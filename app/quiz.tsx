import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { HardQuestionCard, type HardVariant } from '@/components/quiz/hard-question-card';
import { HintBar } from '@/components/quiz/hint-bar';
import { LivesBar } from '@/components/quiz/lives-bar';
import { BuyLivesModal } from '@/components/lives/buy-lives-modal';
import { OutOfLivesModal } from '@/components/quiz/out-of-lives-modal';
import { ProgressBar } from '@/components/quiz/progress-bar';
import { QuestionCard } from '@/components/quiz/question-card';
import { QuizTimer } from '@/components/quiz/quiz-timer';
import { ReportButton } from '@/components/quiz/report-button';
import { ReportModal } from '@/components/quiz/report-modal';
import { ShareQuestionButton } from '@/components/quiz/share-question-button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useHintsState } from '@/hooks/use-hints';
import { useLives } from '@/hooks/use-lives';
import { usePremium } from '@/hooks/use-premium';
import { addLives, getLives, spendLife } from '@/lib/lives';
import { consumeHint, type HintKind } from '@/lib/hints';
import { findReplacementQuestion } from '@/lib/replace-question';
import { useContentCache } from '@/hooks/use-content-cache';
import { useQuizSession } from '@/hooks/use-quiz-session';
import { useTranslation } from '@/hooks/use-translation';
import { fetchRandomQuestions } from '@/api/questions';
import { APP_SLUG } from '@/api/client';
import { resolveLocalImage } from '@/lib/content-cache';
import {
  computeProgress,
  detectUnlocks,
  gatherMetrics,
  markUnlocksSeen,
} from '@/lib/achievements';
import { getMistakeIds, recordMistake } from '@/lib/mistakes';
import { recordQuizCompletion } from '@/lib/quiz-stats';
import {
  enqueueAnswer,
  flushAnswers,
  loadCachedStats,
  realStatsForQuestion,
  type QuestionStatsCache,
} from '@/lib/answer-stats';
import { getTodayQuestionId } from '@/lib/today-question';

const GRADIENT = ['#1a1a47', '#2d1f5e', '#1a1a47'] as const;

type QuizMode = 'daily' | 'quick' | 'timed' | 'survival' | 'hard';

const SURVIVAL_POOL_SIZE = 200;

const SEEN_KEY_PREFIX = 'quiz.seen.v1.';

interface SeenStore {
  ids: number[];
}

async function readSeen(category: string | undefined): Promise<Set<number>> {
  if (!category) return new Set();
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const raw = await AsyncStorage.getItem(SEEN_KEY_PREFIX + category);
    const parsed: SeenStore = raw ? JSON.parse(raw) : { ids: [] };
    return new Set(parsed.ids);
  } catch {
    return new Set();
  }
}

async function writeSeen(category: string | undefined, ids: number[]): Promise<void> {
  if (!category) return;
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    await AsyncStorage.setItem(SEEN_KEY_PREFIX + category, JSON.stringify({ ids }));
  } catch {
    // best-effort
  }
}

/**
 * Pick `wanted` questions from the local snapshot for the given
 * category. Drops IDs already in `seen`; if there aren't enough fresh
 * ones left, signals the caller to reset the seen set so subsequent
 * sessions still get full pools. Image URLs are rewritten to local
 * file paths when available so the quiz works offline.
 */
interface CachePick {
  id: number;
  question: string;
  options: string[];
  correct_option: number;
  explanation: string | null;
  image_url: string | null;
}

/**
 * Decide whether a question is realistic to play in Hard mode given
 * its correct answer. We can't expect a player to spell "United States
 * of America" from scratch — too many slots, too easy to mistype.
 *
 *   - typing : up to 3 words / 20 chars, no parens/brackets, no slash.
 *   - letters: single-word answers up to 12 chars (the letter bank
 *              gets unwieldy otherwise, and spaces in the bank are
 *              ambiguous anyway).
 */
function isHardEligible(
  q: { options?: string[]; correct_option: number },
  variant: 'typing' | 'letters',
): boolean {
  const text = (q.options ?? [])[q.correct_option] ?? '';
  if (!text) return false;
  // Reject answers carrying parenthetical context, slashes (alt
  // spellings) or em-dashes — the player can't recover those.
  if (/[()[\]/——]/.test(text)) return false;
  const trimmed = text.trim();
  // Filter out one/two-letter answers ("A", "B", numeric letters) —
  // they're typically multiple-choice scaffolding, not real prose.
  if (trimmed.length < 3) return false;
  if (variant === 'letters') {
    if (/\s/.test(trimmed)) return false;
    if (trimmed.length > 12) return false;
    return true;
  }
  // typing
  const words = trimmed.split(/\s+/);
  if (words.length > 3) return false;
  if (trimmed.length > 20) return false;
  return true;
}

