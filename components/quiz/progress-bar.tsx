import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';

interface ProgressBarProps {
  progress: number;
  currentIndex: number;
  total: number;
}

// Quiz screen always sits on the dark purple gradient regardless of
// the device's system theme, so the bar and counter use fixed white /
// violet colors. Routing them through Colors[theme] made them
// invisible on devices in light mode.
const FILL_COLOR = '#a78bff';
const TRACK_COLOR = '#ffffff22';
const LABEL_COLOR = '#ffffffd9';

export function ProgressBar({ progress, currentIndex, total }: ProgressBarProps) {
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withTiming(progress, { duration: 300 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${animatedProgress.value * 100}%`,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label} testID="progress-text">
          {currentIndex + 1} / {total}
        </Text>
      </View>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, fillStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 6,
  },
  label: {
    color: LABEL_COLOR,
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: TRACK_COLOR,
  },
  fill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: FILL_COLOR,
  },
});
