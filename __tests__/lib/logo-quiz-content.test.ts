/**
 * Tests for lib/logo-quiz/content.ts — the pure transforms that turn a backend
 * content snapshot into the Logo Quiz's flat, already-localized category and
 * question view-models. Covers VIP filtering (including a missing is_vip),
 * the default-emoji fallback, per-category question counting (incl. 0/0), and
 * the question mapping (brand = options[correct_option], option order, image
 * resolution). The api client is mocked so importing the content cache — which
 * content.ts depends on for resolveLocalImage — touches no network or env.
 */

import { buildCategories, questionsForCategory } from '@/lib/logo-quiz/content';
import { resolveLocalImage, type ContentSnapshot } from '@/lib/content-cache';

jest.mock('@/api/client', () => ({
  APP_SLUG: 'erudite-quiz',
  apiClient: { get: jest.fn(), post: jest.fn() },
}));

type Cat = ContentSnapshot['categories'][number];
type Q = ContentSnapshot['questions'][number];

function mkCat(
  slug: string,
  opts: { is_vip?: boolean; icon_emoji?: string | null; name?: string } = {},
): Cat {
  return {
    slug,
    name: opts.name ?? slug,
    sort_order: 0,
    icon_emoji: opts.icon_emoji ?? null,
    icon_url: null,
    is_vip: opts.is_vip,
    subcategories: [],
  };
}

function mkQ(
  id: number,
  categorySlug: string | null,
  opts: {
    options?: string[];
    correct_option?: number;
    explanation?: string | null;
    image_url?: string | null;
  } = {},
): Q {
  return {
    id,
    category_slug: categorySlug,
    question: `q${id}`,
    options: opts.options ?? ['A', 'B', 'C', 'D'],
    correct_option: opts.correct_option ?? 0,
    explanation: opts.explanation ?? null,
    image_url: opts.image_url ?? null,
  };
}

function makeSnapshot(
  categories: Cat[],
  questions: Q[],
  imageMap?: Record<string, string>,
): ContentSnapshot {
  return {
    app: { slug: 'logo-quiz', name: 'Logo Quiz', supported_locales: ['en', 'ru', 'es'] },
    locale: 'ru',
    version: 1,
    generated_at: '2026-07-28T00:00:00Z',
    categories,
    questions,
    imageMap,
  };
}

describe('buildCategories', () => {
  it('returns only non-VIP categories for the regular section', () => {
    const snap = makeSnapshot(
      [
        mkCat('cars', { is_vip: false }),
        mkCat('luxury', { is_vip: true }),
        mkCat('flags', { is_vip: false }),
      ],
      [],
    );

    const regular = buildCategories(snap, false);

    expect(regular.map((c) => c.slug)).toEqual(['cars', 'flags']);
    expect(regular.every((c) => c.isVip === false)).toBe(true);
  });

  it('returns only VIP categories for the VIP section', () => {
    const snap = makeSnapshot(
      [
        mkCat('cars', { is_vip: false }),
        mkCat('luxury', { is_vip: true }),
        mkCat('yachts', { is_vip: true }),
      ],
      [],
    );

    const vip = buildCategories(snap, true);

    expect(vip.map((c) => c.slug)).toEqual(['luxury', 'yachts']);
    expect(vip.every((c) => c.isVip === true)).toBe(true);
  });

  it('treats a missing/undefined is_vip as false (routes to the regular section)', () => {
    const snap = makeSnapshot([mkCat('cars', {})], []); // is_vip omitted entirely

    expect(buildCategories(snap, false).map((c) => c.slug)).toEqual(['cars']);
    expect(buildCategories(snap, true)).toEqual([]);
    expect(buildCategories(snap, false)[0].isVip).toBe(false);
  });

  it('uses the default emoji when icon_emoji is null or empty, and the backend emoji otherwise', () => {
    const snap = makeSnapshot(
      [
        mkCat('cars', { icon_emoji: null }),
        mkCat('flags', { icon_emoji: '' }),
        mkCat('food', { icon_emoji: '🍔' }),
      ],
      [],
    );

    const bySlug = Object.fromEntries(buildCategories(snap, false).map((c) => [c.slug, c.emoji]));

    expect(bySlug.cars).toBe('🏷️');
    expect(bySlug.flags).toBe('🏷️');
    expect(bySlug.food).toBe('🍔');
  });

  it('counts questions per category by category_slug, returning 0 for empty categories', () => {
    const snap = makeSnapshot(
      [mkCat('cars', { is_vip: false }), mkCat('empty', { is_vip: false })],
      [
        mkQ(1, 'cars'),
        mkQ(2, 'cars'),
        mkQ(3, 'cars'),
        mkQ(4, 'other-category'), // belongs to a category not in the list
      ],
    );

    const bySlug = Object.fromEntries(buildCategories(snap, false).map((c) => [c.slug, c.total]));

    expect(bySlug.cars).toBe(3);
    expect(bySlug.empty).toBe(0); // renders as 0/0, not hidden
  });

  it('passes through the already-localized name from the snapshot', () => {
    const snap = makeSnapshot([mkCat('cars', { name: 'Автомобили' })], []);
    expect(buildCategories(snap, false)[0].name).toBe('Автомобили');
  });
});

