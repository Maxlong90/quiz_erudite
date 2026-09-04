import { useMemo } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';

/**
 * Answer-button label that ALWAYS fits its fixed-size button without ever splitting
 * a word.
 *
 * `adjustsFontSizeToFit` cannot be trusted here: on Android it shrinks the text to
 * fit the HEIGHT but still breaks a long word across lines when that word is wider
 * than the button (which is how "Дисквалификация" ended up as "Дисквалификаци/я"),
 * and it leaves the result visually off-centre. So we pick the size ourselves.
 *
 * The ladder is explicit: try 90% of the base size, then 85%, 80%, 75%, … down to 40%, and take
 * the FIRST size where both hold:
 *   1. the longest single WORD fits on one line (⇒ no mid-word break is possible), and
 *   2. the greedily wrapped text fits the available height.
 * The button itself never changes size — only the font does.
 */

/**
 * Font-size ladder, as a fraction of the base size: 90% → 85% → 80% → … → 40%.
 * The 5% step keeps each drop small, so a label only shrinks as much as it must.
 */
const SCALES = [0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6, 0.55, 0.5, 0.45, 0.4] as const;

/**
 * Average glyph advance as a fraction of the font size for the bold UI font. Chosen
 * on the generous side: over-estimating widths makes us step DOWN a size early,
 * which is safe (text still fits), while under-estimating would allow a break.
 */
const CHAR_ADVANCE = 0.62;
/** Line box height as a fraction of the font size. */
const LINE_HEIGHT_RATIO = 1.25;

const wordWidth = (word: string, fontSize: number) => word.length * fontSize * CHAR_ADVANCE;

/** Greedy word wrap; returns how many lines the text needs at `fontSize`. */
function lineCount(words: string[], fontSize: number, maxWidth: number): number {
  let lines = 1;
  let current = 0;
  const space = fontSize * CHAR_ADVANCE;
  for (const word of words) {
    const w = wordWidth(word, fontSize);
    if (current === 0) {
      current = w;
      continue;
    }
    if (current + space + w <= maxWidth) {
      current += space + w;
    } else {
      lines += 1;
      current = w;
    }
  }
  return lines;
}

/**
 * The largest size from the ladder at which `text` fits `maxWidth` × `maxHeight`
 * with whole words only. Falls back to the smallest rung when nothing fits.
 */
export function fitFontSize(text: string, baseSize: number, maxWidth: number, maxHeight: number): number {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return baseSize * SCALES[0];
  const longest = words.reduce((a, b) => (a.length >= b.length ? a : b));

  for (const scale of SCALES) {
    const size = baseSize * scale;
    // 1. The longest word must fit on one line, or Android would break it mid-word.
    //    A 5% margin absorbs any error in the width estimate — a word that only
    //    "just" fits drops to the next size rather than risking a split.
    if (wordWidth(longest, size) * 1.05 > maxWidth) continue;
    // 2. The wrapped text must fit the button's inner height.
    if (lineCount(words, size, maxWidth) * size * LINE_HEIGHT_RATIO > maxHeight) continue;
    return size;
  }
  return baseSize * SCALES[SCALES.length - 1];
}

export function FitAnswerText({
  text,
  style,
  baseSize,
  maxWidth,
  maxHeight,
}: {
  text: string;
  style?: StyleProp<TextStyle>;
  /** 100% font size; the ladder starts one rung below it (90%). */
  baseSize: number;
  /** Inner width of the button (its width minus horizontal padding + borders). */
  maxWidth: number;
  /** Inner height of the button (its height minus vertical padding + borders). */
  maxHeight: number;
}) {
  const fontSize = useMemo(
    () => fitFontSize(text, baseSize, maxWidth, maxHeight),
    [text, baseSize, maxWidth, maxHeight],
  );
  return (
    <Text
      style={[style, { fontSize, lineHeight: fontSize * LINE_HEIGHT_RATIO }]}
      // No adjustsFontSizeToFit: the size is already correct, and letting RN
      // re-scale would undo the whole-word guarantee.
      textBreakStrategy="simple"
      android_hyphenationFrequency="none"
    >
      {text}
    </Text>
  );
}
