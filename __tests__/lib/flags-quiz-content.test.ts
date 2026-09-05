/**
 * Tests for lib/flags-quiz/content.ts — the pure transforms that turn backend
 * content into the two Flags Quiz view-models: "All countries" (flag image +
 * text options, from the snapshot) and "By continent" (country name + four flag
 * images, from the image-answer endpoint). Covers the country/picture mapping,
 * the backend-slug → ContinentKey mapping, image resolution via the imageMap,
 * dropping questions whose category doesn't map, per-continent grouping/counts,
 * and the option-URL collector. The api client is mocked so importing the
 * content cache (which content.ts depends on for resolveLocalImage) touches no
 * network or env.
 */

import {
  FLAGS_QUIZ_SLUG,
  CONTINENT_BY_SLUG,
  buildCountryQuestions,
  buildPictureQuestions,
  groupByContinent,
  continentCounts,
  optionImageUrls,
  type ImageAnswerApiQuestion,
} from '@/lib/flags-quiz/content';
import type { ContentSnapshot } from '@/lib/content-cache';

jest.mock('@/api/client', () => ({
  APP_SLUG: 'erudite-quiz',
  apiClient: { get: jest.fn(), post: jest.fn() },
}));

type Q = ContentSnapshot['questions'][number];

function mkSnapshotQ(id: number, over: Partial<Q> = {}): Q {
  return {
    id,
    category_slug: 'flags-africa',
    question: 'Which country does this flag belong to?',
    options: ['A', 'B', 'C', 'D'],
    correct_option: 0,
    explanation: null,
    image_url: `https://x/${id}.png`,
    ...over,
  } as Q;
}

function makeSnapshot(questions: Q[], imageMap?: Record<string, string>): ContentSnapshot {
  return {
    app: { slug: FLAGS_QUIZ_SLUG, name: 'Flags Quiz', supported_locales: ['en', 'ru', 'es'] },
    locale: 'en',
    version: 1,
    generated_at: '2026-08-27T00:00:00Z',
    categories: [],
    questions,
    imageMap,
  };
}

function mkImageAnswer(
  id: number,
  category_slug: string | null,
  over: Partial<ImageAnswerApiQuestion> = {},
): ImageAnswerApiQuestion {
  return {
    id,
    category_slug,
    title: `Country ${id}`,
    options: [
      { image_url: `https://x/${id}-0.png` },
      { image_url: `https://x/${id}-1.png` },
      { image_url: `https://x/${id}-2.png` },
      { image_url: `https://x/${id}-3.png` },
    ],
    correct_index: 1,
    explanation: null,
    ...over,
  };
}

describe('CONTINENT_BY_SLUG', () => {
  it('maps every backend continent slug to a ContinentKey', () => {
    expect(CONTINENT_BY_SLUG).toEqual({
      'flags-africa': 'africa',
      'flags-asia': 'asia',
      'flags-europe': 'europe',
      'flags-north-america': 'northAmerica',
      'flags-south-america': 'southAmerica',
      'flags-oceania': 'oceania',
    });
  });
});

