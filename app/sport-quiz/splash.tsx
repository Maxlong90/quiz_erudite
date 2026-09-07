import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Asset } from 'expo-asset';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { SPORT_BG_COLOR, SPORT_BG_NAVY } from '@/components/sport-quiz/app-background';
import { SQColors } from '@/constants/sport-quiz/theme';
import { useSQLabels } from '@/constants/sport-quiz/labels';
import { questionsForLevel } from '@/lib/sport-quiz/content';
import { useSportQuizContent } from '@/hooks/sport-quiz/use-sport-quiz-content';
import { prefetchLocalImages } from '@/hooks/sport-quiz/use-warm-level-images';

/**
 * Sport Quiz splash. Same QUIZZZES wordmark treatment as the Flags Quiz splash —
 * the three middle Z's are the accent — but recoloured GREEN (our neon) and set
 * over the Sport Quiz blue radial backdrop.
 *
 * Stays up a MINIMUM of 3s, and on a FRESH INSTALL holds a little longer — up to
 * SPLASH_CAP_MS — until the content sync reports the first Classic levels'
 * question images are on disk (`priorityReady`). Without that hold the player
 * walks into Classic while the pictures are still downloading and watches them
 * appear one by one. The cap is hard: past it we go in regardless and the rest
 * keeps downloading in the background, because a partially-stocked game beats
 * being stuck on a splash.
 */
const SPLASH_MS = 3000;
const SPLASH_CAP_MS = 6000;
const LETTERS = ['Q', 'U', 'I', 'Z', 'Z', 'Z', 'E', 'S'] as const;

/**
 * Every bitmap the app draws right after launch — the two backdrops, the wheel
 * icon, and all four mode icons — so Home AND the Choose-a-mode screen paint with
 * no icon pop-in. Warmed fire-and-forget: navigation must NEVER wait on it.
 */
const SPORT_SPLASH_ASSETS = [
  SPORT_BG_COLOR,
  SPORT_BG_NAVY,
  require('../../assets/sport-quiz/wheel-icon.png'),
  require('../../assets/sport-quiz/modes/classic.png'),
  require('../../assets/sport-quiz/modes/legends.png'),
  require('../../assets/sport-quiz/modes/challenge.png'),
  require('../../assets/sport-quiz/modes/sprint.png'),
];

export default function SportQuizSplash() {
  const t = useSQLabels();
  const wordOpacity = useSharedValue(0);
  const wordScale = useSharedValue(0.92);
  const tagOpacity = useSharedValue(0);
  const { snapshot, priorityReady } = useSportQuizContent();
  // Two independent timers rather than a Promise.race: the gate we are waiting
  // for (`priorityReady`) lives in React state, which a promise chain captured
  // in a mount-once effect could never observe.
  const [floorDone, setFloorDone] = useState(false);
  const [capped, setCapped] = useState(false);
  const navigated = useRef(false);

  useEffect(() => {
    wordOpacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
    wordScale.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) });
    tagOpacity.value = withDelay(400, withTiming(1, { duration: 500 }));

    // Fire-and-forget. An Asset.loadAsync that never SETTLES (rejection is not
    // the risk — .catch covers that) would otherwise hang the splash forever.
    Asset.loadAsync(SPORT_SPLASH_ASSETS).catch(() => {});

    const floorTimer = setTimeout(() => setFloorDone(true), SPLASH_MS);
    const capTimer = setTimeout(() => setCapped(true), SPLASH_CAP_MS);
    return () => {
      clearTimeout(floorTimer);
      clearTimeout(capTimer);
      // Unmounted: never navigate from under a screen that is already gone.
      navigated.current = true;
    };
  }, []);

  // Leave once the artwork is ready (never before the 3s floor), or at the cap.
  useEffect(() => {
    if (navigated.current) return;
    if (!capped && !(floorDone && priorityReady)) return;
    navigated.current = true;
    // Bytes on disk still cost a decode frame, so hand level 1's images to
    // expo-image's decode cache on the way out. Local files only (see
    // prefetchLocalImages) — decode work, never a competing download.
    if (snapshot) {
      prefetchLocalImages(questionsForLevel(snapshot, 1).map((q) => q.imageUri));
    }
    router.replace('/sport-quiz');
  }, [floorDone, capped, priorityReady, snapshot]);

  const wordStyle = useAnimatedStyle(() => ({ opacity: wordOpacity.value, transform: [{ scale: wordScale.value }] }));
  const tagStyle = useAnimatedStyle(() => ({ opacity: tagOpacity.value }));

  return (
    <View style={styles.fill}>
      {/* Blue textured radial backdrop + a soft aqua bloom behind the wordmark. */}
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="sqBase" cx="50%" cy="46%" r="75%">
            <Stop offset="0" stopColor="#1B4E82" />
            <Stop offset="0.55" stopColor="#0E2E50" />
            <Stop offset="1" stopColor="#071627" />
          </RadialGradient>
          <RadialGradient id="sqBloom" cx="50%" cy="46%" r="42%">
            <Stop offset="0" stopColor={SQColors.neon} stopOpacity="0.28" />
            <Stop offset="1" stopColor={SQColors.neon} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#sqBase)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#sqBloom)" />
      </Svg>
      <StatusBar style="light" />

      <View style={styles.center}>
        <Animated.View style={[styles.wordmark, wordStyle]}>
          {LETTERS.map((ch, i) => {
            // Highlight the three middle Z's (indices 3–5) in neon green.
            const isAccent = i >= 3 && i <= 5;
            return (
              <Text key={i} style={[styles.letter, isAccent && styles.letterAccent]}>
                {ch}
              </Text>
            );
          })}
        </Animated.View>
        <Animated.Text style={[styles.tagline, tagStyle]}>{t.splashTagline}</Animated.Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#071627' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  wordmark: { flexDirection: 'row', alignItems: 'flex-end' },
  letter: {
    fontSize: 56,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
    textShadowColor: 'rgba(150, 210, 255, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  // Neon-green glowing ZZZ.
  letterAccent: {
    color: SQColors.neon,
    textShadowColor: SQColors.neon,
    textShadowRadius: 24,
  },
  tagline: {
    marginTop: 16,
    fontSize: 17,
    fontWeight: '700',
    color: 'rgba(234,246,255,0.8)',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
});
