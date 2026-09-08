/**
 * The configurable template's tile artwork: a named brand spectrum, the ramps
 * built from it, and the mode/category assignments that pick a ramp.
 *
 * THIS IS THE ONLY MODULE IN THE `/t` SURFACE ALLOWED TO CONTAIN COLOUR
 * LITERALS (__tests__/app/t-no-color-literals.test.ts enforces that), because it
 * is the seam the later stages replace. Screens never see a hex — they ask for a
 * ramp by key through hooks/t/use-tile-gradients.ts.
 *
 * WHY A SPECTRUM RATHER THAN A FLAT LIST OF GRADIENTS
 * ---------------------------------------------------
 * The 17 gradients the Erudite home renders are not 17 designs: they are 10
 * distinct pairs drawn from 15 distinct hues, and 7 of the 17 are exact
 * duplicates ("today and general-knowledge are both the golden one"). Today that
 * agreement is a coincidence two files could drift apart on; naming the ramps
 * makes it a fact the type system holds.
 *
 * It is also the cheap shape to remote later: 15 flat TYPE_COLOR tokens and zero
 * new machinery on either side of the wire. A flat 17-gradient map would instead
 * need a 2-stop gradient type in lib/theme/contract.ts (GRADIENT_STOPS is
 * hardcoded to 3) and a matching TYPE_GRADIENT2 in the backend registry.
 *
 * WHY THE SPECTRUM IS NOT DERIVED FROM `accent`
 * ---------------------------------------------
 * Rotating one seed hue was considered and rejected on evidence:
 *
 *  - CONTRAST. Tile labels are `onAccent` (white in both appearances, and NOT
 *    one of REMOTE_TOKEN_KEYS, so no operator can fix it). `sun` on white is
 *    already ~1.44:1; deriving would put all 17 tiles in that band at once for a
 *    pale accent, and the fix would mean widening the wire — exactly the backend
 *    work derivation was supposed to avoid.
 *  - DISCRIMINABILITY. A two-column emoji grid uses hue as its primary index.
 *    Rotations of a single seed make seven categories read as seven shades of
 *    the same thing.
 *  - RECORDED INTENT. docs/architecture.md: `onAccent` stays white in both
 *    themes precisely because it sits on coloured tiles that keep their brand
 *    colours regardless of appearance.
 *  - ARCHITECTURE. lib/theme/contract.ts draws the line that everything the
 *    backend does with tokens — derive rules included — stays behind the
 *    endpoint. A client-side HSL rotation is a second, divergent derivation
 *    engine on the wrong side of that line, and the operator could not preview
 *    it. If hue derivation is ever wanted it belongs in the backend's
 *    ColorTokenRegistry as a declarative OP_HUE beside OP_ALPHA/OP_LIGHT.
 *
 * The hue names below (`sun`, `ember`, `orchid`) are a conscious exception to
 * the "name tokens by role, not by colour" rule that governs EruditePalette: a
 * brand spectrum has no role beyond being itself, and `tileHue7` would be worse.
 */

/** The 15 brand hues every tile gradient is built from. */
export type TileHue =
  | 'sun'
  | 'amber'
  | 'ember'
  | 'maroon'
  | 'clay'
  | 'umber'
  | 'jade'
  | 'pine'
  | 'rose'
  | 'orchid'
  | 'sky'
  | 'indigo'
  | 'violet'
  | 'slate'
  | 'slateDeep';

export type TileSpectrum = Readonly<Record<TileHue, string>>;

/**
 * The bundled spectrum. Every value is lifted byte-for-byte from the shipped
 * Erudite tiles (app/index.tsx mode gradients and constants/category-visuals.ts),
 * so the port is a pure lift-and-shift with zero visual change —
 * __tests__/constants/t-tile-palette.test.ts pins that.
 *
 * Identical in both appearances by design: a tile is its own saturated surface,
 * not a tint of the backdrop, so it has nothing to adapt to. Keep any future hue
 * in this saturated-mid band — a very light first stop is what would force a
 * per-appearance split and double the eventual operator form.
 */
export const TILE_SPECTRUM: TileSpectrum = Object.freeze({
  sun: '#ffd23a',
  amber: '#f59f3a',
  ember: '#d6533a',
  maroon: '#7a1f1f',
  clay: '#c97a3f',
  umber: '#8a4a2a',
  jade: '#3aa37a',
  pine: '#1f6f55',
  rose: '#e0529c',
  orchid: '#a23ad6',
  sky: '#3aa6ff',
  indigo: '#4f6df5',
  violet: '#7c5cff',
  slate: '#5a5fb8',
  slateDeep: '#3a3f8a',
});

/** The 10 two-stop ramps the tiles actually draw. */
export type TileRamp =
  | 'sunrise'
  | 'ocean'
  | 'nebula'
  | 'forest'
  | 'sunset'
  | 'earth'
  | 'bloom'
  | 'lava'
  | 'twilight'
  | 'dusk';

