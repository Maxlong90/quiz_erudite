import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useThemeColors } from '@/hooks/use-theme-colors';
import type { AchievementProgress } from '@/lib/achievements';
import type { EruditePalette } from '@/constants/theme';

interface Props {
  progress: AchievementProgress;
  size?: number;
}

/**
 * Square gradient badge with the achievement's emoji centered. Locked
 * achievements (level 0) render as a flat grey card with a "?" so the
 * player can see what's still ahead of them without spoiling the
 * subject.
 */
export function AchievementBadge({ progress, size = 56 }: Props) {
  const themeColors = useThemeColors();
  const styles = useMemo(() => makeStyles(themeColors), [themeColors]);
  const { def, level } = progress;
  const locked = level === 0;
  const radius = Math.round(size * 0.28);

  if (locked) {
    return (
      <View
        style={[
          styles.lockedBox,
          { width: size, height: size, borderRadius: radius },
        ]}
      >
        <Text style={[styles.lockedText, { fontSize: size * 0.42 }]}>?</Text>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={def.gradient ?? ['#7c5cff', '#3aa6ff']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.badge,
        { width: size, height: size, borderRadius: radius },
      ]}
    >
      <Text style={[styles.emoji, { fontSize: size * 0.5, lineHeight: size * 0.6 }]}>
        {def.emoji}
      </Text>
    </LinearGradient>
  );
}

const makeStyles = (c: EruditePalette) => StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    textAlign: 'center',
  },
  lockedBox: {
    backgroundColor: c.borderSoft,
    borderWidth: 1,
    borderColor: c.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedText: {
    color: c.textDisabled,
    fontWeight: '800',
  },
});