describe('questionsForCategory', () => {
  it('filters by category_slug and preserves backend order', () => {
    const snap = makeSnapshot(
      [mkCat('cars')],
      [mkQ(10, 'cars'), mkQ(20, 'other'), mkQ(30, 'cars'), mkQ(40, 'cars')],
    );

    expect(questionsForCategory(snap, 'cars').map((q) => q.id)).toEqual([10, 30, 40]);
  });

  it('maps brand = options[correct_option] and preserves option order + id/explanation', () => {
    const options = ['Maserati', 'Ferrari', 'Alfa Romeo', 'Lamborghini', 'Aston Martin', 'Bentley'];
    const snap = makeSnapshot(
      [mkCat('cars')],
      [mkQ(2145, 'cars', { options, correct_option: 0, explanation: 'Trident logo.' })],
    );

    const [q] = questionsForCategory(snap, 'cars');

    expect(q.id).toBe(2145);
    expect(q.brand).toBe('Maserati');
    expect(q.correctIndex).toBe(0);
    expect(q.options).toEqual(options); // unchanged order
    expect(q.explanation).toBe('Trident logo.');
  });

  it('resolves brand for a non-zero correct_option', () => {
    const snap = makeSnapshot(
      [mkCat('cars')],
      [mkQ(7, 'cars', { options: ['Saab', 'Volvo', 'Tesla'], correct_option: 1 })],
    );

    expect(questionsForCategory(snap, 'cars')[0].brand).toBe('Volvo');
  });

  it('resolves imageUri to the cached local file when present, else the remote URL, and null when absent', () => {
    const remote = 'http://backend/questions/1/image';
    const snap = makeSnapshot(
      [mkCat('cars')],
      [
        mkQ(1, 'cars', { image_url: remote }),
        mkQ(2, 'cars', { image_url: 'http://backend/questions/2/image' }),
        mkQ(3, 'cars', { image_url: null }),
      ],
      { [remote]: 'file:///local/img-1.png' }, // only question 1 is cached locally
    );

    const qs = questionsForCategory(snap, 'cars');

    expect(qs[0].imageUri).toBe('file:///local/img-1.png'); // local file
    expect(qs[1].imageUri).toBe('http://backend/questions/2/image'); // remote fallback
    expect(qs[2].imageUri).toBeNull(); // no artwork
  });

  it('returns an empty array for a category with no questions', () => {
    const snap = makeSnapshot([mkCat('empty')], [mkQ(1, 'cars')]);
    expect(questionsForCategory(snap, 'empty')).toEqual([]);
  });
});

describe('resolveLocalImage (used by questionsForCategory)', () => {
  it('returns null for a null url, the local file when mapped, and the remote url otherwise', () => {
    const snap = makeSnapshot([], [], { 'http://remote/a.png': 'file:///a.png' });

    expect(resolveLocalImage(snap, null)).toBeNull();
    expect(resolveLocalImage(snap, 'http://remote/a.png')).toBe('file:///a.png');
    expect(resolveLocalImage(snap, 'http://remote/b.png')).toBe('http://remote/b.png');
    expect(resolveLocalImage(null, 'http://remote/a.png')).toBe('http://remote/a.png');
  });
});
