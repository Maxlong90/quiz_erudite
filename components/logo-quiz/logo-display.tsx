import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { LQColors, LQRadius, LQShadow } from '@/constants/logo-quiz/theme';

/**
 * Shows the real brand logo for a quiz question inside the Logo Quiz's framed
 * card. The image (already resolved to a cached local file when available) is
 * rendered contained on a bright surface so real artwork reads cleanly, keeping
 * the rounded, softly-glowing card frame the game uses everywhere. Falls back to
 * a neutral placeholder when a question has no artwork.
 */
export function LogoDisplay({
  imageUri,
  size = 220,
  blurRadius,
}: {
  imageUri?: string | null;
  size?: number;
  /** Obscures the artwork (used to lock premium logos behind the paywall). */
  blurRadius?: number;
}) {
  return (
    <View style={[styles.card, LQShadow.card, { width: size, height: size }]}>
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={{ width: size * 0.74, height: size * 0.74 }}
          contentFit="contain"
          blurRadius={blurRadius}
          // Serve from the shared in-memory/on-disk cache so a logo that was
          // already decoded (grid → quiz, or a re-entered level) paints instantly
          // instead of re-fetching/re-decoding.
          cachePolicy="memory-disk"
          // Stable identity for FlatList tile recycling: reused views keep the
          // right artwork instead of briefly flashing the previous tile's image.
          recyclingKey={imageUri}
        />
      ) : (
        <Text style={[styles.placeholder, { fontSize: size * 0.4 }]}>?</Text>
      )}
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
    backgroundColor: LQColors.surface,
    borderWidth: 2,
    borderColor: LQColors.border,
  },
  placeholder: { color: LQColors.textFaint, fontWeight: '900' },
});
