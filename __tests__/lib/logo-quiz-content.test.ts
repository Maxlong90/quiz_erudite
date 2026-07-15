import {
  findLogoCategory,
  getLogoCategories,
  getLogoQuestions,
  getMockCoinBalance,
  toQuizQuestions,
  type LogoQuestion,
} from '@/lib/logo-quiz-content';

function logoQuestion(overrides: Partial<LogoQuestion> = {}): LogoQuestion {
  return {
    id: 1,
    brand: 'Acme',
    options: ['Acme', 'Beta', 'Gamma', 'Delta'],
    correctOption: 0,
    logoUri: null,
    glyph: '🅰️',
    ...overrides,
  };
}

describe('toQuizQuestions', () => {
  it('maps logo questions onto the engine Question shape', () => {
    const mapped = toQuizQuestions([
      logoQuestion({ id: 42, brand: 'Beta', options: ['Acme', 'Beta'], correctOption: 1, logoUri: 'https://x/y.png' }),
    ]);
    expect(mapped).toHaveLength(1);
    expect(mapped[0]).toMatchObject({
      id: 42,
      options: ['Acme', 'Beta'],
      correct_option: 1,
      image_url: 'https://x/y.png',
      explanation: null,
    });
  });

  it('carries a null image when no logo uri is present', () => {
    const [mapped] = toQuizQuestions([logoQuestion({ logoUri: null })]);
    expect(mapped.image_url).toBeNull();
  });

  it('preserves order and count', () => {
    const mapped = toQuizQuestions([logoQuestion({ id: 1 }), logoQuestion({ id: 2 }), logoQuestion({ id: 3 })]);
    expect(mapped.map((q) => q.id)).toEqual([1, 2, 3]);
  });
});

describe('getLogoCategories', () => {
  it('returns categories with at least one free and one premium', async () => {
    const cats = await getLogoCategories();
    expect(cats.length).toBeGreaterThan(0);
    expect(cats.some((c) => c.premium)).toBe(true);
    expect(cats.some((c) => !c.premium)).toBe(true);
  });

  it('gives each category a stable slug, accent, and glyph', async () => {
    const cats = await getLogoCategories();
    for (const c of cats) {
      expect(typeof c.slug).toBe('string');
      expect(c.slug.length).toBeGreaterThan(0);
      expect(c.glyph.length).toBeGreaterThan(0);
      expect(['cyan', 'magenta', 'purple', 'green', 'gold']).toContain(c.accent);
    }
  });
});

describe('getLogoQuestions', () => {
  it('returns well-formed questions whose correct index is in range', async () => {
    const questions = await getLogoQuestions('tech');
    expect(questions.length).toBeGreaterThan(0);
    for (const q of questions) {
      expect(q.options).toHaveLength(4);
      expect(q.correctOption).toBeGreaterThanOrEqual(0);
      expect(q.correctOption).toBeLessThan(q.options.length);
      // The correct option text must be the brand itself.
      expect(q.options[q.correctOption]).toBe(q.brand);
    }
  });

  it('returns an empty array for an unknown category', async () => {
    expect(await getLogoQuestions('does-not-exist')).toEqual([]);
  });
});

describe('findLogoCategory', () => {
  it('resolves a known slug and returns undefined otherwise', () => {
    expect(findLogoCategory('auto')?.slug).toBe('auto');
    expect(findLogoCategory('nope')).toBeUndefined();
  });
});

describe('getMockCoinBalance', () => {
  it('returns a non-negative stub balance', () => {
    expect(getMockCoinBalance()).toBeGreaterThanOrEqual(0);
  });
});
