/**
 * The acceptance test for the two Coat of Arms gameplay-metric functions.
 *
 * Two contracts live here, and they pull in opposite directions:
 *
 *  1. TALL-PHONE IDENTITY. On a real iPhone (393x852, 430x932, ...) the metrics
 *     must still be the exact literals that shipped: coat 190 / option 68 /
 *     prompt 26 / gap 68, and the 140pt continent cell. This is the "iPhone is
 *     visually unchanged" promise, machine-checked.
 *
 *  2. HEIGHT FIT. On a SHORT or NARROW window (an iPhone-only binary running in a
 *     resized iPad window, reproduced at 360x610) the answer grid is the anchor:
 *     it stays fully visible with no page scroll, and the coat gives up height to
 *     it. So there the coat MUST shrink below 190 (but never below COAT_MIN), and
 *     the continent cell MUST shrink below its width-packing value.
 *
 * The signature now takes safe-area insets; the pure tests pass explicit insets.
 */
import { coatContinentMetrics, coatQuizMetrics } from '@/lib/coat-of-arms/layout';

const NO_INSETS = { top: 0, bottom: 0 };
const NOTCH_INSETS = { top: 47, bottom: 34 };

const PHONE_WIDTHS = [320, 360, 375, 390, 393, 402, 414, 428, 430, 440];
// Only TALL phone heights: these leave ample free height, so the height cap never
// binds and the shipped constants must survive. Short heights (568, 610, ...) are
// the windows the fit is ALLOWED to change and are covered separately below.
const TALL_HEIGHTS = [812, 844, 852, 874, 896, 926, 932, 956];
const TALL_PHONES = PHONE_WIDTHS.flatMap((w) => TALL_HEIGHTS.map((h) => [w, h]));

// Frame chrome around the coat plate: imageFrame borderWidth 3 + padding 10, both
// sides. Mirrors the constant inside layout.ts.
const FRAME_CHROME = (3 + 10) * 2;
const COAT_MIN = 110;

describe('coatQuizMetrics — tall phones keep the shipped constants', () => {
  it.each(TALL_PHONES)('%i x %i keeps COAT_SIZE 190 / OPTION_H 68 / prompt 26 (no insets)', (width, height) => {
    const m = coatQuizMetrics(width, height, NO_INSETS);

    expect(m.coatSize).toBe(190);
    expect(m.optionH).toBe(68);
    expect(m.promptFont).toBe(26);
    expect(m.gapHeight).toBe(68);
    expect(m.optionTextW).toBeCloseTo(0.48 * (width - 40) - 24, 10);
  });

  it.each(TALL_PHONES)('%i x %i still keeps coat 190 under realistic notch insets', (width, height) => {
    // A notch eats ~81pt of height, but a tall phone still has room to spare, so
    // the coat must not shrink there either.
    const m = coatQuizMetrics(width, height, NOTCH_INSETS);
    expect(m.coatSize).toBe(190);
    expect(m.optionH).toBe(68);
  });
});

describe('coatContinentMetrics — tall phones keep the shipped packing', () => {
  it.each(TALL_PHONES)('%i x %i keeps the original OPT_W packing', (width, height) => {
    const m = coatContinentMetrics(width, height, NO_INSETS);

    expect(m.optW).toBe(Math.floor((width - 40 - 64 - 8) / 2));
    expect(m.titleTextW).toBe(width - 48);
    expect(m.gapHeight).toBe(40);
  });

  it('still yields the 140pt cell that shipped on a 393pt phone', () => {
    expect(coatContinentMetrics(393, 852, NO_INSETS).optW).toBe(140);
    // ...and under a realistic notch, too — a tall phone still has the height.
    expect(coatContinentMetrics(393, 852, NOTCH_INSETS).optW).toBe(140);
  });
});

