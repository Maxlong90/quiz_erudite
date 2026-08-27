/**
 * Backend-driven content for the Flags Quiz (App Template: Geography). Two
 * distinct question shapes back the two game modes:
 *
 *  - "All countries" (quiz.tsx): a flag PICTURE + four TEXT options. These are
 *    the app's `image_questions`, served in the shared content snapshot
 *    (`/apps/flags-quiz/snapshot`). Built here into FlagCountryQuestion.
 *
 *  - "By continent" (continent-quiz.tsx): a country NAME + four flag PICTURE
 *    options. These are the app's `image_answer_questions`, kept OUT of the
 *    snapshot and served by their own endpoint
 *    (`/apps/flags-quiz/image-answer-questions`). Built here into
 *    FlagPictureQuestion and grouped by continent.
 *
 * Both are pure transforms — the provider (hooks/flags-quiz/use-flags-quiz-
 * content) does the fetching, image caching and offline persistence.
 */
import { resolveLocalImage, resolveFromMap, type ContentSnapshot } from '@/lib/content-cache';
import type { ContinentKey } from '@/constants/flags-quiz/continent-flags';

/** App slug the Flags Quiz always syncs, regardless of the build's APP_SLUG. */
export const FLAGS_QUIZ_SLUG = 'flags-quiz';

/**
 * Backend continent category slug → frontend ContinentKey. Keeps "Africa on the
 * backend → Africa in the app" exact for every continent. A slug not listed here
 * has no matching frontend section and its questions are dropped.
 */
export const CONTINENT_BY_SLUG: Record<string, ContinentKey> = {
  'flags-africa': 'africa',
  'flags-asia': 'asia',
  'flags-europe': 'europe',
  'flags-north-america': 'northAmerica',
  'flags-south-america': 'southAmerica',
  'flags-oceania': 'oceania',
};

/** "All countries" question: flag image shown, four text options (one correct). */
export interface FlagCountryQuestion {
  id: number;
  /** Localized prompt ("Which country does this flag belong to?"). */
  prompt: string;
  /** Local (or remote) URI of the flag image; null if none. */
  imageUri: string | null;
  /** Localized text answer choices, backend order. */
  options: string[];
  /** Index of the correct option within `options`. */
  correctIndex: number;
  /** Localized flag note shown after a correct answer; may be null. */
  explanation: string | null;
  /** Continent the country belongs to (null if its category doesn't map). */
  continent: ContinentKey | null;
}

/** "By continent" question: country name shown, four flag-image options. */
export interface FlagPictureQuestion {
  id: number;
  /** Localized country name — the prompt the player must match. */
  title: string;
  /** Local (or remote) URIs of the four flag options, backend order. */
  optionImageUris: (string | null)[];
  /** Index of the correct option within `optionImageUris`. */
  correctIndex: number;
  /** Localized flag note shown after a correct answer; may be null. */
  explanation: string | null;
  /** Continent this question belongs to. */
  continent: ContinentKey;
}

/** Raw row from `/apps/flags-quiz/image-answer-questions`. */
export interface ImageAnswerApiQuestion {
  id: number;
  category_slug: string | null;
  title: string;
  options: { image_url: string }[];
  correct_index: number;
  explanation: string | null;
}

/**
 * Build the "All countries" list from the snapshot (every `image_questions`
 * row). Flag images resolve through the snapshot's downloaded imageMap.
 */
export function buildCountryQuestions(snapshot: ContentSnapshot | null): FlagCountryQuestion[] {
  if (!snapshot) return [];
  return snapshot.questions.map((q) => ({
    id: q.id,
    prompt: q.question,
    imageUri: resolveLocalImage(snapshot, q.image_url),
    options: q.options,
    correctIndex: q.correct_option,
    explanation: q.explanation,
    continent: q.category_slug ? CONTINENT_BY_SLUG[q.category_slug] ?? null : null,
  }));
}

/**
 * Build the "By continent" questions from the image-answer payload, resolving
 * each of the four option images through the provided URL→local-file map.
 * Questions whose category doesn't map to a known continent are dropped.
 */
export function buildPictureQuestions(
  raw: ImageAnswerApiQuestion[],
  imageMap: Record<string, string> = {},
): FlagPictureQuestion[] {
  const out: FlagPictureQuestion[] = [];
  for (const q of raw) {
    const continent = q.category_slug ? CONTINENT_BY_SLUG[q.category_slug] : undefined;
    if (!continent) continue;
    out.push({
      id: q.id,
      title: q.title,
      optionImageUris: (q.options ?? []).map((o) => resolveFromMap(imageMap, o.image_url)),
      correctIndex: q.correct_index,
      explanation: q.explanation,
      continent,
    });
  }
  return out;
}

/** Group picture questions by continent (empty object entries omitted). */
export function groupByContinent(
  questions: FlagPictureQuestion[],
): Partial<Record<ContinentKey, FlagPictureQuestion[]>> {
  const acc: Partial<Record<ContinentKey, FlagPictureQuestion[]>> = {};
  for (const q of questions) {
    (acc[q.continent] ??= []).push(q);
  }
  return acc;
}

/** Per-continent question counts — drives the "By continent" list badges. */
export function continentCounts(
  questions: FlagPictureQuestion[],
): Partial<Record<ContinentKey, number>> {
  const counts: Partial<Record<ContinentKey, number>> = {};
  for (const q of questions) counts[q.continent] = (counts[q.continent] ?? 0) + 1;
  return counts;
}

/** Every option image URL across the payload — the pre-cache download set. */
export function optionImageUrls(raw: ImageAnswerApiQuestion[]): string[] {
  return raw.flatMap((q) => (q.options ?? []).map((o) => o.image_url)).filter(Boolean);
}
