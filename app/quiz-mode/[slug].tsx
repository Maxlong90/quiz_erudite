import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ScreenBackground } from '@/components/screen-background';
import { TimedCountModal } from '@/components/quiz-mode/timed-count-modal';
import { fetchCategories, type Category } from '@/api/categories';
import { APP_SLUG } from '@/api/client';
import { CATEGORY_VISUALS, FALLBACK_VISUAL, SUBCATEGORY_EMOJI } from '@/constants/category-visuals';
import { useLocale } from '@/hooks/use-locale';
import { usePremium } from '@/hooks/use-premium';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useTranslation } from '@/hooks/use-translation';
import type { EruditePalette } from '@/constants/theme';
import { localizeCategoryName } from '@/i18n/categories';

const TIMED_COUNT_OPTIONS = [10, 20, 30] as const;

export default function QuizModeScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { locale } = useLocale();
  const { t } = useTranslation();
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { isPremium } = usePremium();
  const lockedByPremium = !isPremium;
  const [sub, setSub] = useState<Category | null>(null);
  const [parentSlug, setParentSlug] = useState<string | null>(null);
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');
  const [timedModalOpen, setTimedModalOpen] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setPhase('loading');

    // Find this subcategory's record + its parent slug. We hit the
    // top-level list to get the latter (slug pattern is "{parent}-...",
    // but parent slugs can themselves contain hyphens, so resolve by id).
    fetchCategories(APP_SLUG)
      .then(async (parents) => {
        const matchedParent = parents.find((p) =>
          // Subcategories are always slug-prefixed by parent slug.
          slug.startsWith(p.slug + '-'),
        );
        if (!matchedParent) {
          throw new Error('Parent not found');
        }
        const subs = await fetchCategories(APP_SLUG, { parent: matchedParent.slug });
        if (cancelled) return;
        const found = subs.find((s) => s.slug === slug) ?? null;
        setSub(found);
        setParentSlug(matchedParent.slug);
        setPhase('ready');
      })
      .catch(() => {
        if (cancelled) return;
        setPhase('error');
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const visual = useMemo(() => {
    if (!parentSlug) return FALLBACK_VISUAL;
    return CATEGORY_VISUALS[parentSlug] ?? FALLBACK_VISUAL;
  }, [parentSlug]);

  const subEmoji = (slug && SUBCATEGORY_EMOJI[slug]) || visual.emoji;
  const subName = sub ? localizeCategoryName(sub.slug, locale, sub.name) : '';

  const questionsCount = sub?.total_questions_count ?? 0;
  const flashcardsCount = sub?.total_flashcards_count ?? 0;
  const hasQuestions = questionsCount > 0;
  const hasFlashcards = flashcardsCount > 0;
  // Timed-quiz question-count options, capped by how many questions exist
  // (but always offer at least the smallest option).
  const timedOptions = TIMED_COUNT_OPTIONS.filter((n) => n <= Math.max(questionsCount, 10));

  function startQuiz(mode: 'daily' | 'quick' | 'timed' | 'survival', count: number, timer = 0) {
    if (!slug) return;
    router.push({
      pathname: '/quiz',
      params: {
        count: String(count),
        locale,
        category: slug,
        mode,
        timer: String(timer),
      },
    });
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.flex}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={({ pressed }) => [styles.iconButton, pressed && styles.iconPressed]}
            accessibilityLabel="Back"
          >
            <IconSymbol name="chevron.left" size={24} color={colors.text} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerEmoji}>{subEmoji}</Text>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {subName}
            </Text>
          </View>
          <View style={styles.iconButton} />
        </View>

        {phase === 'loading' && (
          <View style={styles.center}>
            <ActivityIndicator color={colors.text} size="large" />
          </View>
        )}

        {phase === 'ready' && (
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.sectionLabel}>{t('mode.title')}</Text>

            <ModeCard
              icon="🎲"
              title={t('mode.random.title')}
              subtitle={t('mode.random.subtitle')}
              gradient={visual.gradient}
              disabled={!hasQuestions}
              onPress={() => startQuiz('quick', 1)}
            />

            <ModeCard
              icon="⚡"
              title={t('mode.quick.title')}
              subtitle={t('mode.quick.subtitle')}
              gradient={visual.gradient}
              disabled={!hasQuestions}
              onPress={() => startQuiz('quick', 10)}
            />

            <ModeCard
              icon="⏱️"
              title={t('mode.timed.title')}
              subtitle={t('mode.timed.subtitle')}
              gradient={visual.gradient}
              disabled={!hasQuestions}
              premiumLocked={lockedByPremium}
              onPress={() => setTimedModalOpen(true)}
            />

            <ModeCard
              icon="💀"
              title={t('mode.survival.title')}
              subtitle={t('mode.survival.subtitle')}
              gradient={visual.gradient}
              disabled={!hasQuestions}
              premiumLocked={lockedByPremium}
              // Pull a healthy buffer; quiz ends on first wrong anyway.
              onPress={() => startQuiz('survival', Math.min(50, Math.max(20, questionsCount)))}
            />

            {hasFlashcards && (
              <ModeCard
                icon="🃏"
                title={t('mode.flashcards.title')}
                subtitle={t('mode.flashcards.subtitle')}
                gradient={visual.gradient}
                disabled
                onPress={() => {}}
                lockLabel={t('mode.lockedSoon')}
              />
            )}
          </ScrollView>
        )}

        <TimedCountModal
          visible={timedModalOpen}
          options={timedOptions}
          onClose={() => setTimedModalOpen(false)}
          onPick={(n) => startQuiz('timed', n, 30)}
        />
      </SafeAreaView>
    </ScreenBackground>
  );
}

