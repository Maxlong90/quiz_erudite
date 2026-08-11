import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { LogoDisplay } from '@/components/logo-quiz/logo-display';
import { LQColors, LQRadius } from '@/constants/logo-quiz/theme';

/**
 * A single logo in the level grid. Shows the brand artwork via LogoDisplay with
 * three states layered on top:
 *  - solved   → a green check badge (tap opens the question in review mode)
 *  - locked   → a premium logo the current user can't play yet: the artwork is
 *               blurred (RN Image blurRadius — no native BlurView, Expo-Go safe)
 *               under a translucent scrim + crown (tap routes to the paywall)
 *  - playable → plain artwork (tap starts the question)
 * The tap target and routing are decided by the parent; the tile is stateless.
 */
export function LogoTile({
  imageUri,
  size,
  solved,
  locked,
  onPress,
}: {
  imageUri: string | null;
  size: number;
  solved: boolean;
  locked: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [{ width: size, height: size }, pressed && { transform: [{ scale: 0.96 }] }]}
    >
      <LogoDisplay imageUri={imageUri} size={size} blurRadius={locked ? 14 : undefined} />

      {locked && (
        <View style={[styles.overlay, styles.lockScrim]}>
          <Ionicons name="lock-closed" size={Math.round(size * 0.24)} color="#fff" />
        </View>
      )}

      {solved && !locked && (
        <View style={styles.doneBadge}>
          <Ionicons name="checkmark" size={14} color="#fff" />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: LQRadius.lg,
  },
  lockScrim: { backgroundColor: 'rgba(21,27,46,0.45)' },
  doneBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: LQColors.success,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
});
