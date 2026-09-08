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

import { CoinIcon } from '@/components/football-quiz/ui';
import { FQColors } from '@/constants/football-quiz/theme';
import { MOCK_WHEEL_SEGMENTS, wheelPrizeById, type WheelTier } from '@/lib/football-quiz/mock';

/** A <Rect> whose position can be driven by a Reanimated shared value. */
const AnimatedRect = Animated.createAnimatedComponent(Rect);

/**
 * The Football Quiz Wheel of Fortune graphic — a ring of 8 wedges. Ported from
 * components/sport-quiz/wheel-svg.tsx and restyled to the gold palette.
 *
 * Tier drives how loud a wedge is, exactly as in Sport Quiz:
 *   base (100)       — plain, quiet yellow. Five of the eight wedges.
 *   rare (500)       — brighter solid gold, thicker rim. Two wedges.
 *   legendary (1000) — the loudest: a white-hot gold gradient, a heavy rim and a
 *                      running sheen. One wedge, and it should be unmistakable.
 * The sheen sweeps across the rare + legendary wedges only, so the eye is pulled
 * to the big prizes and the ordinary ones stay calm.
 */
const FQ_WHEEL_TIER: Record<WheelTier, { fill: string; text: string; stroke: string; strokeW: number }> = {
  base: { fill: 'rgba(255, 201, 60, 0.34)', text: FQColors.text, stroke: 'rgba(255,233,176,0.55)', strokeW: 2 },
  rare: { fill: 'url(#fqWheelRareGrad)', text: FQColors.ink, stroke: FQColors.goldLight, strokeW: 3 },
  legendary: { fill: 'url(#fqWheelLegendGrad)', text: FQColors.ink, stroke: '#FFFFFF', strokeW: 4 },
};

const RARE_STOPS = ['#FFD86B', '#FFC93C', '#E39A00'];
const LEGEND_STOPS = ['#FFFFFF', '#FFE9B0', '#FFC93C', '#E39A00'];

/** A point on a circle, angle in degrees CLOCKWISE from the top (12 o'clock). */
export function polarPoint(cx: number, cy: number, r: number, deg: number) {
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

const SEG_DEG = 360 / MOCK_WHEEL_SEGMENTS.length;
const SHINY_WEDGES = MOCK_WHEEL_SEGMENTS.map((id, i) => ({ i, tier: wheelPrizeById(id).tier })).filter(
  (w) => w.tier !== 'base',
);

export function FQWheelSvg({ size }: { size: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2;
  const hub = size * 0.11;

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
        <LinearGradient id="fqWheelRareGrad" x1="0" y1="0" x2="1" y2="1">
          {RARE_STOPS.map((c, i) => (
            <Stop key={i} offset={i / (RARE_STOPS.length - 1)} stopColor={c} stopOpacity="1" />
          ))}
        </LinearGradient>
        <LinearGradient id="fqWheelLegendGrad" x1="0" y1="0" x2="1" y2="1">
          {LEGEND_STOPS.map((c, i) => (
            <Stop key={i} offset={i / (LEGEND_STOPS.length - 1)} stopColor={c} stopOpacity="1" />
          ))}
        </LinearGradient>
        <LinearGradient id="fqWheelSheen" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
          <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0.6" />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </LinearGradient>
        <ClipPath id="fqWheelShinyClip">
          {SHINY_WEDGES.map((w) => (
            <Path key={`c${w.i}`} d={wedgePath(cx, cy, r, w.i * SEG_DEG, (w.i + 1) * SEG_DEG)} />
          ))}
        </ClipPath>
      </Defs>

      {MOCK_WHEEL_SEGMENTS.map((id, i) => {
        const tier = FQ_WHEEL_TIER[wheelPrizeById(id).tier];
        return (
          <Path
            key={`w${i}`}
            d={wedgePath(cx, cy, r, i * SEG_DEG, (i + 1) * SEG_DEG)}
            fill={tier.fill}
            stroke={tier.stroke}
            strokeWidth={tier.strokeW}
          />
        );
      })}

      <G clipPath="url(#fqWheelShinyClip)">
        <AnimatedRect y={0} width={bandW} height={size} fill="url(#fqWheelSheen)" animatedProps={sheenProps} />
      </G>

      <Circle cx={cx} cy={cy} r={r - 1} fill="none" stroke={FQColors.goldLight} strokeWidth={3} />
      <Circle cx={cx} cy={cy} r={hub} fill={FQColors.bgDeep} stroke={FQColors.goldLight} strokeWidth={3} />
    </Svg>
  );
}

/**
 * Per-wedge prize labels — the red coin plus the amount, so the player can read
 * what each wedge pays. These are RN views (not SVG), so the caller stacks them
 * on top of FQWheelSvg inside the SAME rotating container; each label is rotated
 * onto its wedge centreline and spins with the wheel.
 */
export function FQWheelPrizeLabels({ size }: { size: number }) {
  const iconSize = size * 0.1;
  const radius = size * 0.29;

  return (
    <View style={[styles.iconsLayer, { width: size, height: size }]} pointerEvents="none">
      {MOCK_WHEEL_SEGMENTS.map((id, i) => {
        const prize = wheelPrizeById(id);
        const center = (i + 0.5) * SEG_DEG;
        const tier = FQ_WHEEL_TIER[prize.tier];
        return (
          <View key={`i${i}`} style={styles.segLayer}>
            <View style={[styles.segLabel, { transform: [{ rotate: `${center}deg` }, { translateY: -radius }] }]}>
              <CoinIcon size={iconSize} />
              <Text
                style={[styles.segAmount, { color: tier.text, fontSize: size * (prize.tier === 'legendary' ? 0.082 : 0.07) }]}
                allowFontScaling={false}
              >
                {prize.coins}
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
