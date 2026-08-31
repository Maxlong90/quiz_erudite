import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Asset } from 'expo-asset';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { SPORT_BG_COLOR, SPORT_BG_NAVY } from '@/components/sport-quiz/app-background';
import { SQColors } from '@/constants/sport-quiz/theme';
import { useSQLabels } from '@/constants/sport-quiz/labels';

/**
 * Sport Quiz splash. Mirrors the QUIZZES / Flags-Quiz splash structure (animated
 * wordmark + tagline over a soft radial bloom) but in the Sport Quiz blue style.
 *
 * It stays up for a MINIMUM of 3s and, in the same window, preloads everything the
 * app needs so the home/shop/settings/wheel paint fully (background AND buttons
 * together) with no pop-in: the background images are warmed here, and this is the
 * single place to await backend content (questions/images) once the quiz flow
 * exists. Only when BOTH the 3s timer and the preload have finished do we navigate.
 */
const SPLASH_MS = 3000;

const wait = (ms: number) => new Promise((res) => setTimeout(res, ms));

export default function SportQuizSplash() {
  const t = useSQLabels();
  const wordOpacity = useSharedValue(0);
  const wordScale = useSharedValue(0.92);
  const tagOpacity = useSharedValue(0);

  useEffect(() => {
    wordOpacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
    wordScale.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) });
    tagOpacity.value = withDelay(400, withTiming(1, { duration: 500 }));

    let alive = true;
    // Preload EVERYTHING in parallel with the 3s timer. Background images are the
    // main source of pop-in today; warming them here means Home renders bg+buttons
    // in the same frame. (When the quiz flow lands, await its content sync here too.)
    const preload = Asset.loadAsync([SPORT_BG_COLOR, SPORT_BG_NAVY]).catch(() => {});
    Promise.all([preload, wait(SPLASH_MS)]).then(() => {
      if (alive) router.replace('/sport-quiz');
    });
    return () => {
      alive = false;
    };
  }, []);

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
        <Animated.View style={wordStyle}>
          <Text style={styles.wordmark}>
            SPORT <Text style={styles.wordAccent}>QUIZ</Text>
          </Text>
        </Animated.View>
        <Animated.Text style={[styles.tagline, tagStyle]}>{t.splashTagline}</Animated.Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#071627' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  wordmark: {
    fontSize: 46,
    fontWeight: '900',
    letterSpacing: 1,
    color: '#EAF6FF',
    textAlign: 'center',
  },
  wordAccent: {
    color: SQColors.neon,
    textShadowColor: SQColors.neon,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  tagline: {
    marginTop: 14,
    fontSize: 18,
    fontWeight: '700',
    color: 'rgba(234,246,255,0.72)',
    textAlign: 'center',
  },
});
