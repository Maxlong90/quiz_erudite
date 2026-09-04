import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  interpolate,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, ClipPath, Defs, G, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';

import { CoinIcon } from '@/components/logo-quiz/coin-icon';
import { WHEEL_SEGMENTS, wheelPrizeById, type WheelTier } from '@/lib/logo-quiz/economy';
import { GOLD_GRADIENT, LQColors, WHEEL_TIER } from '@/constants/logo-quiz/theme';

/** A `<Rect>` whose position can be driven by a Reanimated shared value. */
const AnimatedRect = Animated.createAnimatedComponent(Rect);

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
const GOLD_GRADIENT_ID = 'wheelGoldGrad';
const SHEEN_GRADIENT_ID = 'wheelSheenGrad';
const SHINY_CLIP_ID = 'wheelShinyClip';

/** Indices of the "shiny" wedges (everything above base) — they get the running sheen. */
const SHINY_WEDGES = WHEEL_SEGMENTS.map((id, i) => ({ i, tier: wheelPrizeById(id).tier })).filter(
  (w) => w.tier !== 'base',
);

function wedgeFill(tier: WheelTier): string {
  // Legendary (1000 coins) = solid premium gold; rare keeps its accent colour.
  // Both get the animated sheen swept over them below.
  return tier === 'legendary' ? `url(#${GOLD_GRADIENT_ID})` : WHEEL_TIER[tier].fill;
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

  // A soft white band that continuously sweeps left→right; clipped to the shiny
  // wedges it reads as the same "premium sheen" as the gold banner. Width ~28% of
  // the wheel; travels from just off the left edge to just past the right.
  const bandW = size * 0.28;
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.linear }),
      -1,
      false,
    );
  }, [progress]);
  const sheenProps = useAnimatedProps(() => ({
    x: interpolate(progress.value, [0, 1], [-bandW, size]),
  }));

  return (
    <Svg width={size} height={size}>
      <Defs>
        {/* Premium gold for the legendary (1000 coins) wedge. */}
        <LinearGradient id={GOLD_GRADIENT_ID} x1="0" y1="0" x2="1" y2="1">
          {GOLD_GRADIENT.map((color, i) => (
            <Stop key={i} offset={i / (GOLD_GRADIENT.length - 1)} stopColor={color} stopOpacity="1" />
          ))}
        </LinearGradient>
        {/* The running sheen band — soft white, feathered at both edges. */}
        <LinearGradient id={SHEEN_GRADIENT_ID} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
          <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0.6" />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </LinearGradient>
        {/* Sheen is only visible over the shiny (rare + legendary) wedges. */}
        <ClipPath id={SHINY_CLIP_ID}>
          {SHINY_WEDGES.map((w) => (
            <Path key={`c${w.i}`} d={wedgePath(cx, cy, r, w.i * SEG_DEG, (w.i + 1) * SEG_DEG)} />
          ))}
        </ClipPath>
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

      {/* Running sheen, clipped to the shiny wedges (drawn above their fills). */}
      <G clipPath={`url(#${SHINY_CLIP_ID})`}>
        <AnimatedRect
          y={0}
          width={bandW}
          height={size}
          fill={`url(#${SHEEN_GRADIENT_ID})`}
          animatedProps={sheenProps}
        />
      </G>

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

/**
 * The wheel's per-wedge prize labels, drawn with the app's real currency icons —
 * the gold `CoinIcon` for coin prizes and the red app heart for lives — with the
 * amount beside each. These are React Native components (not SVG primitives), so
 * they live in an absolute overlay that the CALLER stacks on top of `WheelSvg`
 * inside the SAME rotating container (pass `showLabels={false}` to `WheelSvg` to
 * avoid double labels). Each label is rotated onto its wedge's centreline exactly
 * like the old SVG `<G rotation>` labels, so it spins with the wheel and never
 * shifts the angle mapping that lands the wheel on the won prize.
 */
export function WheelPrizeIcons({ size }: { size: number }) {
  const iconSize = size * 0.1;
  const radius = size * 0.29; // distance of the label group from the wheel centre

  return (
    <View style={[styles.iconsLayer, { width: size, height: size }]} pointerEvents="none">
      {WHEEL_SEGMENTS.map((id, i) => {
        const prize = wheelPrizeById(id);
        const center = (i + 0.5) * SEG_DEG;
        const textColor = WHEEL_TIER[prize.tier].text;
        const isCoin = prize.reward.coins != null;
        const amount = isCoin ? prize.reward.coins : prize.reward.lives;
        return (
          <View key={`i${i}`} style={styles.segLayer}>
            <View
              style={[
                styles.segLabel,
                { transform: [{ rotate: `${center}deg` }, { translateY: -radius }] },
              ]}
            >
              {isCoin ? (
                <CoinIcon size={iconSize} />
              ) : (
                <Ionicons name="heart" size={iconSize} color={LQColors.heart} />
              )}
              <Text
                style={[styles.segAmount, { color: textColor, fontSize: size * 0.07 }]}
                allowFontScaling={false}
              >
                {amount}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  iconsLayer: { position: 'absolute', top: 0, left: 0 },
  // Each label occupies the full square and centres its content on the hub, so the
  // rotate + outward translate places it along its wedge's centreline.
  segLayer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  segLabel: { alignItems: 'center', gap: 2 },
  segAmount: { fontWeight: '900' },
});
