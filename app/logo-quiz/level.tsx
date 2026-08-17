import { useCallback, useEffect, useMemo } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBackground } from '@/components/logo-quiz/app-background';
import { CoinPill, LivesPill } from '@/components/logo-quiz/hud';
import { LogoTile } from '@/components/logo-quiz/logo-tile';
import { questionsForLevel, type LogoQuizQuestion } from '@/lib/logo-quiz/content';
import { LQColors, LQRadius, LQShadow } from '@/constants/logo-quiz/theme';
import { useLQLabels } from '@/constants/logo-quiz/labels';
import { useLogoQuiz } from '@/hooks/logo-quiz/use-logo-quiz';
import { useLogoQuizContent } from '@/hooks/logo-quiz/use-logo-quiz-content';

const GRID_PAD = 16;
const GRID_GAP = 12;
const COLS = 3;

export default function LogoQuizLevel() {
  const t = useLQLabels();
  const { level } = useLocalSearchParams<{ level?: string }>();
  const levelNumber = Number(level ?? 0);
  const { width } = useWindowDimensions();
  const { snapshot } = useLogoQuizContent();
  const { coins, livesState, isPremium, isSolved, getLives, solvedIds, setLastLevel } =
    useLogoQuiz();

  const questions = useMemo<LogoQuizQuestion[]>(
    () => (snapshot ? questionsForLevel(snapshot, levelNumber) : []),
    [snapshot, levelNumber],
  );

  // Remember the level being played so the level-select list scrolls back to it.
  useEffect(() => {
    if (levelNumber > 0) setLastLevel(levelNumber);
  }, [levelNumber, setLastLevel]);

  // Warm every PLAYABLE tile's artwork into the shared expo-image cache before/
  // while the grid draws, so the logos appear all at once instead of decoding
  // (or, for a remote fallback URI, network-fetching) one by one as tiles mount.
  // Premium logos are deliberately NOT prefetched: a locked tile blurs its
  // artwork via RN's Image (see LogoDisplay), and warming the un-blurred bitmap
  // into the shared cache is both wasted (it's behind the paywall) and the exact
  // condition that let premium logos leak through un-blurred. They load on
  // unlock anyway. The next level's non-premium art is prefetched too — after
  // this one — so the level→level jump is instant as well. Fire-and-forget and
  // fail-open: prefetch never blocks or breaks the UI.
  useEffect(() => {
    const currentUrls = questions
      .filter((q) => !q.premium)
      .map((q) => q.imageUri)
      .filter((uri): uri is string => !!uri);
    if (currentUrls.length === 0) return;

    let cancelled = false;
    Image.prefetch(currentUrls, { cachePolicy: 'memory-disk' })
      .catch(() => {})
      .finally(() => {
        if (cancelled || !snapshot) return;
        const nextUrls = questionsForLevel(snapshot, levelNumber + 1)
          .filter((q) => !q.premium)
          .map((q) => q.imageUri)
          .filter((uri): uri is string => !!uri);
        if (nextUrls.length > 0) Image.prefetch(nextUrls, { cachePolicy: 'memory-disk' }).catch(() => {});
      });

    return () => {
      cancelled = true;
    };
  }, [questions, snapshot, levelNumber]);

  // A level that doesn't exist (bad deep link, or backend not emitting `order`
  // yet) sends the player back rather than showing an empty grid.
  useEffect(() => {
    if (snapshot && questions.length === 0) router.back();
  }, [snapshot, questions.length]);

  const tileSize = Math.floor((width - GRID_PAD * 2 - GRID_GAP * (COLS - 1)) / COLS);

  const openQuestion = useCallback(
    (q: LogoQuizQuestion) => {
      const solved = isSolved(q.id);
      // A solved logo opens directly (the quiz derives its review look from
      // isSolved) — no lives/premium gate needed to browse an answered one.
      if (!solved) {
        // Premium logo the current user can't play → paywall.
        if (q.premium && !isPremium) {
          router.push('/logo-quiz/shop');
          return;
        }
        // Out of lives → shop; otherwise start the question.
        if (getLives() <= 0) {
          router.push('/logo-quiz/shop');
          return;
        }
      }
      router.push({
        pathname: '/logo-quiz/quiz',
        params: { level: String(levelNumber), q: String(q.id) },
      });
    },
    [isSolved, isPremium, getLives, levelNumber],
  );

  return (
    <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
      <AppBackground />
      <StatusBar style="dark" />

      {/* Header: back · title · lives + coins */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, LQShadow.card, pressed && { opacity: 0.85 }]}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={22} color={LQColors.text} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {t.level.replace('{n}', String(levelNumber))}
        </Text>
        <View style={styles.headerRight}>
          <LivesPill
            livesState={livesState}
            isPremium={isPremium}
            onZeroPress={() => router.push('/logo-quiz/shop')}
          />
          <CoinPill coins={coins} onPress={() => router.push('/logo-quiz/shop')} />
        </View>
      </View>

      <FlatList
        data={questions}
        keyExtractor={(q) => String(q.id)}
        numColumns={COLS}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        extraData={solvedIds}
        renderItem={({ item }) => (
          <LogoTile
            imageUri={item.imageUri}
            size={tileSize}
            solved={isSolved(item.id)}
            locked={item.premium && !isPremium}
            onPress={() => openQuestion(item)}
          />
        )}
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
  title: { flex: 1, fontSize: 18, fontWeight: '900', color: LQColors.text },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  listContent: { paddingHorizontal: GRID_PAD, paddingBottom: 28, rowGap: GRID_GAP },
  row: { gap: GRID_GAP },
});
