import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GradientButton } from '@/components/logo-quiz/gradient-button';
import { LogoCard } from '@/components/logo-quiz/logo-card';
import { LogoOptionButton } from '@/components/logo-quiz/logo-option-button';
import { LogoProgressBar } from '@/components/logo-quiz/logo-progress-bar';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { accentColor, LogoQuizColors } from '@/constants/logo-quiz-theme';
import { useQuizSession } from '@/hooks/use-quiz-session';
import { useTranslation } from '@/hooks/use-translation';
import { categoryNameKey, computePoints } from '@/lib/logo-quiz';
import { findLogoCategory, getLogoQuestions, toQuizQuestions, type LogoQuestion } from '@/lib/logo-quiz-content';

export default function LogoQuizGameScreen() {
  const { t } = useTranslation();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const category = slug ? findLogoCategory(slug) : undefined;
  const accent = category ? accentColor(category.accent) : LogoQuizColors.cyan;

  // The original logo questions are held alongside the engine session so
  // the card can read per-question glyph/image (the mapped Question drops
  // those). Index maps 1:1 — no question swaps happen in the logo quiz.
  const [logoQuestions, setLogoQuestions] = useState<LogoQuestion[]>([]);
  const [phase, setPhase] = useState<'loading' | 'ready' | 'empty'>('loading');
  const session = useQuizSession();
  const { dispatch } = session;

  useEffect(() => {
    if (!slug) {
      setPhase('empty');
      return;
    }
    let cancelled = false;
    getLogoQuestions(slug).then((questions) => {
      if (cancelled) return;
      if (questions.length === 0) {
        setPhase('empty');
        return;
      }
      setLogoQuestions(questions);
      dispatch({ type: 'SET_QUESTIONS', payload: toQuizQuestions(questions) });
      setPhase('ready');
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  function restart() {
    if (logoQuestions.length > 0) {
      dispatch({ type: 'SET_QUESTIONS', payload: toQuizQuestions(logoQuestions) });
    }
  }

  const categoryName = category ? t(categoryNameKey(category.slug)) : '';
  const points = computePoints(session.score);

  const showResults = session.status === 'finished';

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
            testID="logo-quiz-back"
          >
            <IconSymbol name="chevron.left" size={22} color={LogoQuizColors.text} />
          </Pressable>
          <Text style={styles.categoryName} numberOfLines={1}>
            {categoryName}
          </Text>
          <View style={styles.scorePill}>
            <IconSymbol name="star.fill" size={15} color={LogoQuizColors.gold} />
            <Text style={styles.scoreText}>{points}</Text>
          </View>
        </View>

        {phase === 'loading' && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={accent} />
          </View>
        )}

        {phase === 'empty' && (
          <View style={styles.center}>
            <Text style={styles.emptyText}>{t('logoQuiz.quiz.empty')}</Text>
            <Pressable onPress={() => router.back()} style={styles.emptyBack}>
              <Text style={styles.emptyBackText}>{t('logoQuiz.quiz.backHome')}</Text>
            </Pressable>
          </View>
        )}

        {phase === 'ready' && !showResults && session.currentQuestion && (
          <GameBody
            accent={accent}
            questionBadge={t('logoQuiz.quiz.badge')}
            questionText={t('logoQuiz.quiz.question')}
            progress={session.progress}
            progressLabel={t('logoQuiz.quiz.progress', {
              current: session.currentIndex + 1,
              total: session.questions.length,
            })}
            nextLabel={t('logoQuiz.quiz.next')}
            logo={logoQuestions[session.currentIndex]}
            options={session.currentQuestion.options}
            correctOption={session.currentQuestion.correct_option}
            selectedAnswer={session.selectedAnswer}
            isAnswered={session.isAnswered}
            onSelect={(index) => dispatch({ type: 'ANSWER', payload: index })}
            onNext={() => dispatch({ type: 'NEXT' })}
          />
        )}

        {showResults && (
          <ResultsBody
            title={t('logoQuiz.quiz.finishTitle')}
            score={t('logoQuiz.quiz.finishScore', { points })}
            accuracy={t('logoQuiz.quiz.finishAccuracy', {
              correct: session.score,
              total: session.questions.length,
            })}
            playAgainLabel={t('logoQuiz.quiz.playAgain')}
            backLabel={t('logoQuiz.quiz.backHome')}
            onPlayAgain={restart}
            onBack={() => router.back()}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

interface GameBodyProps {
  accent: string;
  questionBadge: string;
  questionText: string;
  progress: number;
  progressLabel: string;
  nextLabel: string;
  logo: LogoQuestion | undefined;
  options: string[];
  correctOption: number;
  selectedAnswer: number | null;
  isAnswered: boolean;
  onSelect: (index: number) => void;
  onNext: () => void;
}

function GameBody({
  accent,
  questionBadge,
  questionText,
  progress,
  progressLabel,
  nextLabel,
  logo,
  options,
  correctOption,
  selectedAnswer,
  isAnswered,
  onSelect,
  onNext,
}: GameBodyProps) {
  return (
    <>
      <LogoProgressBar progress={progress} label={progressLabel} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.logoWrap}>
          <LogoCard logoUri={logo?.logoUri ?? null} glyph={logo?.glyph ?? '❓'} badgeLabel={questionBadge} accent={accent} />
        </View>
        <Text style={styles.question}>{questionText}</Text>
        <View style={styles.options}>
          {options.map((text, index) => (
            <LogoOptionButton
              key={`${index}-${text}`}
              text={text}
              index={index}
              isSelected={selectedAnswer === index}
              isCorrectOption={index === correctOption}
              isRevealed={isAnswered}
              disabled={isAnswered}
              onPress={() => onSelect(index)}
            />
          ))}
        </View>
      </ScrollView>
      {isAnswered && (
        <View style={styles.footer}>
          <GradientButton label={nextLabel} onPress={onNext} testID="logo-quiz-next" />
        </View>
      )}
    </>
  );
}

interface ResultsBodyProps {
  title: string;
  score: string;
  accuracy: string;
  playAgainLabel: string;
  backLabel: string;
  onPlayAgain: () => void;
  onBack: () => void;
}

function ResultsBody({ title, score, accuracy, playAgainLabel, backLabel, onPlayAgain, onBack }: ResultsBodyProps) {
  return (
    <View style={styles.results}>
      <Text style={styles.resultsEmoji}>🏆</Text>
      <Text style={styles.resultsTitle}>{title}</Text>
      <Text style={styles.resultsScore}>{score}</Text>
      <Text style={styles.resultsAccuracy}>{accuracy}</Text>
      <View style={styles.resultsActions}>
        <GradientButton label={playAgainLabel} iconName="arrow.clockwise" onPress={onPlayAgain} testID="logo-quiz-again" />
        <Pressable onPress={onBack} style={({ pressed }) => [styles.resultsBack, pressed && styles.pressed]}>
          <Text style={styles.resultsBackText}>{backLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: LogoQuizColors.bg,
  },
  flex: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: LogoQuizColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  categoryName: {
    flex: 1,
    textAlign: 'center',
    color: LogoQuizColors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  scorePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: LogoQuizColors.surface,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 40,
    justifyContent: 'center',
  },
  scoreText: {
    color: LogoQuizColors.text,
    fontSize: 14,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 32,
  },
  emptyText: {
    color: LogoQuizColors.textSecondary,
    fontSize: 15,
    textAlign: 'center',
  },
  emptyBack: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  emptyBackText: {
    color: LogoQuizColors.cyan,
    fontSize: 15,
    fontWeight: '700',
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  logoWrap: {
    paddingHorizontal: 24,
  },
  question: {
    color: LogoQuizColors.text,
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 22,
    marginBottom: 18,
  },
  options: {
    gap: 12,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  results: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 8,
  },
  resultsEmoji: {
    fontSize: 64,
    marginBottom: 8,
  },
  resultsTitle: {
    color: LogoQuizColors.text,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  resultsScore: {
    color: LogoQuizColors.cyan,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  resultsAccuracy: {
    color: LogoQuizColors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  resultsActions: {
    alignSelf: 'stretch',
    marginTop: 24,
    gap: 12,
  },
  resultsBack: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  resultsBackText: {
    color: LogoQuizColors.textSecondary,
    fontSize: 15,
    fontWeight: '700',
  },
});