describe('buildCountryQuestions', () => {
  it('returns [] for a null snapshot', () => {
    expect(buildCountryQuestions(null)).toEqual([]);
  });

  it('maps every snapshot question and resolves the flag image via imageMap', () => {
    const snap = makeSnapshot(
      [
        mkSnapshotQ(1, {
          options: ['Nigeria', 'Mali', 'Chad', 'Gabon'],
          correct_option: 2,
          explanation: 'note',
          image_url: 'https://x/1.png',
          category_slug: 'flags-europe',
        }),
      ],
      { 'https://x/1.png': 'file:///local/1.png' },
    );
    const out = buildCountryQuestions(snap);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      id: 1,
      prompt: 'Which country does this flag belong to?',
      imageUri: 'file:///local/1.png',
      options: ['Nigeria', 'Mali', 'Chad', 'Gabon'],
      correctIndex: 2,
      explanation: 'note',
      continent: 'europe',
    });
  });

  it('falls back to the remote URL when the image is not cached, and maps unknown categories to null', () => {
    const snap = makeSnapshot([mkSnapshotQ(2, { category_slug: 'flags-unknown' })]);
    const out = buildCountryQuestions(snap);
    expect(out[0].imageUri).toBe('https://x/2.png');
    expect(out[0].continent).toBeNull();
  });

  it('keeps all 195 questions (count parity)', () => {
    const snap = makeSnapshot(Array.from({ length: 195 }, (_, i) => mkSnapshotQ(i + 1)));
    expect(buildCountryQuestions(snap)).toHaveLength(195);
  });

  // The Coat of Arms reward image: the pre-cleaning coat that still shows the
  // country name, revealed after a correct answer. The backend emits
  // `image_url_original` ONLY when an original exists (64 of 195 coats), so the
  // absent-key case below is the majority case, not an edge case.
  it('resolves the ORIGINAL image via imageMap when the key is present', () => {
    const snap = makeSnapshot(
      [mkSnapshotQ(1, { image_url_original: 'https://x/1.png?variant=original&v=abc' })],
      {
        'https://x/1.png': 'file:///local/1.png',
        'https://x/1.png?variant=original&v=abc': 'file:///local/1-orig.png',
      },
    );
    const [q] = buildCountryQuestions(snap);
    // Both variants resolve independently to their own cached files.
    expect(q.imageUri).toBe('file:///local/1.png');
    expect(q.originalImageUri).toBe('file:///local/1-orig.png');
  });

  it('falls back to the remote original URL when it is not cached', () => {
    const snap = makeSnapshot([mkSnapshotQ(1, { image_url_original: 'https://x/1-orig.png' })]);
    expect(buildCountryQuestions(snap)[0].originalImageUri).toBe('https://x/1-orig.png');
  });

  it('yields a null originalImageUri when the key is ABSENT — the 131-coat and Flags Quiz case', () => {
    const snap = makeSnapshot([mkSnapshotQ(1)]);
    // Guard the FIXTURE too: the backend omits the key entirely rather than
    // sending null, so this must stay `undefined`. If someone "tidies" the
    // factory into `image_url_original: null` the real shape stops being tested.
    expect(snap.questions[0].image_url_original).toBeUndefined();
    expect(buildCountryQuestions(snap)[0].originalImageUri).toBeNull();
  });

  it('yields a null originalImageUri when the key is explicitly null', () => {
    const snap = makeSnapshot([mkSnapshotQ(1, { image_url_original: null })]);
    expect(buildCountryQuestions(snap)[0].originalImageUri).toBeNull();
  });
});

describe('buildPictureQuestions', () => {
  it('maps rows, resolves option images via imageMap, and carries continent', () => {
    const raw = [mkImageAnswer(10, 'flags-asia', { title: 'Japan', correct_index: 3 })];
    const map = { 'https://x/10-0.png': 'file:///l/10-0.png' };
    const out = buildPictureQuestions(raw, map);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      id: 10,
      title: 'Japan',
      correctIndex: 3,
      continent: 'asia',
    });
    // First option resolved locally; the rest fall back to remote URLs.
    expect(out[0].optionImageUris[0]).toBe('file:///l/10-0.png');
    expect(out[0].optionImageUris[1]).toBe('https://x/10-1.png');
    expect(out[0].optionImageUris).toHaveLength(4);
  });

  it('drops questions whose category does not map to a known continent', () => {
    const raw = [mkImageAnswer(1, 'flags-africa'), mkImageAnswer(2, null), mkImageAnswer(3, 'nope')];
    const out = buildPictureQuestions(raw);
    expect(out.map((q) => q.id)).toEqual([1]);
  });
});

describe('groupByContinent + continentCounts', () => {
  const raw = [
    mkImageAnswer(1, 'flags-africa'),
    mkImageAnswer(2, 'flags-africa'),
    mkImageAnswer(3, 'flags-europe'),
    mkImageAnswer(4, 'flags-oceania'),
    mkImageAnswer(5, 'flags-unknown'),
  ];
  const built = buildPictureQuestions(raw);

  it('groups the picture questions by continent', () => {
    const grouped = groupByContinent(built);
    expect(grouped.africa?.map((q) => q.id)).toEqual([1, 2]);
    expect(grouped.europe?.map((q) => q.id)).toEqual([3]);
    expect(grouped.oceania?.map((q) => q.id)).toEqual([4]);
    expect(grouped.asia).toBeUndefined();
  });

  it('counts questions per continent', () => {
    expect(continentCounts(built)).toEqual({ africa: 2, europe: 1, oceania: 1 });
  });
});

describe('optionImageUrls', () => {
  it('flattens every option image URL across the payload', () => {
    const raw = [mkImageAnswer(1, 'flags-africa'), mkImageAnswer(2, 'flags-asia')];
    expect(optionImageUrls(raw)).toEqual([
      'https://x/1-0.png',
      'https://x/1-1.png',
      'https://x/1-2.png',
      'https://x/1-3.png',
      'https://x/2-0.png',
      'https://x/2-1.png',
      'https://x/2-2.png',
      'https://x/2-3.png',
    ]);
  });
});
