import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBackground } from '@/components/logo-quiz/app-background';
import { Confetti } from '@/components/logo-quiz/confetti';
import { GoldButton, GoldSurface } from '@/components/logo-quiz/gold-gradient';
import { CoinPill, LivesPill } from '@/components/logo-quiz/hud';
import { VIP_CATEGORIES } from '@/constants/logo-quiz/mock-data';
import { formatCountdown, msUntilNextLife } from '@/lib/logo-quiz/economy';
import { LQColors, LQRadius, LQShadow, GOLD_TEXT } from '@/constants/logo-quiz/theme';
import { useLQLabels } from '@/constants/logo-quiz/labels';
import { useLogoQuiz, useNow } from '@/hooks/logo-quiz/use-logo-quiz';

export default function LogoQuizResult() {
  const t = useLQLabels();
  const { coins: coinBalance, isPremium, livesState } = useLogoQuiz();
  const params = useLocalSearchParams<{
    score?: string;
    coins?: string;
    total?: string;
    outcome?: string;
    category?: string;
  }>();

  const score = Number(params.score ?? 0);
  const total = Number(params.total ?? 0);
  const gameOver = params.outcome === 'gameover';
  const category = params.category ?? 'all';

  // Live countdown until the next life regenerates (null once the bar is full).
  const now = useNow(1000);
  const nextLifeMs = msUntilNextLife(livesState, now, isPremium);

  // Back arrow returns to the category picker the round was started from —
  // the VIP list when the played category is a VIP one, otherwise the regular list.
  const isVipCategory = VIP_CATEGORIES.some((c) => c.id === category);
  const categoryRoute = isVipCategory ? '/logo-quiz/categories-vip' : '/logo-quiz/categories';

  return (
    <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
      <AppBackground />
      <StatusBar style="dark" />
      <View style={styles.body}>
        {/* Header — back to the category picker on the left, balance pills on the right */}
        <View style={styles.topBar}>
          <Pressable
            style={[styles.iconBtn, LQShadow.card]}
            onPress={() => router.dismissTo(categoryRoute)}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={22} color={LQColors.text} />
          </Pressable>
          <View style={styles.headerRight}>
            <LivesPill livesState={livesState} isPremium={isPremium} />
            <CoinPill coins={coinBalance} />
          </View>
        </View>

        {/* Emoji with a one-shot confetti burst on a win */}
        <View style={styles.emojiWrap}>
          {!gameOver && <Confetti style={StyleSheet.absoluteFill} />}
          <Text style={styles.emoji}>{gameOver ? '💥' : '🎉'}</Text>
        </View>
        <Text style={styles.title}>{gameOver ? t.gameOver : t.roundOver}</Text>

        {/* Round stats — score only */}
        <View style={[styles.statsCard, LQShadow.card]}>
          <View style={styles.statCol}>
            <Text style={styles.scoreValue}>
              {score}
              <Text style={styles.scoreOf}> / {total}</Text>
            </Text>
            <Text style={styles.statLabel}>{t.score}</Text>
          </View>
        </View>

        {/* Out of lives: show the countdown until the next life regenerates. */}
        {gameOver && nextLifeMs != null && (
          <View style={[styles.regenRow, LQShadow.card]}>
            <Ionicons name="heart" size={16} color={LQColors.heart} />
            <Text style={styles.regenLabel}>{t.nextLifeIn}</Text>
            <Text style={styles.regenTime}>{formatCountdown(nextLifeMs)}</Text>
          </View>
        )}

        {/* Premium upsell reminder (hidden once subscribed) — lists every perk */}
        {!isPremium && (
          <Pressable onPress={() => router.replace('/logo-quiz/shop')} style={styles.upsellWrap}>
            <GoldSurface radius={LQRadius.lg} style={[styles.upsell, LQShadow.gold]}>
              <Text style={styles.upsellEmoji}>👑</Text>
              <Text style={styles.upsellText}>{t.premium}</Text>
              <View style={styles.upsellPerks}>
                <Perk text={t.perkLives} />
                <Perk text={t.perkCoins} />
                <Perk text={t.perkCategories} />
              </View>
              <View style={styles.upsellBtn}>
                <Text style={styles.upsellBtnText}>{t.buyPremium}</Text>
              </View>
            </GoldSurface>
          </Pressable>
        )}

        <View style={{ flex: 1 }} />

        {/* Actions — on a win, Next continues to the following level; on a game over,
            the primary sends the player to the Shop. Home returns to Welcome. */}
        {gameOver ? (
          <GoldButton
            onPress={() => router.replace('/logo-quiz/shop')}
            radius={LQRadius.pill}
            style={styles.primaryGold}
          >
            <Text style={styles.primaryGoldText}>{t.goToShop}</Text>
          </GoldButton>
        ) : (
          <Pressable
            style={({ pressed }) => [styles.primaryBtn, LQShadow.card, pressed && { opacity: 0.9 }]}
            onPress={() => router.replace({ pathname: '/logo-quiz/quiz', params: { category } })}
          >
            <Text style={styles.primaryText}>{t.next}</Text>
          </Pressable>
        )}
        <Pressable style={styles.secondaryBtn} onPress={() => router.dismissTo('/logo-quiz')}>
          <Text style={styles.secondaryText}>{t.home}</Text>
        </Pressable>
      </View>
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
  body: { flex: 1, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 16, alignItems: 'center' },
  topBar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: LQColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  emojiWrap: { alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  emoji: { fontSize: 64 },
  title: { fontSize: 28, fontWeight: '900', color: LQColors.text, marginTop: 6, marginBottom: 24 },

  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LQColors.surface,
    borderRadius: LQRadius.lg,
    paddingVertical: 22,
    width: '100%',
  },
  statCol: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 30, fontWeight: '900', color: LQColors.text },
  statOf: { fontSize: 18, fontWeight: '800', color: LQColors.textFaint },
  scoreValue: { fontSize: 48, fontWeight: '900', color: LQColors.text, lineHeight: 52 },
  scoreOf: { fontSize: 26, fontWeight: '800', color: LQColors.textFaint },
  statLabel: { fontSize: 13, fontWeight: '700', color: LQColors.textMuted, marginTop: 4 },
  divider: { width: 1, height: 56, backgroundColor: LQColors.border },

  upsellWrap: { width: '100%', marginTop: 20 },
  upsell: { alignItems: 'center', paddingVertical: 20, paddingHorizontal: 18 },
  upsellEmoji: { fontSize: 30 },
  upsellText: { fontSize: 20, fontWeight: '900', color: GOLD_TEXT, textAlign: 'center', marginTop: 6 },
  upsellPerks: { alignSelf: 'stretch', marginTop: 12, paddingHorizontal: 4 },
  perkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  perkText: { fontSize: 15, fontWeight: '700', color: GOLD_TEXT },
  upsellBtn: {
    marginTop: 12,
    backgroundColor: '#ffffffdd',
    borderRadius: LQRadius.pill,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  upsellBtnText: { color: GOLD_TEXT, fontWeight: '900', fontSize: 15 },

  regenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 18,
    backgroundColor: LQColors.surface,
    borderRadius: LQRadius.pill,
  },
  regenLabel: { color: LQColors.textMuted, fontWeight: '800', fontSize: 14 },
  regenTime: { color: LQColors.text, fontWeight: '900', fontSize: 16 },

  primaryBtn: {
    width: '100%',
    backgroundColor: LQColors.primary,
    borderRadius: LQRadius.pill,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '900', fontSize: 18 },
  primaryGold: { width: '100%' },
  primaryGoldText: { color: GOLD_TEXT, fontWeight: '900', fontSize: 18 },
  secondaryBtn: { paddingVertical: 14, alignItems: 'center' },
  secondaryText: { color: LQColors.textMuted, fontWeight: '800', fontSize: 15 },
});
