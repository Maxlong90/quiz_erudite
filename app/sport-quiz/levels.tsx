import { useCallback, useMemo, useRef } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBackground, useSportsBgReady } from '@/components/sport-quiz/app-background';
import { CoinPill, GlassIconButton } from '@/components/sport-quiz/ui';
import { SportLevelCard } from '@/components/sport-quiz/level-card';
import {
  buildLevels,
  isLevelUnlocked,
  levelSolvedCount,
  type SportQuizLevel,
} from '@/lib/sport-quiz/content';
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
 * Sport Quiz "Select Level" — reached from the Classic mode. Mirrors the Logo
 * Quiz level-select (a scrollable list of level cards with progress + locking),
 * but in Sport Quiz's neon-glass look on the settings navy backdrop, with only a
 * coins pill in the corner (no lives). Tapping an unlocked level opens its first
 * question.
 */
export default function SportQuizLevels() {
  const t = useSQLabels();
  const { coins, solvedIds, lastLevel } = useSportQuiz();
  const { snapshot, status, error, resync } = useSportQuizContent();
  const listRef = useRef<FlatList<LevelRow>>(null);
  // Warm the in-level quiz backdrop while the player browses levels, so it is
  // already decoded when the quiz screen opens (no load-in flash).
  useSportsBgReady('deep');

  const levels = useMemo<SportQuizLevel[]>(
    () => (snapshot ? buildLevels(snapshot) : []),
    [snapshot],
  );

  // Per-level display data. Recomputed when a question is solved (solvedIds is
  // reactive), so clearing a level immediately unlocks the next card.
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

  // On focus (returning from a level / its Level Complete screen) scroll to the
  // last-played level so the player lands on the card they just cleared.
  useFocusEffect(
    useCallback(() => {
      if (lastLevel <= 0) return;
      const target = rows.findIndex((r) => r.level === lastLevel);
      if (target < 0) return;
      const id = setTimeout(() => {
        listRef.current?.scrollToIndex({ index: target, viewPosition: 0.3, animated: false });
      }, 0);
      return () => clearTimeout(id);
    }, [lastLevel, rows]),
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
        ref={listRef}
        data={rows}
        keyExtractor={(r) => String(r.level)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onScrollToIndexFailed={(info) => {
          listRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: false });
          setTimeout(() => {
            listRef.current?.scrollToIndex({ index: info.index, viewPosition: 0.3, animated: false });
          }, 60);
        }}
        renderItem={({ item }) => (
          <SportLevelCard
            level={item.level}
            solved={item.solved}
            total={item.total}
            unlocked={item.unlocked}
            onPress={() =>
              router.push({ pathname: '/sport-quiz/quiz', params: { level: String(item.level) } })
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
