import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBackground, BG_BASE, useCoatBgReady } from '@/components/coat-of-arms/app-background';
import { GlossyButton } from '@/components/flags-quiz/glossy-button';
import { FQColors, FQShadow } from '@/constants/flags-quiz/theme';
import { useFQLabels } from '@/constants/flags-quiz/labels';

/**
 * Coat of Arms result screen. Shown once every question of a run has been
 * answered (see quiz.tsx). Same format as the Flags Quiz result — a big score
 * tile, a percentage and a tiered message — on the Coat of Arms background. From
 * here the player can retry ONLY the questions they missed, replay the whole run,
 * or go home.
 */
export default function CoatOfArmsResult() {
  const t = useFQLabels();
  const bgReady = useCoatBgReady();
  const { correct, total, wrong, mode, continent } = useLocalSearchParams<{
    correct?: string;
    total?: string;
    wrong?: string;
    mode?: string;
    continent?: string;
  }>();

  const score = Number.parseInt(correct ?? '0', 10) || 0;
  const outOf = Number.parseInt(total ?? '0', 10) || 0;
  const percentage = outOf > 0 ? Math.round((score / outOf) * 100) : 0;
  const wrongList = (wrong ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const hasMistakes = wrongList.length > 0;

  const tier = percentage >= 80 ? 'excellent' : percentage >= 40 ? 'good' : 'keepGoing';
  const tierColor = tier === 'excellent' ? '#37B24D' : tier === 'good' ? '#F59F00' : '#E03131';
  const allCorrect = outOf > 0 && score === outOf;
  const emoji = allCorrect
    ? '🏆'
    : score === 0
      ? '🥲'
      : tier === 'excellent'
        ? '🎉'
        : tier === 'good'
          ? '👍'
          : '💪';
  const message =
    tier === 'excellent' ? t.resultExcellent : tier === 'good' ? t.resultGood : t.resultKeepGoing;

  // Where "play again" / "retry mistakes" route depends on which game mode
  // produced this result: the "All countries" quiz or a per-continent game.
  const isContinent = mode === 'continent';
  const gamePath = isContinent ? '/coat-of-arms/continent-quiz' : '/coat-of-arms/quiz';

  function playAgain() {
    router.replace({
      pathname: gamePath,
      params: isContinent ? { continent: continent ?? 'africa' } : {},
    });
  }

  function retryMistakes() {
    router.replace({
      pathname: gamePath,
      params: {
        retry: wrongList.join(','),
        ...(isContinent ? { continent: continent ?? 'africa' } : {}),
      },
    });
  }

  function goHome() {
    router.replace('/coat-of-arms');
  }

  // Hold on the plain blue base until the coats artwork is cached, then reveal
  // background + content together (matches the home screen).
  if (!bgReady) {
    return <View style={[styles.fill, { backgroundColor: BG_BASE }]} />;
  }

  return (
    <View style={styles.fill}>
      {/* Same coats background as home, softened (~30% blur) so the result
          content reads clearly on top. */}
      <AppBackground blurRadius={13} />
      <StatusBar style="light" />

      <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
        <View style={styles.content}>
          <Text style={styles.emoji}>{emoji}</Text>
          <Text style={styles.title}>{t.resultTitle}</Text>

          {/* Big square score tile (Erudite-style stats in the FQ language). */}
          <LinearGradient
            colors={[FQColors.tileLight, FQColors.tileDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.square, { borderColor: tierColor }, FQShadow.card]}
          >
            <LinearGradient
              colors={['rgba(255,255,255,0.55)', 'rgba(255,255,255,0)']}
              style={styles.squareGloss}
              pointerEvents="none"
            />
            <Text
              style={[styles.score, { color: tierColor }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.4}
            >{`${score}/${outOf}`}</Text>
            <Text style={[styles.percent, { color: tierColor }]}>{`${percentage}%`}</Text>
            <Text style={styles.caption}>{t.resultCaption}</Text>
          </LinearGradient>

          <Text style={styles.message}>{message}</Text>

          <View style={styles.buttons}>
            {hasMistakes ? (
              <GlossyButton label={t.retryMistakes} fontSize={22} paddingVertical={18} onPress={retryMistakes} />
            ) : null}
            <GlossyButton label={t.playAgain} fontSize={22} paddingVertical={18} onPress={playAgain} />
            <GlossyButton label={t.backHome} fontSize={22} paddingVertical={18} onPress={goHome} />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: 'transparent' },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 18,
  },
  emoji: { fontSize: 64, lineHeight: 76 },
  title: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
    textShadowColor: 'rgba(4, 40, 96, 0.55)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  square: {
    width: 200,
    height: 200,
    borderRadius: 28,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginVertical: 4,
    paddingHorizontal: 14,
    overflow: 'hidden',
  },
  squareGloss: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: 2,
    height: '50%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  score: { fontSize: 56, fontWeight: '900', fontVariant: ['tabular-nums'], textAlign: 'center', alignSelf: 'stretch' },
  percent: { fontSize: 26, fontWeight: '800', fontVariant: ['tabular-nums'] },
  caption: { color: FQColors.tileGlyph, fontSize: 14, fontWeight: '700', marginTop: 2 },
  message: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  buttons: { width: '100%', gap: 12, marginTop: 4 },
});
