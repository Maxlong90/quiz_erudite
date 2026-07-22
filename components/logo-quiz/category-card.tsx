import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { LQColors, LQRadius, LQShadow } from '@/constants/logo-quiz/theme';
import { useLQLabels } from '@/constants/logo-quiz/labels';
import type { LogoCategory } from '@/constants/logo-quiz/mock-data';
import { useLocale } from '@/hooks/use-locale';
import { useLogoQuiz } from '@/hooks/logo-quiz/use-logo-quiz';

/**
 * One square tile in a Logo Quiz category grid: emoji + localized name, with an
 * optional VIP badge (a lock when the category is locked for the current user).
 * Shows the player's level progress (e.g. 7/40) and a green check once the
 * category has been fully completed. Shared by the main and VIP screens.
 */
export function CategoryCard({
  category,
  width,
  height,
  locked,
  onPress,
}: {
  category: LogoCategory;
  width: number;
  height: number;
  locked: boolean;
  onPress: () => void;
}) {
  const t = useLQLabels();
  const { locale } = useLocale();
  const { progressMap, completedMap } = useLogoQuiz();
  const name = category.name[(locale as keyof LogoCategory['name']) ?? 'en'] ?? category.name.en;

  const total = category.questions.length;
  const done = !!completedMap[category.id];
  const passed = done ? total : Math.min(progressMap[category.id] ?? 0, total);

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
      {category.vip && (
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
      <Text style={styles.emoji}>{category.emoji}</Text>
      <Text style={styles.name} numberOfLines={2}>
        {name}
      </Text>
      <Text style={[styles.progress, done && styles.progressDone]}>
        {passed}/{total}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: LQColors.surface,
    borderRadius: LQRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: LQColors.border,
  },
  cardLocked: { opacity: 0.85 },
  emoji: { fontSize: 38, marginBottom: 6 },
  name: { fontSize: 13, fontWeight: '800', color: LQColors.text, textAlign: 'center' },
  progress: { fontSize: 11, fontWeight: '800', color: LQColors.textFaint, marginTop: 4 },
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
