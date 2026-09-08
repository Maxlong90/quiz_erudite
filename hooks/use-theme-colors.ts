import { EruditeColors, type EruditePalette } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useThemePref } from '@/hooks/use-theme-pref';

/**
 * Resolves the semantic Erudite palette for the *app-selected* appearance
 * (from useThemePref, persisted independently of the OS setting). Consumers
 * repaint automatically when the preference flips, because useThemePref holds
 * `theme` in React state above every screen.
 *
 * On a configurable-template build the ten remote colour tokens are overlaid on
 * top (see hooks/app-theme-provider.ts). On EVERY other build useAppTheme returns the
 * frozen inert value whose palettes ARE EruditeColors by reference, so this
 * returns literally the same object it always has — and with no provider at all
 * (as in most unit tests) the `??` falls through to the same place. Both hooks
 * are called unconditionally, so hook order is unchanged everywhere.
 */
export function useThemeColors(): EruditePalette {
  const { theme } = useThemePref();
  const appTheme = useAppTheme();
  return appTheme?.palettes?.[theme] ?? EruditeColors[theme];
}