function pickQuestionsFromCache(
  snapshot: ReturnType<typeof useContentCache>['snapshot'],
  categorySlugs: string[],
  wanted: number,
  seen: Set<number>,
  hardFilter?: 'typing' | 'letters',
): { picks: CachePick[]; resetSeen: boolean } {
  if (!snapshot) return { picks: [], resetSeen: false };

  // Each requested slug expands to itself plus every subcategory if
  // it's a top-level slug; that way picking "Geography" pulls from
  // all of its leaves, while picking a leaf slug stays scoped.
  const allowed = new Set<string>();
  for (const slug of categorySlugs) {
    const top = snapshot.categories.find((c) => c.slug === slug);
    if (top) {
      allowed.add(top.slug);
      for (const sub of top.subcategories) allowed.add(sub.slug);
    } else {
      allowed.add(slug);
    }
  }

  // Build the pool via a Map keyed by id so any snapshot-level dupes
  // (or two slugs that match the same question) collapse to one entry
  // — guarantees no within-session repeats.
  const poolMap = new Map<number, typeof snapshot.questions[number]>();
  for (const q of snapshot.questions) {
    if (allowed.size > 0 && (!q.category_slug || !allowed.has(q.category_slug))) {
      continue;
    }
    if (hardFilter && !isHardEligible(q, hardFilter)) {
      continue;
    }
    if (!poolMap.has(q.id)) poolMap.set(q.id, q);
  }
  const pool = Array.from(poolMap.values());
  if (pool.length === 0) return { picks: [], resetSeen: false };

  let unseen = pool.filter((q) => !seen.has(q.id));
  let resetSeen = false;
  if (unseen.length < wanted) {
    resetSeen = true;
    unseen = pool;
  }

  // Fisher-Yates shuffle. `sort(() => Math.random() - 0.5)` is biased
  // and on some V8 builds can return wonky permutations; this is
  // O(n), uniform, and trivially correct.
  const shuffled = [...unseen];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Defensive dedupe at the pick boundary: even if upstream somehow
  // produces a repeat, we never hand the session two questions with
  // the same id.
  const pickedIds = new Set<number>();
  const picks: CachePick[] = [];
  for (const q of shuffled) {
    if (pickedIds.has(q.id)) continue;
    pickedIds.add(q.id);
    picks.push(mapToCachePick(snapshot, q));
    if (picks.length >= wanted) break;
  }
  return { picks, resetSeen };
}

function mapToCachePick(
  snapshot: NonNullable<ReturnType<typeof useContentCache>['snapshot']>,
  q: NonNullable<ReturnType<typeof useContentCache>['snapshot']>['questions'][number],
): CachePick {
  return shuffleOptions({
    id: q.id,
    question: q.question ?? '',
    options: q.options ?? [],
    correct_option: q.correct_option,
    explanation: q.explanation,
    image_url: resolveLocalImage(snapshot, q.image_url),
  });
}

/**
 * Shuffle the answer options and remap correct_option to the new
 * position of the originally-correct answer. Called every time we
 * materialize a question for the session, so reopening the same
 * question (e.g. Today's Question on Play Again, or Mistakes review)
 * produces a fresh layout — players can't memorize "the answer is C".
 */
function shuffleOptions<T extends { options: string[]; correct_option: number }>(q: T): T {
  if (!Array.isArray(q.options) || q.options.length < 2) return q;
  const order = q.options.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return {
    ...q,
    options: order.map((i) => q.options[i]),
    correct_option: order.indexOf(q.correct_option),
  };
}

/**
 * Build the question pool from the user's recorded-mistakes list. We
 * preserve the recency order (most recent first) so the freshest pain
 * surfaces first when the player reviews their misses.
 */
function pickMistakeQuestions(
  snapshot: NonNullable<ReturnType<typeof useContentCache>['snapshot']>,
  mistakeIds: number[],
  wanted: number,
): CachePick[] {
  const byId = new Map(snapshot.questions.map((q) => [q.id, q]));
  const picks: CachePick[] = [];
  for (const id of mistakeIds) {
    const q = byId.get(id);
    if (q) picks.push(mapToCachePick(snapshot, q));
    if (picks.length >= wanted) break;
  }
  return picks;
}

