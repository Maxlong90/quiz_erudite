import { Pressable, StyleSheet, Text, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { accentColor, LogoQuizColors, LogoQuizRadii } from '@/constants/logo-quiz-theme';
import type { LogoCategory } from '@/lib/logo-quiz-content';

interface CategoryCardProps {
  category: LogoCategory;
  /** Premium + not unlocked → show the lock badge. */
  locked: boolean;
  onPress: () => void;
  /** Display name resolved through i18n at the call site. */
  displayName: string;
  /** Localized "N логотипов" caption. */
  countLabel: string;
}

/**
 * A category tile from mockup 1 — a square neon-glowing thumbnail with a
 * brand glyph, the category name, and a logo count. Premium categories
 * carry a lock badge in the thumbnail corner.
 */
export function CategoryCard({ category, locked, onPress, displayName, countLabel }: CategoryCardProps) {
  const accent = accentColor(category.accent);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.wrap, pressed && styles.pressed]}
      testID={`logo-category-${category.slug}`}
    >
      <View style={styles.thumb}>
        {/* Accent glow disc behind the glyph. */}
        <View style={[styles.glowDisc, { backgroundColor: `${accent}22`, shadowColor: accent }]}>
          <Text style={styles.glyph}>{category.glyph}</Text>
        </View>
        {locked && (
          <View style={[styles.lockBadge, { borderColor: accent }]} testID={`logo-category-lock-${category.slug}`}>
            <IconSymbol name="lock.fill" size={14} color={accent} />
          </View>
        )}
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {displayName}
      </Text>
      <Text style={[styles.count, { color: accent }]} numberOfLines={1}>
        {countLabel}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '48%',
    borderRadius: LogoQuizRadii.lg,
    backgroundColor: LogoQuizColors.surface,
    borderWidth: 1,
    borderColor: LogoQuizColors.border,
    padding: 14,
    gap: 10,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  thumb: {
    aspectRatio: 1,
    borderRadius: LogoQuizRadii.md,
    backgroundColor: LogoQuizColors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowDisc: {
    width: '58%',
    aspectRatio: 1,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 18,
    elevation: 8,
  },
  glyph: {
    fontSize: 40,
    lineHeight: 48,
  },
  lockBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: LogoQuizColors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    color: LogoQuizColors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  count: {
    fontSize: 12,
    fontWeight: '600',
  },
});
