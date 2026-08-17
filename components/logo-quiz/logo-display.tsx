import { Image as ExpoImage } from 'expo-image';
import { Image as RNImage, StyleSheet, Text, View } from 'react-native';

import { LQColors, LQRadius, LQShadow } from '@/constants/logo-quiz/theme';

/**
 * Shows the real brand logo for a quiz question inside the Logo Quiz's framed
 * card. The image (already resolved to a cached local file when available) is
 * rendered contained on a bright surface so real artwork reads cleanly, keeping
 * the rounded, softly-glowing card frame the game uses everywhere. Falls back to
 * a neutral placeholder when a question has no artwork.
 *
 * Two render paths, picked by whether `blurRadius` is set:
 *  - blurred (locked premium tile) → RN's Image, whose blurRadius reliably
 *    re-applies from the source bitmap. expo-image serves artwork from a shared
 *    URI-keyed memory-disk cache and will NOT re-apply a per-view blurRadius on
 *    top of an already-decoded, un-blurred entry — so a locked tile would render
 *    sharp and leak the premium logo through the paywall.
 *  - normal (playable tile / quiz / share) → expo-image with cachePolicy +
 *    recyclingKey, so a logo decoded once paints instantly on re-entry.
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
  const imageStyle = { width: size * 0.74, height: size * 0.74 };
  return (
    <View style={[styles.card, LQShadow.card, { width: size, height: size }]}>
      {imageUri ? (
        blurRadius != null ? (
          <RNImage
            source={{ uri: imageUri }}
            style={imageStyle}
            resizeMode="contain"
            blurRadius={blurRadius}
          />
        ) : (
          <ExpoImage
            source={{ uri: imageUri }}
            style={imageStyle}
            contentFit="contain"
            // Serve from the shared in-memory/on-disk cache so a logo that was
            // already decoded (grid → quiz, or a re-entered level) paints instantly
            // instead of re-fetching/re-decoding.
            cachePolicy="memory-disk"
            // Stable identity for FlatList tile recycling: reused views keep the
            // right artwork instead of briefly flashing the previous tile's image.
            recyclingKey={imageUri}
          />
        )
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
