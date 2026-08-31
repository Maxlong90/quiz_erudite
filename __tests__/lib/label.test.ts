import { Dimensions } from 'react-native';

import { fitTitleFontSize, wrapLabel } from '@/lib/flags-quiz/label';

// The helper sizes the title against the on-screen text width, which is the
// window width minus the country style's 24px horizontal padding on each side.
// Under the Jest environment Dimensions reports a fixed 750px window, so the
// available text width is 702px and fitTitleFontSize computes
// floor(702 / (longestLineChars * 0.72)) clamped to the [22, 41] band. The
// concrete numbers below are pinned to that width; the band + monotonicity
// assertions hold for ANY width.
const WINDOW_W = Dimensions.get('window').width; // 750 under jest
const TEXT_W = WINDOW_W - 24 * 2;
const CHAR_ADV = 0.72;
const FONT_MAX = 41;
const FONT_MIN = 22;

// The longest single-line length at which the font is still pinned to the max,
// and the shortest at which it bottoms out at the min — derived from the same
// formula so the "shrinks" / "floors" cases stay correct if the width changes.
const fitsAtMax = (chars: number) => Math.floor(TEXT_W / (chars * CHAR_ADV)) >= FONT_MAX;
const flooredToMin = (chars: number) => Math.floor(TEXT_W / (chars * CHAR_ADV)) <= FONT_MIN;

describe('fitTitleFontSize', () => {
  it('returns the 41 max for a short single-word line', () => {
    expect(fitsAtMax(4)).toBe(true); // sanity: "Куба" fits comfortably at the max
    expect(fitTitleFontSize(['Куба'])).toBe(FONT_MAX);
  });

  it('returns the max for an empty line (no text to measure)', () => {
    expect(fitTitleFontSize([''])).toBe(FONT_MAX);
    expect(fitTitleFontSize([])).toBe(FONT_MAX);
  });

  it('shrinks below the max once the longest line no longer fits at 41', () => {
    // A single 30-char word cannot fit at the 41 max on this width, so the
    // helper sizes it DOWN — but never past the readable minimum.
    const longWord = 'ы'.repeat(30);
    expect(fitsAtMax(30)).toBe(false);
    const size = fitTitleFontSize([longWord]);
    expect(size).toBeLessThan(FONT_MAX);
    expect(size).toBeGreaterThanOrEqual(FONT_MIN);
    expect(size).toBe(Math.floor(TEXT_W / (30 * CHAR_ADV))); // 32 at width 750
  });

  it('never returns below the 22 min even for an extremely long single word', () => {
    const hugeWord = 'a'.repeat(60);
    expect(flooredToMin(60)).toBe(true);
    expect(fitTitleFontSize([hugeWord])).toBe(FONT_MIN);
  });

  it('is monotonic non-increasing as the longest line grows', () => {
    const sizes = [10, 20, 30, 40, 60].map((n) => fitTitleFontSize(['x'.repeat(n)]));
    for (let i = 1; i < sizes.length; i++) {
      expect(sizes[i]).toBeLessThanOrEqual(sizes[i - 1]);
    }
  });

  it('is driven by the LONGEST line in a multi-line title', () => {
    const long = 'x'.repeat(40);
    // Adding a shorter second line must not change the fitted size — only the
    // longest line dictates it.
    expect(fitTitleFontSize([long, 'short'])).toBe(fitTitleFontSize([long]));
    expect(fitTitleFontSize(['short', long])).toBe(fitTitleFontSize([long]));
  });

  it('always stays within the [22, 41] band for any line length', () => {
    for (let n = 1; n <= 80; n++) {
      const size = fitTitleFontSize(['q'.repeat(n)]);
      expect(size).toBeGreaterThanOrEqual(FONT_MIN);
      expect(size).toBeLessThanOrEqual(FONT_MAX);
    }
  });
});

describe('wrapLabel', () => {
  it('splits a two-word name at the space into two whole-word lines', () => {
    expect(wrapLabel('Доминиканская Республика')).toBe('Доминиканская\nРеспублика');
    expect(wrapLabel('Экваториальная Гвинея')).toBe('Экваториальная\nГвинея');
  });

  it('keeps a single-word name on one line (no newline)', () => {
    expect(wrapLabel('Куба')).toBe('Куба');
    expect(wrapLabel('Куба').split('\n')).toHaveLength(1);
  });

  it('balances a three-word name across at most two lines, each keeping whole words', () => {
    const wrapped = wrapLabel('Соединённые Штаты Америки');
    expect(wrapped.split('\n').length).toBeLessThanOrEqual(2);
    // Every line keeps at least one whole word.
    for (const line of wrapped.split('\n')) {
      expect(line.trim().length).toBeGreaterThan(0);
    }
  });

  it('never breaks a word mid-letter — the wrapped words equal the originals in order', () => {
    for (const name of [
      'Доминиканская Республика',
      'Экваториальная Гвинея',
      'Соединённые Штаты Америки',
      'Куба',
      'Сан-Томе и Принсипи',
    ]) {
      const original = name.trim().split(/\s+/);
      const wrappedWords = wrapLabel(name).split(/\s+/);
      // Only whitespace (spaces / the injected newline) separates words, and no
      // word is ever split across letters, so the token sequence is unchanged.
      expect(wrappedWords).toEqual(original);
    }
  });
});
