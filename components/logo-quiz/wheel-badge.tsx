import { useEffect } from 'react';
import { Image, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { LQColors } from '@/constants/logo-quiz/theme';

/**
 * Tiny standalone Wheel-of-Fortune glyphs shared by the Shop tile and the Home
 * Shop-button badge (extracted so the two call sites don't duplicate the mark or
 * the red "!" dot). `WheelMark` is the glossy wheel icon (bitmap art that already
 * bakes in the coin/heart mini-prizes); `WheelAlertDot` is the red "!" that
 * signals a spin is ready — optionally pulsing.
 */

/** A small wheel icon rendered from the shared glossy wheel bitmap. */
export function WheelMark({ size = 28 }: { size?: number }) {
  return (
    <Image
      source={require('../../assets/logo-quiz/wheel-icon.png')}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  );
}

/** Red circular "!" alert. When `pulse` is set it smoothly grows/shrinks. */
export function WheelAlertDot({
  pulse = false,
  size = 20,
  style,
}: {
  pulse?: boolean;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const scale = useSharedValue(1);
  useEffect(() => {
    if (!pulse) return;
    scale.value = withRepeat(
      withTiming(1.28, { duration: 650, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [pulse, scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse ? scale.value : 1 }],
  }));

  return (
    <Animated.View
      style={[styles.dot, { width: size, height: size, borderRadius: size / 2 }, animStyle, style]}
    >
      <Text style={[styles.bang, { fontSize: size * 0.68, lineHeight: size * 0.82 }]}>!</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  dot: {
    backgroundColor: LQColors.wrong,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  bang: { color: '#FFFFFF', fontWeight: '900' },
});
