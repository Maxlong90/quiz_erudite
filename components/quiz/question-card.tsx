import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  FadeInDown,
  SlideInRight,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { OptionButton } from '@/components/quiz/option-button';
import { useTranslation } from '@/hooks/use-translation';
import type { Question } from '@/api/types';

interface QuestionCardProps {
  question: Question;
  selectedOption: number | null;
  onSelectOption: (index: number) => void;
  /** 50/50 hint: indices to render as visually disabled (faded). */
  hiddenIndices?: Set<number>;
  /** Stats hint: per-option pick rate (0..100). Shown under each option. */
  stats?: number[] | null;
}

export function QuestionCard({
  question,
  selectedOption,
  onSelectOption,
  hiddenIndices,
  stats,
}: QuestionCardProps) {
  const { t } = useTranslation();
  const isRevealed = selectedOption !== null;
  const showStats = Array.isArray(stats);

  return (
    <Animated.View entering={SlideInRight.duration(300)} key={question.id} style={styles.container}>
      {question.image_url && (
        <View style={styles.imageWrapper}>
          <Image
            source={{ uri: question.image_url }}
            style={styles.image}
            contentFit="cover"
            transition={200}
            testID="question-image"
          />
        </View>
      )}

      <ThemedText style={styles.questionText}>{question.question}</ThemedText>

      {showStats && (
        <Animated.View entering={FadeInDown.duration(300)} style={styles.statsHeader}>
          <Text style={styles.statsHeaderText}>📊 {t('hintsInfo.statistics.subtitle')}</Text>
        </Animated.View>
      )}

      <View style={styles.optionsContainer}>
        {question.options.map((option, index) => {
          const hidden = hiddenIndices?.has(index) ?? false;
          const pct = stats?.[index];
          return (
            <View key={index} style={hidden && styles.optionHidden}>
              <OptionButton
                text={option}
                index={index}
                isSelected={selectedOption === index}
                isCorrectOption={index === question.correct_option}
                isRevealed={isRevealed}
                onPress={() => onSelectOption(index)}
                disabled={isRevealed || hidden}
              />
              {pct != null && !hidden && (
                <View style={styles.statsRow}>
                  <View style={styles.statsTrack}>
                    <View style={[styles.statsFill, { width: `${pct}%` }]} />
                  </View>
                  <Text style={styles.statsText}>{pct}%</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {isRevealed && question.explanation && (
        <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.explanationBox}>
          <ThemedText style={styles.explanationText}>
            {question.explanation}
          </ThemedText>
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    gap: 16,
  },
  imageWrapper: {
    alignItems: 'center',
    backgroundColor: '#0e0e2a',
    borderRadius: 16,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 200,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 26,
    color: '#fff',
  },
  statsHeader: {
    backgroundColor: '#7c5cff22',
    borderColor: '#7c5cff66',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  statsHeaderText: {
    color: '#c9bbff',
    fontSize: 12,
    fontWeight: '700',
  },
  optionsContainer: {
    gap: 10,
  },
  optionHidden: {
    opacity: 0.25,
  },
  statsRow: {
    marginTop: 6,
    marginBottom: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  statsTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#ffffff14',
    borderRadius: 4,
    overflow: 'hidden',
  },
  statsFill: {
    height: '100%',
    backgroundColor: '#7c5cff',
    borderRadius: 4,
  },
  statsText: {
    color: '#a78bff',
    fontSize: 12,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    minWidth: 34,
    textAlign: 'right',
  },
  explanationBox: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#f0f9ff',
  },
  explanationText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#1e40af',
    fontStyle: 'italic',
  },
});
