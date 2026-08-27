import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { useThemeColors } from '@/hooks/use-theme-colors';
import type { EruditePalette } from '@/constants/theme';

interface Props {
  /** Seconds left for the current question. */
  secondsLeft: number;
  /** Total seconds the question started with. */
  totalSeconds: number;
}

/**
 * Countdown bar above the progress bar for timed quizzes. Fills from
 * 100% to 0% over the question's allotted time, turning red in the
 * final 5 seconds.
 */
export function QuizTimer({ secondsLeft, totalSeconds }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const fill = useSharedValue(1);

  useEffect(() => {
    const ratio = totalSeconds > 0 ? Math.max(0, Math.min(1, secondsLeft / totalSeconds)) : 0;
    fill.value = withTiming(ratio, { duration: 250, easing: Easing.linear });
  }, [secondsLeft, totalSeconds, fill]);

  const animated = useAnimatedStyle(() => ({
    width: `${fill.value * 100}%`,
  }));

  const isCritical = secondsLeft <= 5 && secondsLeft > 0;
  const color = isCritical ? colors.danger : colors.accentSoft;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.track}>
          <Animated.View style={[styles.fill, { backgroundColor: color }, animated]} />
        </View>
        <Text style={[styles.seconds, { color }]}>
          {Math.max(0, secondsLeft)}s
        </Text>
      </View>
    </View>
  );
}

const makeStyles = (c: EruditePalette) => StyleSheet.create({
  wrap: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  track: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: c.border,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
  seconds: {
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    minWidth: 32,
    textAlign: 'right',
  },
});
