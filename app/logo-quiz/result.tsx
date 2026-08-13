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
    outcome?: string;
  }>();

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
  // Lower the icon + title (+ the Game Over life-regen row) by one Home Play-button
  // height (paddingVertical 20×2 + 44px play icon = 84) now that the score box is
  // gone on both branches. 8 (base marginTop) + 84 = 92. Applying it to the first
  // child pushes the whole group down; the flex spacer below absorbs it, so only
  // the composition descends — the bottom buttons stay pinned.
  // Lower the group by one Play-button height (8 + 84), then lift just the badge
  // up by half a Play-button height (42) via translateY so the icon rises without
  // moving the title.
  emojiWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8 + 84,
    transform: [{ translateY: -42 }],
  },
  // +40% over the previous 256 badge (256×1.4 ≈ 358); transparent neon badge, contain.
  icon: { width: 358, height: 358 },
  title: { fontWeight: '900', color: LQColors.text, marginTop: 6, marginBottom: 24 },
  // Game Over title ×2 then +20% (56→67); Win title ×1.5 (28→42). Both use the
  // Wheel-of-Fortune violet accent (#8B5CF6, the WHEEL_TILE_GRADIENT end stop).
  titleGameOver: { fontSize: 67, color: '#8B5CF6' },
  titleWin: { fontSize: 42, color: '#8B5CF6' },

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
