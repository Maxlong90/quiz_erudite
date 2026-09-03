import { useMemo } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBackground, useSportsBgReady } from '@/components/sport-quiz/app-background';
import { CoinPill, GlassIconButton } from '@/components/sport-quiz/ui';
import { SportLevelCard } from '@/components/sport-quiz/level-card';
import {
  buildLegendsLevels,
  isLegendsLevelUnlocked,
  legendsLevelSolvedCount,
  type SportLegendsLevel,
} from '@/lib/sport-quiz/legends';
import { SQColors, SQRadius } from '@/constants/sport-quiz/theme';
import { useSQLabels } from '@/constants/sport-quiz/labels';
import { useSportQuiz } from '@/hooks/sport-quiz/use-sport-quiz';
import { useSportQuizContent } from '@/hooks/sport-quiz/use-sport-quiz-content';

interface LevelRow {
  level: number;
  solved: number;
  total: number;
  unlocked: boolean;
}

/**
 * Sports Legends "Select Level" — reached from the Sport Quiz mode screen. A
 * verbatim clone of the Classic level-select (a scrollable list of level cards
 * with progress + locking, coins pill only) but sourced from the Legends content
 * pool (buildLegendsLevels). Tapping an unlocked level opens its first Legends
 * question (the reveal-grid quiz). Progress is the shared per-question solvedIds
 * — Legends question ids never collide with Classic ids, so the two modes track
 * independently without a separate store.
 */
export default function SportLegendsLevels() {
  const t = useSQLabels();
  const { coins, solvedIds } = useSportQuiz();
  const { snapshot, status, error, resync } = useSportQuizContent();
  // Warm the in-level quiz backdrop while the player browses levels.
  useSportsBgReady('deep');

  const levels = useMemo<SportLegendsLevel[]>(
    () => (snapshot ? buildLegendsLevels(snapshot) : []),
    [snapshot],
  );

  // Per-level display data. Recomputed when a question is solved (solvedIds is
  // reactive), so clearing a level immediately unlocks the next card.
  const rows = useMemo<LevelRow[]>(
    () =>
      levels.map((l) => ({
        level: l.level,
        solved: legendsLevelSolvedCount(l.questions, solvedIds),
        total: l.questions.length,
        unlocked: isLegendsLevelUnlocked(levels, l.level, solvedIds),
      })),
    [levels, solvedIds],
  );

  return (
    <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
      <AppBackground variant="navy" />
      <StatusBar style="light" />

      {/* Header: back · coins (no lives) */}
      <View style={styles.header}>
        <GlassIconButton glyph="chevron-back" size={44} onPress={() => router.back()} />
        <Pressable onPress={() => router.push('/sport-quiz/shop')} hitSlop={8}>
          <CoinPill coins={coins} size="lg" />
        </Pressable>
      </View>

      <Text style={styles.title}>{t.selectLevel}</Text>

      <FlatList
        data={rows}
        keyExtractor={(r) => String(r.level)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <SportLevelCard
            level={item.level}
            solved={item.solved}
            total={item.total}
            unlocked={item.unlocked}
            onPress={() =>
              router.push({ pathname: '/sport-quiz/legends-grid', params: { level: String(item.level) } })
            }
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            {status === 'idle' || status === 'syncing' ? (
              <>
                <ActivityIndicator color={SQColors.neon} />
                <Text style={styles.emptyText}>{t.loadingContent}</Text>
              </>
            ) : (
              <>
                <Text style={styles.emptyText}>{status === 'error' ? 'Content error' : t.noLevels}</Text>
                {status === 'error' && !!error && <Text style={styles.errorDetail}>{error}</Text>}
                <Pressable onPress={() => resync()} style={styles.retryBtn} hitSlop={8}>
                  <Text style={styles.retryText}>↻ Retry</Text>
                </Pressable>
              </>
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
  },

  title: {
    color: SQColors.neonPink,
    fontWeight: '900',
    fontSize: 26,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
    textShadowColor: SQColors.neonPink,
    textShadowRadius: 12,
    textShadowOffset: { width: 0, height: 0 },
  },

  listContent: { paddingHorizontal: 16, paddingBottom: 28, rowGap: 12 },

  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 12, paddingHorizontal: 24 },
  emptyText: { color: SQColors.textMuted, fontWeight: '800', fontSize: 15, textAlign: 'center' },
  errorDetail: { color: SQColors.neonPink, fontWeight: '600', fontSize: 12, textAlign: 'center' },
  retryBtn: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: SQRadius.pill,
    borderWidth: 1.5,
    borderColor: SQColors.neon,
    backgroundColor: 'rgba(43,255,179,0.12)',
  },
  retryText: { color: SQColors.neon, fontWeight: '900', fontSize: 15 },
});
