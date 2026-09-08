/**
 * Third-party sign-in brand colour for the configurable template: the Apple and
 * Google button paint, and nothing else.
 *
 * This is the SECOND (and, by intent, last) module in the `/t` surface allowed to
 * contain colour literals — __tests__/app/t-no-color-literals.test.ts exempts it
 * by name, and eslint.config.js carries the mirror of that exemption. Like
 * constants/t/tile-palette.ts it is a seam rather than a dumping ground, but it
 * is a seam of a completely different KIND, and the difference is the whole
 * reason it exists as its own file.
 *
 * WHY THESE SIX VALUES ARE NOT PALETTE TOKENS
 * -------------------------------------------
 * They are not ours to choose. Apple's Human Interface Guidelines permit
 * Sign in with Apple in black or white only, with the label ink fixed against
 * it; Google's identity guidelines fix the `G` at #4285F4 on a white button.
 * An operator preset that recoloured either one would produce a build that
 * violates a vendor guideline and can be rejected at store review — so a
 * "configurable" version of these values is not a feature we are declining to
 * build, it is a bug we are declining to ship.
 *
 * That makes them the exact inverse of every other colour under app/t/: the
 * template's palette is operator data BY CONSTRUCTION, so anything reachable
 * through hooks/t/use-template-theme.ts is by definition something an operator
 * may move. These must never move. They therefore live outside the funnel, and
 * screens reference OAUTH_BRAND directly in their stylesheets rather than
 * through the `c` parameter — the indirection would be a lie about where the
 * value comes from.
 *
 * WHY THIS SEAM WILL NEVER BE REMOTED
 * -----------------------------------
 * constants/t/tile-palette.ts is temporary: it holds literals precisely so a
 * later stage can lift them onto the wire as TYPE_COLOR tokens. This file is
 * permanent, and remoting it would BE the defect rather than the fix. If a
 * future reader finds these hexes and reaches for lib/theme/contract.ts, that
 * paragraph is the answer.
 *
 * Nor can they be withAlpha() derivations of anything in the palette, the way
 * the premium badge's gold tints in app/t/account.tsx are: they are not tints of
 * a brand colour, they are somebody else's brand colour.
 *
 * Compare app/t/paywall.tsx:31-35, which reasons about a different flavour of
 * the same problem — ink that has no token because contrast, not licensing,
 * pins it.
 *
 * The values are kept BYTE-VERBATIM from app/account.tsx:272-277 (`#000` rather
 * than `#000000`, the uppercase `F` in `#4285F4`). React Native parses the short
 * and long forms identically, so the shape is not what matters; being able to
 * answer "did the port change a colour?" by diffing character for character is.
 */

/** The providers the account screen offers. */
export type OAuthProvider = 'apple' | 'google';

export interface OAuthBrandColors {
  /** Button fill. */
  bg: string;
  /** Label ink. Legible on `bg` by the vendor's own spec, not by our palette. */
  fg: string;
  /**
   * Wordmark/glyph ink. Apple's spec makes it identical to the label ink;
   * Google's does not — the `G` is #4285F4 on white and nothing else. The field
   * is REQUIRED on both rather than optional on Apple: the shape encodes the
   * vendor spec, not the current markup (app/t/account.tsx renders an empty
   * <Text> for the Apple glyph, a pre-existing bug copied verbatim from the
   * shipped screen — an optional `mark` would freeze that bug into the type).
   */
  mark: string;
}

/**
 * `as const satisfies` rather than Object.freeze: this is deep-readonly at
 * compile time and free at runtime, whereas Object.freeze is SHALLOW — it would
 * leave OAUTH_BRAND.apple mutable and hand the reader false confidence. The
 * freeze in hooks/t/use-template-theme.ts is not a counter-example: that object
 * crosses a memo boundary into arbitrary runtime consumers, and this one does
 * not leave the stylesheets that read it.
 */
export const OAUTH_BRAND = {
  apple: { bg: '#000', fg: '#fff', mark: '#fff' },
  google: { bg: '#fff', fg: '#1a1a1a', mark: '#4285F4' },
} as const satisfies Record<OAuthProvider, OAuthBrandColors>;
