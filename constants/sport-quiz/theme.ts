/**
 * Sport Quiz visual language — a neon-on-navy system designed to sit on top of
 * the dark-blue sports photo background (assets/sport-quiz/backgrounds).
 *
 * The signature look: translucent "glass" surfaces with a bright neon rim and a
 * soft neon glow (shadow with a coloured shadowColor). The primary accent is an
 * electric aqua-green (energy / "go"); a hot magenta is the secondary accent for
 * alerts and highlights; coins are gold. Every variant keeps its own palette —
 * this is Sport Quiz's, mirroring how logo-quiz / flags-quiz own theirs.
 */

export const SQColors = {
  // Base navy sampled from the photo background — used for load states so the
  // screen never flashes white before the image warms up.
  bgBase: '#0C1E30',
  bgDeep: '#081521',

  // Neon accents.
  neon: '#2BFFB3', // primary — electric aqua-green (Play, active accents)
  neonBright: '#7BFFD2', // lighter aqua for gloss / highlights
  neonDim: '#12B98A', // darker aqua for gradient bottoms
  neonBlue: '#2ED0FF', // secondary — electric cyan
  neonPink: '#FF2E9A', // tertiary — hot magenta (alerts, "popular")

  coin: '#FFC93C', // gold
  coinDark: '#E39A00',

  text: '#EAF6FF',
  textMuted: '#8FA9C2',
  textOnNeon: '#04241A', // dark ink for text placed on a bright neon fill

  // Glass surfaces.
  glass: 'rgba(9, 24, 40, 0.55)',
  glassStrong: 'rgba(9, 24, 40, 0.78)',
  glassBorder: 'rgba(123, 255, 210, 0.45)', // neon-tinted hairline
  glassBorderDim: 'rgba(143, 169, 194, 0.25)',
} as const;

export const SQRadius = {
  sm: 12,
  md: 18,
  lg: 26,
  pill: 999,
} as const;

/** Neon glow + depth shadows. shadowColor carries the neon tint. */
export const SQShadow = {
  neon: {
    shadowColor: SQColors.neon,
    shadowOpacity: 0.75,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  neonPink: {
    shadowColor: SQColors.neonPink,
    shadowOpacity: 0.7,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  card: {
    shadowColor: '#000000',
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
} as const;

/** Play button fill (bright aqua-green → deep aqua). */
export const SQ_PLAY_GRADIENT = ['#5CFFC6', '#1FE39C', '#0FB07C'] as const;
/** Gold gradient for coin surfaces. */
export const SQ_GOLD_GRADIENT = ['#FFE27A', '#FFC93C', '#E39A00'] as const;
