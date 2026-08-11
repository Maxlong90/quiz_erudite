import { useMemo } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBackground } from '@/components/logo-quiz/app-background';
import { CoinPill, LivesPill } from '@/components/logo-quiz/hud';
import { LevelCard } from '@/components/logo-quiz/level-card';
import {
  buildLevels,
  isLevelUnlocked,
  levelSolvedCount,
  type LogoQuizLevel,
} from '@/lib/logo-quiz/content';
import { LQColors, LQRadius, LQShadow } from '@/constants/logo-quiz/theme';
import { useLQLabels } from '@/constants/logo-quiz/labels';
import { useLogoQuiz } from '@/hooks/logo-quiz/use-logo-quiz';
import { useLogoQuizContent } from '@/hooks/logo-quiz/use-logo-quiz-content';

interface LevelRow {
  level: number;
  solved: number;
  total: number;
  unlocked: boolean;
}

export default function LogoQuizLevels() {
  const t = useLQLabels();
  const { coins, livesState, isPremium, solvedIds } = useLogoQuiz();
  const { snapshot, status } = useLogoQuizContent();

  const levels = useMemo<LogoQuizLevel[]>(
    () => (snapshot ? buildLevels(snapshot) : []),
    [snapshot],
  );

  // Per-level display data. Recomputed when a question is solved (solvedIds is
  // reactive), so clearing a level's 9 free questions immediately unlocks the
  // next card.
  const rows = useMemo<LevelRow[]>(
    () =>
      levels.map((l) => ({
        level: l.level,
        solved: levelSolvedCount(l.questions, solvedIds),
        total: l.questions.length,
        unlocked: isLevelUnlocked(levels, l.level, solvedIds),
      })),
    [levels, solvedIds],
  );

  return (
    <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
      <AppBackground />
      <StatusBar style="dark" />

      {/* Header: back · lives + coins */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, LQShadow.card, pressed && { opacity: 0.85 }]}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={22} color={LQColors.text} />
        </Pressable>
        <View style={styles.headerRight}>
          <LivesPill
            livesState={livesState}
            isPremium={isPremium}
            onZeroPress={() => router.push('/logo-quiz/shop')}
          />
          <CoinPill coins={coins} onPress={() => router.push('/logo-quiz/shop')} />
        </View>
      </View>

      <Text style={styles.title}>{t.selectLevel}</Text>

      <FlatList
        data={rows}
        keyExtractor={(r) => String(r.level)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <LevelCard
            level={item.level}
            solved={item.solved}
            total={item.total}
            unlocked={item.unlocked}
            onPress={() =>
              router.push({ pathname: '/logo-quiz/level', params: { level: String(item.level) } })
            }
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            {!snapshot && status === 'syncing' ? (
              <>
                <ActivityIndicator color={LQColors.primary} />
                <Text style={styles.emptyText}>{t.loadingContent}</Text>
              </>
            ) : (
              <Text style={styles.emptyText}>{t.noLevels}</Text>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: 'transparent' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: LQRadius.pill,
    backgroundColor: LQColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  title: {
    fontSize: 22,
    fontWeight: '900',
    color: LQColors.text,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
  },

  listContent: { paddingHorizontal: 16, paddingBottom: 28, rowGap: 12 },

  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 12 },
  emptyText: { color: LQColors.textMuted, fontWeight: '800', fontSize: 15 },
});
