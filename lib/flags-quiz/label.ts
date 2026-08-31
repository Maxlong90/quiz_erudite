import { Dimensions } from 'react-native';

/**
 * Break a country name into at most two lines at WORD boundaries only, so a long
 * name wraps as whole words ("Экваториальная" / "Гвинея") instead of being split
 * mid-word by the auto-layout ("Экваториаль" / "ная Гвинея"). A single-word name
 * stays on one line (the caller shrinks the font to fit); a three-plus-word name
 * is balanced across two lines, keeping at least one whole word per line.
 *
 * Shared by the "All countries" answer buttons and the share-card composition so
 * both wrap identically.
 */
export function wrapLabel(label: string): string {
  const words = label.trim().split(/\s+/);
  if (words.length < 2) return label;
  const total = words.reduce((n, w) => n + w.length, 0);
  // Pick the split point that best balances the two lines by character count:
  // the first index at which the first line reaches half the total. Clamp so each
  // line keeps at least one whole word (a tiny middle word like "и" must not push
  // everything onto line one).
  let acc = 0;
  let split = 0;
  for (let k = 0; k < words.length; k++) {
    acc += words[k].length;
    split = k + 1;
    if (acc >= total / 2) break;
  }
  split = Math.min(Math.max(split, 1), words.length - 1);
  return `${words.slice(0, split).join(' ')}\n${words.slice(split).join(' ')}`;
}

// The "By continent" question title (the country name) lives in a full-width,
// 900-weight style with `paddingHorizontal: 24` in BOTH continent screens (Flags
// Quiz + Coat of Arms), so this is the text width the longest whole word has to
// live in. We size the font DOWN from the design max until the longest wrapped
// line fits that width — so a long name wraps only at real word boundaries (via
// wrapLabel), NEVER splitting a word across letters.
const TITLE_TEXT_W = Dimensions.get('window').width - 24 * 2;
const TITLE_FONT_MAX = 41; // the original fixed size — the cap
const TITLE_FONT_MIN = 22; // still readable on the narrowest phones
// Conservative per-character advance (fraction of font size) for the bold 900
// title font — the same idea as CHAR_ADV in flags-quiz/quiz.tsx, a little high on
// purpose so the computed size always leaves margin and never clips a whole word.
const TITLE_CHAR_ADV = 0.72;

/**
 * Largest font size (within the min/max band) at which the LONGEST of these lines
 * still fits the title's available text width on one line — so whole words never
 * wrap mid-word. Feed it the lines produced by wrapLabel(title).split('\n').
 */
export function fitTitleFontSize(lines: string[]): number {
  const longest = lines.reduce((m, l) => Math.max(m, l.length), 0);
  if (longest === 0) return TITLE_FONT_MAX;
  const fit = Math.floor(TITLE_TEXT_W / (longest * TITLE_CHAR_ADV));
  return Math.max(TITLE_FONT_MIN, Math.min(TITLE_FONT_MAX, fit));
}
