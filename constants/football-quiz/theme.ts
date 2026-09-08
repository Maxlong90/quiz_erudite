/**
 * Football Quiz visual language — the gold-on-haze system approved in the design
 * review. It mirrors Sport Quiz's structure (same screens, same primitives) but
 * swaps the two-accent neon palette for a SINGLE gold accent lifted off the
 * stadium floodlights in the home-screen photo.
 *
 * Sport Quiz → Football Quiz:
 *   neon aqua #2BFFB3 (rims, glyphs, progress) → gold #FFC93C / rim #FFE9B0
 *   hot magenta #FF2E9A (screen titles)        → the same gold (one accent only)
 *   navy glass rgba(9,24,40,.55)               → grey glass rgba(12,14,16,.7)
 *   cool text #EAF6FF                          → warm text #FFF6E4
 *
 * Coins are RED here, not gold — gold is the interface accent, so the currency
 * needs its own colour to stay a separate signal.
 */

export const FQColors = {
  bgBase: '#2B2B26', // average of the "light haze" backdrop
  bgDeep: '#191A19', // average of the "deep" backdrop (quiz screen)

  gold: '#FFC93C',
  goldLight: '#FFE9B0',
  goldDark: '#D98A0B',
  ink: '#3A2405', // dark text placed ON a gold fill

  // Currency — deliberately NOT gold, so coins read as their own thing.
  coin: '#E23B3B',
  coinRim: '#B32020',

  text: '#FFF6E4',
  textMuted: '#A79B86',

  glass: 'rgba(12,14,16,0.58)',
  glassStrong: 'rgba(12,14,16,0.80)',
  glassBorder: 'rgba(255,233,176,0.9)',
  glassBorderDim: 'rgba(255,233,176,0.28)',

  wrong: '#FF3B57',
} as const;

export const FQRadius = { sm: 12, md: 18, lg: 26, pill: 999 } as const;

/** Gold glow — the Football Quiz equivalent of Sport Quiz's neonGlow(). */
export const FQShadow = {
  gold: {
    shadowColor: FQColors.gold,
    shadowOpacity: 0.75,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
} as const;

/** Solid gold fill — CTAs, progress bars, price chips, Back/Next. */
export const FQ_GOLD_GRADIENT = ['#FFE9B0', '#FFC93C', '#D98A0B'] as const;
/** Red coin face. */
export const FQ_COIN_GRADIENT = ['#FF6B5A', '#E23B3B', '#8E1414'] as const;

/**
 * Translucent gold fill used by every framed control (icon buttons, the Play
 * circle, level chips). 0.40 is the value picked in the design review.
 */
export const FQ_FILL = 'rgba(255,201,60,0.40)';
