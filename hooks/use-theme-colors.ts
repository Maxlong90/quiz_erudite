import { EruditeColors, type EruditePalette } from '@/constants/theme';
import { useThemePref } from '@/hooks/use-theme-pref';

/**
 * Resolves the semantic Erudite palette for the *app-selected* appearance
 * (from useThemePref, persisted independently of the OS setting). Consumers
 * repaint automatically when the preference flips, because useThemePref holds
 * `theme` in React state above every screen.
 */
export function useThemeColors(): EruditePalette {
  return EruditeColors[useThemePref().theme];
}
