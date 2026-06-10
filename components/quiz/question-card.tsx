import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  FadeInDown,
  SlideInRight,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { OptionButton } from '@/components/quiz/option-button';
import type { Question } from '@/api/types';

interface QuestionCardProps {
  question: Question;
  selectedOption: number | null;
  onSelectOption: (index: number) => void;
  /** 50/50 hint: indices to render as visually disabled (faded). */
  hiddenIndices?: Set<number>;
  /** Stats hint: per-option pick rate (0..100). Shown next to label. */
  stats?: number[] | null;
  /** AI hint: short blurb shown above the options. */
  aiHint?: string | null;
}

export function QuestionCard({
  question,
  selectedOption,
  onSelectOption,
  hiddenIndices,
  stats,
  aiHint,
}: QuestionCardProps) {
  const isRevealed = selectedOption !== null;

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

      {aiHint && (
        <Animated.View entering={FadeInDown.duration(300)} style={styles.aiBox}>
          <Text style={styles.aiLabel}>🤖 Hint</Text>
          <Text style={styles.aiText}>{aiHint}</Text>
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
                <View style={styles.statsBar}>
                  <View style={[styles.statsFill, { width: `${pct}%` }]} />
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
  aiBox: {
    backgroundColor: '#7c5cff22',
    borderColor: '#7c5cff66',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  aiLabel: {
    color: '#a78bff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  aiText: {
    color: '#fff',
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  optionsContainer: {
    gap: 10,
  },
  optionHidden: {
    opacity: 0.25,
  },
  statsBar: {
    height: 6,
    marginTop: 4,
    backgroundColor: '#ffffff14',
    borderRadius: 3,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 6,
  },
  statsFill: {
    height: '100%',
    backgroundColor: '#7c5cff',
    borderRadius: 3,
  },
  statsText: {
    position: 'absolute',
    right: 6,
    top: -16,
    color: '#a78bff',
    fontSize: 10,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
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