export const TILE_RAMPS = Object.freeze({
  sunrise: ['sun', 'amber'],
  ocean: ['sky', 'indigo'],
  nebula: ['violet', 'sky'],
  forest: ['jade', 'pine'],
  sunset: ['amber', 'ember'],
  earth: ['clay', 'umber'],
  bloom: ['rose', 'orchid'],
  lava: ['ember', 'maroon'],
  twilight: ['indigo', 'violet'],
  dusk: ['slate', 'slateDeep'],
}) satisfies Readonly<Record<TileRamp, readonly [TileHue, TileHue]>>;

/** The ten mode tiles, in the order the Modes tab renders them. */
export type TModeId =
  | 'today'
  | 'timeLimit'
  | 'random10'
  | 'byTopic'
  | 'timed'
  | 'challenge'
  | 'survival'
  | 'mistakes'
  | 'hard'
  | 'flashcards';

/**
 * EXHAUSTIVE by construction: the `satisfies` makes a mode without a ramp a
 * compile error rather than a silent fallback to grey.
 */
export const MODE_RAMPS = Object.freeze({
  today: 'sunrise',
  timeLimit: 'ocean',
  random10: 'nebula',
  byTopic: 'forest',
  timed: 'sunset',
  challenge: 'sunrise',
  survival: 'earth',
  mistakes: 'bloom',
  hard: 'lava',
  flashcards: 'ocean',
}) satisfies Readonly<Record<TModeId, TileRamp>>;

/**
 * OPEN, unlike MODE_RAMPS: category slugs are backend data, so an unknown slug
 * is a normal runtime case and resolves to FALLBACK_RAMP.
 *
 * These MUST keep resolving to the same gradients as
 * constants/category-visuals.ts. A `/t` category tile pushes into
 * app/category/[slug].tsx — an Erudite screen still reading CATEGORY_VISUALS —
 * so a tile that changed colour mid-navigation would read as a rendering bug.
 *
 * DO NOT "tidy" the null prototype away. Because the KEY is untrusted operator
 * data, a plain object literal makes `CATEGORY_RAMPS[slug] ?? FALLBACK_RAMP`
 * unsound: for a category slugged `constructor` or `toString` the lookup
 * inherits a FUNCTION from Object.prototype instead of yielding undefined, so
 * the `??` never fires and the tile resolves to `undefined` — which reaches a
 * native LinearGradient and throws "Unable to parse color" on Android rather
 * than rendering the neutral fallback. A null prototype has no inherited keys,
 * so every unknown slug (including `__proto__`) misses cleanly and every
 * consumer of this map gets that for free.
 */
export const CATEGORY_RAMPS: Readonly<Record<string, TileRamp>> = Object.freeze(
  Object.assign(Object.create(null) as Record<string, TileRamp>, {
    geography: 'twilight',
    history: 'earth',
    'science-and-nature': 'forest',
    'arts-literature': 'bloom',
    sports: 'sunset',
    entertainment: 'nebula',
    'general-knowledge': 'sunrise',
  } satisfies Record<string, TileRamp>),
);

export const FALLBACK_RAMP: TileRamp = 'dusk';

/**
 * The dark pill behind the gold crown on a premium-locked mode tile.
 *
 * Deliberately NOT `EruditePalette.scrim`: that token is a modal backdrop
 * (`rgba(20,16,46,0.35)` in light — purple-tinted and far too weak), and reusing
 * it would couple badge styling to modal dimming. This is tile artwork, so like
 * the spectrum it is identical in both appearances.
 */
export const TILE_BADGE_SCRIM = '#00000066';

export type TileGradient = readonly [string, string];
export type TileGradientMap = Readonly<Record<TileRamp, TileGradient>>;

/**
 * THE SEAM. Resolves every ramp against a spectrum.
 *
 * Today it is called exactly once, at module load, with the bundled spectrum.
 * When the spectrum becomes operator data this is the function that gets handed
 * the remote one, and nothing else in the tree changes.
 */
export function resolveTileGradients(spectrum: TileSpectrum): TileGradientMap {
  const entries = Object.entries(TILE_RAMPS) as [TileRamp, readonly [TileHue, TileHue]][];
  const resolved = {} as Record<TileRamp, TileGradient>;
  for (const [ramp, [from, to]] of entries) {
    resolved[ramp] = Object.freeze([spectrum[from], spectrum[to]] as const);
  }
  return Object.freeze(resolved);
}

/**
 * Computed ONCE at module load and frozen, so every tile reads the same tuple by
 * reference on every render. That is what keeps the resolver's
 * reference-identity guarantee (lib/theme/resolve.ts) intact and keeps
 * gradients out of any memo at all.
 */
export const TILE_GRADIENTS: TileGradientMap = resolveTileGradients(TILE_SPECTRUM);
