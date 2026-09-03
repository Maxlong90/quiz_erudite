import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBackground } from '@/components/sport-quiz/app-background';
import { FootballBurst } from '@/components/sport-quiz/football-burst';
import { CoinPill, GlassIconButton, neonGlow } from '@/components/sport-quiz/ui';
import { SQColors, SQRadius } from '@/constants/sport-quiz/theme';
import { useSQLabels } from '@/constants/sport-quiz/labels';
import { useSportQuiz } from '@/hooks/sport-quiz/use-sport-quiz';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const BALLS_SPREAD = Math.max(SCREEN_W, SCREEN_H);
const BALLS_DISTANCE: readonly [number, number] = [BALLS_SPREAD * 0.22, BALLS_SPREAD * 0.62];
const BALLS_GRAVITY: readonly [number, number] = [SCREEN_H * 0.4, SCREEN_H * 0.95];

/**
 * Sport Quiz "Level Complete" — shown after the last question of a Classic level
 * is answered. A one-shot football burst celebrates the win; the only action
 * returns to the level-select list (where the next level is now unlocked).
 * Mirrors the Logo Quiz result screen (win path), in Sport Quiz's look.
 */
export default function SportQuizLevelComplete() {
  const t = useSQLabels();
  const { coins } = useSportQuiz();
  const backToLevels = () => router.dismissTo('/sport-quiz/levels');

  return (
    <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
      <AppBackground variant="navy" />
      <StatusBar style="light" />

      <View style={styles.header}>
        <GlassIconButton glyph="chevron-back" size={44} onPress={backToLevels} />
        <Pressable onPress={() => router.push('/sport-quiz/shop')} hitSlop={8}>
          <CoinPill coins={coins} size="lg" />
        </Pressable>
      </View>

      <View style={styles.body}>
        <Text style={styles.emoji}>🏆</Text>
        <Text style={styles.title}>{t.levelComplete}</Text>
      </View>

      {/* One-shot celebratory football burst from the centre. */}
      <View style={styles.ballsLayer} pointerEvents="none">
        <FootballBurst count={32} distanceRange={BALLS_DISTANCE} gravityRange={BALLS_GRAVITY} />
      </View>

      <View style={styles.footer}>
        <Pressable
          onPress={backToLevels}
          style={({ pressed }) => [styles.primaryBtn, neonGlow(SQColors.neon, 12), pressed && { opacity: 0.9 }]}
        >
          <Text style={styles.primaryText}>{t.backToLevels}</Text>
        </Pressable>
      </View>
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
  },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  emoji: { fontSize: 96, marginBottom: 12 },
  title: {
    color: SQColors.neon,
    fontWeight: '900',
    fontSize: 40,
    letterSpacing: 0.5,
    textAlign: 'center',
    textTransform: 'uppercase',
    textShadowColor: SQColors.neon,
    textShadowRadius: 16,
    textShadowOffset: { width: 0, height: 0 },
  },
  ballsLayer: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  footer: { paddingHorizontal: 20, paddingBottom: 16 },
  primaryBtn: {
    backgroundColor: SQColors.neon,
    borderRadius: SQRadius.pill,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryText: { color: SQColors.textOnNeon, fontWeight: '900', fontSize: 18 },
});
