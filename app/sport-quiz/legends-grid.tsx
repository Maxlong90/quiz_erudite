import { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppBackground, useSportsBgReady } from '@/components/sport-quiz/app-background';
import { CoinPill, GlassIconButton } from '@/components/sport-quiz/ui';
import { LegendTile } from '@/components/sport-quiz/legend-tile';
import { legendsQuestionsForLevel } from '@/lib/sport-quiz/legends';
import type { SportQuizQuestion } from '@/lib/sport-quiz/content';
import { SQColors } from '@/constants/sport-quiz/theme';
import { useSQLabels } from '@/constants/sport-quiz/labels';
import { useSportQuiz } from '@/hooks/sport-quiz/use-sport-quiz';
import { useSportQuizContent } from '@/hooks/sport-quiz/use-sport-quiz-content';

const COLS = 3;
const ROWS = 5; // 3 × 5 = 15 faces, always on one screen (no scroll)
const GAP = 10;
const PAD = 16;

/**
 * Sports Legends level board — reached by tapping a level. Shows the level's 15
 * faces as a 3×5 grid that always fits on screen (no scroll). Every face starts
 * CLOSED; tapping any tile opens its question. A face that has been guessed shows
 * its photo here permanently (LegendTile derives that from the solved set), so
 * clearing the level gradually uncovers the whole board. Mirrors the Logo Quiz
 * level grid, adapted to Sport Quiz's neon-glass look and the hidden-face rule.
 */
export default function SportLegendsGrid() {
  const t = useSQLabels();
  const { level } = useLocalSearchParams<{ level?: string }>();
  const levelNumber = Number(level ?? 0);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { coins, solvedIds, isSolved, setLastLevel } = useSportQuiz();
  const { snapshot } = useSportQuizContent();
  useSportsBgReady('deep');

  const questions = useMemo<SportQuizQuestion[]>(
    () => (snapshot ? legendsQuestionsForLevel(snapshot, levelNumber) : []),
    [snapshot, levelNumber],
  );

  useEffect(() => {
    if (levelNumber > 0) setLastLevel(levelNumber);
  }, [levelNumber, setLastLevel]);

  // Warm solved faces into the image cache so they appear at once.
  useEffect(() => {
    const uris = questions
      .filter((q) => isSolved(q.id))
      .map((q) => q.imageUri)
      .filter((u): u is string => !!u);
    if (uris.length) Image.prefetch(uris, { cachePolicy: 'memory-disk' }).catch(() => {});
  }, [questions, isSolved]);

  // A missing level (bad deep link / content not synced) sends the player back.
  useEffect(() => {
    if (snapshot && questions.length === 0) router.back();
  }, [snapshot, questions.length]);

  // Size tiles to fit BOTH the width (3 cols) and the leftover height (5 rows),
  // so the whole board is visible without scrolling on any device.
  const tileSize = useMemo(() => {
    const byWidth = (width - PAD * 2 - GAP * (COLS - 1)) / COLS;
    const chromeH = insets.top + insets.bottom + 64 /* header */ + 44 /* title */ + PAD * 2;
    const byHeight = (height - chromeH - GAP * (ROWS - 1)) / ROWS;
    return Math.floor(Math.max(64, Math.min(byWidth, byHeight)));
  }, [width, height, insets.top, insets.bottom]);

  return (
    <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
      <AppBackground variant="navy" />
      <StatusBar style="light" />

      <View style={styles.header}>
        <GlassIconButton glyph="chevron-back" size={44} onPress={() => router.back()} />
        <Pressable onPress={() => router.push('/sport-quiz/shop')} hitSlop={8}>
          <CoinPill coins={coins} size="lg" />
        </Pressable>
      </View>

      <View style={styles.gridWrap}>
        {/* Level number — centered on screen, sitting directly above the middle
            (second) face of the top row, with equal margins left and right. */}
        <Text style={styles.title} numberOfLines={1}>
          {t.levelLabel.replace('{n}', String(levelNumber))}
        </Text>
        <View style={[styles.grid, { width: COLS * tileSize + GAP * (COLS - 1) }]}>
          {questions.map((q, i) => (
            <LegendTile
              key={q.id}
              imageUri={q.imageUri}
              size={tileSize}
              index={i + 1}
              solved={!!solvedIds[q.id]}
              onPress={() =>
                router.push({
                  pathname: '/sport-quiz/legends-quiz',
                  params: { level: String(levelNumber), q: String(q.id) },
                })
              }
            />
          ))}
        </View>
      </View>
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
  title: {
    width: '100%',
    textAlign: 'center',
    color: SQColors.neonPink,
    fontWeight: '900',
    fontSize: 22,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 12,
    textShadowColor: SQColors.neonPink,
    textShadowRadius: 10,
    textShadowOffset: { width: 0, height: 0 },
  },
  gridWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: PAD },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
    justifyContent: 'center',
  },
});
