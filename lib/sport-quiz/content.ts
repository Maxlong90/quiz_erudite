/**
 * Backend-driven content for Sport Quiz. Questions come from the shared snapshot
 * API (`/apps/sport-quiz/snapshot?locale=…`) via the offline content cache; these
 * helpers turn that snapshot into the level-grouped, already-localized view-models
 * the Sport Quiz screens render. Mirrors lib/logo-quiz/content.ts, but Sport Quiz
 * has NO premium and NO lives — every question is free — and its "question" is a
 * real text prompt (optionally with an image), not a logo to identify.
 *
 * Levels are dense chunks of LEVEL_SIZE questions. The play order strictly
 * ALTERNATES 1 image · 1 non-image (text/date) question; non-image questions are
 * ordered by difficulty tier (EASY → MEDIUM → HARD) so the earliest levels are the
 * most approachable and the hardest land at the very end. Sports Legends is
 * excluded (its own mode). Stable, deterministic (keyed by question id) so
 * questions never hop levels between launches — bump SHUFFLE_SALT to re-shuffle.
 */
import { resolveLocalImage, type ContentSnapshot } from '@/lib/content-cache';
import { EASY_QUESTION_IDS, HARD_QUESTION_IDS } from '@/lib/sport-quiz/difficulty';
import { isLegendQuestion } from '@/lib/sport-quiz/legends';

/** App slug Sport Quiz always syncs, regardless of the build's APP_SLUG. */
export const SPORT_QUIZ_SLUG = 'sport-quiz';

/** Questions per level. */
export const LEVEL_SIZE = 20;

export interface SportQuizQuestion {
  id: number;
  /** The question prompt text. */
  question: string;
  /** Answer choices exactly as served by the backend. */
  options: string[];
  /** Index of the correct option within `options`. */
  correctIndex: number;
  /** The correct option's text — the answer the player must pick. */
  correctAnswer: string;
  /** Local (or remote) URI of the question image; null for a text-only question. */
  imageUri: string | null;
  /** Localized explanation shown after a correct answer; may be null/empty. */
  explanation: string | null;
}

export interface SportQuizLevel {
  /** 1-based level number. */
  level: number;
  /** Questions of this level, in play order (≤ LEVEL_SIZE; last may be fewer). */
  questions: SportQuizQuestion[];
}

/** Map one snapshot question into a client view-model. */
function toSportQuizQuestion(
  snapshot: ContentSnapshot,
  q: ContentSnapshot['questions'][number],
): SportQuizQuestion {
  return {
    id: q.id,
    question: q.question,
    options: q.options,
    correctIndex: q.correct_option,
    correctAnswer: q.options[q.correct_option] ?? '',
    imageUri: resolveLocalImage(snapshot, q.image_url),
    explanation: q.explanation,
  };
}

/** Two kinds only: an image question, or a non-image one — text, date and
 * numeric questions are merged into a single "text" bucket. */
type QuestionKind = 'image' | 'text';

/**
 * Salt for the shuffle. Bump this constant to RE-SHUFFLE the whole pool anew
 * (a fresh, different permutation) while staying fully deterministic.
 */
const SHUFFLE_SALT = 0x5f356495;

/**
 * Deterministic hash of a question id → a stable, well-mixed shuffle key. Using
 * the id (not Math.random) keeps the order IDENTICAL across app launches, so a
 * question never hops between levels and per-question progress stays valid.
 */
function shuffleKey(id: number): number {
  let x = (id ^ 0x9e3779b9 ^ SHUFFLE_SALT) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x21f0aaad) >>> 0;
  x = Math.imul(x ^ (x >>> 15), 0x735a2d97) >>> 0;
  return (x ^ (x >>> 15)) >>> 0;
}

/**
 * The full play order: strictly ALTERNATE 1 image · 1 non-image question. Images
 * are deterministically shuffled (no difficulty rating). Non-image questions are
 * ordered by DIFFICULTY tier — EASY → MEDIUM → HARD — so the earliest levels are
 * the most approachable and the hardest text questions land at the very end; each
 * tier is shuffled deterministically within itself. When one kind runs out its
 * slot is filled from the other, so the alternation holds while both pools last
 * and then degrades gracefully. Fully deterministic (stable across launches →
 * questions never hop levels); bump SHUFFLE_SALT to re-shuffle everything anew.
 */
