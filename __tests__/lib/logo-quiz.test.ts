import {
  POINTS_PER_QUESTION,
  canAccessAiTopicInput,
  categoryNameKey,
  computePoints,
  isCategoryLocked,
  optionLetter,
} from '@/lib/logo-quiz';
import type { LogoCategory } from '@/lib/logo-quiz-content';

function category(overrides: Partial<LogoCategory> = {}): LogoCategory {
  return {
    slug: 'x',
    name: 'X',
    accent: 'cyan',
    logoCount: 10,
    premium: false,
    glyph: '⭐',
    ...overrides,
  };
}

describe('computePoints', () => {
  it('multiplies correct answers by the per-question value', () => {
    expect(computePoints(0)).toBe(0);
    expect(computePoints(1)).toBe(POINTS_PER_QUESTION);
    expect(computePoints(8)).toBe(320);
  });

  it('floors fractional input and clamps negatives to zero', () => {
    expect(computePoints(3.7)).toBe(3 * POINTS_PER_QUESTION);
    expect(computePoints(-5)).toBe(0);
    expect(computePoints(Number.NaN)).toBe(0);
  });
});

describe('canAccessAiTopicInput', () => {
  it('grants access only when premium is confirmed true', () => {
    expect(canAccessAiTopicInput(true)).toBe(true);
  });

  it('denies access while loading (null) or non-premium', () => {
    expect(canAccessAiTopicInput(false)).toBe(false);
    expect(canAccessAiTopicInput(null)).toBe(false);
  });
});

describe('isCategoryLocked', () => {
  it('locks premium categories unless premium is confirmed', () => {
    const premium = category({ premium: true });
    expect(isCategoryLocked(premium, true)).toBe(false);
    expect(isCategoryLocked(premium, false)).toBe(true);
    expect(isCategoryLocked(premium, null)).toBe(true);
  });

  it('never locks a free category', () => {
    const free = category({ premium: false });
    expect(isCategoryLocked(free, false)).toBe(false);
    expect(isCategoryLocked(free, null)).toBe(false);
    expect(isCategoryLocked(free, true)).toBe(false);
  });
});

describe('optionLetter', () => {
  it('maps indices to A/B/C/D and beyond', () => {
    expect(optionLetter(0)).toBe('A');
    expect(optionLetter(1)).toBe('B');
    expect(optionLetter(3)).toBe('D');
    expect(optionLetter(6)).toBe('G');
  });
});

describe('categoryNameKey', () => {
  it('builds the namespaced i18n key for a slug', () => {
    expect(categoryNameKey('tech')).toBe('logoQuiz.category.tech');
  });
});
