import { StyleSheet, View } from 'react-native';
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
}

export function QuestionCard({
  question,
  selectedOption,
  onSelectOption,
}: QuestionCardProps) {
  const isRevealed = selectedOption !== null;

  return (
    <Animated.View entering={SlideInRight.duration(300)} key={question.id} style={styles.container}>
      {question.image_url && (
        <View style={styles.imageWrapper}>
          <Image
            source={{ uri: question.image_url }}
            style={styles.image}
            contentFit="contain"
            transition={200}
            testID="question-image"
          />
        </View>
      )}

      <ThemedText style={styles.questionText}>{question.question}</ThemedText>

      <View style={styles.optionsContainer}>
        {question.options.map((option, index) => (
          <OptionButton
            key={index}
            text={option}
            index={index}
            isSelected={selectedOption === index}
            isCorrectOption={index === question.correct_option}
            isRevealed={isRevealed}
            onPress={() => onSelectOption(index)}
            disabled={isRevealed}
          />
        ))}
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
    backgroundColor: '#f8f9fa',
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
  },
  optionsContainer: {
    gap: 10,
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
