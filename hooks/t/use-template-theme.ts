import type { EruditePalette } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';

/**
 * The single colour funnel for the configurable template.
 *
 * Every screen under app/t/ reads its palette through here rather than through
 * useThemeColors() directly. That is enforced by
 * __tests__/app/t-no-color-literals.test.ts, which asserts no file under app/t/
 * imports '@/hooks/use-theme-colors' — so "where does the template get its
 * colours" is a one-file fact rather than a grep.
 *
 * What this adds is a SUPERSET: all thirty EruditePalette tokens unchanged, plus
 * the handful of derived roles the ported screens need and the bundled palette
 * has no name for. It never rewrites a token, so an operator preset still lands
 * on the screen exactly as the backend authored it.
 *
 * WHY A SUPERSET RATHER THAN NEW PALETTE TOKENS
 * --------------------------------------------
 * constants/theme.ts and hooks/use-theme-colors.ts serve the live Erudite build
 * and five sibling apps. Adding a token there to satisfy one template screen
 * would push a template concern into every shipped app; wrapping costs nothing
 * and keeps the blast radius at app/t/. When task Э1 widens REMOTE_TOKEN_KEYS
 * these derived roles become real operator-settable tokens and this file
 * shrinks — the call sites do not move.
 *
 * WHAT EARNS A NAME HERE
 * ----------------------
 * A derived role earns a name in this hook only if TWO OR MORE screens use it.
 * The tier scale below qualifies (the results screen and the stats screen share
 * it). A tint used by exactly one screen — say the nine "on the purple panel"
 * shades of the paywall — stays an inline withAlpha(...) in that screen's own
 * makeStyles. Without that rule this file becomes the dumping ground the
 * literals guard was written to prevent.
 *
 * REFERENCE IDENTITY IS LOAD-BEARING
 * ----------------------------------
 * Roughly sixty-nine call sites across the app are shaped
 * `useMemo(() => makeStyles(colors), [colors])`. A hook returning a freshly
 * spread object on every render would invalidate every one of those memos and
 * rebuild every stylesheet in the template on every render — a diffuse
 * flicker/perf regression that no visual diff would catch. lib/theme/resolve.ts
 * makes the same promise for the palette itself and documents it at length; this
 * file inherits it. See deriveTemplateTheme below for the mechanism.
 */

export interface TemplateTheme extends EruditePalette {
  /** Top band of the shared score/accuracy scale — the bundled `success` green. */
  tierHigh: string;
  /** Middle band. The brand accent, NOT an amber; see the note below. */
  tierMid: string;
  /** Bottom band — the bundled `danger` red. */
  tierLow: string;
}

/**
 * INTENTIONAL PIXEL CHANGE: the middle tier is the accent, not an amber.
 *
 * app/results.tsx:93-94 and app/stats.tsx:149 share a hardcoded traffic-light
 * scale — a green, an amber and a red. The outer two map onto `success` and
 * `danger` cleanly. The amber has NO equivalent anywhere in EruditePalette, and
 * none of the three ways to manufacture one is acceptable here:
 *
 *  - `gold` is illegible against the light appearance's `bgSolid`, and the
 *    results screen paints this colour on a large score number and a ring drawn
 *    DIRECTLY on the background rather than inside a card.
 *  - lib/theme/color.ts deliberately ships no lighten/darken operation — derive
 *    rules live in the backend's ColorTokenRegistry, and a second, divergent
 *    derivation engine on the client is exactly what that split forbids.
 *  - Borrowing TILE_SPECTRUM.amber from constants/t/tile-palette.ts would put an
 *    artwork hue in a text role and muddy what that seam means.
 *
 * `accent` is legible on both appearances by construction (it is the CTA colour
 * in both) and is one of the ten operator-settable REMOTE_TOKEN_KEYS, so the
 * scale repaints with the preset — which is the whole point of the template. The
 * scale degrades from traffic-light to high/brand/low: still three legible
 * steps. When Э1 widens the token set it should add a `warning` token, and this
 * one line becomes `tierMid: palette.warning`.
 */
function build(palette: EruditePalette): TemplateTheme {
  return Object.freeze({
    ...palette,
    tierHigh: palette.success,
    tierMid: palette.accent,
    tierLow: palette.danger,
  });
}

/**
 * Memo keyed on the palette OBJECT, at module level.
 *
 * A useMemo inside the hook would not do: each component instance owns its own
 * memo cell, so two components rendering under the same palette would each get a
 * different TemplateTheme and their makeStyles memos would be independent. The
 * map is what makes the identity global — every consumer of a given palette
 * receives the same object.
 *
 * Keying on the palette object is sound because useThemeColors() already returns
 * a stable reference: either EruditeColors[theme] itself, or the single resolved
 * palette the theme provider built once (lib/theme/resolve.ts returns the base
 * object untouched when the preset changes nothing).
 *
 * WeakMap rather than Map, because palettes are per-appearance and per-remote-
 * fetch objects: a preset that is superseded by a later fetch must be able to be
 * collected, and a strong map would pin every palette the app ever resolved.
 */
const DERIVED = new WeakMap<EruditePalette, TemplateTheme>();

/**
 * Pure, memoised widening of a palette into a TemplateTheme. Exported for tests
 * and for anything that already holds a palette; screens call the hook.
 */
export function deriveTemplateTheme(palette: EruditePalette): TemplateTheme {
  const cached = DERIVED.get(palette);
  if (cached !== undefined) return cached;

  const derived = build(palette);
  DERIVED.set(palette, derived);
  return derived;
}

/**
 * The template's palette. Drop-in for useThemeColors() — a TemplateTheme is an
 * EruditePalette, so a `makeStyles(c: EruditePalette)` signature keeps working
 * untouched until that screen actually needs a tier.
 *
 * No hook state and no useMemo of its own: the WeakMap above already guarantees
 * a stable reference, and useThemeColors() is the only hook involved.
 */
export function useTemplateTheme(): TemplateTheme {
  return deriveTemplateTheme(useThemeColors());
}
