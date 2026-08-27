import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import { FQColors } from '@/constants/flags-quiz/theme';

/**
 * Data-driven flag renderer used by the "By continent" game, where the answer
 * options are flag PICTURES. A flag is described by a small spec (equal/weighted
 * colour bands, a centred disc, or a Union-Jack canton) and drawn at a FIXED box
 * size so every option is identical, inside the same navy rim frame as the flag
 * on the "All countries" screen.
 *
 * These are simplified placeholder flags (emblems/stars omitted) until the real
 * flag-image catalogue is wired from the backend.
 */

export type FlagSpec =
  | { kind: 'bands'; dir: 'h' | 'v'; bands: { color: string; weight?: number }[] }
  | { kind: 'disc'; bg: string; color: string; r?: number; cx?: number; cy?: number }
  | { kind: 'canton'; field: string };

const VBW = 60;
const VBH = 40;

function Bands({ dir, bands }: { dir: 'h' | 'v'; bands: { color: string; weight?: number }[] }) {
  const total = bands.reduce((s, b) => s + (b.weight ?? 1), 0);
  let cursor = 0;
  return (
    <>
      {bands.map((b, i) => {
        const frac = (b.weight ?? 1) / total;
        const rect =
          dir === 'h' ? (
            <Rect key={i} x={0} y={cursor * VBH} width={VBW} height={frac * VBH} fill={b.color} />
          ) : (
            <Rect key={i} x={cursor * VBW} y={0} width={frac * VBW} height={VBH} fill={b.color} />
          );
        cursor += frac;
        return rect;
      })}
    </>
  );
}

// Simplified Union Jack (no saltire counterchange) drawn in a 60×30 space — used
// scaled into a canton for a couple of Oceania flags.
function MiniUnionJack() {
  return (
    <>
      <Rect x={0} y={0} width={60} height={30} fill="#012169" />
      <Path d="M0,0 L60,30 M60,0 L0,30" stroke="#ffffff" strokeWidth={6} />
      <Path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth={2} />
      <Path d="M30,0 V30 M0,15 H60" stroke="#ffffff" strokeWidth={10} />
      <Path d="M30,0 V30 M0,15 H60" stroke="#C8102E" strokeWidth={6} />
    </>
  );
}

function FlagBody({ spec }: { spec: FlagSpec }) {
  if (spec.kind === 'bands') return <Bands dir={spec.dir} bands={spec.bands} />;
  if (spec.kind === 'disc') {
    return (
      <>
        <Rect x={0} y={0} width={VBW} height={VBH} fill={spec.bg} />
        <Circle cx={spec.cx ?? 30} cy={spec.cy ?? 20} r={spec.r ?? 11} fill={spec.color} />
      </>
    );
  }
  // canton: solid field + a Union Jack in the top-left quarter.
  return (
    <>
      <Rect x={0} y={0} width={VBW} height={VBH} fill={spec.field} />
      <G transform="translate(0,0) scale(0.5)">
        <MiniUnionJack />
      </G>
    </>
  );
}

export function FlagImage({
  spec,
  width,
  height,
}: {
  spec: FlagSpec;
  width: number;
  height: number;
}) {
  return (
    <View style={[styles.frame, { width, height }]}>
      <Svg width={width} height={height} viewBox={`0 0 ${VBW} ${VBH}`} preserveAspectRatio="none">
        <FlagBody spec={spec} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  // Same navy rim frame as the flag on the "All countries" screen, hugging the flag.
  frame: {
    borderWidth: 3,
    borderColor: FQColors.tileRim,
    borderRadius: 6,
    overflow: 'hidden',
  },
});
