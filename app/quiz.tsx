import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { ProgressBar } from '@/components/quiz/progress-bar';
import { QuestionCard } from '@/components/quiz/question-card';
import { ReportButton } from '@/components/quiz/report-button';
import { ReportModal } from '@/components/quiz/report-modal';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useQuizSession } from '@/hooks/use-quiz-session';
import { useTranslation } from '@/hooks/use-translation';
import { fetchRandomQuestions } from '@/api/questions';
import { APP_SLUG } from '@/api/client';

const GRADIENT = ['#1a1a47', '#2d1f5e', '#1a1a47'] as const;

export default function QuizScreen() {
  const { count, locale, category } = useLocalSearchParams<{
    count: string;
    locale: string;
    category?: string;
  }>();
  const { t } = useTranslation();

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
  const [reportOpen, setReportOpen] = useState(false);

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
        APP_SLUG,
        locale ?? 'en',
        parseInt(count ?? '10', 10),
        category,
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

  function handleClose() {
    router.replace('/');
  }

  const nextButtonStyle = useAnimatedStyle(() => ({
    opacity: nextButtonOpacity.value,
  }));

  if (status === 'loading') {
    return (
      <LinearGradient colors={GRADIENT} locations={[0, 0.55, 1]} style={styles.flex}>
        <StatusBar style="light" />
        <SafeAreaView style={styles.centered}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>{t('quiz.loading')}</Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (status === 'error') {
    return (
      <LinearGradient colors={GRADIENT} locations={[0, 0.55, 1]} style={styles.flex}>
        <StatusBar style="light" />
        <SafeAreaView style={styles.centered}>
          <Text style={styles.emoji}>😕</Text>
          <Text style={styles.errorTitle}>{t('quiz.error.title')}</Text>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <Pressable onPress={loadQuestions} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{t('quiz.error.retry')}</Text>
          </Pressable>
          <Pressable onPress={() => router.replace('/')} style={styles.homeLink}>
            <Text style={styles.homeLinkText}>{t('quiz.error.home')}</Text>
          </Pressable>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (!currentQuestion) return null;

  const isLastQuestion = currentIndex === questions.length - 1;

  return (
    <LinearGradient colors={GRADIENT} locations={[0, 0.55, 1]} style={styles.flex}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.flex}>
        <View style={styles.header}>
          <Pressable
            onPress={handleClose}
            hitSlop={12}
            style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
            accessibilityLabel={t('quiz.error.home')}
            testID="close-quiz"
          >
            <IconSymbol name="xmark" size={22} color="#ffffffcc" />
          </Pressable>
          <View style={styles.progressWrap}>
            <ProgressBar
              progress={progress}
              currentIndex={currentIndex}
              total={questions.length}
            />
          </View>
          <View style={styles.iconButton}>
            <ReportButton onPress={() => setReportOpen(true)} />
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <QuestionCard
            question={currentQuestion}
            selectedOption={selectedAnswer}
            onSelectOption={handleSelectOption}
          />
          <Animated.View style={[styles.nextContainer, nextButtonStyle]}>
            {isAnswered && (
              <Pressable
                onPress={handleNext}
                style={({ pressed }) => [
                  styles.primaryButton,
                  styles.nextButton,
                  pressed && styles.nextButtonPressed,
                ]}
                testID="next-button"
              >
                <Text style={styles.primaryButtonText}>
                  {isLastQuestion ? t('quiz.results') : t('quiz.next')}
                </Text>
              </Pressable>
            )}
          </Animated.View>
        </ScrollView>
        <ReportModal
          visible={reportOpen}
          contentType="question"
          contentId={currentQuestion.id}
          locale={locale ?? 'en'}
          onClose={() => setReportOpen(false)}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: {
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
    color: '#ffffffcc',
  },
  emoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  errorTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  errorText: {
    color: '#ffffffaa',
    textAlign: 'center',
    fontSize: 14,
    marginBottom: 8,
  },
  homeLink: {
    marginTop: 8,
  },
  homeLinkText: {
    color: '#a78bff',
    fontSize: 16,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButtonPressed: {
    opacity: 0.5,
  },
  progressWrap: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingTop: 28,
    paddingBottom: 32,
  },
  nextContainer: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  primaryButton: {
    backgroundColor: '#7c5cff',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 28,
    alignItems: 'center',
    shadowColor: '#7c5cff',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  nextButton: {
    width: '100%',
    paddingHorizontal: 0,
  },
  nextButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
