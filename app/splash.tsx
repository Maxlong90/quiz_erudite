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

import { useLocale } from '@/hooks/use-locale';
import { useOnboarding } from '@/hooks/use-onboarding';

const SPLASH_DURATION_MS = 3000;
const LETTERS = ['Q', 'U', 'I', 'Z', 'Z', 'Z', 'E', 'S'] as const;

export default function SplashScreen() {
  const { hasSeen } = useOnboarding();
  const { hasPicked } = useLocale();

  const wordmarkOpacity = useSharedValue(0);
  const wordmarkScale = useSharedValue(0.92);
  const taglineOpacity = useSharedValue(0);

  useEffect(() => {
    wordmarkOpacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
    wordmarkScale.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) });
    taglineOpacity.value = withDelay(500, withTiming(1, { duration: 500 }));

    const t = setTimeout(() => {
      // Treat unresolved AsyncStorage reads as "first launch" so we
      // never accidentally drop the user past first-time setup.
      if (hasPicked === false) {
        router.replace('/language');
      } else if (hasSeen === false) {
        router.replace('/onboarding');
      } else if (hasPicked && hasSeen) {
        router.replace('/');
      } else {
        // Still loading — fall through to language picker, the safest
        // first-time destination.
        router.replace('/language');
      }
    }, SPLASH_DURATION_MS);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSeen, hasPicked]);

  const wordmarkStyle = useAnimatedStyle(() => ({
    opacity: wordmarkOpacity.value,
    transform: [{ scale: wordmarkScale.value }],
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
  }));

  return (
    <LinearGradient
      colors={['#1a1a47', '#2d1f5e', '#1a1a47']}
      locations={[0, 0.55, 1]}
      style={styles.flex}
    >
      <StatusBar style="light" />

      <View style={styles.content}>
        <Animated.View style={[styles.wordmark, wordmarkStyle]}>
          {LETTERS.map((ch, i) => {
            // Highlight the three middle Z's in the brand purple so the
            // wordmark reads as QUI-ZZZ-ES, signalling the "quiz triple".
            const isAccent = i >= 3 && i <= 5;
            return (
              <Text
                key={i}
                style={[styles.letter, isAccent && styles.letterAccent]}
              >
                {ch}
              </Text>
            );
          })}
        </Animated.View>

        <Animated.Text style={[styles.tagline, taglineStyle]}>
          Прокачай эрудицию
        </Animated.Text>
      </View>

      <Stars />
    </LinearGradient>
  );
}

function Stars() {
  const positions = [
    { top: 80, left: 40, size: 3 },
    { top: 130, left: '70%' as const, size: 2 },
    { top: 200, left: '20%' as const, size: 2 },
    { top: 260, right: 40, size: 4 },
    { top: 360, left: '50%' as const, size: 2 },
    { top: 430, left: 50, size: 2 },
    { top: 500, right: 70, size: 3 },
    { top: 580, left: '40%' as const, size: 2 },
  ];
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {positions.map((p, i) => (
        <View
          key={i}
          style={[
            styles.star,
            {
              top: p.top,
              left: 'left' in p ? p.left : undefined,
              right: 'right' in p ? p.right : undefined,
              width: p.size,
              height: p.size,
              borderRadius: p.size / 2,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 14,
  },
  wordmark: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  letter: {
    fontSize: 56,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 2,
    // Soft glow so the wordmark reads on the dark backdrop.
    textShadowColor: 'rgba(124, 92, 255, 0.55)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  letterAccent: {
    color: '#a78bff',
    textShadowColor: 'rgba(167, 139, 255, 0.85)',
    textShadowRadius: 22,
  },
  tagline: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffffaa',
    letterSpacing: 0.4,
  },
  star: {
    position: 'absolute',
    backgroundColor: '#ffffff66',
  },
});
