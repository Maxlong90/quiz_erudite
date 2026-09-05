/**
 * Backend-driven "By continent" content for the Coat of Arms quiz. Mirrors the
 * Flags Quiz picture-question transform, only the category slugs differ
 * (coat-of-arms-{continent} instead of flags-{continent}). A picture question is
 * a country NAME + four COAT-OF-ARMS image options (one correct); the rows come
 * from `/apps/coat-of-arms/image-answer-questions`.
 */
import { resolveFromMap } from '@/lib/content-cache';
import type { ContinentKey } from '@/constants/flags-quiz/continent-flags';
import {
  correctOptionOriginalUrl,
  type FlagPictureQuestion,
  type ImageAnswerApiQuestion,
} from '@/lib/flags-quiz/content';

/** App slug the Coat of Arms quiz always syncs. */
export const COAT_QUIZ_SLUG = 'coat-of-arms';

/** Backend coat continent category slug → frontend ContinentKey. */
export const COAT_CONTINENT_BY_SLUG: Record<string, ContinentKey> = {
  'coat-of-arms-africa': 'africa',
  'coat-of-arms-asia': 'asia',
  'coat-of-arms-europe': 'europe',
  'coat-of-arms-north-america': 'northAmerica',
  'coat-of-arms-south-america': 'southAmerica',
  'coat-of-arms-oceania': 'oceania',
};

/**
 * Build the "By continent" questions from the image-answer payload, resolving
 * each of the four coat option images through the URL→local-file map, plus the
 * CORRECT option's original artwork (the coat that still carries the country
 * name) for the post-answer reveal. Questions whose category doesn't map to a
 * known continent are dropped; a question with no original simply never reveals.
 */
export function buildCoatPictureQuestions(
  raw: ImageAnswerApiQuestion[],
  imageMap: Record<string, string> = {},
): FlagPictureQuestion[] {
  const out: FlagPictureQuestion[] = [];
  for (const q of raw) {
    const continent = q.category_slug ? COAT_CONTINENT_BY_SLUG[q.category_slug] : undefined;
    if (!continent) continue;
    out.push({
      id: q.id,
      title: q.title,
      optionImageUris: (q.options ?? []).map((o) => resolveFromMap(imageMap, o.image_url)),
      correctIndex: q.correct_index,
      correctOriginalImageUri: resolveFromMap(imageMap, correctOptionOriginalUrl(q)),
      explanation: q.explanation,
      continent,
    });
  }
  return out;
}
