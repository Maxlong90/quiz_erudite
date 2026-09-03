import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { ItalyColors } from '@/constants/italy-quiz/theme';

/**
 * Glossy dark-navy rounded-square icon button — the same deep-blue tile as the
 * home Play button (royal-blue → deep-navy gradient, white gloss band along the
 * top, dark-navy rim, white glyph). Built from LinearGradient + a flex-centred
 * Ionicons glyph (NOT react-native-svg): the SVG version mis-sized its tile on
 * some runtimes so the glyph floated outside the square. Used for the Settings
 * (gear) button on the home screen and Back on inner screens.
 */

export type GlossyGlyph =
  | 'settings-sharp'
  | 'chevron-back'
  | 'phone-portrait'
  | 'ellipsis-horizontal'
  | 'share-social'
  | 'help';

interface Props {
  glyph: GlossyGlyph;
  size?: number;
}

/** Purely visual — wrap in a Pressable to make it tappable. */
export function GlossyIconButton({ glyph, size = 54 }: Props) {
  const radius = size * 0.28;
  const glyphSize = size * 0.52;
  const border = Math.max(1.5, size * 0.037);

  return (
    <LinearGradient
      colors={[ItalyColors.tileLight, ItalyColors.tileDark]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.tile,
        { width: size, height: size, borderRadius: radius, borderWidth: border },
      ]}
    >
      {/* Top gloss band, matching the Play button. */}
      <LinearGradient
        colors={['rgba(255,255,255,0.5)', 'rgba(255,255,255,0)']}
        style={[styles.gloss, { borderTopLeftRadius: radius - 2, borderTopRightRadius: radius - 2 }]}
        pointerEvents="none"
      />
      <View style={styles.glyph} pointerEvents="none">
        <Ionicons name={glyph} size={glyphSize} color={ItalyColors.tileGlyph} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: ItalyColors.tileRim,
  },
  gloss: {
    position: 'absolute',
    top: 1,
    left: 1,
    right: 1,
    height: '50%',
  },
  glyph: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
});
