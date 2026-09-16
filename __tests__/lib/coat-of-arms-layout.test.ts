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
import {
  coatContinentMetrics,
  coatQuizMetrics,
  fitPromptFontSize,
  PROMPT_FONT_MIN,
} from '@/lib/coat-of-arms/layout';

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

describe('fitPromptFontSize — the two-line question fit', () => {
  // The shipped RU prompt: the exact string that used to clip to «Какой стране …».
  const RU_PROMPT = 'Какой стране принадлежит этот герб?';
  // The bound the metric caps the prompt at (26pt on a phone, larger on tall iPads).
  const MAX = 26;
  // What styles.prompt leaves the text on a phone: contentWidth minus 24pt padding
  // each side. 320px → 272, 360px → 312, 430px → 382.
  const NARROW_W = 320 - 48; // 272

  it('returns maxFont when there is nothing to fit (empty text or non-positive width)', () => {
    expect(fitPromptFontSize('', 300, MAX)).toBe(MAX);
    expect(fitPromptFontSize('   ', 300, MAX)).toBe(MAX);
    expect(fitPromptFontSize(RU_PROMPT, 0, MAX)).toBe(MAX);
    expect(fitPromptFontSize(RU_PROMPT, -10, MAX)).toBe(MAX);
  });

  it('shrinks the RU prompt below maxFont on a narrow column, but never below the floor', () => {
    const f = fitPromptFontSize(RU_PROMPT, NARROW_W, MAX);
    expect(f).toBeLessThan(MAX);
    expect(f).toBeGreaterThanOrEqual(PROMPT_FONT_MIN);
    expect(Number.isInteger(f)).toBe(true);
  });

  it('keeps the RU prompt at full maxFont when the column is wide enough', () => {
    // 472 = the 520pt content column minus 24pt padding each side — a wide window.
    expect(fitPromptFontSize(RU_PROMPT, 472, MAX)).toBe(MAX);
  });

  it('gives a Latin string a larger font than an equal-length Cyrillic one (narrower glyphs)', () => {
    // Same character count, only the script differs; the cap is out of the way so
    // the per-script advance is what decides.
    const cyrillic = 'аб аб аб аб аб аб аб аб аб аб аб аб аб'; // 38 chars
    const latin = 'ab ab ab ab ab ab ab ab ab ab ab ab ab'; // 38 chars
    expect(latin.length).toBe(cyrillic.length);
    const fLatin = fitPromptFontSize(latin, 300, 60);
    const fCyr = fitPromptFontSize(cyrillic, 300, 60);
    expect(fLatin).toBeGreaterThan(fCyr);
  });

  it('never returns below PROMPT_FONT_MIN even for a very long string in a tiny column', () => {
    const long = 'a '.repeat(100).trim(); // 199 chars of short words
    expect(fitPromptFontSize(long, 200, MAX)).toBe(PROMPT_FONT_MIN);
  });

  it('shrinks harder when one very long word must fit a single line (byWord constraint)', () => {
    // Same total length; the single 20-char word forces a smaller font than the
    // short-word version, because a word can never wrap onto a second line.
    const shortWords = 'ab ab ab ab ab ab ab'; // 20 chars, longest word 2
    const oneLongWord = 'a'.repeat(20); // 20 chars, longest word 20
    expect(oneLongWord.length).toBe(shortWords.length);
    const fShort = fitPromptFontSize(shortWords, 200, 40);
    const fLong = fitPromptFontSize(oneLongWord, 200, 40);
    expect(fLong).toBeLessThan(fShort);
    expect(fLong).toBeGreaterThanOrEqual(PROMPT_FONT_MIN);
  });

  it('fits fully within the two-line height the metric reserves at every phone width', () => {
    // At each phone width the prompt takes styles.prompt padding (24 each side);
    // the fit must land in [PROMPT_FONT_MIN, promptFont] and be an integer so the
    // rendered height never exceeds the two-line reserve that feeds coatSize.
    for (const width of [320, 360, 393, 430]) {
      const m = coatQuizMetrics(width, 852, NO_INSETS);
      const f = fitPromptFontSize(RU_PROMPT, m.contentWidth - 48, m.promptFont);
      expect(f).toBeGreaterThanOrEqual(PROMPT_FONT_MIN);
      expect(f).toBeLessThanOrEqual(m.promptFont);
      expect(Number.isInteger(f)).toBe(true);
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
