/**
 * Logo Quiz visual language — a modern LIGHT theme. VIP / premium surfaces use
 * the animated gold gradient (see components/logo-quiz/gold-gradient.tsx) to
 * signal value; everything else stays clean and light.
 */

export const LQColors = {
  bg: '#F3F5FB',
  bgAlt: '#E9EDF7',
  surface: '#FFFFFF',
  text: '#151B2E',
  textMuted: '#6B7392',
  textFaint: '#9AA1BC',
  border: '#E4E8F2',
  primary: '#4C6FFF',
  primaryDark: '#2F4FE0',
  coin: '#F5A623',
  coinDark: '#D98A00',
  heart: '#FF4D6D',
  success: '#22C55E',
  successBg: '#E7F9EE',
  wrong: '#EF4444',
  wrongBg: '#FDECEC',
  disabled: '#C7CDDB',
} as const;

/** The premium gold gradient. Order = top-left → bottom-right. */
export const GOLD_GRADIENT = ['#FFD700', '#FFA000'] as const;
export const GOLD_TEXT = '#5A3D00';
export const GOLD_BORDER = '#E0930A';

export const LQRadius = {
  sm: 10,
  md: 16,
  lg: 22,
  pill: 999,
} as const;

export const LQShadow = {
  card: {
    shadowColor: '#1B2559',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  gold: {
    shadowColor: '#C77F00',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
} as const;

/**
 * Wheel-of-fortune segment palette by prominence tier (visual config — easy to
 * tweak alongside the prize/weight table in economy.ts). `base` is the least
 * prominent (100 coins / 3 lives), `rare` is an eye-catching accent (500 coins /
 * 10 lives), and `legendary` (1000 coins) is drawn with the iridescent shimmer
 * gradient below to be by far the most noticeable wedge.
 */
export const WHEEL_TIER = {
  base: { fill: '#EEF1FA', text: '#3A4260' },
  rare: { fill: '#8B5CF6', text: '#FFFFFF' },
  legendary: { fill: '#FFD54A', text: GOLD_TEXT },
} as const;

/** Iridescent gradient stops for the legendary (1000 coins) wedge — the shiniest. */
export const WHEEL_LEGENDARY_GRADIENT = ['#FFE29F', '#FF9DAE', '#C58BFF', '#7CD7FF', '#FFE29F'] as const;
