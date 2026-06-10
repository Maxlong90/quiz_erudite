import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ContentSnapshot } from '@/lib/content-cache';
import { getMistakeIds } from '@/lib/mistakes';
import { getAllSeenIds, getStats } from '@/lib/quiz-stats';
import type { StringKey } from '@/i18n/strings';

const SEEN_LEVELS_KEY = 'quiz.achievements.seenLevels.v1';

/** Metrics the achievement engine knows how to score against. */
export type AchievementMetric =
  | 'quizzes'
  | 'questions'
  | 'correct'
  | 'seconds'
  | 'mistakes'
  | 'subjects'
  | 'perfect';

export interface AchievementDef {
  id: string;
  titleKey: StringKey;
  subtitleKey: StringKey;
  emoji: string;
  metric: AchievementMetric;
  /** Sorted ascending. Each entry promotes the achievement one level. */
  thresholds: number[];
  /**
   * Optional accent gradient for the badge (when at least level 1).
   * Falls back to the violet brand color.
   */
  gradient?: readonly [string, string];
}

export interface AchievementProgress {
  def: AchievementDef;
  /** Raw metric value used for the bar. */
  value: number;
  /** Number of thresholds the player has crossed (0..thresholds.length). */
  level: number;
  /** True once every threshold has been crossed. */
  isMaxed: boolean;
  /**
   * For an unfinished achievement: the next threshold the bar fills
   * toward. Null when maxed.
   */
  nextThreshold: number | null;
  /** 0..1 fill ratio toward nextThreshold (or 1 when maxed). */
  ratio: number;
}

/**
 * The full catalog. Add a new entry, ship a new achievement. Keep
 * thresholds tight at the low end so even a few quizzes unlock
 * something visible.
 */
export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'activity',
    titleKey: 'achievements.activity.title',
    subtitleKey: 'achievements.activity.subtitle',
    emoji: '🎯',
    metric: 'quizzes',
    thresholds: [1, 10, 50, 200],
    gradient: ['#7c5cff', '#3aa6ff'],
  },
  {
    id: 'knowledge',
    titleKey: 'achievements.knowledge.title',
    subtitleKey: 'achievements.knowledge.subtitle',
    emoji: '🧠',
    metric: 'questions',
    thresholds: [10, 100, 500, 2000],
    gradient: ['#3aa37a', '#1f6f55'],
  },
  {
    id: 'accuracy',
    titleKey: 'achievements.accuracy.title',
    subtitleKey: 'achievements.accuracy.subtitle',
    emoji: '🎯',
    metric: 'correct',
    thresholds: [10, 100, 500, 2000],
    gradient: ['#22c55e', '#15803d'],
  },
  {
    id: 'time',
    titleKey: 'achievements.time.title',
    subtitleKey: 'achievements.time.subtitle',
    emoji: '⏳',
    metric: 'seconds',
    thresholds: [600, 1800, 10800, 36000], // 10m, 30m, 3h, 10h
    gradient: ['#f59f3a', '#d6533a'],
  },
  {
    id: 'explorer',
    titleKey: 'achievements.explorer.title',
    subtitleKey: 'achievements.explorer.subtitle',
    emoji: '🌍',
    metric: 'subjects',
    thresholds: [1, 3, 5, 7],
    gradient: ['#4f6df5', '#7c5cff'],
  },
  {
    id: 'mistakes',
    titleKey: 'achievements.mistakes.title',
    subtitleKey: 'achievements.mistakes.subtitle',
    emoji: '🔁',
    metric: 'mistakes',
    thresholds: [5, 25, 100],
    gradient: ['#e0529c', '#a23ad6'],
  },
  {
    id: 'perfect',
    titleKey: 'achievements.perfect.title',
    subtitleKey: 'achievements.perfect.subtitle',
    emoji: '💯',
    metric: 'perfect',
    thresholds: [1, 5, 25, 100],
    gradient: ['#ffd23a', '#f59f3a'],
  },
];

export interface MetricsSnapshot {
  quizzes: number;
  questions: number;
  correct: number;
  seconds: number;
  mistakes: number;
  subjects: number;
  perfect: number;
}

