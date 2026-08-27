import type { ReactNode } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

import { useThemeColors } from '@/hooks/use-theme-colors';
import { useThemePref } from '@/hooks/use-theme-pref';

/**
 * Full-screen themed backdrop. Renders the appearance-specific gradient plus a
 * matching status-bar style, so screens drop `<ScreenBackground>` in place of
 * the old hardcoded `<LinearGradient colors={['#1a1a47', ...]}>` + `<StatusBar
 * style="light" />` pair and repaint with the theme automatically.
 */
export function ScreenBackground({
  children,
  style,
}: {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useThemeColors();
  const { theme } = useThemePref();
  return (
    <LinearGradient
      colors={colors.bgGradient}
      locations={[0, 0.55, 1]}
      style={[styles.flex, style]}
    >
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
