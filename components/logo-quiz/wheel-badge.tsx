import { useEffect } from 'react';
import { StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { wedgePath } from '@/components/logo-quiz/wheel-svg';
import { LQColors } from '@/constants/logo-quiz/theme';

/**
 * Tiny standalone Wheel-of-Fortune glyphs shared by the Shop tile and the Home
 * Shop-button badge (extracted so the two call sites don't duplicate the mark or
 * the red "!" dot). `WheelMark` is a compact multicolour wheel; `WheelAlertDot`
 * is the red "!" that signals a spin is ready — optionally pulsing.
 */

const MARK_COLORS = [
  LQColors.primary,
  LQColors.coin,
  LQColors.heart,
  LQColors.success,
  '#8B5CF6',
  '#0EA5E9',
  LQColors.coin,
  LQColors.primary,
];

/** A small decorative wheel icon (coloured wedges, no labels). */
export function WheelMark({ size = 28 }: { size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2;
  const seg = 360 / MARK_COLORS.length;
  return (
    <Svg width={size} height={size}>
      {MARK_COLORS.map((color, i) => (
        <Path key={i} d={wedgePath(cx, cy, r, i * seg, (i + 1) * seg)} fill={color} />
      ))}
      <Circle cx={cx} cy={cy} r={size * 0.16} fill="#FFFFFF" />
    </Svg>
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
