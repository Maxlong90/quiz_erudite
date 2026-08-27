/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

export const QuizColors = {
  correct: '#22c55e',
  correctLight: '#dcfce7',
  wrong: '#ef4444',
  wrongLight: '#fee2e2',
  neutral: '#e5e7eb',
  neutralDark: '#374151',
};

// ---------------------------------------------------------------------------
// Erudite semantic theme tokens
//
// The legacy `Colors`/`QuizColors` above back an OS-scheme path (ThemedText /
// ThemedView / useColorScheme) that we deliberately leave alone. The tokens
// below drive the *app-selected* appearance (useThemePref → 'dark' | 'light')
// via useThemeColors(). Dark is seeded byte-for-byte from the hex that was
// hardcoded across the screens, so switching a screen onto these tokens is a
// pure lift-and-shift with zero visual change; light is purely additive.
//
// #7c5cff (accent) is intentionally identical in both themes.
// ---------------------------------------------------------------------------
export type ErudGradient = readonly [string, string, string];

export interface EruditePalette {
  /** Full-screen backdrop gradient (3 stops, locations [0, 0.55, 1]). */
  bgGradient: ErudGradient;
  /** Solid fill matching gradient[0] — nav card / system root bg. */
  bgSolid: string;
  /** Raised card surface. */
  surface: string;
  /** Faint surface tint (dashed cards, subtle fills). */
  surfaceSoft: string;
  /** Sunken well, e.g. image backgrounds. */
  surfaceSunken: string;
  /** Bottom-sheet / modal panel. */
  sheet: string;
  /** Backdrop dim behind sheets/modals. */
  scrim: string;
  text: string;
  textMuted: string;
  textFaint: string;
  textDisabled: string;
  border: string;
  borderStrong: string;
  borderSoft: string;
  /** Brand accent — identical in both themes. */
  accent: string;
  /** Softer accent for fills/labels; darkened in light so it stays visible. */
  accentSoft: string;
  /** Translucent accent background (chips, highlights). */
  accentBg: string;
  /** Text/icon sitting on a solid/gradient accent — white in both themes. */
  onAccent: string;
  success: string;
  danger: string;
  gold: string;
  optIdleBg: string;
  optIdleBorder: string;
  optCorrectBg: string;
  optWrongBg: string;
  explanationBg: string;
  explanationText: string;
}

export const EruditeColors: { dark: EruditePalette; light: EruditePalette } = {
  dark: {
    bgGradient: ['#1a1a47', '#2d1f5e', '#1a1a47'],
    bgSolid: '#1a1a47',
    surface: '#ffffff0f',
    surfaceSoft: '#ffffff0d',
    surfaceSunken: '#0e0e2a',
    sheet: '#1f1949',
    scrim: 'rgba(0,0,0,0.55)',
    text: '#fff',
    textMuted: '#ffffffcc',
    textFaint: '#ffffff99',
    textDisabled: '#ffffff66',
    border: '#ffffff1f',
    borderStrong: '#ffffff33',
    borderSoft: '#ffffff14',
    accent: '#7c5cff',
    accentSoft: '#a78bff',
    accentBg: '#7c5cff33',
    onAccent: '#fff',
    success: '#22c55e',
    danger: '#ef4444',
    gold: '#ffd23a',
    optIdleBg: '#374151',
    optIdleBorder: '#4b5563',
    optCorrectBg: '#166534',
    optWrongBg: '#991b1b',
    explanationBg: '#0e1a3a',
    explanationText: '#ffffffd9',
  },
  light: {
    bgGradient: ['#f4f2fb', '#ece7fb', '#f4f2fb'],
    bgSolid: '#f4f2fb',
    surface: '#ffffff',
    surfaceSoft: '#7c5cff0d',
    surfaceSunken: '#eae6f7',
    sheet: '#ffffff',
    scrim: 'rgba(20,16,46,0.35)',
    text: '#1c1740',
    textMuted: '#463f6b',
    textFaint: '#6b6390',
    textDisabled: '#a49fc0',
    border: '#1c17401f',
    borderStrong: '#1c174033',
    borderSoft: '#1c174014',
    accent: '#7c5cff',
    accentSoft: '#6a45f5',
    accentBg: '#7c5cff1a',
    onAccent: '#fff',
    success: '#16a34a',
    danger: '#dc2626',
    gold: '#ffd23a',
    optIdleBg: QuizColors.neutral,
    optIdleBorder: '#d1d5db',
    optCorrectBg: QuizColors.correctLight,
    optWrongBg: QuizColors.wrongLight,
    explanationBg: '#f0f9ff',
    explanationText: '#1e40af',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
