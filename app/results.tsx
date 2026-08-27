import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AchievementUnlockModal } from '@/components/achievements/achievement-unlock-modal';
import { ScreenBackground } from '@/components/screen-background';
import { useContentCache } from '@/hooks/use-content-cache';
import { useTranslation } from '@/hooks/use-translation';
import { useThemeColors } from '@/hooks/use-theme-colors';
import type { EruditePalette } from '@/constants/theme';
import type { StringKey } from '@/i18n/strings';
import {
  ACHIEVEMENTS,
  computeProgress,
  gatherMetrics,
  type AchievementProgress,
} from '@/lib/achievements';

export default function ResultsScreen() {
  const {
    score: scoreStr,
    total: totalStr,
    count,
    locale,
    category,
    categorySlugs,
    mode,
    timer,
    totalSeconds,
    source,
    hardVariant,
    unlocked,
  } = useLocalSearchParams<{
    score: string;
    total: string;
    count: string;
    locale: string;
    category?: string;
    categorySlugs?: string;
    mode?: string;
    timer?: string;
    totalSeconds?: string;
    source?: string;
    hardVariant?: string;
    unlocked?: string;
  }>();

  const { t } = useTranslation();
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { snapshot } = useContentCache();
  const [unlockQueue, setUnlockQueue] = useState<AchievementProgress[]>([]);

  // Hydrate the modal queue from the comma-separated id list the quiz
  // screen passed in. We re-compute progress from current metrics so
  // the modal shows the level we just reached, not whatever number the
  // URL might have if the user pulls the route up later.
  useEffect(() => {
    if (!unlocked) return;
    const ids = unlocked.split(',').map((s) => s.trim()).filter(Boolean);
    if (ids.length === 0) return;
    let cancelled = false;
    gatherMetrics(snapshot ?? null)
      .then((metrics) => {
        if (cancelled) return;
        const progress = computeProgress(metrics);
        const idSet = new Set(ids);
        // Preserve catalog order so the queue feels deterministic.
        const queue = ACHIEVEMENTS
          .map((def) => progress.find((p) => p.def.id === def.id))
          .filter((p): p is AchievementProgress => !!p && idSet.has(p.def.id));
        setUnlockQueue(queue);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [unlocked, snapshot]);

  function dismissCurrentUnlock() {
    setUnlockQueue((q) => q.slice(1));
  }

  const score = parseInt(scoreStr ?? '0', 10);
  const total = parseInt(totalStr ?? '0', 10);
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;

  const tier =
    percentage >= 80 ? 'excellent' : percentage >= 40 ? 'good' : 'keepGoing';

  const scoreColor =
    tier === 'excellent' ? '#22c55e' : tier === 'good' ? '#f59e0b' : '#ef4444';

  const emoji = tier === 'excellent' ? '🏆' : tier === 'good' ? '👍' : '💪';

  const messageKey: StringKey =
    tier === 'excellent'
      ? 'results.messageExcellent'
      : tier === 'good'
        ? 'results.messageGood'
        : 'results.messageKeepGoing';

  function handlePlayAgain() {
    router.replace({
      pathname: '/quiz',
      params: {
        count: count ?? '10',
        locale: locale ?? 'en',
        ...(category ? { category } : {}),
        ...(categorySlugs ? { categorySlugs } : {}),
        ...(mode ? { mode } : {}),
        ...(timer ? { timer } : {}),
        ...(totalSeconds ? { totalSeconds } : {}),
        ...(source ? { source } : {}),
        ...(hardVariant ? { hardVariant } : {}),
      },
    });
  }

  function handleHome() {
    router.replace('/');
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.flex}>
        <View style={styles.content}>
          <Animated.View
            entering={FadeInDown.delay(100).duration(500)}
            style={styles.heroSection}
          >
            <Text style={styles.emoji}>{emoji}</Text>
            <Text style={styles.title}>{t('results.title')}</Text>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(300).duration(500)}
            style={styles.scoreSection}
          >
            <View style={[styles.scoreCircle, { borderColor: scoreColor }]}>
              <Text style={[styles.scoreNumber, { color: scoreColor }]}>{score}</Text>
              <Text style={styles.scoreDivider}>/ {total}</Text>
            </View>
            <Text style={[styles.percentage, { color: scoreColor }]}>{percentage}%</Text>
            <Text style={styles.message}>{t(messageKey)}</Text>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(500).duration(500)}
            style={styles.buttonsSection}
          >
            <Pressable
              onPress={handlePlayAgain}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryPressed]}
              testID="results-play-again"
            >
              <Text style={styles.primaryButtonText}>{t('results.playAgain')}</Text>
            </Pressable>
            <Pressable
              onPress={handleHome}
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.secondaryPressed]}
              testID="results-home"
            >
              <Text style={styles.secondaryButtonText}>{t('results.home')}</Text>
            </Pressable>
          </Animated.View>
        </View>
      </SafeAreaView>

      <AchievementUnlockModal
        visible={unlockQueue.length > 0}
        progress={unlockQueue[0] ?? null}
        onDismiss={dismissCurrentUnlock}
      />
    </ScreenBackground>
  );
}

const makeStyles = (c: EruditePalette) => StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
    gap: 32,
  },
  heroSection: {
    alignItems: 'center',
    gap: 16,
  },
  emoji: {
    fontSize: 72,
    lineHeight: 88,
    textAlign: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: c.text,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  scoreSection: {
    alignItems: 'center',
    gap: 14,
  },
  scoreCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: c.surfaceSoft,
  },
  scoreNumber: {
    fontSize: 56,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  scoreDivider: {
    fontSize: 20,
    color: c.textFaint,
    fontVariant: ['tabular-nums'],
  },
  percentage: {
    fontSize: 28,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  message: {
    fontSize: 16,
    color: c.textMuted,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  buttonsSection: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: c.accent,
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: 'center',
    shadowColor: c.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  primaryButtonText: {
    color: c.onAccent,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  secondaryButton: {
    paddingVertical: 14,
    borderRadius: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: c.borderStrong,
    backgroundColor: c.surfaceSoft,
  },
  secondaryPressed: {
    opacity: 0.7,
  },
  secondaryButtonText: {
    color: c.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
