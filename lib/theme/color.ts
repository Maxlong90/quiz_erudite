/**
 * Hex-colour arithmetic for the theme layer — the only place on the client that
 * parses or rewrites a CSS hex string.
 *
 * This is the client mirror of the backend's app/Support/ColorMath.php, and it
 * mirrors that file's most important property: everything here is TOTAL. An
 * input this module does not understand (a CSS function like
 * `rgba(0,0,0,0.55)`, an empty string, a named colour) is handed back
 * UNCHANGED rather than rejected or nulled. Since Э1 the whole bundled palette
 * is hex — `scrim` was normalised from its `rgba()` literal to the 8-digit form
 * the wire serves — but totals keep the property alive for any value that slips
 * past the parser. These strings go straight into React Native style props,
 * where an unparseable colour THROWS IN NATIVE CODE on Android ("Unable to
 * parse color"). A theme helper that can hard-crash the app it themes is not
 * fail-open. Callers that need to branch on shape ask `isHexColor` first.
 *
 * Nothing here throws and nothing here logs.
 */

/**
 * #rgb | #rgba | #rrggbb | #rrggbbaa — the same four forms
 * lib/theme/contract.ts accepts off the wire. Anchored, so a longer string
 * containing a hex run does not match.
 */
const HEX_COLOR = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

/**
 * True when `value` is a hex colour we can take apart. Anything else — an
 * `rgba()` literal, a blank, a named colour — is false, and every other
 * function in this module passes it through untouched.
 */
export function isHexColor(value: string): boolean {
  return HEX_COLOR.test(value.trim());
}

/**
 * Normalise a hex colour to its long, lowercase form: `#FFF` => `#ffffff`,
 * `#fff4` => `#ffffff44`. Already-long values are only lowercased.
 *
 * Non-hex input is returned trimmed but otherwise as-is.
 */
export function expandHex(value: string): string {
  const trimmed = value.trim();
  if (!isHexColor(trimmed)) {
    return trimmed;
  }

  let digits = trimmed.slice(1).toLowerCase();

  // #rgb / #rgba are shorthand: each digit is doubled.
  if (digits.length === 3 || digits.length === 4) {
    digits = digits
      .split('')
      .map((digit) => digit + digit)
      .join('');
  }

  return `#${digits}`;
}

/**
 * Return `hex` at the given opacity, REPLACING any alpha it already carries
 * rather than appending a second channel. So `withAlpha('#7c5cff33', 0.40)` is
 * `'#7c5cff66'`, not `'#7c5cff3366'` — otherwise a colour that is already a
 * tint would grow a new alpha byte on every pass.
 *
 * `alpha` is a fraction in 0..1. Non-hex input is returned unchanged.
 *
 * The byte is computed with Math.round(), NOT a truncating cast, and this is
 * load-bearing for parity with the backend: the palette's ratios land on exact
 * .5 boundaries often enough that truncation silently shifts real colours
 * (0.05 truncates to 0c where round gives 0d; 0.10 -> 19 vs 1a; 0.12 -> 1e vs
 * 1f; 0.133 -> 21 vs 22). Clamping happens AFTER rounding so an out-of-range
 * ratio saturates rather than wrapping.
 */
export function withAlpha(hex: string, alpha: number): string {
  if (!isHexColor(hex)) {
    return hex;
  }

  const base = expandHex(hex).slice(0, 7);
  const byte = Math.max(0, Math.min(255, Math.round(alpha * 255)));

  return base + byte.toString(16).padStart(2, '0');
}