/** Pull every metric the achievement engine cares about in one call. */
export async function gatherMetrics(snapshot: ContentSnapshot | null): Promise<MetricsSnapshot> {
  const [stats, seenIds, mistakeIds] = await Promise.all([
    getStats(),
    getAllSeenIds(),
    getMistakeIds(),
  ]);

  // Distinct top-level subjects the player has touched. Resolve each
  // seen question id to its subject via the snapshot — counting per
  // slug-bucket would miss mixed-category modes (10 random etc.) whose
  // seen ids live in the bucket-less "__all__" set.
  let subjectsTouched = 0;
  if (snapshot && seenIds.size > 0) {
    for (const top of snapshot.categories) {
      const slugSet = new Set<string>([top.slug, ...top.subcategories.map((s) => s.slug)]);
      const touched = snapshot.questions.some(
        (q) => q.category_slug != null && slugSet.has(q.category_slug) && seenIds.has(q.id),
      );
      if (touched) subjectsTouched++;
    }
  }

  return {
    quizzes: stats.quizzesTaken,
    questions: stats.totalQuestions,
    correct: stats.totalCorrect,
    seconds: stats.totalSeconds,
    mistakes: mistakeIds.length,
    subjects: subjectsTouched,
    perfect: stats.perfectQuizzes,
  };
}

export function computeProgress(metrics: MetricsSnapshot): AchievementProgress[] {
  return ACHIEVEMENTS.map((def) => {
    const value = metrics[def.metric] ?? 0;
    const level = def.thresholds.filter((t) => value >= t).length;
    const isMaxed = level >= def.thresholds.length;
    const nextThreshold = isMaxed ? null : def.thresholds[level];
    let ratio = 1;
    if (!isMaxed && nextThreshold) {
      // Bar fills from previous threshold up to next, so successive
      // levels feel like real progress — not a single bar inching from
      // 0 to the highest tier.
      const prev = level > 0 ? def.thresholds[level - 1] : 0;
      const span = nextThreshold - prev;
      ratio = span > 0 ? Math.max(0, Math.min(1, (value - prev) / span)) : 0;
    }
    return { def, value, level, isMaxed, nextThreshold, ratio };
  });
}

interface SeenLevels {
  [achievementId: string]: number;
}

async function readSeenLevels(): Promise<SeenLevels> {
  try {
    const raw = await AsyncStorage.getItem(SEEN_LEVELS_KEY);
    return raw ? (JSON.parse(raw) as SeenLevels) : {};
  } catch {
    return {};
  }
}

async function writeSeenLevels(seen: SeenLevels): Promise<void> {
  try {
    await AsyncStorage.setItem(SEEN_LEVELS_KEY, JSON.stringify(seen));
  } catch {
    // best-effort
  }
}

/**
 * Compare current achievement levels against the last ones we showed
 * the player and return the IDs whose levels just went up. The caller
 * is expected to display those, then call markUnlocksSeen() so the
 * same level isn't celebrated twice.
 */
export async function detectUnlocks(progress: AchievementProgress[]): Promise<{
  newlyUnlocked: AchievementProgress[];
  /** Pass to markUnlocksSeen() once the modals have been shown. */
  pendingLevels: SeenLevels;
}> {
  const seen = await readSeenLevels();
  const newlyUnlocked: AchievementProgress[] = [];
  const pendingLevels: SeenLevels = { ...seen };

  for (const p of progress) {
    const prev = seen[p.def.id] ?? 0;
    if (p.level > prev) {
      newlyUnlocked.push(p);
      pendingLevels[p.def.id] = p.level;
    }
  }
  return { newlyUnlocked, pendingLevels };
}

export async function markUnlocksSeen(pendingLevels: SeenLevels): Promise<void> {
  await writeSeenLevels(pendingLevels);
}

/** Reset the seen-levels store (used by dev reset in settings). */
export async function clearAchievementsSeen(): Promise<void> {
  await AsyncStorage.removeItem(SEEN_LEVELS_KEY);
}
