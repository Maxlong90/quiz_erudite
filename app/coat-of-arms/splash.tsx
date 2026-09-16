import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { useFQLabels } from '@/constants/flags-quiz/labels';
import { useCoatContent } from '@/hooks/coat-of-arms/use-coat-content';
import { PRIORITY_COUNT } from '@/lib/coat-of-arms/content';
import { prefetchLocalImages } from '@/hooks/coat-of-arms/use-warm-coat-images';

// Onboarding splash for the Coat of Arms build — IDENTICAL to the Flags Quiz
// splash (same blue gradient, same QUIZZZES wordmark with the three middle Z's
// highlighted, same localized tagline, same 3s timing and animation). Only the
// hand-off target differs (the Coat of Arms home). Kept as its own file so the
// two apps stay independent.
//
// Stays up a MINIMUM of SPLASH_MS, and on a FRESH INSTALL holds a little longer —
// up to SPLASH_CAP_MS — until the content sync reports the first PRIORITY_COUNT
// coats are on disk (`priorityReady`). Without that hold the player walks into
// the game while the coats are still downloading and watches them appear one by
// one. The cap is hard: past it we go in regardless and the rest keeps
// downloading in the background, because a partially-stocked game beats being
// stuck on a splash.
const SPLASH_MS = 3000;
const SPLASH_CAP_MS = 7000;
const LETTERS = ['Q', 'U', 'I', 'Z', 'Z', 'Z', 'E', 'S'] as const;

export default function CoatOfArmsSplash() {
  const t = useFQLabels();
  const { countryQuestions, priorityReady } = useCoatContent();
  const wordmarkOpacity = useSharedValue(0);
  const wordmarkScale = useSharedValue(0.92);
  const taglineOpacity = useSharedValue(0);
  // Two independent timers rather than a Promise.race: the gate we are waiting
  // for (`priorityReady`) lives in React state, which a promise chain captured
  // in a mount-once effect could never observe.
  const [floorDone, setFloorDone] = useState(false);
  const [capped, setCapped] = useState(false);
  const navigated = useRef(false);

  useEffect(() => {
    wordmarkOpacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
    wordmarkScale.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) });
    taglineOpacity.value = withDelay(400, withTiming(1, { duration: 500 }));

    const floorTimer = setTimeout(() => setFloorDone(true), SPLASH_MS);
    const capTimer = setTimeout(() => setCapped(true), SPLASH_CAP_MS);
    return () => {
      clearTimeout(floorTimer);
      clearTimeout(capTimer);
      // Unmounted: never navigate from under a screen that is already gone.
      navigated.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Leave once the coats are ready (never before the 3s floor), or at the cap.
  useEffect(() => {
    if (navigated.current) return;
    if (!capped && !(floorDone && priorityReady)) return;
    navigated.current = true;
    // Bytes on disk still cost a decode frame, so hand the first porción's coats
    // (and their reveal originals) to expo-image's decode cache on the way out.
    // Local files only (see prefetchLocalImages) — decode work, never a download.
    prefetchLocalImages(
      countryQuestions.slice(0, PRIORITY_COUNT).flatMap((q) => [q.imageUri, q.originalImageUri]),
    );
    router.replace('/coat-of-arms');
  }, [floorDone, capped, priorityReady, countryQuestions]);

  const wordmarkStyle = useAnimatedStyle(() => ({
    opacity: wordmarkOpacity.value,
    transform: [{ scale: wordmarkScale.value }],
  }));
  const taglineStyle = useAnimatedStyle(() => ({ opacity: taglineOpacity.value }));

  return (
    <LinearGradient
      colors={['#2E97F2', '#1466C4', '#0A3576']}
      locations={[0, 0.55, 1]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.flex}
    >
      <StatusBar style="light" />

      <View style={styles.content}>
        <Animated.View style={[styles.wordmark, wordmarkStyle]}>
          {LETTERS.map((ch, i) => {
            // Highlight the three middle Z's so it reads QUI-ZZZ-ES.
            const isAccent = i >= 3 && i <= 5;
            return (
              <Text key={i} style={[styles.letter, isAccent && styles.letterAccent]}>
                {ch}
              </Text>
            );
          })}
        </Animated.View>

        <Animated.Text style={[styles.tagline, taglineStyle]}>{t.tagline}</Animated.Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  wordmark: { flexDirection: 'row', alignItems: 'center' },
  letter: {
    fontSize: 56,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 2,
    textShadowColor: 'rgba(150, 210, 255, 0.55)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  // Light-cyan glowing ZZZ that pops against the blue gradient.
  letterAccent: {
    color: '#9FE6FF',
    textShadowColor: 'rgba(140, 215, 255, 0.95)',
    textShadowRadius: 24,
  },
  tagline: {
    fontSize: 17,
    fontWeight: '600',
    color: '#EAF4FF',
    letterSpacing: 0.4,
  },
});
