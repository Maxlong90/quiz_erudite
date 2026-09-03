import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { neonGlow } from '@/components/sport-quiz/ui';
import { SQColors, SQRadius } from '@/constants/sport-quiz/theme';
import { useSQLabels } from '@/constants/sport-quiz/labels';

/**
 * One row in the Sport Quiz Select-Level list, in the app's neon-glass look. An
 * unlocked level is a glass card with a neon-rimmed number chip, "Level N", a
 * solved/total count and an aqua progress bar; a fully-solved level gets a neon
 * check. A locked level is a dimmed, non-tappable card prompting the player to
 * finish the previous one. Progress is passed in (derived from the solved-id
 * set) — the card is stateless. Mirrors components/logo-quiz/level-card.tsx.
 */
export function SportLevelCard({
  level,
  solved,
  total,
  unlocked,
  onPress,
}: {
  level: number;
  solved: number;
  total: number;
  unlocked: boolean;
  onPress: () => void;
}) {
  const t = useSQLabels();
  const title = t.levelLabel.replace('{n}', String(level));
  const done = total > 0 && solved >= total;
  const fillRatio = total > 0 ? Math.min(1, solved / total) : 0;

  if (!unlocked) {
    return (
      <View style={[styles.card, styles.cardLocked]}>
        <LinearGradient colors={[SQColors.glassStrong, SQColors.glass]} style={[StyleSheet.absoluteFill, { borderRadius: SQRadius.lg }]} />
        <View style={styles.lockChip}>
          <Ionicons name="lock-closed" size={18} color={SQColors.textMuted} />
        </View>
        <View style={styles.body}>
          <Text style={styles.titleLocked}>{title}</Text>
          <Text style={styles.lockedHint}>{t.finishPrevious}</Text>
        </View>
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        neonGlow(SQColors.neon, 12),
        pressed && { transform: [{ scale: 0.98 }], opacity: 0.92 },
      ]}
    >
      <LinearGradient colors={[SQColors.glassStrong, SQColors.glass]} style={[StyleSheet.absoluteFill, { borderRadius: SQRadius.lg }]} />
      <View style={styles.numberChip}>
        <Text style={styles.numberText}>{level}</Text>
      </View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
          {done && (
            <View style={styles.doneBadge}>
              <Ionicons name="checkmark" size={13} color="#FFFFFF" />
            </View>
          )}
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${fillRatio * 100}%` }]} />
        </View>
        <Text style={styles.count}>
          {solved}/{total}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: SQRadius.lg,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: SQColors.neon,
    overflow: 'hidden',
  },
  cardLocked: { borderColor: SQColors.glassBorderDim, opacity: 0.75 },
  numberChip: {
    width: 46,
    height: 46,
    borderRadius: SQRadius.md,
    backgroundColor: 'rgba(43,255,179,0.16)',
    borderWidth: 1.5,
    borderColor: SQColors.neon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: { color: '#EAFFF8', fontWeight: '900', fontSize: 20 },
  lockChip: {
    width: 46,
    height: 46,
    borderRadius: SQRadius.md,
    backgroundColor: 'rgba(143,169,194,0.12)',
    borderWidth: 1.5,
    borderColor: SQColors.glassBorderDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: '#EAFFF8', fontWeight: '900', fontSize: 18 },
  titleLocked: { color: SQColors.textMuted, fontWeight: '900', fontSize: 18 },
  lockedHint: { color: SQColors.textMuted, fontWeight: '700', fontSize: 13, marginTop: 4 },
  track: {
    height: 8,
    borderRadius: SQRadius.pill,
    backgroundColor: 'rgba(143,169,194,0.25)',
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: SQRadius.pill, backgroundColor: SQColors.neon },
  count: { color: SQColors.text, fontWeight: '800', fontSize: 14 },
  doneBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: SQColors.neonPink,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
