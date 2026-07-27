import { useCallback } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBackground } from '@/components/logo-quiz/app-background';
import { CategoryCard } from '@/components/logo-quiz/category-card';
import { CoinPill, LivesPill } from '@/components/logo-quiz/hud';
import { GoldSurface } from '@/components/logo-quiz/gold-gradient';
import { VIP_CATEGORIES, type LogoCategory } from '@/constants/logo-quiz/mock-data';
import { LQColors, LQRadius, LQShadow, GOLD_TEXT } from '@/constants/logo-quiz/theme';
import { useLQLabels } from '@/constants/logo-quiz/labels';
import { useLogoQuiz } from '@/hooks/logo-quiz/use-logo-quiz';

const GRID_PAD = 16;
const GRID_GAP = 12;

export default function LogoQuizCategoriesVip() {
  const t = useLQLabels();
  const { isPremium, getLives, coins, livesState } = useLogoQuiz();
  const { width } = useWindowDimensions();

  const cardW = Math.floor((width - GRID_PAD * 2 - GRID_GAP * 2) / 3);
  const cardH = Math.round(cardW * 1.18);

  // Every category here is premium-only: non-subscribers are sent to the Shop.
  // Out of lives also routes to the Shop instead of into a round.
  const openCategory = useCallback(
    (cat: LogoCategory) => {
      if (!isPremium || getLives() <= 0) {
        router.push('/logo-quiz/shop');
        return;
      }
      router.push({ pathname: '/logo-quiz/quiz', params: { category: cat.id } });
    },
    [isPremium, getLives],
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

      <FlatList
        data={VIP_CATEGORIES}
        keyExtractor={(c) => c.id}
        numColumns={3}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          !isPremium ? (
            <Pressable onPress={() => router.push('/logo-quiz/shop')}>
              <GoldSurface radius={LQRadius.lg} style={[styles.banner, LQShadow.gold]}>
                <Ionicons name="lock-closed" size={16} color={GOLD_TEXT} />
                <Text style={styles.bannerText}>{t.premiumBanner}</Text>
              </GoldSurface>
            </Pressable>
          ) : null
        }
        renderItem={({ item }) => (
          <CategoryCard
            category={item}
            width={cardW}
            height={cardH}
            locked={!isPremium}
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

  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: GRID_PAD,
    marginTop: 4,
    marginBottom: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  bannerText: { color: GOLD_TEXT, fontWeight: '900', fontSize: 14, flexShrink: 1, textAlign: 'center' },
});