describe('coatQuizMetrics — height fit on short/narrow windows', () => {
  // The whole coat block + gap + grid stack, reconstructed from the SAME reserve
  // the metric uses. If this is <= height, the answer grid is fully on screen.
  const PROMPT_RESERVE = 96;
  function stackHeight(w: number, h: number) {
    const m = coatQuizMetrics(w, h, NO_INSETS);
    const gridH = 2 * m.optionH + 14;
    const fixedReserve = 64 + 16 + 48 + PROMPT_RESERVE + gridH + 16 + FRAME_CHROME;
    return fixedReserve + m.coatSize + m.gapHeight;
  }

  it('shrinks the coat below 190 on the 360x610 window that used to clip', () => {
    const m = coatQuizMetrics(360, 610, NO_INSETS);

    // The coat gave up height to the grid, but is still recognisable.
    expect(m.coatSize).toBeLessThan(190);
    expect(m.coatSize).toBeGreaterThanOrEqual(COAT_MIN);
    // The buttons are the anchor — they do NOT shrink on a compact window.
    expect(m.optionH).toBe(68);
    // And the whole stack fits the window.
    expect(stackHeight(360, 610)).toBeLessThanOrEqual(610);
  });

  it('fits the whole stack on the 320x568 window (the grid no longer clips)', () => {
    // 320x568 was the tightest required size and used to clip the bottom row.
    const m = coatQuizMetrics(320, 568, NO_INSETS);
    expect(m.coatSize).toBeGreaterThanOrEqual(COAT_MIN);
    // The gap gave its slack to keep the grid on screen.
    expect(m.gapHeight).toBeLessThan(68);
    expect(stackHeight(320, 568)).toBeLessThanOrEqual(568);
  });

  it('never shrinks the coat below COAT_MIN on an extreme short window', () => {
    expect(coatQuizMetrics(360, 400, NO_INSETS).coatSize).toBe(COAT_MIN);
  });

  it('shrinks the coat on a short, wide window instead of overflowing', () => {
    expect(coatQuizMetrics(1024, 568, NO_INSETS).coatSize).toBeLessThan(190);
  });
});

describe('coatContinentMetrics — height fit on short/narrow windows', () => {
  it('shrinks the cell below its width-packing value on a short window', () => {
    const widthPack = Math.floor((393 - 40 - 64 - 8) / 2);
    const m = coatContinentMetrics(393, 560, NO_INSETS);

    expect(m.optW).toBeLessThan(widthPack);
    expect(m.optW).toBeGreaterThanOrEqual(96);
  });

  it('keeps two cells fitting one row even when the height cap binds', () => {
    // The height cap only ever LOWERS optW, so two cells must always still fit —
    // the grid can never collapse to a single column.
    for (const [width, height] of [[360, 560], [393, 560], [500, 680], [820, 568]]) {
      const m = coatContinentMetrics(width, height, NO_INSETS);
      const rowWidth = (m.optW + 32) * 2 + 20 * 2 + 8;
      expect(rowWidth).toBeLessThanOrEqual(m.contentWidth);
    }
  });
});

describe('coatQuizMetrics — adaptive branch (roomy windows)', () => {
  it('grows the coat on a tall iPad window without exceeding the column', () => {
    const m = coatQuizMetrics(820, 1180, NO_INSETS);

    expect(m.coatSize).toBeGreaterThan(190);
    expect(m.coatSize + FRAME_CHROME).toBeLessThanOrEqual(m.contentWidth);
  });

  it('never grows the coat past its readability cap', () => {
    expect(coatQuizMetrics(2048, 2732, NO_INSETS).coatSize).toBeLessThanOrEqual(320);
  });

  it('sizes answer text from the capped column, not the raw window width', () => {
    expect(coatQuizMetrics(1024, 1180, NO_INSETS).optionTextW).toBe(
      coatQuizMetrics(820, 1180, NO_INSETS).optionTextW,
    );
  });

  it('returns integers, so expo-image is not re-rasterised on sub-pixel drift', () => {
    for (const [width, height] of [[700, 900], [820, 1180], [1024, 768], [1366, 1024]]) {
      const m = coatQuizMetrics(width, height, NO_INSETS);
      expect(Number.isInteger(m.coatSize)).toBe(true);
      expect(Number.isInteger(m.optionH)).toBe(true);
      expect(Number.isInteger(m.promptFont)).toBe(true);
    }
  });
});

describe('coatContinentMetrics — adaptive branch (roomy windows)', () => {
  it('keeps two coat options per row at every roomy window size', () => {
    for (const [width, height] of [[600, 800], [820, 1180], [1024, 768], [1366, 1024], [2048, 2732]]) {
      const m = coatContinentMetrics(width, height, NO_INSETS);
      const rowWidth = (m.optW + 32) * 2 + 20 * 2 + 8;
      expect(rowWidth).toBeLessThanOrEqual(m.contentWidth);
    }
  });

  it('grows the coat cell on a tall iPad window but caps it with the column', () => {
    const m = coatContinentMetrics(820, 1180, NO_INSETS);
    expect(m.optW).toBe(Math.floor((520 - 40 - 64 - 8) / 2));
    expect(m.optW).toBeGreaterThan(140);
  });

  it('returns integer cell sizes', () => {
    for (const [width, height] of [[600, 800], [820, 1180], [1024, 768]]) {
      expect(Number.isInteger(coatContinentMetrics(width, height, NO_INSETS).optW)).toBe(true);
    }
  });
});
