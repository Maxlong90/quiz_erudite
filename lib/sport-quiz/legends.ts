/**
 * Backend-driven content for the Sport Quiz "Sports Legends" mode. Legends
 * questions are ordinary IMAGE questions (a photo of a sporting legend + four
 * name options) that live in their OWN content category so they never mix with
 * the Classic pool. These helpers turn the shared snapshot into the same
 * level-grouped view-models Classic uses (see lib/sport-quiz/content.ts), so the
 * Legends level-select and quiz screens render identically to Classic — the only
 * difference is the reveal-grid overlay the quiz draws over each photo.
 *
 * Contract with the backend: a question belongs to Legends when its
 * `category_slug` matches LEGENDS_CATEGORY_SLUG (or a sub-slug of it). Classic's
 * buildLevels() excludes exactly this set, so the two pools are disjoint.
 *
 * Levels are dense chunks of LEGENDS_LEVEL_SIZE questions, ordered by a stable,
 * deterministic shuffle keyed by question id (never hops levels between launches).
 */
import { resolveLocalImage, type ContentSnapshot } from '@/lib/content-cache';
import type { SportQuizQuestion } from '@/lib/sport-quiz/content';

/**
 * Content-category slug that marks a question as a Legends card. All Legends
 * questions live in this single category `sport-legends`; levels are dense
 * chunks of LEGENDS_LEVEL_SIZE in the backend's insertion order (id-ascending),
 * which is the operator's authored order.
 */
export const LEGENDS_CATEGORY_SLUG = 'sport-legends';

/** Faces per Legends level — a full 15-face grid (LogoQuiz-style). */
export const LEGENDS_LEVEL_SIZE = 15;

export interface SportLegendsLevel {
  /** 1-based level number. */
  level: number;
  /** Questions of this level, in play order (≤ LEGENDS_LEVEL_SIZE; last fewer). */
  questions: SportQuizQuestion[];
}

/**
 * Whether a snapshot question is a Legends card. True when its category slug is
 * the Legends category or one of its sub-categories (`sport-legends-...`). Kept
 * here so Classic's content module can import it and exclude the same set.
 */
export function isLegendQuestion(q: ContentSnapshot['questions'][number]): boolean {
  const slug = q.category_slug;
  if (!slug) return false;
  return slug === LEGENDS_CATEGORY_SLUG || slug.startsWith(`${LEGENDS_CATEGORY_SLUG}-`);
}

/** Map one snapshot question into the shared Sport Quiz view-model. */
function toLegendQuestion(
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

/** Look up a single Legends question by id (null if not a Legends question). */
export function legendQuestionById(
  snapshot: ContentSnapshot,
  id: number,
): SportQuizQuestion | null {
  const q = snapshot.questions.find((qq) => qq.id === id && isLegendQuestion(qq));
  return q ? toLegendQuestion(snapshot, q) : null;
}

/**
 * Salt for the Legends shuffle. Bump to RE-SHUFFLE the Legends pool anew while
 * staying fully deterministic.
 */
const LEGENDS_SHUFFLE_SALT = 0x51ed270b;

/**
 * Deterministic hash of a question id → a stable, well-mixed shuffle key. Using
 * the id (not Math.random) keeps the Legends order IDENTICAL across launches, so
 * a face never hops between levels and per-question progress stays valid.
 */
function legendShuffleKey(id: number): number {
  let x = (id ^ 0x9e3779b9 ^ LEGENDS_SHUFFLE_SALT) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x21f0aaad) >>> 0;
  x = Math.imul(x ^ (x >>> 15), 0x735a2d97) >>> 0;
  return (x ^ (x >>> 15)) >>> 0;
}

/**
 * Group every Legends question into dense levels of LEGENDS_LEVEL_SIZE, in a
 * deterministic SHUFFLED order (keyed by question id, not the backend's authored
 * id-ascending order). Stable across launches, so a face never hops levels.
 */
export function buildLegendsLevels(snapshot: ContentSnapshot): SportLegendsLevel[] {
  const ordered = snapshot.questions
    .filter(isLegendQuestion)
    .map((q) => toLegendQuestion(snapshot, q))
    .sort((a, b) => legendShuffleKey(a.id) - legendShuffleKey(b.id) || a.id - b.id);
  const levels: SportLegendsLevel[] = [];
  for (let i = 0; i < ordered.length; i += LEGENDS_LEVEL_SIZE) {
    levels.push({ level: levels.length + 1, questions: ordered.slice(i, i + LEGENDS_LEVEL_SIZE) });
  }
  return levels;
}

/** The questions of a single Legends level (empty when the level does not exist). */
export function legendsQuestionsForLevel(
  snapshot: ContentSnapshot,
  level: number,
): SportQuizQuestion[] {
  return buildLegendsLevels(snapshot).find((l) => l.level === level)?.questions ?? [];
}

/** Solved questions in a level — drives the X/total card count. */
export function legendsLevelSolvedCount(
  questions: SportQuizQuestion[],
  solvedIds: Record<number, true>,
): number {
  return questions.reduce((n, q) => n + (solvedIds[q.id] ? 1 : 0), 0);
}

/**
 * A level is unlocked when it is Level 1 (always) or when EVERY question of the
 * previous level is solved. Pure progression — no lives/premium gate — exactly
 * like Classic.
 */
export function isLegendsLevelUnlocked(
  levels: SportLegendsLevel[],
  level: number,
  solvedIds: Record<number, true>,
): boolean {
  if (level <= 1) return true;
  const previous = levels.find((l) => l.level === level - 1);
  if (!previous) return false;
  return legendsLevelSolvedCount(previous.questions, solvedIds) >= previous.questions.length;
}
