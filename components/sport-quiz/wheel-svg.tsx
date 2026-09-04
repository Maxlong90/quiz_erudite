import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, ClipPath, Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { CoinIcon } from '@/components/sport-quiz/ui';
import { WHEEL_SEGMENTS, wheelPrizeById, type WheelTier } from '@/lib/sport-quiz/economy';
import { SQColors } from '@/constants/sport-quiz/theme';

/** A `<Rect>` whose position can be driven by a Reanimated shared value. */
const AnimatedRect = Animated.createAnimatedComponent(Rect);

/**
 * The Sport Quiz Wheel of Fortune graphic — a static SVG ring of 8 coloured
 * wedges (coins only). Rotation is applied by the caller (wrap it in a Reanimated
 * Animated.View), so this stays a pure presentational component. Segment colours
 * come from the prize tier: legendary (1000 coins) gets the iridescent gold
 * shimmer, rare (500 coins) the hot-magenta accent, base the quiet aqua glass.
 * Ported from components/logo-quiz/wheel-svg.tsx, restyled to the SQ palette.
 */

/** Tier → wedge fill / label colours in the SQ palette. */
const SQ_WHEEL_TIER: Record<WheelTier, { fill: string; text: string }> = {
  base: { fill: 'rgba(46, 208, 255, 0.28)', text: SQColors.text }, // aqua glass
  rare: { fill: SQColors.neonPink, text: '#FFFFFF' }, // hot magenta
  legendary: { fill: `url(#sqWheelGoldGrad)`, text: SQColors.textOnNeon }, // gold shimmer
};

const SQ_GOLD_STOPS = ['#FFE27A', '#FFC93C', '#E39A00'];

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
const GOLD_GRADIENT_ID = 'sqWheelGoldGrad';
const SHEEN_GRADIENT_ID = 'sqWheelSheenGrad';
const SHINY_CLIP_ID = 'sqWheelShinyClip';

/** Indices of the "shiny" wedges (everything above base) — they get the running sheen. */
const SHINY_WEDGES = WHEEL_SEGMENTS.map((id, i) => ({ i, tier: wheelPrizeById(id).tier })).filter(
  (w) => w.tier !== 'base',
);

function wedgeFill(tier: WheelTier): string {
  return SQ_WHEEL_TIER[tier].fill;
}

export function WheelSvg({ size }: { size: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2;
  const hub = size * 0.11;

  // A soft white band that continuously sweeps left→right; clipped to the shiny
  // wedges it reads as a premium sheen. Width ~28% of the wheel.
  const bandW = size * 0.28;
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 2200, easing: Easing.linear }), -1, false);
  }, [progress]);
  const sheenProps = useAnimatedProps(() => ({
    x: interpolate(progress.value, [0, 1], [-bandW, size]),
  }));

  return (
    <Svg width={size} height={size}>
      <Defs>
        {/* Premium gold for the legendary (1000 coins) wedge. */}
        <LinearGradient id={GOLD_GRADIENT_ID} x1="0" y1="0" x2="1" y2="1">
          {SQ_GOLD_STOPS.map((color, i) => (
            <Stop key={i} offset={i / (SQ_GOLD_STOPS.length - 1)} stopColor={color} stopOpacity="1" />
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
            stroke={SQColors.neonBright}
            strokeWidth={2}
          />
        );
      })}

      {/* Running sheen, clipped to the shiny wedges (drawn above their fills). */}
      <G clipPath={`url(#${SHINY_CLIP_ID})`}>
        <AnimatedRect y={0} width={bandW} height={size} fill={`url(#${SHEEN_GRADIENT_ID})`} animatedProps={sheenProps} />
      </G>

      {/* Rim + hub — neon aqua rim, glass hub. */}
      <Circle cx={cx} cy={cy} r={r - 1} fill="none" stroke={SQColors.neon} strokeWidth={3} />
      <Circle cx={cx} cy={cy} r={hub} fill={SQColors.bgDeep} stroke={SQColors.neon} strokeWidth={3} />
    </Svg>
  );
}

/**
 * The wheel's per-wedge prize labels, drawn with the app's real gold CoinIcon and
 * the coin amount beside each. These are React Native components (not SVG), so they
 * live in an absolute overlay the CALLER stacks on top of `WheelSvg` inside the
 * SAME rotating container. Each label is rotated onto its wedge's centreline so it
 * spins with the wheel and never shifts where the wheel lands.
 */
export function WheelPrizeIcons({ size }: { size: number }) {
  const iconSize = size * 0.1;
  const radius = size * 0.29; // distance of the label group from the wheel centre

  return (
    <View style={[styles.iconsLayer, { width: size, height: size }]} pointerEvents="none">
      {WHEEL_SEGMENTS.map((id, i) => {
        const prize = wheelPrizeById(id);
        // Each label rotated onto its wedge centreline (rotate + push outward), so it
        // reads along the radius and spins with the wheel — identical to Logo Quiz.
        const center = (i + 0.5) * SEG_DEG;
        const textColor = SQ_WHEEL_TIER[prize.tier].text;
        return (
          <View key={`i${i}`} style={styles.segLayer}>
            <View style={[styles.segLabel, { transform: [{ rotate: `${center}deg` }, { translateY: -radius }] }]}>
              <CoinIcon size={iconSize} />
              <Text style={[styles.segAmount, { color: textColor, fontSize: size * 0.07 }]} allowFontScaling={false}>
                {prize.reward.coins}
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
  segLayer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  segLabel: { alignItems: 'center', gap: 2 },
  segAmount: { fontWeight: '900' },
});
