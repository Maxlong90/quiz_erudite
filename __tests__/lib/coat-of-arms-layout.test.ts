/**
 * The acceptance test for "Coat of Arms gameplay is unchanged on phones".
 *
 * The adaptive-layout work replaced a set of module-level constants — frozen at
 * import from `Dimensions.get('window')` — with functions of the LIVE window size.
 * That is the fix for the iPad Guideline 4 reject, but it is also the moment a
 * phone layout could drift by a point or two without anyone noticing.
 *
 * So this pins the shipped numbers directly: across every real iPhone size, the
 * metrics functions must return the exact literals that were hard-coded before.
 * No renderer, no snapshots — just the arithmetic, which is the thing that changed.
 */
import { coatContinentMetrics, coatQuizMetrics } from '@/lib/coat-of-arms/layout';

const PHONE_WIDTHS = [320, 360, 375, 390, 393, 402, 414, 428, 430, 440];
const PHONE_HEIGHTS = [568, 667, 736, 812, 844, 852, 874, 896, 926, 932, 956];
const PHONE_SIZES = PHONE_WIDTHS.flatMap((w) => PHONE_HEIGHTS.map((h) => [w, h]));

describe('coatQuizMetrics — phone values are the shipped constants', () => {
  it.each(PHONE_SIZES)('%i x %i keeps COAT_SIZE 190 / OPTION_H 68 / prompt 26', (width, height) => {
    const m = coatQuizMetrics(width, height);

    expect(m.coatSize).toBe(190);
    expect(m.optionH).toBe(68);
    expect(m.promptFont).toBe(26);
    // The gap that used to be `styles.options.marginTop: OPTION_H * 1.0`.
    expect(m.gapHeight).toBe(68);
    // The original OPTION_TEXT_W formula, now fed the live content width.
    expect(m.optionTextW).toBeCloseTo(0.48 * (width - 40) - 24, 10);
  });
});

describe('coatContinentMetrics — phone values are the shipped constants', () => {
  it.each(PHONE_SIZES)('%i x %i keeps the original OPT_W packing', (width, height) => {
    const m = coatContinentMetrics(width, height);

    expect(m.optW).toBe(Math.floor((width - 40 - 64 - 8) / 2));
    expect(m.titleTextW).toBe(width - 48);
    expect(m.gapHeight).toBe(40);
  });

  it('still yields the 140pt cell that shipped on a 393pt phone', () => {
    expect(coatContinentMetrics(393, 852).optW).toBe(140);
  });
});

describe('coatQuizMetrics — adaptive branch', () => {
  it('grows the coat on a tall iPad window without exceeding the column', () => {
    const m = coatQuizMetrics(820, 1180);

    expect(m.coatSize).toBeGreaterThan(190);
    // The plate plus its frame chrome must still fit the 520pt content column.
    expect(m.coatSize + (3 + 10) * 2).toBeLessThanOrEqual(m.contentWidth);
  });

  it('never grows the coat past its readability cap', () => {
    expect(coatQuizMetrics(2048, 2732).coatSize).toBeLessThanOrEqual(320);
  });

  it('shrinks the coat on a short, wide window instead of overflowing', () => {
    expect(coatQuizMetrics(1024, 568).coatSize).toBeLessThan(190);
  });

  it('sizes answer text from the capped column, not the raw window width', () => {
    // Without the cap a 1024pt window would fit labels for a 470pt-wide button
    // that does not exist — the button is inside a 520pt column.
    expect(coatQuizMetrics(1024, 1180).optionTextW).toBe(coatQuizMetrics(820, 1180).optionTextW);
  });

  it('returns integers, so expo-image is not re-rasterised on sub-pixel drift', () => {
    for (const [width, height] of [[700, 900], [820, 1180], [1024, 768], [1366, 1024]]) {
      const m = coatQuizMetrics(width, height);
      expect(Number.isInteger(m.coatSize)).toBe(true);
      expect(Number.isInteger(m.optionH)).toBe(true);
      expect(Number.isInteger(m.promptFont)).toBe(true);
    }
  });
});

describe('coatContinentMetrics — adaptive branch', () => {
  it('keeps two coat options per row at every window size', () => {
    // The bug this guards: applying `scale` to optW overflows the row and Yoga
    // silently collapses the 2x2 grid into a single column.
    for (const [width, height] of [[600, 800], [820, 1180], [1024, 768], [1366, 1024], [2048, 2732]]) {
      const m = coatContinentMetrics(width, height);
      // Two cells, each wearing 32pt of ring/border/plate chrome, plus the grid's
      // 20pt side padding and the 8pt gutter between the columns.
      const rowWidth = (m.optW + 32) * 2 + 20 * 2 + 8;
      expect(rowWidth).toBeLessThanOrEqual(m.contentWidth);
    }
  });

  it('grows the coat cell on an iPad window but caps it with the column', () => {
    const m = coatContinentMetrics(820, 1180);
    expect(m.optW).toBe(Math.floor((520 - 40 - 64 - 8) / 2));
    expect(m.optW).toBeGreaterThan(140);
  });

  it('does not let window height change the grid packing', () => {
    // optW is horizontal packing only — height must not enter it.
    expect(coatContinentMetrics(820, 1180).optW).toBe(coatContinentMetrics(820, 568).optW);
  });
});
