import Svg, { Circle, Defs, G, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';

import { WHEEL_SEGMENTS, wheelPrizeById, type WheelTier } from '@/lib/logo-quiz/economy';
import { WHEEL_LEGENDARY_GRADIENT, WHEEL_TIER } from '@/constants/logo-quiz/theme';

/**
 * The Wheel of Fortune graphic — a static SVG ring of 9 coloured wedges. Rotation
 * is applied by the caller (wrap it in a Reanimated Animated.View), so this stays
 * a pure presentational component. Segment colours come from the prize tier:
 * legendary (1000 coins) gets the iridescent shimmer gradient, rare (500 coins /
 * 10 lives) an eye-catching accent, base the quiet neutral.
 */

/** A point on a circle, angle measured in degrees CLOCKWISE from the top (12 o'clock). */
export function polarPoint(cx: number, cy: number, r: number, deg: number): { x: number; y: number } {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.sin(rad), y: cy - r * Math.cos(rad) };
}

/** SVG path for a pie wedge spanning [a0, a1] degrees (clockwise from the top). */
export function wedgePath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const p0 = polarPoint(cx, cy, r, a0);
  const p1 = polarPoint(cx, cy, r, a1);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${p0.x} ${p0.y} A ${r} ${r} 0 ${large} 1 ${p1.x} ${p1.y} Z`;
}

const SEG_DEG = 360 / WHEEL_SEGMENTS.length;
const LEGENDARY_GRADIENT_ID = 'wheelLegendaryGrad';

function wedgeFill(tier: WheelTier): string {
  return tier === 'legendary' ? `url(#${LEGENDARY_GRADIENT_ID})` : WHEEL_TIER[tier].fill;
}

/** A short glyph + amount for a wedge label ('★' for coins, '♥' for lives). */
function labelParts(prizeId: string): { amount: string; glyph: string } {
  const { reward } = wheelPrizeById(prizeId);
  if (reward.coins != null) return { amount: String(reward.coins), glyph: '★' };
  return { amount: String(reward.lives), glyph: '♥' };
}

export function WheelSvg({ size, showLabels = true }: { size: number; showLabels?: boolean }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2;
  const hub = size * 0.11;

  return (
    <Svg width={size} height={size}>
      <Defs>
        {/* Iridescent legendary shimmer — a diagonal multi-hue sweep. */}
        <LinearGradient id={LEGENDARY_GRADIENT_ID} x1="0" y1="0" x2="1" y2="1">
          {WHEEL_LEGENDARY_GRADIENT.map((color, i) => (
            <Stop
              key={i}
              offset={i / (WHEEL_LEGENDARY_GRADIENT.length - 1)}
              stopColor={color}
              stopOpacity="1"
            />
          ))}
        </LinearGradient>
      </Defs>

      {/* Wedges */}
      {WHEEL_SEGMENTS.map((id, i) => {
        const prize = wheelPrizeById(id);
        return (
          <Path
            key={`w${i}`}
            d={wedgePath(cx, cy, r, i * SEG_DEG, (i + 1) * SEG_DEG)}
            fill={wedgeFill(prize.tier)}
            stroke="#FFFFFF"
            strokeWidth={2}
          />
        );
      })}

      {/* Labels — each rotated to sit along its wedge's centreline. */}
      {showLabels &&
        WHEEL_SEGMENTS.map((id, i) => {
          const prize = wheelPrizeById(id);
          const center = (i + 0.5) * SEG_DEG;
          const textColor = WHEEL_TIER[prize.tier].text;
          const { amount, glyph } = labelParts(id);
          return (
            <G key={`l${i}`} rotation={center} origin={`${cx}, ${cy}`}>
              <SvgText
                x={cx}
                y={cy - r * 0.6}
                fill={textColor}
                fontSize={size * 0.075}
                fontWeight="900"
                textAnchor="middle"
              >
                {amount}
              </SvgText>
              <SvgText
                x={cx}
                y={cy - r * 0.46}
                fill={textColor}
                fontSize={size * 0.07}
                fontWeight="900"
                textAnchor="middle"
              >
                {glyph}
              </SvgText>
            </G>
          );
        })}

      {/* Rim + hub */}
      <Circle cx={cx} cy={cy} r={r - 1} fill="none" stroke="#E0930A" strokeWidth={3} />
      <Circle cx={cx} cy={cy} r={hub} fill="#FFFFFF" stroke="#E0930A" strokeWidth={3} />
    </Svg>
  );
}
