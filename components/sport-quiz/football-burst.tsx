import { useEffect, useMemo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

/**
 * One-shot football burst — Sport Quiz's take on the Logo Quiz confetti
 * (components/logo-quiz/confetti.tsx). A cloud of soccer-ball emoji launches
 * outward from a single origin point, arcs under "gravity", spins, and fades.
 * Purely decorative (pointer events pass through). Mount it once on the win
 * moment and it plays a single time.
 */

// Stable default ranges (a tight, localised pop) — kept as module constants so the
// default-prop references never change, which would otherwise re-randomise balls
// on every render.
const DEFAULT_DISTANCE: readonly [number, number] = [90, 240];
const DEFAULT_GRAVITY: readonly [number, number] = [140, 300];

interface Ball {
  angle: number;
  distance: number;
  gravity: number;
  rotate: number;
  size: number;
  delay: number;
}

function makeBalls(
  count: number,
  distanceRange: readonly [number, number],
  gravityRange: readonly [number, number],
): Ball[] {
  const r = (min: number, max: number) => min + Math.random() * (max - min);
  return Array.from({ length: count }, () => ({
    angle: r(0, Math.PI * 2),
    distance: r(distanceRange[0], distanceRange[1]),
    gravity: r(gravityRange[0], gravityRange[1]),
    rotate: r(-540, 540),
    size: r(22, 40),
    delay: r(0, 160),
  }));
}

function Piece({ ball }: { ball: Ball }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(ball.delay, withTiming(1, { duration: 2400, easing: Easing.out(Easing.quad) }));
  }, [p, ball.delay]);

  const style = useAnimatedStyle(() => {
    const t = p.value;
    const dx = Math.cos(ball.angle) * ball.distance * t;
    // Outward along the angle, plus a downward gravity arc that grows with t².
    const dy = Math.sin(ball.angle) * ball.distance * t + ball.gravity * t * t;
    const opacity = t < 0.8 ? 1 : 1 - (t - 0.8) / 0.2;
    return {
      opacity,
      transform: [{ translateX: dx }, { translateY: dy }, { rotate: `${ball.rotate * t}deg` }],
    };
  });

  return (
    <Animated.Text style={[styles.ball, { fontSize: ball.size }, style]}>⚽</Animated.Text>
  );
}

/**
 * `distanceRange` / `gravityRange` size the burst. They default to a tight pop;
 * the Wheel screen passes screen-scaled ranges so the balls spray across the
 * WHOLE screen (mirrors how the Logo Quiz wheel scales its confetti).
 */
export function FootballBurst({
  count = 28,
  style,
  distanceRange = DEFAULT_DISTANCE,
  gravityRange = DEFAULT_GRAVITY,
}: {
  count?: number;
  style?: StyleProp<ViewStyle>;
  distanceRange?: readonly [number, number];
  gravityRange?: readonly [number, number];
}) {
  const balls = useMemo(
    () => makeBalls(count, distanceRange, gravityRange),
    [count, distanceRange, gravityRange],
  );
  return (
    <View style={[styles.origin, style]} pointerEvents="none">
      {balls.map((ball, i) => (
        <Piece key={i} ball={ball} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // A zero-size anchor; balls are absolutely centred on it and fly outward.
  origin: { alignItems: 'center', justifyContent: 'center' },
  ball: { position: 'absolute' },
});
