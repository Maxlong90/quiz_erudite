import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { AppBackground } from '@/components/logo-quiz/app-background';
import { GoldSurface } from '@/components/logo-quiz/gold-gradient';
import { CoinIcon } from '@/components/logo-quiz/coin-icon';
import { CoinPill, LivesPill } from '@/components/logo-quiz/hud';
import {
  COIN_PACKS,
  LIFE_PACKS,
  LIVES_FOR_COINS_AMOUNT,
  LIVES_FOR_COINS_COST,
  type CoinPack,
  type LifePack,
} from '@/lib/logo-quiz/economy';
import { LQColors, LQRadius, LQShadow, GOLD_TEXT } from '@/constants/logo-quiz/theme';
import { useLQLabels } from '@/constants/logo-quiz/labels';
import { useLogoQuiz } from '@/hooks/logo-quiz/use-logo-quiz';

export default function LogoQuizShop() {
  const t = useLQLabels();
  const { coins, isPremium, livesState, buyPremium, buyCoins, buyLives, buyLivesForCoins } =
    useLogoQuiz();
  const [boughtPack, setBoughtPack] = useState<string | null>(null);
  const [boughtLife, setBoughtLife] = useState<string | null>(null);
  const [boughtCoinLives, setBoughtCoinLives] = useState(false);

  const canAffordCoinLives = coins >= LIVES_FOR_COINS_COST;

  const onBuyPremium = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    buyPremium();
  };

  const onBuyPack = (pack: CoinPack) => {
    Haptics.selectionAsync().catch(() => {});
    buyCoins(pack);
    setBoughtPack(pack.id);
    setTimeout(() => setBoughtPack((p) => (p === pack.id ? null : p)), 1400);
  };

  const onBuyLives = (pack: LifePack) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    buyLives(pack);
    setBoughtLife(pack.id);
    setTimeout(() => setBoughtLife((p) => (p === pack.id ? null : p)), 1400);
  };

  // Buy lives with in-game coins. No-op (nothing happens) when short on coins.
  const onBuyLivesForCoins = () => {
    if (!buyLivesForCoins()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setBoughtCoinLives(true);
    setTimeout(() => setBoughtCoinLives(false), 1400);
  };

  return (
    <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
      <AppBackground />
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Pressable style={[styles.iconBtn, LQShadow.card]} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={LQColors.text} />
        </Pressable>
        <View style={styles.headerRight}>
          <LivesPill livesState={livesState} isPremium={isPremium} />
          <CoinPill coins={coins} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* Subscription block */}
        <Text style={styles.section}>{t.subscription}</Text>
        <GoldSurface radius={LQRadius.lg} style={[styles.premiumCard, LQShadow.gold]}>
          <Text style={styles.premiumTitle}>👑 {t.premium}</Text>
          <Text style={styles.premiumPerksTitle}>{t.premiumPerks}</Text>
          <Perk text={t.perkCategories} />
          <Perk text={t.perkLives} />
          <Perk text={t.perkCoins} />

          <View style={{ height: 14 }} />
          {isPremium ? (
            <View style={styles.activePill}>
              <Ionicons name="checkmark-circle" size={18} color={GOLD_TEXT} />
              <Text style={styles.activeText}>{t.premiumActive}</Text>
            </View>
          ) : (
            <Pressable
              onPress={onBuyPremium}
              style={({ pressed }) => [styles.premiumBuy, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.premiumBuyText}>{t.getPremium} · $4.99</Text>
            </Pressable>
          )}
        </GoldSurface>

        {/* Coins block */}
        <Text style={[styles.section, { marginTop: 26 }]}>{t.coinPacks}</Text>
        {COIN_PACKS.map((pack) => (
          <View key={pack.id} style={[styles.packRow, LQShadow.card]}>
            <View style={styles.packLeft}>
              <CoinIcon size={30} />
              <View>
                <Text style={styles.packCoins}>{pack.coins}</Text>
                {pack.popular && (
                  <View style={styles.popularTag}>
                    <Text style={styles.popularText}>{t.mostPopular}</Text>
                  </View>
                )}
              </View>
            </View>
            <Pressable
              onPress={() => onBuyPack(pack)}
              style={({ pressed }) => [styles.packBuy, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.packBuyText}>
                {boughtPack === pack.id ? '✓' : pack.price}
              </Text>
            </Pressable>
          </View>
        ))}

        {/* Lives block — bought lives stock above the regenerating bar. Shown for
            everyone: premium no longer has infinite lives (it regenerates 3× faster). */}
        <Text style={[styles.section, { marginTop: 26 }]}>{t.livesPacks}</Text>

        {/* Lives for in-game coins (a coin sink) — priced in coins, disabled when
            the player can't afford it. */}
        <View style={[styles.packRow, LQShadow.card]}>
          <View style={styles.packLeft}>
            <Text style={styles.packCoinEmoji}>❤️</Text>
            <Text style={styles.packCoins}>
              {LIVES_FOR_COINS_AMOUNT} {t.livesUnit}
            </Text>
          </View>
          <Pressable
            onPress={onBuyLivesForCoins}
            disabled={!canAffordCoinLives}
            style={({ pressed }) => [
              styles.packBuy,
              styles.lifeBuy,
              !canAffordCoinLives && styles.packBuyDisabled,
              pressed && canAffordCoinLives && { opacity: 0.85 },
            ]}
          >
            {boughtCoinLives ? (
              <Text style={styles.packBuyText}>✓</Text>
            ) : (
              <View style={styles.coinPriceRow}>
                <CoinIcon size={15} />
                <Text style={styles.packBuyText}>{LIVES_FOR_COINS_COST}</Text>
              </View>
            )}
          </Pressable>
        </View>

        {LIFE_PACKS.map((pack) => (
          <View key={pack.id} style={[styles.packRow, LQShadow.card]}>
            <View style={styles.packLeft}>
              <Text style={styles.packCoinEmoji}>❤️</Text>
              <View>
                <Text style={styles.packCoins}>
                  {pack.lives} {t.livesUnit}
                </Text>
                {pack.popular && (
                  <View style={styles.popularTag}>
                    <Text style={styles.popularText}>{t.mostPopular}</Text>
                  </View>
                )}
              </View>
            </View>
            <Pressable
              onPress={() => onBuyLives(pack)}
              style={({ pressed }) => [styles.packBuy, styles.lifeBuy, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.packBuyText}>
                {boughtLife === pack.id ? '✓' : pack.price}
              </Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function Perk({ text }: { text: string }) {
  return (
    <View style={styles.perkRow}>
      <Ionicons name="checkmark-circle" size={18} color={GOLD_TEXT} />
      <Text style={styles.perkText}>{text}</Text>
    </View>
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
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: LQColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '900', color: LQColors.text },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  body: { paddingHorizontal: 16, paddingBottom: 32 },
  section: { fontSize: 15, fontWeight: '800', color: LQColors.textMuted, marginBottom: 10, marginTop: 6 },

  premiumCard: { padding: 20 },
  premiumTitle: { fontSize: 24, fontWeight: '900', color: GOLD_TEXT },
  premiumPerksTitle: { fontSize: 13, fontWeight: '800', color: '#7A5500', marginTop: 10, marginBottom: 8 },
  perkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  perkText: { fontSize: 15, fontWeight: '700', color: GOLD_TEXT },
  premiumBuy: {
    backgroundColor: '#ffffffdd',
    borderRadius: LQRadius.pill,
    paddingVertical: 14,
    alignItems: 'center',
  },
  premiumBuyText: { color: GOLD_TEXT, fontWeight: '900', fontSize: 16 },
  activePill: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  activeText: { color: GOLD_TEXT, fontWeight: '900', fontSize: 16 },

  packRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: LQColors.surface,
    borderRadius: LQRadius.md,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: LQColors.border,
  },
  packLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  packCoinEmoji: { fontSize: 30 },
  packCoins: { fontSize: 20, fontWeight: '900', color: LQColors.text },
  popularTag: {
    alignSelf: 'flex-start',
    backgroundColor: LQColors.coin,
    borderRadius: LQRadius.sm,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginTop: 3,
  },
  popularText: { color: '#fff', fontWeight: '900', fontSize: 10 },
  packBuy: {
    backgroundColor: LQColors.primary,
    borderRadius: LQRadius.pill,
    paddingVertical: 10,
    paddingHorizontal: 22,
    minWidth: 90,
    alignItems: 'center',
  },
  packBuyText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  lifeBuy: { backgroundColor: LQColors.heart },
  packBuyDisabled: { opacity: 0.4 },
  coinPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
