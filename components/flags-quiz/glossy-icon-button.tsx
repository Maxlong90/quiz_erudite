import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { FQColors } from '@/constants/flags-quiz/theme';

/**
 * Glossy blue rounded-square icon button, recreated to match the reference
 * settings tile: a light-blue → medium-blue diagonal gradient, a soft white
 * gloss band along the top, a darker-blue rim, and a navy glyph. The Settings
 * (gear) and Shop (bag) buttons are the SAME component so they read as a
 * matching set at identical size — the shop icon is "generated from the gear"
 * simply by swapping the glyph. Colours are sampled from the reference art
 * (see FQColors.tile*).
 */

export type GlossyGlyph = 'settings-sharp' | 'bag-handle' | 'chevron-back';

interface Props {
  glyph: GlossyGlyph;
  size?: number;
}

/** Purely visual — wrap in a Pressable to make it tappable. */
export function GlossyIconButton({ glyph, size = 54 }: Props) {
  const radius = size * 0.28;
  const glyphSize = size * 0.52;
  // Rim inset so the stroke sits fully inside the square.
  const inset = Math.max(1.5, size * 0.03);

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="fqTile" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={FQColors.tileLight} />
            <Stop offset="1" stopColor={FQColors.tileDark} />
          </LinearGradient>
          {/* Top gloss — bright at the very top, fading to nothing by mid-height. */}
          <LinearGradient id="fqGloss" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.55" />
            <Stop offset="0.55" stopColor="#FFFFFF" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        {/* Base tile */}
        <Rect
          x={inset}
          y={inset}
          width={size - inset * 2}
          height={size - inset * 2}
          rx={radius}
          ry={radius}
          fill="url(#fqTile)"
          stroke={FQColors.tileRim}
          strokeWidth={inset}
        />
        {/* Gloss overlay, inset a touch so it stays within the rim */}
        <Rect
          x={inset * 2}
          y={inset * 2}
          width={size - inset * 4}
          height={(size - inset * 4) * 0.55}
          rx={radius * 0.8}
          ry={radius * 0.8}
          fill="url(#fqGloss)"
        />
      </Svg>
      <View style={styles.glyph} pointerEvents="none">
        <Ionicons name={glyph} size={glyphSize} color={FQColors.tileGlyph} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  glyph: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
});