interface ModeCardProps {
  icon: string;
  title: string;
  subtitle: string;
  gradient: readonly [string, string];
  disabled?: boolean;
  premiumLocked?: boolean;
  onPress: () => void;
  lockLabel?: string;
}

function ModeCard({
  icon,
  title,
  subtitle,
  gradient,
  disabled,
  premiumLocked,
  onPress,
  lockLabel,
}: ModeCardProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  function handlePress() {
    if (premiumLocked) {
      router.push('/paywall');
      return;
    }
    onPress();
  }
  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      style={({ pressed }) => [styles.cardWrap, pressed && !disabled && styles.cardPressed]}
    >
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, disabled && styles.cardDisabled]}
      >
        {premiumLocked && (
          <View style={styles.crownBadge}>
            <IconSymbol name="crown.fill" size={16} color="#ffd23a" />
          </View>
        )}
        <Text style={styles.cardIcon}>{icon}</Text>
        <View style={styles.cardCopy}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardSubtitle}>{lockLabel ?? subtitle}</Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const makeStyles = (c: EruditePalette) => StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  headerEmoji: { fontSize: 22 },
  headerTitle: {
    color: c.text,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconPressed: { opacity: 0.5 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
    gap: 14,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: c.textFaint,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 4,
    marginLeft: 4,
  },
  cardWrap: {
    borderRadius: 22,
    overflow: 'hidden',
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.95,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
  },
  cardTall: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 14,
  },
  cardDisabled: {
    opacity: 0.45,
  },
  crownBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#00000066',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  cardIcon: {
    fontSize: 36,
  },
  cardCopy: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    color: c.onAccent,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  cardSubtitle: {
    color: c.onAccent,
    fontSize: 13,
    fontWeight: '500',
  },
  timedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  chipRow: {
    gap: 8,
  },
  chipLabel: {
    color: '#ffffff99',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginLeft: 2,
  },
  chips: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ffffff44',
    backgroundColor: '#ffffff14',
  },
  chipActive: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  chipText: {
    color: '#ffffffcc',
    fontWeight: '700',
    fontSize: 14,
  },
  chipTextActive: {
    color: '#1a1a47',
  },
  startBtn: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderRadius: 22,
    alignItems: 'center',
  },
  startBtnPressed: {
    opacity: 0.85,
  },
  startBtnText: {
    color: '#1a1a47',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
});
