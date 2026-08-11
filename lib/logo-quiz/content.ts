/**
 * Backend-driven content for the Logo Quiz. Questions come from the shared
 * snapshot API (`/apps/logo-quiz/snapshot?locale=…`) via the offline content
 * cache; these helpers turn that snapshot into the level-grouped, already-
 * localized view-models the Logo Quiz screens render. Real brand artwork is
 * shown from each question's `image_url`.
 *
 * The backend assigns every playable logo-quiz question a persistent 1-based
 * `order`. Everything else is DERIVED here on the client:
 *   level           = ceil(order / 15)
 *   positionInLevel = (order - 1) % 15          → 0..14
 *   premium         = positionInLevel >= 9       → the 6 premium slots (10..15)
 * The last level may be partial (< 15 questions).
 */
import { resolveLocalImage, type ContentSnapshot } from '@/lib/content-cache';

/** App slug the Logo Quiz always syncs, regardless of the build's APP_SLUG. */
export const LOGO_QUIZ_SLUG = 'logo-quiz';

/** Questions per level. */
export const LEVEL_SIZE = 15;
/** Free (non-premium) questions at the front of every level — positions 0..8. */
export const FREE_PER_LEVEL = 9;

export interface LogoQuizQuestion {
  id: number;
  /** Correct brand name — the answer the player must pick. */
  brand: string;
  /** Answer choices exactly as served by the backend. */
  options: string[];
  /** Index of the correct option within `options`. */
  correctIndex: number;
  /** Local (or remote) URI of the real brand logo; null if none. */
  imageUri: string | null;
  /** Localized explanation shown after a correct answer; may be null/empty. */
  explanation: string | null;
  /** Persistent 1-based number from the backend snapshot. */
  order: number;
  /** Derived level number: ceil(order / LEVEL_SIZE). */
  level: number;
  /** Derived slot within the level: (order - 1) % LEVEL_SIZE → 0..14. */
  positionInLevel: number;
  /** Derived premium flag: positionInLevel >= FREE_PER_LEVEL (positions 10..15). */
  premium: boolean;
}

export interface LogoQuizLevel {
  /** 1-based level number. */
  level: number;
  /** Questions of this level, sorted by `order` (≤ LEVEL_SIZE; last may be fewer). */
  questions: LogoQuizQuestion[];
}

/** Map one snapshot question + its resolved order into a client view-model. */
function toLogoQuizQuestion(
  snapshot: ContentSnapshot,
  q: ContentSnapshot['questions'][number],
  order: number,
): LogoQuizQuestion {
  const positionInLevel = (order - 1) % LEVEL_SIZE;
  return {
    id: q.id,
    brand: q.options[q.correct_option] ?? '',
    options: q.options,
    correctIndex: q.correct_option,
    imageUri: resolveLocalImage(snapshot, q.image_url),
    explanation: q.explanation,
    order,
    level: Math.ceil(order / LEVEL_SIZE),
    positionInLevel,
    premium: positionInLevel >= FREE_PER_LEVEL,
  };
}

/**
 * Group every numbered logo-quiz question into dense, ordered levels of 15.
 * Questions without a valid `order` (backend not yet emitting it, or an
 * excluded question) are dropped — so an old snapshot degrades to an empty
 * level list instead of crashing. `order` is read defensively because the
 * shared SnapshotQuestion type does not declare it (it survives the cache
 * round-trip as a raw field).
 */
export function buildLevels(snapshot: ContentSnapshot): LogoQuizLevel[] {
  const mapped: LogoQuizQuestion[] = [];
  for (const q of snapshot.questions) {
    const order = (q as { order?: number }).order;
    if (typeof order !== 'number' || !Number.isInteger(order) || order < 1) continue;
    mapped.push(toLogoQuizQuestion(snapshot, q, order));
  }
  mapped.sort((a, b) => a.order - b.order);

  const byLevel = new Map<number, LogoQuizQuestion[]>();
  for (const question of mapped) {
    const bucket = byLevel.get(question.level);
    if (bucket) bucket.push(question);
    else byLevel.set(question.level, [question]);
  }

  return Array.from(byLevel.keys())
    .sort((a, b) => a - b)
    .map((level) => ({ level, questions: byLevel.get(level)! }));
}

/** The questions of a single level (empty array when the level does not exist). */
export function questionsForLevel(snapshot: ContentSnapshot, level: number): LogoQuizQuestion[] {
  return buildLevels(snapshot).find((l) => l.level === level)?.questions ?? [];
}

/** How many levels the snapshot yields. */
export function totalLevels(snapshot: ContentSnapshot): number {
  return buildLevels(snapshot).length;
}

/** How many of a level's questions are free (non-premium). */
function freeQuestionCount(questions: LogoQuizQuestion[]): number {
  return questions.reduce((n, q) => n + (q.premium ? 0 : 1), 0);
}

/** Solved questions in a level — premium included (drives the X/total card count). */
export function levelSolvedCount(
  questions: LogoQuizQuestion[],
  solvedIds: Record<number, true>,
): number {
  return questions.reduce((n, q) => n + (solvedIds[q.id] ? 1 : 0), 0);
}

/** Solved FREE questions in a level (positions 0..8) — drives level unlocking. */
export function levelFreeSolvedCount(
  questions: LogoQuizQuestion[],
  solvedIds: Record<number, true>,
): number {
  return questions.reduce((n, q) => n + (!q.premium && solvedIds[q.id] ? 1 : 0), 0);
}

/**
 * A level is unlocked when Level 1 (always) or when every FREE question of the
 * previous level is solved. Premium questions never gate progression, so a free
 * player clears the whole game on the 9 free questions of each level. A partial
 * previous level (fewer than 9 free questions) unlocks once all its free ones
 * are solved.
 */
export function isLevelUnlocked(
  levels: LogoQuizLevel[],
  level: number,
  solvedIds: Record<number, true>,
): boolean {
  if (level <= 1) return true;
  const previous = levels.find((l) => l.level === level - 1);
  if (!previous) return false;
  const needed = Math.min(FREE_PER_LEVEL, freeQuestionCount(previous.questions));
  return levelFreeSolvedCount(previous.questions, solvedIds) >= needed;
}