export default function QuizScreen() {
  const params = useLocalSearchParams<{
    count: string;
    locale: string;
    category?: string;
    categorySlugs?: string;
    mode?: string;
    timer?: string;
    totalSeconds?: string;
    source?: string;
    hardVariant?: string;
  }>();
  const count = params.count;
  const locale = params.locale;
  const category = params.category;
  const categorySlugsParam = params.categorySlugs;
  const source = params.source;
  const mode = ((params.mode ?? 'quick') as QuizMode);
  const timerSeconds = parseInt(params.timer ?? '0', 10) || 0;
  const totalSeconds = parseInt(params.totalSeconds ?? '0', 10) || 0;
  const isTimed = mode === 'timed' && timerSeconds > 0;
  const isSurvival = mode === 'survival';
  const isMistakes = source === 'mistakes';
  const isDaily = mode === 'daily';
  const isHard = mode === 'hard';
  const hardVariant: HardVariant = params.hardVariant === 'letters' ? 'letters' : 'typing';
  const hasTotalTimer = totalSeconds > 0;

  // Resolve which categories the picker should pull from. Order of
  // precedence: explicit multi-slug list > legacy single category >
  // empty set (= every category).
  const requestedSlugs = categorySlugsParam
    ? categorySlugsParam.split(',').map((s) => s.trim()).filter(Boolean)
    : (category ? [category] : []);

  const { t } = useTranslation();
  const { snapshot } = useContentCache();

  const {
    questions,
    answers,
    currentIndex,
    currentQuestion,
    isAnswered,
    selectedAnswer,
    score,
    status,
    error,
    progress,
    dispatch,
  } = useQuizSession();

  const nextButtonOpacity = useSharedValue(0);
  const [reportOpen, setReportOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(timerSeconds);
  const [totalLeft, setTotalLeft] = useState(totalSeconds);

  // Lives & hints. Daily / mistakes are excluded from life-deduction
  // by design — those modes are review-style, not stakes-style.
  const livesApply = !isDaily && !isMistakes;
  const { count: livesCount, reload: reloadLives } = useLives();
  const { state: hintsState, reload: reloadHints } = useHintsState();
  const { isPremium } = usePremium();

  // Premium = UNLIMITED lives AND hints. Single seam so a future ranked
  // "Hard mode" (rankings / prizes) can RE-ENABLE spending for premium in
  // that mode ONLY — when it lands, add `&& !isRankedHardMode` to both
  // predicates below. Do NOT build that mode here. `isPremium` is null
  // while loading; treat that as non-premium (spending stays on until it
  // resolves — the safe default).
  const premiumUnlimited = isPremium === true;
  const livesSpendingEnabled = livesApply && !isSurvival && !premiumUnlimited;
  const hintsSpendingEnabled = !premiumUnlimited;

  const [outOfLivesOpen, setOutOfLivesOpen] = useState(false);
  const [buyLivesOpen, setBuyLivesOpen] = useState(false);
  const [hintsUsedThisQ, setHintsUsedThisQ] = useState<Set<HintKind>>(new Set());
  const [hiddenIndices, setHiddenIndices] = useState<Set<number>>(new Set());
  const [statsHint, setStatsHint] = useState<number[] | null>(null);
  // Real per-question answer distributions, loaded once from the local cache
  // on mount so the statistics hint can read them synchronously (offline-safe)
  // and fall back to the generated distribution when a question is absent.
  const statsCacheRef = useRef<QuestionStatsCache | null>(null);
  // Transient banner when replaceQuestion has no candidate to swap in.
  const [replaceUnavailable, setReplaceUnavailable] = useState(false);
  const replaceNoticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cross-session no-repeat bucket key. Mirrors loadQuestions' scheme so
  // both the initial pick and the replaceQuestion swap dedupe the same way:
  // a "hard typing" run doesn't share history with a regular run, and each
  // unique category selection gets its own bucket.
  const seenKey = (requestedSlugs.length === 0
    ? '__all__'
    : [...requestedSlugs].sort().join('+'))
    + (isHard ? `__hard_${hardVariant}` : '');

  // Reset hint state at the start of every question so a new question
  // begins with a clean slate (no carried-over 50/50 or stats overlay).
  const [hintQuestionIdx, setHintQuestionIdx] = useState(0);
  if (currentIndex !== hintQuestionIdx) {
    setHintQuestionIdx(currentIndex);
    setHintsUsedThisQ(new Set());
    setHiddenIndices(new Set());
    setStatsHint(null);
  }
  // Tracks which question index the per-question timer is currently
  // counting for. When the player advances, we reset secondsLeft to a
  // fresh value DURING this render — not in a useEffect — so the tick
  // effect never sees the previous question's "0" and auto-times out
  // the new one before the reset commits.
  const [timedQuestionIdx, setTimedQuestionIdx] = useState(0);
  if (isTimed && currentIndex !== timedQuestionIdx) {
    setTimedQuestionIdx(currentIndex);
    setSecondsLeft(timerSeconds);
  }
  // Wall-clock timestamp when the session went into 'playing'. Used to
  // compute how long the run actually lasted for the stats screen.
  const playStartedAtRef = useRef<number | null>(null);
  // Guards against double-counting: whichever path records the session
  // first (natural finish OR early exit via the close button) flips
  // this so the other path becomes a no-op.
  const recordedRef = useRef(false);

  useEffect(() => {
    loadQuestions();
    // Warm the real-stats cache into memory for the statistics hint. Purely
    // best-effort — the hint falls back to a generated distribution if this
    // hasn't landed (or the question is below threshold).
    loadCachedStats()
      .then((cache) => {
        statsCacheRef.current = cache;
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clear the replace-unavailable banner timer on unmount.
  useEffect(
    () => () => {
      if (replaceNoticeTimer.current) clearTimeout(replaceNoticeTimer.current);
    },
    [],
  );

  // Stamp the start of the playing phase so we can attribute the run's
  // duration to the running totals on the Stats screen.
  useEffect(() => {
    if (status === 'playing' && playStartedAtRef.current == null) {
      playStartedAtRef.current = Date.now();
    }
  }, [status]);

  useEffect(() => {
    if (status === 'finished') {
      // Ship any queued answer reports now that a session wrapped up — a
      // natural online moment. Fire-and-forget; stays queued if offline.
      flushAnswers().catch(() => {});
      // For survival or a total-time run, "total" is the number the
      // user actually saw — runs can end before the planned count.
      const answeredCount = answers.filter((a) => a !== null).length;
      const totalForResults =
        isSurvival || hasTotalTimer
          ? Math.max(answeredCount, 1)
          : questions.length;

      const startedAt = playStartedAtRef.current;
      const durationSec = startedAt ? (Date.now() - startedAt) / 1000 : 0;
      const baseParams: Record<string, string> = {
        score: String(score),
        total: String(totalForResults),
        count: count ?? '10',
        locale: locale ?? 'en',
        mode,
        // Carry every param needed to faithfully relaunch the same kind
        // of quiz from the Results "Play again" button.
        ...(category ? { category } : {}),
        ...(categorySlugsParam ? { categorySlugs: categorySlugsParam } : {}),
        ...(isTimed ? { timer: String(timerSeconds) } : {}),
        ...(totalSeconds > 0 ? { totalSeconds: String(totalSeconds) } : {}),
        ...(source ? { source } : {}),
        ...(isHard ? { hardVariant } : {}),
      };

      const goToResults = (extra: Record<string, string> = {}) => {
        router.replace({
          pathname: '/results',
          params: { ...baseParams, ...extra },
        });
      };

      if (isDaily) {
        // Daily mode is one question, intentionally excluded from
        // totals so opening "today" doesn't pad the stats.
        goToResults();
        return;
      }

      // Persist totals THEN compute achievement deltas, so the just-
      // finished quiz counts toward the new threshold check.
      (async () => {
        try {
          if (!recordedRef.current) {
            recordedRef.current = true;
            await recordQuizCompletion({
              questionsAnswered: answeredCount,
              correct: score,
              durationSeconds: durationSec,
            });
          }
          const metrics = await gatherMetrics(snapshot ?? null);
          const progress = computeProgress(metrics);
          const { newlyUnlocked, pendingLevels } = await detectUnlocks(progress);
          if (newlyUnlocked.length > 0) {
            await markUnlocksSeen(pendingLevels);
            goToResults({
              unlocked: newlyUnlocked.map((p) => p.def.id).join(','),
            });
            return;
          }
        } catch {
          // ignore — never block the user from seeing their score
        }
        goToResults();
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    if (isAnswered) {
      nextButtonOpacity.value = withDelay(500, withTiming(1, { duration: 300 }));
    } else {
      nextButtonOpacity.value = 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAnswered]);

  // Survival: end the run on the first wrong answer. Brief delay so
  // the player gets to see the correct option highlighted.
  useEffect(() => {
    if (!isSurvival || !isAnswered || !currentQuestion) return;
    if (selectedAnswer !== currentQuestion.correct_option) {
      const t = setTimeout(() => dispatch({ type: 'FINISH' }), 1500);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAnswered, selectedAnswer, isSurvival, currentQuestion?.id]);

  // Timed mode: tick down each second. When the timer hits 0 on an
  // unanswered question, auto-mark it timed-out (-1, never matches the
  // correct option) and let the standard reveal flow take it from
  // there. The reset on a new question is handled in render above —
  // doing it from a useEffect would run AFTER this tick, which would
  // see the previous question's stale 0 and instantly time-out the
  // fresh question.
  useEffect(() => {
    if (!isTimed || isAnswered) return;
    if (timedQuestionIdx !== currentIndex) return; // mid-transition; wait for in-render reset
    if (secondsLeft <= 0) {
      dispatch({ type: 'ANSWER', payload: -1 });
      return;
    }
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, isAnswered, isTimed, timedQuestionIdx, currentIndex]);

  // Total-quiz timer (Time Limit mode): counts down across the whole
  // session. When it expires, finish immediately so the player goes
  // straight to Results with whatever they've answered so far.
  useEffect(() => {
    if (!hasTotalTimer || status !== 'playing') return;
    // Freeze the clock while the out-of-lives gate is up — it's not
    // fair to drain the timer behind a modal the player must resolve.
    if (outOfLivesOpen) return;
    if (totalLeft <= 0) {
      dispatch({ type: 'FINISH' });
      return;
    }
    const id = setTimeout(() => setTotalLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalLeft, hasTotalTimer, status, outOfLivesOpen]);

  // Build a deterministic-per-question fake distribution of how often
  // other players pick each option, used by the "stats" hint. The
  // correct option always gets the largest share (40–60%); the rest
  // split the remainder weighted randomly. Seeding by question.id
  // keeps the same percentages across repeated hint uses on the same
  // question, which feels less arbitrary than fully-random rerolls.
  function generateStatsForQuestion(q: { id: number; options: string[]; correct_option: number }): number[] {
    const seed = q.id;
    const rand = (n: number) => {
      // Mulberry32-ish: tiny, no deps, deterministic per (seed, n).
      let s = (seed * 9301 + 49297 + n * 233280) % 233280;
      return s / 233280;
    };
    const correctPct = 40 + Math.floor(rand(0) * 21); // 40..60
    const remaining = 100 - correctPct;
    const otherIdx = q.options.map((_, i) => i).filter((i) => i !== q.correct_option);
    const weights = otherIdx.map((_, i) => 0.5 + rand(i + 1));
    const wsum = weights.reduce((a, b) => a + b, 0);
    const stats: number[] = new Array(q.options.length).fill(0);
    let assigned = 0;
    otherIdx.forEach((i, k) => {
      const v = k === otherIdx.length - 1
        ? remaining - assigned
        : Math.round((weights[k] / wsum) * remaining);
      stats[i] = v;
      assigned += v;
    });
    stats[q.correct_option] = correctPct;
    return stats;
  }

  function flashReplaceUnavailable() {
    setReplaceUnavailable(true);
    if (replaceNoticeTimer.current) clearTimeout(replaceNoticeTimer.current);
    replaceNoticeTimer.current = setTimeout(() => setReplaceUnavailable(false), 2600);
  }

  function useHint(kind: HintKind) {
    if (!currentQuestion || isAnswered) return;
    if (hintsUsedThisQ.has(kind)) return;
    // Premium spends nothing (hintsSpendingEnabled === false): skip the
    // remaining-count gate AND the consume. Free players still need stock.
    if (hintsSpendingEnabled && (hintsState[kind] ?? 0) <= 0) return;

    // replaceQuestion is special: it must confirm a candidate exists BEFORE
    // spending, and it reads/writes async state — handled on its own path.
    if (kind === 'replaceQuestion') {
      void applyReplaceQuestion();
      return;
    }

    if (hintsSpendingEnabled) {
      consumeHint(kind).then(() => reloadHints()).catch(() => {});
    }
    setHintsUsedThisQ((s) => new Set(s).add(kind));

    switch (kind) {
      case 'fiftyFifty': {
        // Leave EXACTLY two options: the correct one + one random wrong.
        // Robust to any option count — hide every wrong except one.
        const wrongs = currentQuestion.options
          .map((_, i) => i)
          .filter((i) => i !== currentQuestion.correct_option && !hiddenIndices.has(i));
        // Shuffle so the surviving wrong option is random.
        for (let i = wrongs.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [wrongs[i], wrongs[j]] = [wrongs[j], wrongs[i]];
        }
        // Keep one wrong visible; hide the rest.
        const toHide = wrongs.slice(1);
        setHiddenIndices((cur) => {
          const next = new Set(cur);
          for (const idx of toHide) next.add(idx);
          return next;
        });
        break;
      }
      case 'statistics': {
        // Prefer the real distribution collected from other players; the
        // cache only holds questions the server gated in (>= threshold),
        // so a hit is honest real data. Fall back to the generated one.
        const real = realStatsForQuestion(
          statsCacheRef.current,
          currentQuestion.id,
          currentQuestion.options.length,
        );
        setStatsHint(real ?? generateStatsForQuestion(currentQuestion));
        break;
      }
    }
  }

  // Replace the current question with a fresh, unused one of the same
  // subcategory (and Hard-eligibility when in Hard mode). Consumes a hint
  // only on a successful swap; when nothing is available it flashes a
  // notice and spends nothing. Keeps session state intact — the reducer
  // swaps in place, and we clear this question's hint overlays here.
  async function applyReplaceQuestion() {
    if (!snapshot || !currentQuestion) {
      flashReplaceUnavailable();
      return;
    }
    const seen = await readSeen(seenKey);
    const exclude = new Set<number>(seen);
    for (const q of questions) exclude.add(q.id);

    const chosen = findReplacementQuestion({
      pool: snapshot.questions,
      currentId: currentQuestion.id,
      excludeIds: exclude,
      eligible: isHard ? (q) => isHardEligible(q, hardVariant) : undefined,
    });
    if (!chosen) {
      flashReplaceUnavailable();
      return;
    }

    const pick = mapToCachePick(snapshot, chosen);
    if (hintsSpendingEnabled) {
      try {
        await consumeHint('replaceQuestion');
        reloadHints();
      } catch {
        // best-effort; the swap still happens
      }
    }
    dispatch({ type: 'REPLACE_QUESTION', payload: pick });
    // Track the swapped-in question so it isn't repeated later.
    await writeSeen(seenKey, [...seen, chosen.id]);
    // Fresh question at the SAME index — the per-question reset keyed on
    // currentIndex won't fire, so clear this question's overlays manually.
    setHintsUsedThisQ(new Set());
    setHiddenIndices(new Set());
    setStatsHint(null);
  }

  async function loadQuestions() {
    dispatch({ type: 'SET_LOADING' });
    const requestedCount = parseInt(count ?? '10', 10);
    const wantLocale = locale ?? 'en';

    // Lives gate — block a fresh quiz if the player has no lives left.
    // Premium bypasses it entirely (unlimited lives).
    if (livesApply && !premiumUnlimited) {
      const lives = await getLives();
      if (lives <= 0) {
        setOutOfLivesOpen(true);
        dispatch({ type: 'SET_ERROR', payload: 'No lives' });
        return;
      }
    }

    // Survival and total-time runs need a deep pool — neither has a
    // fixed end count so we pre-load enough that the player won't
    // outrun the supply mid-session.
    const wanted = isSurvival || hasTotalTimer ? SURVIVAL_POOL_SIZE : requestedCount;

    // Today's question: deterministic per local day. Same question on
    // every launch and every Play Again until midnight rolls over.
    if (isDaily) {
      if (!snapshot) {
        dispatch({ type: 'SET_ERROR', payload: 'Cache not ready yet' });
        return;
      }
      const id = await getTodayQuestionId(snapshot);
      const found = id != null ? snapshot.questions.find((q) => q.id === id) : null;
      if (!found) {
        dispatch({ type: 'SET_ERROR', payload: "Couldn't pick today's question" });
        return;
      }
      dispatch({ type: 'SET_QUESTIONS', payload: [mapToCachePick(snapshot, found)] });
      return;
    }

    // Mistakes mode: pull straight from the recorded mistake list,
    // ignoring categories. If the cache hasn't arrived yet there's no
    // good fallback, so surface an error and let the user retry.
    if (isMistakes) {
      if (!snapshot) {
        dispatch({ type: 'SET_ERROR', payload: 'Cache not ready yet' });
        return;
      }
      const ids = await getMistakeIds();
      const picks = pickMistakeQuestions(snapshot, ids, requestedCount);
      if (picks.length === 0) {
        dispatch({ type: 'SET_ERROR', payload: 'No mistakes recorded yet' });
        return;
      }
      dispatch({ type: 'SET_QUESTIONS', payload: picks });
      return;
    }

    // Prefer the local snapshot when it's ready: that way the quiz
    // works offline AND we get cross-session "no repeats" via the
    // persisted seen set. The seen-key includes every requested slug
    // so multi-cat / all-cat runs also get cross-session dedup —
    // each unique selection has its own bucket.
    if (snapshot && snapshot.locale === wantLocale) {
      // Bucket the seen-set by mode too so a "hard typing" run doesn't
      // share its history with a regular run on the same categories.
      // `seenKey` is derived once at component scope (shared with the
      // replaceQuestion swap so both dedupe against the same bucket).
      const seen = await readSeen(seenKey);
      const { picks, resetSeen } = pickQuestionsFromCache(
        snapshot,
        requestedSlugs,
        wanted,
        seen,
        isHard ? hardVariant : undefined,
      );
      if (picks.length > 0) {
        dispatch({ type: 'SET_QUESTIONS', payload: picks });
        const baseSeen = resetSeen ? [] : Array.from(seen);
        await writeSeen(seenKey, [...baseSeen, ...picks.map((q) => q.id)]);
        return;
      }
    }

    try {
      const data = await fetchRandomQuestions(
        APP_SLUG,
        wantLocale,
        wanted,
        requestedSlugs.length === 1 ? requestedSlugs[0] : undefined,
      );
      dispatch({ type: 'SET_QUESTIONS', payload: data.map(shuffleOptions) });
    } catch (err) {
      dispatch({
        type: 'SET_ERROR',
        payload: err instanceof Error ? err.message : 'Failed to load questions',
      });
    }
  }

  function handleSelectOption(index: number) {
    if (isAnswered) return;
    dispatch({ type: 'ANSWER', payload: index });

    // Report the pick for the anonymous real-stats aggregate (fire-and-
    // forget, non-blocking, offline-safe). Skip Hard mode — its answers are
    // typed / letter-built with no discrete option index — and skip the
    // timed-out sentinel (-1), which isn't a real choice.
    if (!isHard && index >= 0 && currentQuestion) {
      enqueueAnswer(currentQuestion.id, index).catch(() => {});
    }

    const isCorrect = index === currentQuestion?.correct_option;
    if (!isCorrect && currentQuestion) {
      // Record the mistake so it surfaces under the home Mistakes tile.
      // Fire-and-forget — never block the UI on a write.
      recordMistake(currentQuestion.id).catch(() => {});
      // Wrong answer costs a life. Survival is excluded — it ends the
      // run on first wrong anyway. Premium spends nothing (unlimited).
      // When the life that would absorb this mistake isn't there (count
      // hits 0), gate the player: they can't advance until they top up
      // via ad or purchase. (livesSpendingEnabled already folds in
      // livesApply, survival, and premium.)
      if (livesSpendingEnabled) {
        const isLast = currentIndex === questions.length - 1;
        spendLife()
          .then((newCount) => {
            reloadLives();
            if (newCount <= 0 && !isLast) {
              setOutOfLivesOpen(true);
            }
          })
          .catch(() => {});
      }
    }
    if (process.env.EXPO_OS !== 'web') {
      if (isCorrect) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }
  }

  function handleNext() {
    nextButtonOpacity.value = 0;
    dispatch({ type: 'NEXT' });
  }

  function handleClose() {
    // Leaving mid-quiz still banks whatever the player answered so far
    // (e.g. a Time Limit run abandoned before the clock ran out). Daily
    // is excluded from totals, same as a natural finish.
    const answeredCount = answers.filter((a) => a !== null).length;
    if (!isDaily && !recordedRef.current && answeredCount > 0) {
      recordedRef.current = true;
      const startedAt = playStartedAtRef.current;
      const durationSec = startedAt ? (Date.now() - startedAt) / 1000 : 0;
      // Fire-and-forget — don't block navigation on the write. Early
      // exit banks questions/correct/time but does NOT count as a
      // finished quiz (quizzesTaken stays put, no perfect-run credit).
      recordQuizCompletion({
        questionsAnswered: answeredCount,
        correct: score,
        durationSeconds: durationSec,
        countAsQuiz: false,
      }).catch(() => {});
    }
    // Leaving the quiz is also a good moment to ship queued answer reports.
    flushAnswers().catch(() => {});
    router.replace('/');
  }

  const nextButtonStyle = useAnimatedStyle(() => ({
    opacity: nextButtonOpacity.value,
  }));

  if (status === 'loading') {
    return (
      <LinearGradient colors={GRADIENT} locations={[0, 0.55, 1]} style={styles.flex}>
        <StatusBar style="light" />
        <SafeAreaView style={styles.centered}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>{t('quiz.loading')}</Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (status === 'error') {
    return (
      <LinearGradient colors={GRADIENT} locations={[0, 0.55, 1]} style={styles.flex}>
        <StatusBar style="light" />
        <SafeAreaView style={styles.centered}>
          <Text style={styles.emoji}>😕</Text>
          <Text style={styles.errorTitle}>{t('quiz.error.title')}</Text>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <Pressable onPress={loadQuestions} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{t('quiz.error.retry')}</Text>
          </Pressable>
          <Pressable onPress={() => router.replace('/')} style={styles.homeLink}>
            <Text style={styles.homeLinkText}>{t('quiz.error.home')}</Text>
          </Pressable>
        </SafeAreaView>
        <OutOfLivesModal
          visible={outOfLivesOpen}
          onClose={() => { setOutOfLivesOpen(false); router.replace('/'); }}
          onWatchAd={async () => {
            // Stub for rewarded video: pretend the user watched a 2-sec
            // ad and reward 1 life. Real AdMob/IronSource wiring lands
            // later; keeping a fake delay makes the UX feel real.
            await new Promise((r) => setTimeout(r, 1500));
            await addLives(1);
            await reloadLives();
            setOutOfLivesOpen(false);
            loadQuestions();
          }}
          onOpenShop={() => { setOutOfLivesOpen(false); setBuyLivesOpen(true); }}
        />
        <BuyLivesModal
          visible={buyLivesOpen}
          onClose={() => { setBuyLivesOpen(false); setOutOfLivesOpen(true); }}
          onPurchased={async () => {
            await reloadLives();
            setBuyLivesOpen(false);
            setOutOfLivesOpen(false);
            // Start the quiz now that the player has lives.
            loadQuestions();
          }}
        />
      </LinearGradient>
    );
  }

  if (!currentQuestion) return null;

  const isLastQuestion = currentIndex === questions.length - 1;

  return (
    <LinearGradient colors={GRADIENT} locations={[0, 0.55, 1]} style={styles.flex}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.flex}>
        <View style={styles.header}>
          <Pressable
            onPress={handleClose}
            hitSlop={12}
            style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
            accessibilityLabel={t('quiz.error.home')}
            testID="close-quiz"
          >
            <IconSymbol name="xmark" size={22} color="#ffffffcc" />
          </Pressable>
          {livesApply && <LivesBar count={livesCount} unlimited={premiumUnlimited} />}
          <View style={styles.progressWrap}>
            <ProgressBar
              progress={progress}
              currentIndex={currentIndex}
              total={questions.length}
            />
          </View>
          <View style={styles.iconButton}>
            <ShareQuestionButton question={currentQuestion} />
          </View>
          <View style={styles.iconButton}>
            <ReportButton onPress={() => setReportOpen(true)} />
          </View>
        </View>

        {isTimed && (
          <QuizTimer secondsLeft={secondsLeft} totalSeconds={timerSeconds} />
        )}

        {hasTotalTimer && <TotalTimer secondsLeft={totalLeft} totalSeconds={totalSeconds} />}

        <ScrollView
          style={styles.scrollFlex}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {isHard ? (
            <HardQuestionCard
              question={currentQuestion}
              variant={hardVariant}
              isRevealed={isAnswered}
              isCorrectSubmitted={isAnswered && selectedAnswer === currentQuestion.correct_option}
              onSubmit={(matchesCorrect) => {
                handleSelectOption(matchesCorrect ? currentQuestion.correct_option : -1);
              }}
            />
          ) : (
            <QuestionCard
              question={currentQuestion}
              selectedOption={selectedAnswer}
              onSelectOption={handleSelectOption}
              hiddenIndices={hiddenIndices}
              stats={statsHint}
            />
          )}

          {!isAnswered && (
            <>
              <HintBar
                state={hintsState}
                used={hintsUsedThisQ}
                hard={isHard}
                unlimited={premiumUnlimited}
                onUse={useHint}
              />
              {replaceUnavailable && (
                <View style={styles.replaceNotice}>
                  <Text style={styles.replaceNoticeText}>
                    {t('hint.replaceQuestion.unavailable')}
                  </Text>
                </View>
              )}
            </>
          )}
        </ScrollView>

        {/* Next is pinned outside the ScrollView so it stays in the same
            spot regardless of how long the question/answers are. */}
        {isAnswered && (
          <Animated.View style={[styles.nextFooter, nextButtonStyle]}>
            <Pressable
              onPress={handleNext}
              style={({ pressed }) => [
                styles.primaryButton,
                styles.nextButton,
                pressed && styles.nextButtonPressed,
              ]}
              testID="next-button"
            >
              <Text style={styles.primaryButtonText}>
                {isLastQuestion ? t('quiz.results') : t('quiz.next')}
              </Text>
            </Pressable>
          </Animated.View>
        )}
        <ReportModal
          visible={reportOpen}
          contentType="question"
          contentId={currentQuestion.id}
          locale={locale ?? 'en'}
          onClose={() => setReportOpen(false)}
        />
        <OutOfLivesModal
          visible={outOfLivesOpen}
          // Closing the gate mid-quiz means giving up the run — there's
          // no way to keep playing without a life, so we bail home.
          onClose={() => { setOutOfLivesOpen(false); router.replace('/'); }}
          onWatchAd={async () => {
            await new Promise((r) => setTimeout(r, 1500));
            await addLives(1);
            await reloadLives();
            // Stay on the current (already-answered) question; the
            // player dismisses the gate and taps Next to continue.
            setOutOfLivesOpen(false);
          }}
          // Open the quick-buy sheet instead of leaving the quiz for
          // the full shop screen.
          onOpenShop={() => { setOutOfLivesOpen(false); setBuyLivesOpen(true); }}
        />
        <BuyLivesModal
          visible={buyLivesOpen}
          // Backing out of buy returns to the gate — the player still
          // has no lives, so they can't silently slip back into play.
          onClose={() => { setBuyLivesOpen(false); setOutOfLivesOpen(true); }}
          onPurchased={async () => {
            await reloadLives();
            // Lives credited — drop both gates and let play resume.
            setBuyLivesOpen(false);
            setOutOfLivesOpen(false);
          }}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

/**
 * Whole-quiz countdown badge for Time Limit mode. Renders MM:SS so the
 * player has a clear sense of how much total time is left, with a red
 * tint in the last 10 seconds.
 */
function TotalTimer({ secondsLeft, totalSeconds }: { secondsLeft: number; totalSeconds: number }) {
  const m = Math.max(0, Math.floor(secondsLeft / 60));
  const s = Math.max(0, secondsLeft % 60);
  const label = `${m}:${s.toString().padStart(2, '0')}`;
  const isCritical = secondsLeft <= 10 && secondsLeft > 0;
  const color = isCritical ? '#ef4444' : '#a78bff';
  const ratio = totalSeconds > 0 ? Math.max(0, Math.min(1, secondsLeft / totalSeconds)) : 0;
  return (
    <View style={totalTimerStyles.wrap}>
      <View style={totalTimerStyles.row}>
        <View style={totalTimerStyles.track}>
          <View
            style={[
              totalTimerStyles.fill,
              { backgroundColor: color, width: `${ratio * 100}%` },
            ]}
          />
        </View>
        <Text style={[totalTimerStyles.label, { color }]}>{label}</Text>
      </View>
    </View>
  );
}

const totalTimerStyles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  track: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffffff22',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    minWidth: 44,
    textAlign: 'right',
  },
});

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#ffffffcc',
  },
  emoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  errorTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  errorText: {
    color: '#ffffffaa',
    textAlign: 'center',
    fontSize: 14,
    marginBottom: 8,
  },
  homeLink: {
    marginTop: 8,
  },
  homeLinkText: {
    color: '#a78bff',
    fontSize: 16,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButtonPressed: {
    opacity: 0.5,
  },
  progressWrap: {
    flex: 1,
  },
  scrollFlex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingTop: 28,
    paddingBottom: 24,
  },
  replaceNotice: {
    marginHorizontal: 16,
    marginTop: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#7c5cff22',
    borderWidth: 1,
    borderColor: '#7c5cff66',
    alignItems: 'center',
  },
  replaceNoticeText: {
    color: '#c9bbff',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  nextFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ffffff1f',
  },
  primaryButton: {
    backgroundColor: '#7c5cff',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 28,
    alignItems: 'center',
    shadowColor: '#7c5cff',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  nextButton: {
    width: '100%',
    paddingHorizontal: 0,
  },
  nextButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
