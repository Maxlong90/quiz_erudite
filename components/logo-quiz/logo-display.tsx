import { StyleSheet, Text, View } from 'react-native';

import { LQColors, LQRadius, LQShadow } from '@/constants/logo-quiz/theme';
import type { LogoQuestion } from '@/constants/logo-quiz/mock-data';

/**
 * Renders a mock brand "logo" (an emoji mark on the brand colour) in one of the
 * spec's three reveal modes:
 *   - full      → shown clearly
 *   - blurred   → smeared (offset low-opacity copies) — the "blurred" look
 *   - pixelated → a translucent mosaic grid breaks the mark into blocks
 *   - hidden    → opaque bars cover the top & bottom, leaving a centre slit
 * Real blur on an emoji glyph isn't possible (blurRadius applies to images
 * only), so blur/pixelate are approximated with overlays — enough to make the
 * three difficulty modes visually distinct for this mock.
 */
export function LogoDisplay({ question, size = 220 }: { question: LogoQuestion; size?: number }) {
  const { glyph, brandColor, displayMode } = question;
  const glyphSize = size * 0.46;

  return (
    <View
      style={[
        styles.card,
        LQShadow.card,
        { width: size, height: size, backgroundColor: brandColor },
      ]}
    >
      {displayMode === 'blurred' ? (
        <BlurredGlyph glyph={glyph} glyphSize={glyphSize} />
      ) : (
        <Text style={[styles.glyph, { fontSize: glyphSize }]}>{glyph}</Text>
      )}

      {displayMode === 'pixelated' && <PixelMosaic size={size} color={brandColor} />}
      {displayMode === 'hidden' && <HiddenBars size={size} color={brandColor} />}
    </View>
  );
}

/** Poor-man's blur: several offset, low-opacity copies smear the glyph. */
function BlurredGlyph({ glyph, glyphSize }: { glyph: string; glyphSize: number }) {
  const offsets = [
    { x: -4, y: -4 },
    { x: 4, y: 4 },
    { x: -4, y: 4 },
    { x: 4, y: -4 },
    { x: 0, y: 0 },
  ];
  return (
    <View style={StyleSheet.absoluteFill}>
      {offsets.map((o, i) => (
        <View key={i} style={[StyleSheet.absoluteFill, styles.center]}>
          <Text
            style={[
              styles.glyph,
              { fontSize: glyphSize, opacity: 0.34, transform: [{ translateX: o.x }, { translateY: o.y }] },
            ]}
          >
            {glyph}
          </Text>
        </View>
      ))}
      <View style={[StyleSheet.absoluteFill, styles.frost]} />
    </View>
  );
}

/** Translucent block grid overlaid on the glyph → a mosaic / pixelated look. */
function PixelMosaic({ size, color }: { size: number; color: string }) {
  const cols = 7;
  const cell = size / cols;
  const cells = Array.from({ length: cols * cols }, (_, i) => i);
  return (
    <View style={[StyleSheet.absoluteFill, styles.mosaic]} pointerEvents="none">
      {cells.map((i) => (
        <View
          key={i}
          style={{
            width: cell,
            height: cell,
            backgroundColor: color,
            opacity: (i * 7 + 3) % 5 === 0 ? 0.25 : 0.62,
          }}
        />
      ))}
    </View>
  );
}

/** Opaque bars cover the top and bottom, leaving a central horizontal slit. */
function HiddenBars({ size, color }: { size: number; color: string }) {
  const bar = size * 0.36;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: bar, backgroundColor: color }} />
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: bar, backgroundColor: color }} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: LQRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    alignSelf: 'center',
  },
  glyph: { textAlign: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
  frost: { backgroundColor: '#ffffff22' },
  mosaic: { flexDirection: 'row', flexWrap: 'wrap' },
});
