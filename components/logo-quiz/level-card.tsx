import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { LQColors, LQRadius, LQShadow } from '@/constants/logo-quiz/theme';
import { useLQLabels } from '@/constants/logo-quiz/labels';

/**
 * One row in the Logo Quiz level-select list. An unlocked level shows our blue
 * card with "Level N", a solved/total count (premium solves included) and a
 * progress bar; a fully-solved level gets a green check. A locked level is a
 * dark, non-tappable card prompting the player to finish the previous one.
 * Progress is passed in (derived from the solved-id set) — the card is stateless.
 */
export function LevelCard({
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
  const t = useLQLabels();
  const title = t.level.replace('{n}', String(level));
  const done = total > 0 && solved >= total;
  const fillRatio = total > 0 ? Math.min(1, solved / total) : 0;

  if (!unlocked) {
    return (
      <View style={[styles.card, styles.cardLocked, LQShadow.card]}>
        <View style={styles.lockIcon}>
          <Ionicons name="lock-closed" size={18} color={LQColors.surface} />
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
        styles.cardUnlocked,
        LQShadow.card,
        pressed && { transform: [{ scale: 0.98 }] },
      ]}
    >
      <View style={styles.numberBadge}>
        <Text style={styles.numberText}>{level}</Text>
      </View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
          {done && (
            <View style={styles.doneBadge}>
              <Ionicons name="checkmark" size={13} color="#fff" />
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
    borderRadius: LQRadius.lg,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  cardUnlocked: {
    backgroundColor: LQColors.primary,
  },
  cardLocked: {
    backgroundColor: LQColors.text,
    opacity: 0.9,
  },
  numberBadge: {
    width: 46,
    height: 46,
    borderRadius: LQRadius.md,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: { color: '#fff', fontWeight: '900', fontSize: 20 },
  lockIcon: {
    width: 46,
    height: 46,
    borderRadius: LQRadius.md,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: '#fff', fontWeight: '900', fontSize: 18 },
  titleLocked: { color: LQColors.surface, fontWeight: '900', fontSize: 18 },
  lockedHint: { color: 'rgba(255,255,255,0.7)', fontWeight: '700', fontSize: 13, marginTop: 4 },
  track: {
    height: 8,
    borderRadius: LQRadius.pill,
    backgroundColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: LQRadius.pill, backgroundColor: LQColors.success },
  count: { color: '#fff', fontWeight: '800', fontSize: 14 },
  doneBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: LQColors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
