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
