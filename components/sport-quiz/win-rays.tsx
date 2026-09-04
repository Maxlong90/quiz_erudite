import Svg, { Defs, Ellipse, Polygon, RadialGradient, Stop } from 'react-native-svg';

import { SQColors } from '@/constants/sport-quiz/theme';

/**
 * The Win screen's backdrop flourish: a sunburst of gold rays fanning out from the
 * trophy, plus a soft golden halo under its base so the cup reads as if it is lit
 * from within.
 *
 * The rays are drawn long enough to always run PAST the screen corners (never a
 * visible ray tip), and the whole thing is a static, absolutely-positioned layer —
 * purely decorative, so it never intercepts touches.
 */

/** Degrees between neighbouring rays. */
const RAY_STEP = 24;
/** Half-width of one ray, in degrees. */
const RAY_HALF = 5.5;
const RAY_OPACITY = 0.16;
const GLOW_ID = 'sqWinGlow';

function rayPoints(cx: number, cy: number, r: number, angleDeg: number): string {
  const a0 = ((angleDeg - RAY_HALF) * Math.PI) / 180;
  const a1 = ((angleDeg + RAY_HALF) * Math.PI) / 180;
  return (
    `${cx},${cy} ` +
    `${(cx + r * Math.cos(a0)).toFixed(1)},${(cy + r * Math.sin(a0)).toFixed(1)} ` +
    `${(cx + r * Math.cos(a1)).toFixed(1)},${(cy + r * Math.sin(a1)).toFixed(1)}`
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
  const reach =
    Math.hypot(Math.max(cx, width - cx), Math.max(cy, height - cy)) * 1.25;
  const angles = Array.from({ length: Math.round(360 / RAY_STEP) }, (_, i) => i * RAY_STEP);

  return (
    <Svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0 }} pointerEvents="none">
      <Defs>
        <RadialGradient id={GLOW_ID}>
          <Stop offset="0" stopColor={SQColors.coin} stopOpacity="0.55" />
          <Stop offset="1" stopColor={SQColors.coin} stopOpacity="0" />
        </RadialGradient>
      </Defs>

      {angles.map((a) => (
        <Polygon key={a} points={rayPoints(cx, cy, reach, a)} fill={SQColors.coin} opacity={RAY_OPACITY} />
      ))}

      {/* Halo pooled under the cup's base. */}
      <Ellipse
        cx={cx}
        cy={cy + cupSize * 0.45}
        rx={cupSize * 0.5}
        ry={cupSize * 0.3}
        fill={`url(#${GLOW_ID})`}
      />
    </Svg>
  );
}
