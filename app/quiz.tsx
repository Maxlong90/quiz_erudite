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
import { QuizTimer } from '@/components/quiz/quiz-timer';
import { ReportButton } from '@/components/quiz/report-button';
import { ReportModal } from '@/components/quiz/report-modal';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useContentCache } from '@/hooks/use-content-cache';
import { useQuizSession } from '@/hooks/use-quiz-session';
import { useTranslation } from '@/hooks/use-translation';
import { fetchRandomQuestions } from '@/api/questions';
import { APP_SLUG } from '@/api/client';
import { resolveLocalImage } from '@/lib/content-cache';

const GRADIENT = ['#1a1a47', '#2d1f5e', '#1a1a47'] as const;

type QuizMode = 'daily' | 'quick' | 'timed' | 'survival';

const SEEN_KEY_PREFIX = 'quiz.seen.v1.';

interface SeenStore {
  ids: number[];
}

async function readSeen(category: string | undefined): Promise<Set<number>> {
  if (!category) return new Set();
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const raw = await AsyncStorage.getItem(SEEN_KEY_PREFIX + category);
    const parsed: SeenStore = raw ? JSON.parse(raw) : { ids: [] };
    return new Set(parsed.ids);
  } catch {
    return new Set();
  }
}

async function writeSeen(category: string | undefined, ids: number[]): Promise<void> {
  if (!category) return;
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    await AsyncStorage.setItem(SEEN_KEY_PREFIX + category, JSON.stringify({ ids }));
  } catch {
    // best-effort
  }
}

/**
 * Pick `wanted` questions from the local snapshot for the given
 * category. Drops IDs already in `seen`; if there aren't enough fresh
 * ones left, signals the caller to reset the seen set so subsequent
 * sessions still get full pools. Image URLs are rewritten to local
 * file paths when available so the quiz works offline.
 */
interface CachePick {
  id: number;
  question: string;
  options: string[];
  correct_option: number;
  explanation: string | null;
  image_url: string | null;
}

function pickQuestionsFromCache(
  snapshot: ReturnType<typeof useContentCache>['snapshot'],
  categorySlug: string | undefined,
  wanted: number,
  seen: Set<number>,
): { picks: CachePick[]; resetSeen: boolean } {
  if (!snapshot) return { picks: [], resetSeen: false };

  // Match the slug as either a top-level (include every subcat
  // question) or a leaf.
  const allowed = new Set<string>();
  if (categorySlug) {
    const top = snapshot.categories.find((c) => c.slug === categorySlug);
    if (top) {
      allowed.add(top.slug);
      for (const sub of top.subcategories) allowed.add(sub.slug);
    } else {
      allowed.add(categorySlug);
    }
  }

  const pool = snapshot.questions.filter(
    (q) => allowed.size === 0 || (q.category_slug && allowed.has(q.category_slug)),
  );
  if (pool.length === 0) return { picks: [], resetSeen: false };

  let unseen = pool.filter((q) => !seen.has(q.id));
  let resetSeen = false;
  // If the unseen tail can't fill a full quiz, treat the cycle as
  // done: reset the tracker and pull from the full pool again.
  if (unseen.length < wanted) {
    resetSeen = true;
    unseen = pool;
  }

  const shuffled = [...unseen].sort(() => Math.random() - 0.5);
  const sliced = shuffled.slice(0, Math.min(wanted, shuffled.length));
  const picks = sliced.map((q) => ({
    id: q.id,
    question: q.question ?? '',
    options: q.options ?? [],
    correct_option: q.correct_option,
    explanation: q.explanation,
    image_url: resolveLocalImage(snapshot, q.image_url),
  }));
  return { picks, resetSeen };
}

export default function QuizScreen() {
  const params = useLocalSearchParams<{
    count: string;
    locale: string;
    category?: string;
    mode?: string;
    timer?: string;
  }>();
  const count = params.count;
  const locale = params.locale;
  const category = params.category;
  const mode = ((params.mode ?? 'quick') as QuizMode);
  const timerSeconds = parseInt(params.timer ?? '0', 10) || 0;
  const isTimed = mode === 'timed' && timerSeconds > 0;
  const isSurvival = mode === 'survival';

  const { t } = useTranslation();
  const { snapshot } = useContentCache();

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
  const [secondsLeft, setSecondsLeft] = useState(timerSeconds);

  useEffect(() => {
    loadQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (status === 'finished') {
      // For survival, "total" is the number of questions the user
      // actually saw (= currentIndex + 1) since the run ended early.
      const totalForResults = isSurvival ? currentIndex + 1 : questions.length;
      router.replace({
        pathname: '/results',
        params: {
          score: String(score),
          total: String(totalForResults),
          count: count ?? '10',
          locale: locale ?? 'en',
          mode,
          ...(category ? { category } : {}),
          ...(isTimed ? { timer: String(timerSeconds) } : {}),
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

  // Survival: end the run on the first wrong answer. Brief delay so
  // the player gets to see the correct option highlighted.
  useEffect(() => {
    if (!isSurvival || !isAnswered || !currentQuestion) return;
    if (selectedAnswer !== currentQuestion.correct_option) {
      const t = setTimeout(() => dispatch({ type: 'FINISH' }), 1500);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAnswered, selectedAnswer, isSurvival, currentQuestion?.id]);

  // Timed mode: reset the per-question countdown whenever we land on a
  // new question.
  useEffect(() => {
    if (!isTimed) return;
    setSecondsLeft(timerSeconds);
  }, [currentIndex, isTimed, timerSeconds]);

  // Timed mode: tick down each second. When the timer hits 0 on an
  // unanswered question, auto-mark it timed-out (-1, never matches the
  // correct option) and let the standard reveal flow take it from
  // there.
  useEffect(() => {
    if (!isTimed || isAnswered) return;
    if (secondsLeft <= 0) {
      dispatch({ type: 'ANSWER', payload: -1 });
      return;
    }
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, isAnswered, isTimed]);

  async function loadQuestions() {
    dispatch({ type: 'SET_LOADING' });
    const wanted = parseInt(count ?? '10', 10);
    const wantLocale = locale ?? 'en';

    // Prefer the local snapshot when it's ready: that way the quiz
    // works offline AND we get cross-session "no repeats" via the
    // persisted seen set.
    if (snapshot && snapshot.locale === wantLocale) {
      const seen = await readSeen(category);
      const { picks, resetSeen } = pickQuestionsFromCache(snapshot, category, wanted, seen);
      if (picks.length > 0) {
        dispatch({ type: 'SET_QUESTIONS', payload: picks });
        const baseSeen = resetSeen ? [] : Array.from(seen);
        await writeSeen(category, [...baseSeen, ...picks.map((q) => q.id)]);
        return;
      }
    }

    try {
      const data = await fetchRandomQuestions(
        APP_SLUG,
        wantLocale,
        wanted,
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

        {isTimed && (
          <QuizTimer secondsLeft={secondsLeft} totalSeconds={timerSeconds} />
        )}

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
