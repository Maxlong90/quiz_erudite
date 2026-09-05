/**
 * Tests for lib/coat-of-arms/content.ts — the "By continent" transform that
 * turns the image-answer payload (country NAME + four coat-of-arms PICTURES)
 * into the view-model the continent game renders.
 *
 * The interesting part is the post-answer reward: the CORRECT option may carry
 * `image_url_original`, the archived master artwork that still shows the country
 * name on its banner. The backend OMITS that key (never nulls it) and only 64 of
 * 195 countries have one, so "no original" is the common, non-exceptional path.
 *
 * The api client is mocked so importing the content cache touches no network.
 */

import { buildCoatPictureQuestions, COAT_CONTINENT_BY_SLUG } from '@/lib/coat-of-arms/content';
import type { ImageAnswerApiQuestion } from '@/lib/flags-quiz/content';

jest.mock('@/api/client', () => ({
  APP_SLUG: 'coat-of-arms',
  apiClient: { get: jest.fn(), post: jest.fn() },
}));

function mkCoatQuestion(
  id: number,
  category_slug: string | null,
  over: Partial<ImageAnswerApiQuestion> = {},
): ImageAnswerApiQuestion {
  return {
    id,
    category_slug,
    title: `Country ${id}`,
    options: [
      { image_url: `https://x/${id}/answer-image/0` },
      { image_url: `https://x/${id}/answer-image/1` },
      { image_url: `https://x/${id}/answer-image/2` },
      { image_url: `https://x/${id}/answer-image/3` },
    ],
    correct_index: 1,
    explanation: null,
    ...over,
  };
}

describe('COAT_CONTINENT_BY_SLUG', () => {
  it('maps every backend coat continent slug to a ContinentKey', () => {
    expect(COAT_CONTINENT_BY_SLUG).toEqual({
      'coat-of-arms-africa': 'africa',
      'coat-of-arms-asia': 'asia',
      'coat-of-arms-europe': 'europe',
      'coat-of-arms-north-america': 'northAmerica',
      'coat-of-arms-south-america': 'southAmerica',
      'coat-of-arms-oceania': 'oceania',
    });
  });
});

describe('buildCoatPictureQuestions', () => {
  it('maps rows, resolves the four coat options via imageMap, and carries continent', () => {
    const raw = [mkCoatQuestion(3551, 'coat-of-arms-africa', { title: 'Egypt', correct_index: 3 })];
    const map = { 'https://x/3551/answer-image/0': 'file:///l/3551-0.png' };
    const out = buildCoatPictureQuestions(raw, map);

    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ id: 3551, title: 'Egypt', correctIndex: 3, continent: 'africa' });
    expect(out[0].optionImageUris[0]).toBe('file:///l/3551-0.png');
    // Uncached options fall back to their remote URL rather than going null.
    expect(out[0].optionImageUris[1]).toBe('https://x/3551/answer-image/1');
    expect(out[0].optionImageUris).toHaveLength(4);
  });

  it('drops questions whose category does not map to a known continent', () => {
    const raw = [
      mkCoatQuestion(1, 'coat-of-arms-africa'),
      mkCoatQuestion(2, null),
      mkCoatQuestion(3, 'flags-africa'),
    ];
    expect(buildCoatPictureQuestions(raw).map((q) => q.id)).toEqual([1]);
  });

  describe('the original-artwork reward', () => {
    it('resolves the CORRECT option original via imageMap', () => {
      // Mirrors the real Egypt row: the original is served from a DIFFERENT
      // question id than the played option, so it is read verbatim.
      const raw = [
        mkCoatQuestion(3551, 'coat-of-arms-africa', {
          correct_index: 3,
          options: [
            { image_url: 'https://x/3551/answer-image/0' },
            { image_url: 'https://x/3551/answer-image/1' },
            { image_url: 'https://x/3551/answer-image/2' },
            {
              image_url: 'https://x/3551/answer-image/3',
              image_url_original: 'https://x/3618/image?variant=original&v=100970c011c3',
            },
          ],
        }),
      ];
      const map = {
        'https://x/3618/image?variant=original&v=100970c011c3': 'file:///l/3618-original.webp',
      };

      expect(buildCoatPictureQuestions(raw, map)[0].correctOriginalImageUri).toBe(
        'file:///l/3618-original.webp',
      );
    });

    it('falls back to the remote original URL when it is not cached yet', () => {
      const raw = [
        mkCoatQuestion(1, 'coat-of-arms-europe', {
          correct_index: 0,
          options: [
            { image_url: 'https://x/1/answer-image/0', image_url_original: 'https://x/9/orig' },
            { image_url: 'https://x/1/answer-image/1' },
          ],
        }),
      ];
      expect(buildCoatPictureQuestions(raw)[0].correctOriginalImageUri).toBe('https://x/9/orig');
    });

    it('is null when the key is ABSENT — the ~68% of coats with no master artwork', () => {
      const out = buildCoatPictureQuestions([mkCoatQuestion(1, 'coat-of-arms-asia')]);
      expect(out[0].correctOriginalImageUri).toBeNull();
    });

    it('NEVER picks up a wrong option original — that would spoil the answer', () => {
      const raw = [
        mkCoatQuestion(1, 'coat-of-arms-asia', {
          correct_index: 2,
          options: [
            { image_url: 'https://x/1/answer-image/0', image_url_original: 'https://x/spoiler-0' },
            { image_url: 'https://x/1/answer-image/1', image_url_original: 'https://x/spoiler-1' },
            { image_url: 'https://x/1/answer-image/2' },
            { image_url: 'https://x/1/answer-image/3', image_url_original: 'https://x/spoiler-3' },
          ],
        }),
      ];
      expect(buildCoatPictureQuestions(raw)[0].correctOriginalImageUri).toBeNull();
    });

    it('keeps every question playable even when no original exists (0 dropped)', () => {
      const raw = Array.from({ length: 10 }, (_, i) => mkCoatQuestion(i + 1, 'coat-of-arms-africa'));
      const out = buildCoatPictureQuestions(raw);

      expect(out).toHaveLength(10);
      expect(out.every((q) => q.correctOriginalImageUri === null)).toBe(true);
      expect(out.every((q) => q.optionImageUris.length === 4)).toBe(true);
    });
  });
});
