import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoryCard } from '@/components/logo-quiz/category-card';
import { GradientButton } from '@/components/logo-quiz/gradient-button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { LogoQuizColors } from '@/constants/logo-quiz-theme';
import { usePremium } from '@/hooks/use-premium';
import { useTranslation } from '@/hooks/use-translation';
import { categoryNameKey, canAccessAiTopicInput, isCategoryLocked } from '@/lib/logo-quiz';
import { getLogoCategories, getMockCoinBalance, type LogoCategory } from '@/lib/logo-quiz-content';

export default function LogoQuizHomeScreen() {
  const { t } = useTranslation();
  const { isPremium } = usePremium();
  const [categories, setCategories] = useState<LogoCategory[]>([]);
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');
  const coins = getMockCoinBalance();

  useEffect(() => {
    let cancelled = false;
    getLogoCategories()
      .then((cats) => {
        if (cancelled) return;
        setCategories(cats);
        setPhase('ready');
      })
      .catch(() => {
        if (!cancelled) setPhase('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function openCategory(category: LogoCategory) {
    if (isCategoryLocked(category, isPremium)) {
      router.push('/logo-quiz/paywall');
      return;
    }
    router.push({ pathname: '/logo-quiz/quiz', params: { slug: category.slug } });
  }

  function openAiCta() {
    if (canAccessAiTopicInput(isPremium)) {
      router.push('/logo-quiz/ai');
    } else {
      router.push('/logo-quiz/paywall');
    }
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.eyebrow}>{t('logoQuiz.home.eyebrow')}</Text>
            <Text style={styles.title}>{t('logoQuiz.home.title')}</Text>
          </View>
          <View style={styles.coins}>
            <IconSymbol name="circle.grid.cross.fill" size={18} color={LogoQuizColors.gold} />
            <Text style={styles.coinsText}>{coins.toLocaleString()}</Text>
          </View>
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>{t('logoQuiz.home.sectionCategories')}</Text>
          <Text style={styles.seeAll}>{t('logoQuiz.home.seeAll')}</Text>
        </View>

        {phase === 'loading' && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={LogoQuizColors.cyan} />
          </View>
        )}

        {phase === 'error' && (
          <View style={styles.center}>
            <Text style={styles.errorText}>{t('logoQuiz.home.error')}</Text>
          </View>
        )}

        {phase === 'ready' && (
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <View style={styles.grid}>
              {categories.map((cat) => (
                <CategoryCard
                  key={cat.slug}
                  category={cat}
                  locked={isCategoryLocked(cat, isPremium)}
                  onPress={() => openCategory(cat)}
                  displayName={t(categoryNameKey(cat.slug))}
                  countLabel={t('logoQuiz.category.count', { count: cat.logoCount })}
                />
              ))}
            </View>
          </ScrollView>
        )}

        <View style={styles.ctaWrap}>
          <GradientButton
            label={t('logoQuiz.home.aiCta')}
            subtitle={t('logoQuiz.home.aiCtaSubtitle')}
            iconName="sparkles"
            onPress={openAiCta}
            testID="logo-ai-cta"
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: LogoQuizColors.bg,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerLeft: {
    gap: 4,
  },
  eyebrow: {
    color: LogoQuizColors.magenta,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  title: {
    color: LogoQuizColors.text,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  coins: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: LogoQuizColors.surface,
    borderWidth: 1,
    borderColor: LogoQuizColors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  coinsText: {
    color: LogoQuizColors.text,
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  sectionTitle: {
    color: LogoQuizColors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  seeAll: {
    color: LogoQuizColors.cyan,
    fontSize: 14,
    fontWeight: '700',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    color: LogoQuizColors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 16,
  },
  ctaWrap: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
});
