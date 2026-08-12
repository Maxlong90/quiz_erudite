import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBackground } from '@/components/logo-quiz/app-background';
import { Confetti } from '@/components/logo-quiz/confetti';
import { GoldButton } from '@/components/logo-quiz/gold-gradient';
import { CoinPill, LivesPill } from '@/components/logo-quiz/hud';
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
  }>();

  const score = Number(params.score ?? 0);
  const total = Number(params.total ?? 0);
  // The result screen is reached only for a fully cleared level (a win) or a
  // game over — the per-question flow now stays inside the quiz screen.
  const gameOver = params.outcome === 'gameover';

  // Live countdown until the next life regenerates (null once the bar is full).
  const now = useNow(1000);
  const nextLifeMs = msUntilNextLife(livesState, now, isPremium);

  // Back arrow returns to the level-select list the round was started from.
  const levelsRoute = '/logo-quiz/categories';

  return (
    <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
      <AppBackground />
      <StatusBar style="dark" />
      <View style={styles.body}>
        {/* Header — back to the category picker on the left, balance pills on the right */}
        <View style={styles.topBar}>
          <Pressable
            style={[styles.iconBtn, LQShadow.card]}
            onPress={() => router.dismissTo(levelsRoute)}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={22} color={LQColors.text} />
          </Pressable>
          <View style={styles.headerRight}>
            <LivesPill livesState={livesState} isPremium={isPremium} />
            <CoinPill coins={coinBalance} onPress={() => router.push('/logo-quiz/shop')} />
          </View>
        </View>

        {/* Neon badge with a one-shot confetti burst on a win */}
        <View style={styles.emojiWrap}>
          {!gameOver && <Confetti style={StyleSheet.absoluteFill} />}
          <Image
            source={
              gameOver
                ? require('../../assets/logo-quiz/game-over-cloud.png')
                : require('../../assets/logo-quiz/win-smiley.png')
            }
            style={styles.icon}
            resizeMode="contain"
          />
        </View>
        <Text style={[styles.title, gameOver ? styles.titleGameOver : styles.titleWin]}>
          {gameOver ? 'Try later' : 'Level Complete'}
        </Text>

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

        <View style={{ flex: 1 }} />

        {/* Actions — a cleared level returns to the level-select list. On a game
            over the primary sends the player to the Shop. Home → Welcome. */}
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
            onPress={() => router.dismissTo(levelsRoute)}
          >
            <Text style={styles.primaryText}>{t.backToLevels}</Text>
          </Pressable>
        )}
        <Pressable style={styles.secondaryBtn} onPress={() => router.dismissTo('/logo-quiz')}>
          <Text style={styles.secondaryText}>{t.home}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
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
  // 2× the old 64px emoji box; transparent neon badge, proportional (contain).
  icon: { width: 128, height: 128 },
  title: { fontWeight: '900', color: LQColors.text, marginTop: 6, marginBottom: 24 },
  // Game Over title ×2 (28→56); Win title ×1.5 (28→42).
  titleGameOver: { fontSize: 56 },
  titleWin: { fontSize: 42 },

  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LQColors.surfaceAlt,
    borderRadius: LQRadius.lg,
    paddingVertical: 22,
    width: '50%',
  },
  statCol: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 30, fontWeight: '900', color: LQColors.text },
  statOf: { fontSize: 18, fontWeight: '800', color: LQColors.textFaint },
  scoreValue: { fontSize: 48, fontWeight: '900', color: LQColors.text, lineHeight: 52 },
  scoreOf: { fontSize: 26, fontWeight: '800', color: LQColors.textFaint },
  statLabel: { fontSize: 13, fontWeight: '700', color: LQColors.textMuted, marginTop: 4 },
  divider: { width: 1, height: 56, backgroundColor: LQColors.border },

  regenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 18,
    backgroundColor: LQColors.surfaceAlt,
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
