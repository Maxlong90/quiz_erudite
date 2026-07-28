import { useCallback, useMemo } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBackground } from '@/components/logo-quiz/app-background';
import { CategoryCard } from '@/components/logo-quiz/category-card';
import { CoinPill, LivesPill } from '@/components/logo-quiz/hud';
import { GoldButton } from '@/components/logo-quiz/gold-gradient';
import { buildCategories, type LogoQuizCategory } from '@/lib/logo-quiz/content';
import { LQColors, LQRadius, LQShadow, GOLD_TEXT } from '@/constants/logo-quiz/theme';
import { useLQLabels } from '@/constants/logo-quiz/labels';
import { useLogoQuiz } from '@/hooks/logo-quiz/use-logo-quiz';
import { useLogoQuizContent } from '@/hooks/logo-quiz/use-logo-quiz-content';

const GRID_PAD = 16;
const GRID_GAP = 12;

export default function LogoQuizCategories() {
  const t = useLQLabels();
  const { width } = useWindowDimensions();
  const { getLives, coins, livesState, isPremium } = useLogoQuiz();
  const { snapshot, status } = useLogoQuizContent();

  const cardW = Math.floor((width - GRID_PAD * 2 - GRID_GAP * 2) / 3);
  const cardH = Math.round(cardW * 1.18);

  // Regular section = categories the backend did NOT flag as VIP.
  const categories = useMemo(
    () => (snapshot ? buildCategories(snapshot, false) : []),
    [snapshot],
  );

  const openCategory = useCallback(
    (cat: LogoQuizCategory) => {
      // Out of lives: send the player to the Shop instead of into a round.
      if (getLives() <= 0) {
        router.push('/logo-quiz/shop');
        return;
      }
      router.push({ pathname: '/logo-quiz/quiz', params: { category: cat.slug } });
    },
    [getLives],
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
        <View style={styles.headerRight}>
          <LivesPill
            livesState={livesState}
            isPremium={isPremium}
            onZeroPress={() => router.push('/logo-quiz/shop')}
          />
          <CoinPill coins={coins} onPress={() => router.push('/logo-quiz/shop')} />
        </View>
      </View>

      {/* Vertically scrolling 3-column grid, gold VIP button pinned on top */}
      <FlatList
        data={categories}
        keyExtractor={(c) => c.slug}
        numColumns={3}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <GoldButton
            onPress={() => router.push('/logo-quiz/categories-vip')}
            radius={LQRadius.lg}
            style={styles.vipButton}
          >
            <View style={styles.vipButtonInner}>
              <Text style={styles.vipButtonText}>👑 {t.vipCategories}</Text>
              <Ionicons name="chevron-forward" size={18} color={GOLD_TEXT} />
            </View>
          </GoldButton>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            {!snapshot && status === 'syncing' ? (
              <>
                <ActivityIndicator color={LQColors.primary} />
                <Text style={styles.emptyText}>{t.loadingContent}</Text>
              </>
            ) : (
              <Text style={styles.emptyText}>{t.noCategories}</Text>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <CategoryCard
            slug={item.slug}
            name={item.name}
            emoji={item.emoji}
            vip={item.isVip}
            total={item.total}
            width={cardW}
            height={cardH}
            locked={false}
            onPress={() => openCategory(item)}
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
  title: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '900', color: LQColors.text },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  listContent: { paddingBottom: 28, rowGap: GRID_GAP },
  row: { gap: GRID_GAP, paddingHorizontal: GRID_PAD },

  vipButton: { marginHorizontal: GRID_PAD, marginTop: 4, marginBottom: 14 },
  vipButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  vipButtonText: { color: GOLD_TEXT, fontWeight: '900', fontSize: 16 },

  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 12 },
  emptyText: { color: LQColors.textMuted, fontWeight: '800', fontSize: 15 },
});
