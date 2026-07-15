/**
 * Logo Quiz visual language — a self-contained neon dark theme, kept
 * separate from the main app's purple-gradient trivia flow so the
 * feature reads as its own mini-app. Never hardcode these values in
 * screens/components; import from here so the palette stays in one place.
 */

export const LogoQuizColors = {
  // Backgrounds (page) and elevated surfaces (cards/inputs).
  bg: '#08080F',
  bgElevated: '#0E0E1A',
  surface: '#15151F',
  surfaceElevated: '#1C1C2B',
  border: '#2A2A40',

  // Neon accents.
  cyan: '#00E5FF',
  magenta: '#FF2FD0',
  purple: '#9D5CFF',
  green: '#39FF9E',
  gold: '#FFC93C',

  // Text.
  text: '#FFFFFF',
  textSecondary: '#9A9AB8',
  textMuted: '#5C5C7A',
} as const;

export const LogoQuizRadii = {
  sm: 14,
  md: 18,
  lg: 22,
  xl: 28,
} as const;

/**
 * The signature gradient (cyan → purple → magenta) used on every primary
 * CTA. Exposed as a mutable tuple so it can be spread into
 * expo-linear-gradient's `colors` prop without a readonly-type clash.
 */
export const LOGO_QUIZ_CTA_GRADIENT: readonly [string, string, string] = [
  LogoQuizColors.cyan,
  LogoQuizColors.purple,
  LogoQuizColors.magenta,
];

/** Progress-bar fill gradient (cyan → purple), per mockup 2. */
export const LOGO_QUIZ_PROGRESS_GRADIENT: readonly [string, string] = [
  LogoQuizColors.cyan,
  LogoQuizColors.purple,
];

/**
 * A per-category accent drives its neon glow. Kept as a named union so
 * mock data and components agree on the small, closed set of hues.
 */
export type LogoQuizAccent = 'cyan' | 'magenta' | 'purple' | 'green' | 'gold';

export function accentColor(accent: LogoQuizAccent): string {
  return LogoQuizColors[accent];
}
