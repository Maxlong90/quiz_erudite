import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

import { neonGlow } from '@/components/sport-quiz/ui';
import { SQColors, SQRadius } from '@/constants/sport-quiz/theme';

/**
 * One face in the Sports Legends level grid. Two states:
 *  - unsolved → a CLOSED tile: dark neon-glass card with a silhouette + "?" and
 *    the tile's position number. The photo is fully hidden (the whole point of
 *    the mode) until the player guesses the athlete.
 *  - solved   → the athlete's photo, revealed for good, with a neon check badge.
 * The tile is stateless; the parent decides the tap target (open the question).
 */
export function LegendTile({
  imageUri,
  size,
  index,
  solved,
  onPress,
}: {
  imageUri: string | null;
  size: number;
  index: number;
  solved: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        { width: size, height: size },
        styles.tile,
        neonGlow(SQColors.neon, 8),
        pressed && { transform: [{ scale: 0.96 }], opacity: 0.92 },
      ]}
    >
      {solved && imageUri ? (
        <>
          <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
          <View style={styles.doneBadge}>
            <Ionicons name="checkmark" size={13} color="#FFFFFF" />
          </View>
        </>
      ) : (
        <>
          <LinearGradient colors={[SQColors.glassStrong, SQColors.glass]} style={StyleSheet.absoluteFill} />
          <Ionicons name="person" size={Math.round(size * 0.34)} color={SQColors.glassBorder} />
          <Text style={styles.qmark}>?</Text>
          <Text style={styles.num}>{index}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    borderRadius: SQRadius.md,
    borderWidth: 1.5,
    borderColor: SQColors.neon,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qmark: {
    position: 'absolute',
    color: SQColors.neonPink,
    fontWeight: '900',
    fontSize: 26,
    textShadowColor: SQColors.neonPink,
    textShadowRadius: 10,
    textShadowOffset: { width: 0, height: 0 },
  },
  num: {
    position: 'absolute',
    top: 5,
    left: 7,
    color: SQColors.textMuted,
    fontWeight: '900',
    fontSize: 12,
  },
  doneBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: SQColors.neon,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
