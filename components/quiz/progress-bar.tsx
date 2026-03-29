import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface ProgressBarProps {
  progress: number;
  currentIndex: number;
  total: number;
}

export function ProgressBar({ progress, currentIndex, total }: ProgressBarProps) {
  const theme = useColorScheme() ?? 'light';
  const tintColor = Colors[theme].tint;
  const trackColor = Colors[theme].icon + '33';

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
        <ThemedText style={styles.label} testID="progress-text">
          {currentIndex + 1} / {total}
        </ThemedText>
      </View>
      <View style={[styles.track, { backgroundColor: trackColor }]}>
        <Animated.View
          style={[styles.fill, { backgroundColor: tintColor }, fillStyle]}
        />
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
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
});
