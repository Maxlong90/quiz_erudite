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
