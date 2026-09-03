import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeOut } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { SQColors } from '@/constants/sport-quiz/theme';

/**
 * The puzzle plates laid over a Sports Legends photo. A cols×rows grid of opaque
 * neon-glass plates hides the picture; tapping a plate uncovers that piece (the
 * parent charges coins per tap and adds the index to `revealed`). A revealed
 * plate fades out and leaves its slot transparent so the photo shows through.
 * When `revealAll` is set (the athlete was guessed / skipped) every remaining
 * plate fades away at once and taps are ignored.
 *
 * Rendered as an absolute-fill layer inside the image frame, so it lines up 1:1
 * with the photo underneath.
 */
export function PuzzleOverlay({
  cols,
  rows,
  revealed,
  revealAll,
  onTapPlate,
}: {
  cols: number;
  rows: number;
  revealed: Set<number>;
  revealAll: boolean;
  onTapPlate: (index: number) => void;
}) {
  const total = cols * rows;
  return (
    <View style={styles.layer} pointerEvents={revealAll ? 'none' : 'auto'}>
      {Array.from({ length: total }, (_, i) => {
        const gone = revealAll || revealed.has(i);
        return (
          <View key={i} style={[styles.cell, { width: `${100 / cols}%`, height: `${100 / rows}%` }]}>
            {!gone && (
              <Animated.View exiting={FadeOut.duration(220)} style={StyleSheet.absoluteFill}>
                <Pressable style={styles.plate} onPress={() => onTapPlate(i)}>
                  <LinearGradient colors={[SQColors.glassStrong, SQColors.glass]} style={StyleSheet.absoluteFill} />
                  {/* A football on every plate — the reveal grid reads as a set of
                      soccer tiles until the photo is uncovered. */}
                  <MaterialCommunityIcons name="soccer" size={26} color="rgba(43,255,179,0.5)" />
                </Pressable>
              </Animated.View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: { padding: 1.5 },
  plate: {
    flex: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(43,255,179,0.25)',
    backgroundColor: 'rgba(9,24,40,0.96)',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
