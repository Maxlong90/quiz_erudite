import { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, Ellipse, Polygon, RadialGradient, Stop } from 'react-native-svg';

import { SQColors } from '@/constants/sport-quiz/theme';

/**
 * The Win screen's backdrop flourish: a sunburst of gold rays fanning out from the
 * trophy, plus a soft golden halo under its base so the cup reads as if it is lit
 * from within.
 *
 * The rays are drawn long enough to always run PAST the screen corners (never a
 * visible ray tip) and turn slowly and endlessly. The spinning layer is a square
 * centred on the trophy, so the rays rotate about their own origin instead of
 * orbiting the screen centre. The halo sits in its own static layer — it marks the
 * cup's base and must not turn with the rays. Purely decorative: no touch handling.
 */

/** Degrees between neighbouring rays. */
const RAY_STEP = 24;
/** Half-width of one ray, in degrees. */
const RAY_HALF = 5.5;
const RAY_OPACITY = 0.16;
/** One full, unhurried turn. */
const SPIN_DURATION_MS = 60000;
const GLOW_ID = 'sqWinGlow';

function rayPoints(c: number, r: number, angleDeg: number): string {
  const a0 = ((angleDeg - RAY_HALF) * Math.PI) / 180;
  const a1 = ((angleDeg + RAY_HALF) * Math.PI) / 180;
  return (
    `${c},${c} ` +
    `${(c + r * Math.cos(a0)).toFixed(1)},${(c + r * Math.sin(a0)).toFixed(1)} ` +
    `${(c + r * Math.cos(a1)).toFixed(1)},${(c + r * Math.sin(a1)).toFixed(1)}`
  );
}

export function WinRays({
  width,
  height,
  cx,
  cy,
  cupSize,
}: {
  width: number;
  height: number;
  /** Screen coordinates of the trophy's centre — the rays' origin. */
  cx: number;
  cy: number;
  /** Rendered trophy box, which scales the halo under it. */
  cupSize: number;
}) {
  // Reach the farthest corner, then overshoot 25% so no ray ever ends on screen.
  const reach = Math.hypot(Math.max(cx, width - cx), Math.max(cy, height - cy)) * 1.25;
  const box = reach * 2;
  const angles = Array.from({ length: Math.round(360 / RAY_STEP) }, (_, i) => i * RAY_STEP);

  const spin = useSharedValue(0);
  useEffect(() => {
    spin.value = withRepeat(withTiming(360, { duration: SPIN_DURATION_MS, easing: Easing.linear }), -1, false);
  }, [spin]);
  const spinStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value}deg` }] }));

  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[
          { position: 'absolute', left: cx - reach, top: cy - reach, width: box, height: box },
          spinStyle,
        ]}
      >
        <Svg width={box} height={box}>
          {angles.map((a) => (
            <Polygon key={a} points={rayPoints(reach, reach, a)} fill={SQColors.coin} opacity={RAY_OPACITY} />
          ))}
        </Svg>
      </Animated.View>

      {/* Halo pooled under the cup's base — static, so it stays put as rays turn. */}
      <Svg
        width={width}
        height={height}
        style={{ position: 'absolute', top: 0, left: 0 }}
        pointerEvents="none"
      >
        <Defs>
          <RadialGradient id={GLOW_ID}>
            <Stop offset="0" stopColor={SQColors.coin} stopOpacity="0.55" />
            <Stop offset="1" stopColor={SQColors.coin} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Ellipse
          cx={cx}
          cy={cy + cupSize * 0.45}
          rx={cupSize * 0.5}
          ry={cupSize * 0.3}
          fill={`url(#${GLOW_ID})`}
        />
      </Svg>
    </>
  );
}
