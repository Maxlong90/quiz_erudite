import { useEffect } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { CoinIcon } from '@/components/logo-quiz/coin-icon';
import { polarPoint, wedgePath } from '@/components/logo-quiz/wheel-svg';
import { LQColors } from '@/constants/logo-quiz/theme';

/**
 * Tiny standalone Wheel-of-Fortune glyphs shared by the Shop tile and the Home
 * Shop-button badge (extracted so the two call sites don't duplicate the mark or
 * the red "!" dot). `WheelMark` is a compact multicolour wheel that also flashes
 * a few mini-prizes (coins + hearts) so it reads as "spin to win coins & lives";
 * `WheelAlertDot` is the red "!" that signals a spin is ready — optionally pulsing.
 */

// Warm + white palette only. The Shop button (indigo #4C6FFF) and Shop tile
// (indigo→violet WHEEL_TILE_GRADIENT) sit BEHIND this mark, so the mark must avoid
// those blues/violets (#4C6FFF / #7A5CFF / #8B5CF6 / LQColors.primary) and use
// contrasting warm tones so it pops off its background.
const MARK_COLORS = [
  LQColors.coin, // gold
  LQColors.heart, // red
  LQColors.success, // green
  '#FF9F1C', // orange
  '#FF6FB5', // warm pink
  '#FFD54A', // yellow
  '#FFFFFF', // white
  LQColors.coin, // gold
];

/**
 * Mini-prizes shown around the mark — alternating coins and hearts on opposite
 * wedges, hinting that coins and lives are the rewards inside. Angles are degrees
 * CLOCKWISE from the top (12 o'clock), matching `polarPoint`.
 */
const MARK_PRIZES: { kind: 'coin' | 'heart'; deg: number }[] = [
  { kind: 'coin', deg: 45 },
  { kind: 'heart', deg: 135 },
  { kind: 'coin', deg: 225 },
  { kind: 'heart', deg: 315 },
];

/** A small decorative wheel icon: coloured wedges with mini coin/heart prizes. */
export function WheelMark({ size = 28 }: { size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2;
  const seg = 360 / MARK_COLORS.length;
  const prizeR = size * 0.31; // radius of the mini-prize ring from the centre
  const iconSize = size * 0.24;
  const disc = iconSize * 1.5; // white backing so a prize reads on any wedge colour

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {MARK_COLORS.map((color, i) => (
          <Path key={i} d={wedgePath(cx, cy, r, i * seg, (i + 1) * seg)} fill={color} />
        ))}
        <Circle cx={cx} cy={cy} r={size * 0.14} fill="#FFFFFF" />
      </Svg>

      {/* Mini-prizes overlaid on the wedges (RN components, so drawn above the SVG). */}
      {MARK_PRIZES.map((p, i) => {
        const pt = polarPoint(cx, cy, prizeR, p.deg);
        return (
          <View
            key={i}
            style={[
              styles.markPrize,
              { left: pt.x - disc / 2, top: pt.y - disc / 2, width: disc, height: disc, borderRadius: disc / 2 },
            ]}
          >
            {p.kind === 'coin' ? (
              <CoinIcon size={iconSize} />
            ) : (
              <Ionicons name="heart" size={iconSize} color={LQColors.heart} />
            )}
          </View>
        );
      })}
    </View>
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
  markPrize: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(21,27,46,0.08)',
  },
});
