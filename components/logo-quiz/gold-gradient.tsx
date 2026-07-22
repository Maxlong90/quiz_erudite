import { useEffect, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { GOLD_GRADIENT, LQRadius, LQShadow } from '@/constants/logo-quiz/theme';

/**
 * Animated gold gradient surface used for every VIP / premium element. A static
 * gold gradient plus a looping diagonal "sheen" that sweeps across, giving the
 * premium feel the spec asks for (#FFD700 → #FFA000). Wrap any content in it.
 */
export function GoldSurface({
  children,
  style,
  radius = LQRadius.md,
}: {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  radius?: number;
}) {
  const progress = useSharedValue(0);
  const width = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.linear }),
      -1,
      false,
    );
  }, [progress]);

  const sheenStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(progress.value, [0, 1], [-140, width.value + 140]) },
      { skewX: '-18deg' },
    ],
  }));

  return (
    <View
      style={[{ borderRadius: radius, overflow: 'hidden' }, style]}
      onLayout={(e) => {
        width.value = e.nativeEvent.layout.width;
      }}
    >
      <LinearGradient
        colors={GOLD_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View pointerEvents="none" style={[styles.sheen, sheenStyle]}>
        <LinearGradient
          colors={['#ffffff00', '#ffffffaa', '#ffffff00']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      {children}
    </View>
  );
}

/** A pressable button rendered on the animated gold gradient. */
export function GoldButton({
  onPress,
  disabled,
  children,
  style,
  radius = LQRadius.pill,
}: {
  onPress?: () => void;
  disabled?: boolean;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  radius?: number;
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      style={({ pressed }) => [
        LQShadow.gold,
        { borderRadius: radius, opacity: disabled ? 0.55 : 1 },
        pressed && !disabled && { transform: [{ scale: 0.97 }] },
        style,
      ]}
    >
      <GoldSurface radius={radius} style={styles.button}>
        {children}
      </GoldSurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sheen: {
    position: 'absolute',
    top: -20,
    bottom: -20,
    width: 70,
  },
  button: {
    paddingVertical: 15,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
