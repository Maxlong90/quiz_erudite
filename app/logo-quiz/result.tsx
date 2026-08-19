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

// Outline thickness in px, and the 8 directions the black copies are offset to.
const OUTLINE = 2;
const OUTLINE_OFFSETS: [number, number][] = [
  [-OUTLINE, -OUTLINE], [0, -OUTLINE], [OUTLINE, -OUTLINE],
  [-OUTLINE, 0], [OUTLINE, 0],
  [-OUTLINE, OUTLINE], [0, OUTLINE], [OUTLINE, OUTLINE],
];

// Crisp black outline for the result title: 8 black copies of the text offset around
// a centred violet fill (React Native has no native text stroke).
function OutlinedTitle({ text, fontSize }: { text: string; fontSize: number }) {
  return (
    <View style={styles.titleWrap}>
      {OUTLINE_OFFSETS.map(([x, y], i) => (
        <Text
          key={i}
          style={[styles.titleBase, styles.titleOutline, { fontSize, transform: [{ translateX: x }, { translateY: y }] }]}
        >
          {text}
        </Text>
      ))}
      <Text style={[styles.titleBase, { fontSize, color: '#8B5CF6' }]}>{text}</Text>
    </View>
  );
}

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
        <OutlinedTitle text={gameOver ? 'Try later' : 'Level Complete'} fontSize={gameOver ? 67 : 42} />

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
            over the primary sends the player to the Shop. */}
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
  // Home Play-button height = paddingVertical 20×2 + 44px icon = 84 (half = 42).
  // The group starts lowered by one Play-button (marginTop 8 + 84) now that the
  // score box is gone; each element is then lifted with translateY: the badge
  // (cloud/smiley — shared, so Win == Game Over, same 358 size) and the title
  // (Try later / Level Complete — shared position) each rise a full Play-button,
  // and the Game Over "Next life in" row rises a full Play-button too.
  emojiWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8 + 84,
    transform: [{ translateY: -84 }],
  },
  // +40% over the previous 256 badge (256×1.4 ≈ 358); transparent neon badge, contain.
  icon: { width: 358, height: 358 },
  // Title wrap (Try later / Level Complete — shared position) lifted a full Play-
  // button (84). Font size passed inline: Game Over 67 (×2 +20%), Win 42 (×1.5).
  titleWrap: {
    marginTop: 6,
    marginBottom: 24,
    transform: [{ translateY: -84 }],
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBase: { fontWeight: '900' },
  // Crisp outline: 8 black copies offset around the violet fill (RN has no text stroke).
  titleOutline: { position: 'absolute', color: '#000' },

  regenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 18,
    backgroundColor: LQColors.surfaceAlt,
    borderRadius: LQRadius.pill,
    // "Next life in" counter lifted a full Play-button height (84).
    transform: [{ translateY: -84 }],
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
});
