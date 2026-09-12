import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBackground, BG_BASE, useCoatBgReady } from '@/components/coat-of-arms/app-background';
import { GlossyButton } from '@/components/flags-quiz/glossy-button';
import { FQColors, FQShadow } from '@/constants/flags-quiz/theme';
import { useFQLabels } from '@/constants/flags-quiz/labels';
import { useCoaLabels } from '@/constants/coat-of-arms/labels';
import { useResponsive } from '@/hooks/use-responsive';

/**
 * Coat of Arms result screen. Shown once every question of a run has been
 * answered (see quiz.tsx). Same format as the Flags Quiz result — a big score
 * tile, a percentage and a tiered message — on the Coat of Arms background. From
 * here the player can retry ONLY the questions they missed, replay the whole run,
 * or go home.
 */
export default function CoatOfArmsResult() {
  const t = useFQLabels();
  const c = useCoaLabels();
  const bgReady = useCoatBgReady();
  // This screen is a fixed vertical stack (emoji + title + 200pt medal + message
  // + up to three buttons + gaps ≈ 618pt). In a SHORT window — 1024x568, entirely
  // reachable on iPad — that overflows and the buttons go off-screen. `scale`
  // shrinks below 1 there, which is what keeps the whole stack reachable.
  const r = useResponsive();
  const medal = Math.round(200 * r.scale);
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
    tier === 'excellent' ? c.resultExcellent : tier === 'good' ? c.resultGood : c.resultKeepGoing;

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
        <View
          style={[
            styles.content,
            { gap: Math.round(18 * r.scale) },
            r.column,
          ]}
        >
          <Text style={{ fontSize: Math.round(64 * r.scale), lineHeight: Math.round(76 * r.scale) }}>
            {emoji}
          </Text>
          <Text style={[styles.title, { fontSize: Math.round(30 * r.scale) }]}>
            {t.resultTitle}
          </Text>

          {/* Big square score tile (Erudite-style stats in the FQ language). */}
          <LinearGradient
            colors={[FQColors.tileLight, FQColors.tileDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.square,
              { width: medal, height: medal, borderColor: tierColor },
              FQShadow.card,
            ]}
          >
            <LinearGradient
              colors={['rgba(255,255,255,0.55)', 'rgba(255,255,255,0)']}
              style={styles.squareGloss}
              pointerEvents="none"
            />
            <Text
              style={[styles.score, { color: tierColor, fontSize: Math.round(56 * r.scale) }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.4}
            >{`${score}/${outOf}`}</Text>
            <Text
              style={[styles.percent, { color: tierColor, fontSize: Math.round(26 * r.scale) }]}
            >{`${percentage}%`}</Text>
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
  // gap, and the emoji/title/medal/score sizes below, are applied INLINE from the
  // live window scale so the stack stays reachable in a short window.
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    color: '#FFFFFF',
    fontWeight: '900',
    textShadowColor: 'rgba(4, 40, 96, 0.55)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  square: {
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
  score: { fontWeight: '900', fontVariant: ['tabular-nums'], textAlign: 'center', alignSelf: 'stretch' },
  percent: { fontWeight: '800', fontVariant: ['tabular-nums'] },
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
