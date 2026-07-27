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
 * One-shot confetti burst. A cloud of little coloured shards launches outward
 * from a single origin point, arcs under "gravity", spins, and fades. Purely
 * decorative (pointer events pass through). Mount it once — e.g. on the win
 * Result screen — and it plays a single time.
 */

const COLORS = ['#4C6FFF', '#FF4D6D', '#F5A623', '#22C55E', '#8B5CF6', '#0EA5E9', '#EC4899', '#FFD700'];

// Stable default ranges (a tight, localised pop) — kept as module constants so the
// default-prop references never change, which would otherwise re-randomise shards
// on every render.
const DEFAULT_DISTANCE: readonly [number, number] = [90, 240];
const DEFAULT_GRAVITY: readonly [number, number] = [140, 300];

interface Shard {
  angle: number;
  distance: number;
  gravity: number;
  rotate: number;
  size: number;
  delay: number;
  color: string;
  round: boolean;
}

function makeShards(
  count: number,
  distanceRange: readonly [number, number],
  gravityRange: readonly [number, number],
): Shard[] {
  const r = (min: number, max: number) => min + Math.random() * (max - min);
  return Array.from({ length: count }, (_, i) => ({
    angle: r(0, Math.PI * 2),
    distance: r(distanceRange[0], distanceRange[1]),
    gravity: r(gravityRange[0], gravityRange[1]),
    rotate: r(-420, 420),
    size: r(7, 12),
    delay: r(0, 160),
    color: COLORS[i % COLORS.length],
    round: i % 3 === 0,
  }));
}

function Piece({ shard }: { shard: Shard }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(shard.delay, withTiming(1, { duration: 2400, easing: Easing.out(Easing.quad) }));
  }, [p, shard.delay]);

  const style = useAnimatedStyle(() => {
    const t = p.value;
    const dx = Math.cos(shard.angle) * shard.distance * t;
    // Outward along the angle, plus a downward gravity arc that grows with t².
    const dy = Math.sin(shard.angle) * shard.distance * t + shard.gravity * t * t;
    const opacity = t < 0.8 ? 1 : 1 - (t - 0.8) / 0.2;
    return {
      opacity,
      transform: [{ translateX: dx }, { translateY: dy }, { rotate: `${shard.rotate * t}deg` }],
    };
  });

  return (
    <Animated.View
      style={[
        styles.piece,
        { width: shard.size, height: shard.round ? shard.size : shard.size * 1.5, backgroundColor: shard.color },
        shard.round && { borderRadius: shard.size },
        style,
      ]}
    />
  );
}

/**
 * `distanceRange` / `gravityRange` size the burst. They default to the tight,
 * localised pop used on the win Result screen; the Wheel screen passes screen-
 * scaled ranges so the shards spray across the WHOLE screen.
 */
export function Confetti({
  count = 32,
  style,
  distanceRange = DEFAULT_DISTANCE,
  gravityRange = DEFAULT_GRAVITY,
}: {
  count?: number;
  style?: StyleProp<ViewStyle>;
  distanceRange?: readonly [number, number];
  gravityRange?: readonly [number, number];
}) {
  const shards = useMemo(
    () => makeShards(count, distanceRange, gravityRange),
    [count, distanceRange, gravityRange],
  );
  return (
    <View style={[styles.origin, style]} pointerEvents="none">
      {shards.map((shard, i) => (
        <Piece key={i} shard={shard} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // A zero-size anchor; pieces are absolutely centred on it and fly outward.
  origin: { alignItems: 'center', justifyContent: 'center' },
  piece: { position: 'absolute', borderRadius: 2 },
});
