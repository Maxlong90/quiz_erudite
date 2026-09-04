import { useCallback, useRef, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FootballBurst } from '@/components/sport-quiz/football-burst';
import { WinRays } from '@/components/sport-quiz/win-rays';
import { neonGlow } from '@/components/sport-quiz/ui';
import { SQColors, SQRadius } from '@/constants/sport-quiz/theme';
import { useSQLabels } from '@/constants/sport-quiz/labels';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Celebration burst: balls fly RADIALLY out of the screen centre for 4s. Gravity is
// light on purpose so it reads as a star-burst, not a downward dump.
const BALLS_DURATION_MS = 4000;
const BALLS_COUNT = 32;
const BALLS_SPREAD = Math.max(SCREEN_W, SCREEN_H);
const BALLS_DISTANCE: readonly [number, number] = [BALLS_SPREAD * 0.24, BALLS_SPREAD * 0.62];
const BALLS_GRAVITY: readonly [number, number] = [SCREEN_H * 0.1, SCREEN_H * 0.26];

/** The trophy is the hero here — it spans the full screen width. */
const CUP_SIZE = SCREEN_W;

// Bundled with the app (not fetched), so the backdrop and the cup are on screen the
// instant it mounts — no flash of empty background.
const WIN_BG = require('../../assets/sport-quiz/win/win-bg.jpg');
const TROPHY = require('../../assets/sport-quiz/win/trophy.png');

/**
 * Sport Quiz "Level Complete" — the shared win screen for BOTH modes (Classic and
 * Sports Legends; `mode` decides which level list the button returns to).
 *
 * Deliberately bare: a giant trophy on a gold sunburst with a halo under its base,
 * the headline, and one button back to the levels. No coin pill and no back arrow —
 * nothing competing with the win.
 */
export default function SportQuizLevelComplete() {
  const t = useSQLabels();
  const { mode } = useLocalSearchParams<{ level?: string; mode?: string }>();
  const backToLevels = () =>
    router.dismissTo(mode === 'legends' ? '/sport-quiz/legends-levels' : '/sport-quiz/levels');

  // The rays radiate from the trophy's real centre, so they stay aligned on any
  // screen size. Measured in WINDOW coordinates to match the full-screen ray layer.
  const cupRef = useRef<View>(null);
  const [cupCentre, setCupCentre] = useState({ x: SCREEN_W / 2, y: SCREEN_H * 0.38 });
  const onCupLayout = useCallback(() => {
    cupRef.current?.measureInWindow((x, y, w, h) => {
      if (w > 0 && h > 0) setCupCentre({ x: x + w / 2, y: y + h / 2 });
    });
  }, []);

  return (
    <View style={styles.fill}>
      <Image source={WIN_BG} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" />
      <WinRays width={SCREEN_W} height={SCREEN_H} cx={cupCentre.x} cy={cupCentre.y} cupSize={CUP_SIZE} />

      {/* Transparent — an opaque background here would paint OVER the backdrop
          image and the rays sitting behind it. */}
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <StatusBar style="light" />

        <View style={styles.body}>
          <View ref={cupRef} onLayout={onCupLayout} style={styles.cupWrap} collapsable={false}>
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
  safe: { flex: 1, backgroundColor: 'transparent' },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  cupWrap: { width: CUP_SIZE, height: CUP_SIZE, alignItems: 'center', justifyContent: 'center' },
  trophy: { width: '100%', height: '100%' },

  title: {
    color: SQColors.neon,
    fontWeight: '900',
    fontSize: 32,
    letterSpacing: 0.5,
    textAlign: 'center',
    textTransform: 'uppercase',
    marginTop: 4,
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
