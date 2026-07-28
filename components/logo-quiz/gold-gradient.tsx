import { useEffect, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { BLUE_GRADIENT, GOLD_GRADIENT, LQRadius, LQShadow } from '@/constants/logo-quiz/theme';

/**
 * The looping diagonal white "sheen" sweep on its own — the shared premium-shine
 * mechanic, extracted so it can be layered over any surface OR over bare content
 * (e.g. the Shop's "Spin now" label) without a masked-view native dependency.
 *
 * Renders as an absolutely-positioned, clipped, non-interactive layer that fills
 * its parent and measures its own width, so drop it on top of (or behind) content
 * inside a `position:'relative'` container. It changes nothing but the passing
 * highlight — no base colour, no layout.
 */
export function ShineOverlay({ radius = 0 }: { radius?: number }) {
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
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}
      onLayout={(e) => {
        width.value = e.nativeEvent.layout.width;
      }}
    >
      <Animated.View pointerEvents="none" style={[styles.sheen, sheenStyle]}>
        <LinearGradient
          colors={['#ffffff00', '#ffffffaa', '#ffffff00']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

/**
 * A gradient surface with a looping diagonal "sheen" that sweeps across — the
 * shared premium-shine mechanic. `GoldSurface` and `BlueShinySurface` are thin
 * wrappers that only pick the base gradient (and, for blue, add diamond glints).
 */
function ShinySurface({
  colors,
  children,
  style,
  radius = LQRadius.md,
  sparkle = false,
}: {
  colors: readonly [string, string, ...string[]];
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  radius?: number;
  sparkle?: boolean;
}) {
  return (
    <View style={[{ borderRadius: radius, overflow: 'hidden' }, style]}>
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {sparkle && <DiamondGlints />}
      <ShineOverlay radius={radius} />
      {children}
    </View>
  );
}

/**
 * Animated gold gradient surface used for every VIP / premium element (#FFD700 →
 * #FFA000) with the looping diagonal sheen. Wrap any content in it.
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
  return (
    <ShinySurface colors={GOLD_GRADIENT} style={style} radius={radius}>
      {children}
    </ShinySurface>
  );
}

/**
 * The sapphire counterpart of GoldSurface — the same running sheen over a blue
 * gradient, plus a few twinkling "diamond" glints. Used for the Wheel's Spin CTA.
 */
export function BlueShinySurface({
  children,
  style,
  radius = LQRadius.md,
}: {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  radius?: number;
}) {
  return (
    <ShinySurface colors={BLUE_GRADIENT} style={style} radius={radius} sparkle>
      {children}
    </ShinySurface>
  );
}

/** Positions (as % of the surface) for the small twinkling diamonds. */
const GLINTS = [
  { left: '14%', top: '30%', size: 7, delay: 0 },
  { left: '82%', top: '26%', size: 6, delay: 500 },
  { left: '70%', top: '62%', size: 8, delay: 1000 },
  { left: '30%', top: '66%', size: 5, delay: 1500 },
] as const;

/** A light scatter of twinkling white diamonds (rotated squares) for the blue CTA. */
function DiamondGlints() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {GLINTS.map((g, i) => (
        <Glint key={i} left={g.left} top={g.top} size={g.size} delay={g.delay} />
      ))}
    </View>
  );
}

function Glint({ left, top, size, delay }: { left: string; top: string; size: number; delay: number }) {
  const twinkle = useSharedValue(0);
  useEffect(() => {
    twinkle.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, true),
    );
  }, [twinkle, delay]);

  const glintStyle = useAnimatedStyle(() => ({
    opacity: interpolate(twinkle.value, [0, 1], [0.15, 0.9]),
    transform: [{ rotate: '45deg' }, { scale: interpolate(twinkle.value, [0, 1], [0.7, 1]) }],
  }));

  return (
    <Animated.View
      style={[
        styles.glint,
        { left: left as `${number}%`, top: top as `${number}%`, width: size, height: size },
        glintStyle,
      ]}
    />
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
  glint: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 1.5,
    shadowColor: '#FFFFFF',
    shadowOpacity: 0.9,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
});
