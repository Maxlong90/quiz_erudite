import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useEffect } from 'react';

import { LOGO_QUIZ_PROGRESS_GRADIENT, LogoQuizColors } from '@/constants/logo-quiz-theme';

interface LogoProgressBarProps {
  /** 0..1 fill fraction. */
  progress: number;
  /** Caption below the track, e.g. "Вопрос 4 из 12". */
  label: string;
}

/**
 * Neon progress bar for the logo quiz — a cyan→purple gradient fill with a
 * label on the left and a live percentage on the right. Kept separate from
 * the main-quiz `ProgressBar` so that component's fixed violet styling and
 * its call sites stay untouched.
 */
export function LogoProgressBar({ progress, label }: LogoProgressBarProps) {
  const clamped = Math.max(0, Math.min(1, progress));
  const animated = useSharedValue(0);

  useEffect(() => {
    animated.value = withTiming(clamped, { duration: 300 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clamped]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${animated.value * 100}%`,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.track}>
        <Animated.View style={[styles.fillWrap, fillStyle]}>
          <LinearGradient
            colors={[...LOGO_QUIZ_PROGRESS_GRADIENT]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.fill}
          />
        </Animated.View>
      </View>
      <View style={styles.labelRow}>
        <Text style={styles.label} testID="logo-progress-label">
          {label}
        </Text>
        <Text style={styles.percent} testID="logo-progress-percent">
          {Math.round(clamped * 100)}%
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 8,
  },
  track: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: LogoQuizColors.surfaceElevated,
  },
  fillWrap: {
    height: '100%',
  },
  fill: {
    flex: 1,
    borderRadius: 4,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    color: LogoQuizColors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  percent: {
    color: LogoQuizColors.cyan,
    fontSize: 13,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
});
