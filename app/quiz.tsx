import { useEffect } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { ProgressBar } from '@/components/quiz/progress-bar';
import { QuestionCard } from '@/components/quiz/question-card';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useQuizSession } from '@/hooks/use-quiz-session';
import { fetchRandomQuestions } from '@/api/questions';

export default function QuizScreen() {
  const { count, locale } = useLocalSearchParams<{ count: string; locale: string }>();
  const theme = useColorScheme() ?? 'light';
  const tint = Colors[theme].tint;

  const {
    questions,
    currentIndex,
    currentQuestion,
    isAnswered,
    selectedAnswer,
    score,
    status,
    error,
    progress,
    dispatch,
  } = useQuizSession();

  const nextButtonOpacity = useSharedValue(0);

  useEffect(() => {
    loadQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (status === 'finished') {
      router.replace({
        pathname: '/results',
        params: {
          score: String(score),
          total: String(questions.length),
          count: count ?? '10',
          locale: locale ?? 'en',
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    if (isAnswered) {
      nextButtonOpacity.value = withDelay(500, withTiming(1, { duration: 300 }));
    } else {
      nextButtonOpacity.value = 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAnswered]);

  async function loadQuestions() {
    dispatch({ type: 'SET_LOADING' });
    try {
      const data = await fetchRandomQuestions(
        'coat-of-arms',
        locale ?? 'en',
        parseInt(count ?? '10', 10)
      );
      dispatch({ type: 'SET_QUESTIONS', payload: data });
    } catch (err) {
      dispatch({
        type: 'SET_ERROR',
        payload: err instanceof Error ? err.message : 'Failed to load questions',
      });
    }
  }

  function handleSelectOption(index: number) {
    if (isAnswered) return;
    dispatch({ type: 'ANSWER', payload: index });

    const isCorrect = index === currentQuestion?.correct_option;
    if (process.env.EXPO_OS !== 'web') {
      if (isCorrect) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }
  }

  function handleNext() {
    nextButtonOpacity.value = 0;
    dispatch({ type: 'NEXT' });
  }

  const nextButtonStyle = useAnimatedStyle(() => ({
    opacity: nextButtonOpacity.value,
  }));

  if (status === 'loading') {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: Colors[theme].background }]}>
        <ActivityIndicator size="large" color={tint} />
        <ThemedText style={styles.loadingText}>Loading questions...</ThemedText>
      </SafeAreaView>
    );
  }

  if (status === 'error') {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: Colors[theme].background }]}>
        <ThemedText style={styles.emoji}>😕</ThemedText>
        <ThemedText type="subtitle" style={styles.errorTitle}>
          Something went wrong
        </ThemedText>
        <ThemedText style={styles.errorText}>{error}</ThemedText>
        <Pressable
          onPress={loadQuestions}
          style={[styles.retryButton, { backgroundColor: tint }]}
        >
          <ThemedText style={styles.retryButtonText}>Try Again</ThemedText>
        </Pressable>
        <Pressable onPress={() => router.replace('/')} style={styles.homeLink}>
          <ThemedText style={[styles.homeLinkText, { color: tint }]}>Go Home</ThemedText>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (!currentQuestion) return null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: Colors[theme].background }]}>
      <ProgressBar
        progress={progress}
        currentIndex={currentIndex}
        total={questions.length}
      />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <QuestionCard
          question={currentQuestion}
          selectedOption={selectedAnswer}
          onSelectOption={handleSelectOption}
        />
        <Animated.View style={[styles.nextContainer, nextButtonStyle]}>
          {isAnswered && (
            <Pressable
              onPress={handleNext}
              style={[styles.nextButton, { backgroundColor: tint }]}
              testID="next-button"
            >
              <ThemedText style={styles.nextButtonText}>
                {currentIndex === questions.length - 1 ? 'See Results' : 'Next'}
              </ThemedText>
            </Pressable>
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    opacity: 0.7,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  errorTitle: {
    textAlign: 'center',
  },
  errorText: {
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: 8,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  homeLink: {
    marginTop: 8,
  },
  homeLinkText: {
    fontSize: 16,
    fontWeight: '500',
  },
  scroll: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  nextContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  nextButton: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
