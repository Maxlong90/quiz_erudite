import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FootballBurst } from '@/components/sport-quiz/football-burst';
import { neonGlow } from '@/components/sport-quiz/ui';
import { SQColors, SQRadius } from '@/constants/sport-quiz/theme';
import { useSQLabels } from '@/constants/sport-quiz/labels';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Celebration burst: balls fly RADIALLY out of the screen centre for 4s. Gravity is
// deliberately light so it reads as a star-burst rather than a downward dump.
const BALLS_DURATION_MS = 4000;
const BALLS_COUNT = 32;
const BALLS_SPREAD = Math.max(SCREEN_W, SCREEN_H);
const BALLS_DISTANCE: readonly [number, number] = [BALLS_SPREAD * 0.24, BALLS_SPREAD * 0.62];
const BALLS_GRAVITY: readonly [number, number] = [SCREEN_H * 0.1, SCREEN_H * 0.26];

// Bundled with the app (not fetched), so the backdrop and the cup are on screen the
// instant it mounts — no flash of empty background.
const WIN_BG = require('../../assets/sport-quiz/win/win-bg.jpg');
const TROPHY = require('../../assets/sport-quiz/win/trophy.png');

/**
 * Sport Quiz "Level Complete" — shown after the last question of a Classic level is
 * answered. Deliberately bare: the trophy, the headline and a single button back to
 * the level list. No coin pill, no back arrow — nothing to distract from the win.
 */
export default function SportQuizLevelComplete() {
  const t = useSQLabels();
  const backToLevels = () => router.dismissTo('/sport-quiz/levels');

  return (
    <View style={styles.fill}>
      <Image source={WIN_BG} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" />
      <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
        <StatusBar style="light" />

        <View style={styles.body}>
          <View style={[styles.trophyRing, neonGlow(SQColors.neon, 18)]}>
            <Image source={TROPHY} style={styles.trophy} contentFit="contain" />
          </View>
          <Text style={styles.title}>{t.levelComplete}</Text>
        </View>

        {/* One-shot celebratory burst from the centre of the screen. */}
        <View style={styles.ballsLayer} pointerEvents="none">
          <FootballBurst
            count={BALLS_COUNT}
            distanceRange={BALLS_DISTANCE}
            gravityRange={BALLS_GRAVITY}
            durationMs={BALLS_DURATION_MS}
          />
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
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: SQColors.bgDeep },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },

  // The cup sits in a neon ring on a dim glass disc (design #1).
  trophyRing: {
    width: 236,
    height: 236,
    borderRadius: 118,
    borderWidth: 3,
    borderColor: SQColors.neon,
    backgroundColor: 'rgba(6,22,34,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  trophy: { width: 180, height: 180 },

  title: {
    color: SQColors.neon,
    fontWeight: '900',
    fontSize: 34,
    letterSpacing: 0.5,
    textAlign: 'center',
    textTransform: 'uppercase',
    textShadowColor: SQColors.neon,
    textShadowRadius: 16,
    textShadowOffset: { width: 0, height: 0 },
  },

  ballsLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },

  footer: { paddingHorizontal: 20, paddingBottom: 16 },
  primaryBtn: {
    backgroundColor: SQColors.neon,
    borderRadius: SQRadius.pill,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryText: { color: SQColors.textOnNeon, fontWeight: '900', fontSize: 18 },
});
