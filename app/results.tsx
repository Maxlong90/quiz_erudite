import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Colors, QuizColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function ResultsScreen() {
  const { score: scoreStr, total: totalStr, count, locale } = useLocalSearchParams<{
    score: string;
    total: string;
    count: string;
    locale: string;
  }>();

  const theme = useColorScheme() ?? 'light';
  const tint = Colors[theme].tint;

  const score = parseInt(scoreStr ?? '0', 10);
  const total = parseInt(totalStr ?? '0', 10);
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;

  const getScoreColor = () => {
    if (percentage > 70) return QuizColors.correct;
    if (percentage >= 40) return '#f59e0b';
    return QuizColors.wrong;
  };

  const getMessage = () => {
    if (percentage > 70) return 'Excellent! You\'re a heraldry expert!';
    if (percentage >= 40) return 'Good job! Keep learning!';
    return 'Keep practicing, you\'ll get there!';
  };

  const getEmoji = () => {
    if (percentage > 70) return '🏆';
    if (percentage >= 40) return '👍';
    return '💪';
  };

  const scoreColor = getScoreColor();

  const handlePlayAgain = () => {
    router.replace({
      pathname: '/quiz',
      params: { count: count ?? '10', locale: locale ?? 'en' },
    });
  };

  const handleHome = () => {
    router.replace('/');
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: Colors[theme].background }]}>
      <View style={styles.content}>
        <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.heroSection}>
          <ThemedText style={styles.emoji}>{getEmoji()}</ThemedText>
          <ThemedText type="title">Quiz Complete!</ThemedText>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).duration(500)} style={styles.scoreSection}>
          <View style={[styles.scoreCircle, { borderColor: scoreColor }]}>
            <ThemedText style={[styles.scoreNumber, { color: scoreColor }]}>
              {score}
            </ThemedText>
            <ThemedText style={styles.scoreDivider}>/ {total}</ThemedText>
          </View>
          <ThemedText style={[styles.percentage, { color: scoreColor }]}>
            {percentage}%
          </ThemedText>
          <ThemedText style={styles.message}>{getMessage()}</ThemedText>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(500).duration(500)} style={styles.buttonsSection}>
          <Pressable
            onPress={handlePlayAgain}
            style={[styles.primaryButton, { backgroundColor: tint }]}
          >
            <ThemedText style={styles.primaryButtonText}>Play Again</ThemedText>
          </Pressable>
          <Pressable
            onPress={handleHome}
            style={[styles.secondaryButton, { borderColor: tint }]}
          >
            <ThemedText style={[styles.secondaryButtonText, { color: tint }]}>
              Home
            </ThemedText>
          </Pressable>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 36,
  },
  heroSection: {
    alignItems: 'center',
    gap: 12,
  },
  emoji: {
    fontSize: 64,
  },
  scoreSection: {
    alignItems: 'center',
    gap: 12,
  },
  scoreCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreNumber: {
    fontSize: 56,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  scoreDivider: {
    fontSize: 20,
    opacity: 0.6,
    fontVariant: ['tabular-nums'],
  },
  percentage: {
    fontSize: 28,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  message: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
  },
  buttonsSection: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  secondaryButton: {
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
  },
  secondaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
});
