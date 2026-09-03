import { useEffect } from 'react';
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

import { useItalyLabels } from '@/constants/italy-quiz/labels';

// Onboarding splash for the Italy Quiz build: a deep-navy gradient with the
// QUIZZZES wordmark (the three middle Z's highlighted, as in the erudite brand)
// and the localized tagline. Shows for 3s, then hands off to the home screen.
const SPLASH_MS = 3000;
const LETTERS = ['Q', 'U', 'I', 'Z', 'Z', 'Z', 'E', 'S'] as const;

export default function ItalyQuizSplash() {
  const t = useItalyLabels();
  const wordmarkOpacity = useSharedValue(0);
  const wordmarkScale = useSharedValue(0.92);
  const taglineOpacity = useSharedValue(0);

  useEffect(() => {
    wordmarkOpacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
    wordmarkScale.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) });
    taglineOpacity.value = withDelay(400, withTiming(1, { duration: 500 }));

    const timer = setTimeout(() => {
      router.replace('/italy-quiz');
    }, SPLASH_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const wordmarkStyle = useAnimatedStyle(() => ({
    opacity: wordmarkOpacity.value,
    transform: [{ scale: wordmarkScale.value }],
  }));
  const taglineStyle = useAnimatedStyle(() => ({ opacity: taglineOpacity.value }));

  return (
    <LinearGradient
      colors={['#2E52C8', '#14307E', '#0A1B54']}
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
  // Light-cyan glowing ZZZ that pops against the navy gradient.
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