function orderedQuestions(snapshot: ContentSnapshot): SportQuizQuestion[] {
  // Exclude the Sports Legends pool — those image questions live in their own
  // mode/category and must never leak into the Classic levels.
  const all = snapshot.questions
    .filter((q) => !isLegendQuestion(q))
    .map((q) => toSportQuizQuestion(snapshot, q));
  const byKey = (a: SportQuizQuestion, b: SportQuizQuestion) =>
    shuffleKey(a.id) - shuffleKey(b.id) || a.id - b.id;

  const image = all.filter((q) => q.imageUri).sort(byKey);
  const nonImage = all.filter((q) => !q.imageUri);
  // Non-image questions by difficulty tier, EASY → MEDIUM → HARD (medium = every
  // question not explicitly rated). Each tier shuffled deterministically, then
  // concatenated so all easy text precedes all medium, which precedes all hard.
  const easy = nonImage.filter((q) => EASY_QUESTION_IDS.has(q.id)).sort(byKey);
  const hard = nonImage.filter((q) => HARD_QUESTION_IDS.has(q.id)).sort(byKey);
  const medium = nonImage
    .filter((q) => !EASY_QUESTION_IDS.has(q.id) && !HARD_QUESTION_IDS.has(q.id))
    .sort(byKey);
  const text = [...easy, ...medium, ...hard];

  const buckets: Record<QuestionKind, SportQuizQuestion[]> = { image, text };
  const pattern: QuestionKind[] = ['image', 'text'];
  const fallback: Record<QuestionKind, QuestionKind[]> = {
    image: ['image', 'text'],
    text: ['text', 'image'],
  };
  const cursor: Record<QuestionKind, number> = { image: 0, text: 0 };
  const take = (k: QuestionKind): SportQuizQuestion | null =>
    cursor[k] < buckets[k].length ? buckets[k][cursor[k]++] : null;

  const total = all.length;
  const order: SportQuizQuestion[] = [];
  let step = 0;
  while (order.length < total) {
    const want = pattern[step++ % pattern.length];
    let picked: SportQuizQuestion | null = null;
    for (const cand of fallback[want]) {
      picked = take(cand);
      if (picked) break;
    }
    if (!picked) break; // nothing left in any bucket
    order.push(picked);
  }
  return order;
}

/** Group every question into dense levels of LEVEL_SIZE, in shuffled play order. */
export function buildLevels(snapshot: ContentSnapshot): SportQuizLevel[] {
  const ordered = orderedQuestions(snapshot);
  const levels: SportQuizLevel[] = [];
  for (let i = 0; i < ordered.length; i += LEVEL_SIZE) {
    levels.push({
      level: levels.length + 1,
      questions: ordered.slice(i, i + LEVEL_SIZE),
    });
  }
  return levels;
}

/** The questions of a single level (empty array when the level does not exist). */
export function questionsForLevel(snapshot: ContentSnapshot, level: number): SportQuizQuestion[] {
  return buildLevels(snapshot).find((l) => l.level === level)?.questions ?? [];
}

/** How many levels the snapshot yields. */
export function totalLevels(snapshot: ContentSnapshot): number {
  return buildLevels(snapshot).length;
}

/** Solved questions in a level — drives the X/total card count. */
export function levelSolvedCount(
  questions: SportQuizQuestion[],
  solvedIds: Record<number, true>,
): number {
  return questions.reduce((n, q) => n + (solvedIds[q.id] ? 1 : 0), 0);
}

/**
 * A level is unlocked when it is Level 1 (always) or when EVERY question of the
 * previous level is solved. No lives/premium gate — pure progression.
 */
export function isLevelUnlocked(
  levels: SportQuizLevel[],
  level: number,
  solvedIds: Record<number, true>,
): boolean {
  if (level <= 1) return true;
  const previous = levels.find((l) => l.level === level - 1);
  if (!previous) return false;
  return levelSolvedCount(previous.questions, solvedIds) >= previous.questions.length;
}
