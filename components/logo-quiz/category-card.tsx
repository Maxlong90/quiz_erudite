import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { LQColors, LQRadius, LQShadow } from '@/constants/logo-quiz/theme';
import { useLQLabels } from '@/constants/logo-quiz/labels';
import { useLogoQuiz } from '@/hooks/logo-quiz/use-logo-quiz';

/**
 * One square tile in a Logo Quiz category grid: emoji + (already localized)
 * name, with an optional VIP badge (a lock when the category is locked for the
 * current user). Shows the player's level progress as passed/total (e.g. 7/40,
 * or 0/0 for an empty category) and a green check once the category has been
 * fully completed. Shared by the main and VIP screens. Progress is keyed by the
 * backend category `slug`.
 */
export function CategoryCard({
  slug,
  name,
  emoji,
  iconUri,
  vip,
  total,
  width,
  height,
  locked,
  onPress,
}: {
  slug: string;
  name: string;
  emoji: string;
  /** Backend category icon; falls back to `emoji` when null/undefined. */
  iconUri?: string | null;
  vip: boolean;
  total: number;
  width: number;
  height: number;
  locked: boolean;
  onPress: () => void;
}) {
  const t = useLQLabels();
  const { progressMap, completedMap } = useLogoQuiz();

  const done = !!completedMap[slug];
  const passed = done ? total : Math.min(progressMap[slug] ?? 0, total);

  // Icon scales with the card width so a 2-column (wide) grid gets a large icon
  // while narrower layouts stay proportionate. ~0.48 → ~84px on a 2-col card.
  const iconSize = Math.round(width * 0.48);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        LQShadow.card,
        { width, height },
        locked && styles.cardLocked,
        pressed && { transform: [{ scale: 0.97 }] },
      ]}
    >
      {vip && (
        <View style={[styles.badge, styles.badgeLeft, locked ? styles.badgeLocked : styles.badgeVip]}>
          <Ionicons name={locked ? 'lock-closed' : 'star'} size={11} color="#fff" />
          <Text style={styles.badgeText}>{t.vip}</Text>
        </View>
      )}
      {done && (
        <View style={styles.doneBadge}>
          <Ionicons name="checkmark" size={13} color="#fff" />
        </View>
      )}
      {/* Icon zone — fixed at the top so icons line up across columns. */}
      <View style={[styles.iconWrap, { height: iconSize }]}>
        {iconUri ? (
          <Image
            source={{ uri: iconUri }}
            resizeMode="contain"
            style={{ width: iconSize, height: iconSize }}
          />
        ) : (
          <Text style={[styles.emoji, { fontSize: Math.round(iconSize * 0.9) }]}>{emoji}</Text>
        )}
      </View>
      {/* Name zone — fixed height for up to 2 lines, centered, so the progress
          below always starts at the same Y regardless of name length. */}
      <View style={styles.nameZone}>
        <Text style={styles.name} numberOfLines={2}>
          {name}
        </Text>
      </View>
      {/* Progress pinned to the bottom → aligned across every card in a row. */}
      <Text style={[styles.progress, done && styles.progressDone]}>
        {passed}/{total}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    // Grey surface instead of white, matching the app's quiet-card fill.
    backgroundColor: LQColors.surfaceAlt,
    borderRadius: LQRadius.lg,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: LQColors.border,
  },
  cardLocked: { opacity: 0.85 },
  // Fixed-height zone keeps every icon on the same baseline across columns.
  iconWrap: { alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emoji: { includeFontPadding: false },
  // Reserve room for up to two lines so 1- and 2-line names occupy equal height.
  nameZone: { height: 38, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 14, fontWeight: '800', color: LQColors.text, textAlign: 'center' },
  // Progress counter enlarged by 110% (12 → 25) so passed/total reads clearly on each card.
  progress: { fontSize: 25, fontWeight: '800', color: LQColors.textFaint, marginTop: 'auto' },
  progressDone: { color: LQColors.success },

  badge: {
    position: 'absolute',
    top: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: LQRadius.sm,
  },
  badgeLeft: { left: 8 },
  badgeVip: { backgroundColor: LQColors.coin },
  badgeLocked: { backgroundColor: LQColors.textMuted },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },

  doneBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: LQColors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
