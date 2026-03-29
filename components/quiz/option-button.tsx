import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';

import { ThemedText } from '@/components/themed-text';
import { QuizColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface OptionButtonProps {
  text: string;
  index: number;
  isSelected: boolean;
  isCorrectOption: boolean;
  isRevealed: boolean;
  onPress: () => void;
  disabled: boolean;
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

export function OptionButton({
  text,
  index,
  isSelected,
  isCorrectOption,
  isRevealed,
  onPress,
  disabled,
}: OptionButtonProps) {
  const theme = useColorScheme() ?? 'light';
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const bgOpacity = useSharedValue(0);

  useEffect(() => {
    if (!isRevealed) {
      bgOpacity.value = 0;
      scale.value = 1;
      translateX.value = 0;
      return;
    }
    bgOpacity.value = withTiming(1, { duration: 300 });
    if (isSelected && isCorrectOption) {
      scale.value = withSequence(withSpring(1.03), withSpring(1));
    } else if (isSelected && !isCorrectOption) {
      translateX.value = withSequence(
        withTiming(-8, { duration: 50 }),
        withTiming(8, { duration: 50 }),
        withTiming(-8, { duration: 50 }),
        withTiming(8, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRevealed, isSelected, isCorrectOption]);

  const getBackgroundColor = () => {
    if (!isRevealed) {
      return theme === 'dark' ? QuizColors.neutralDark : QuizColors.neutral;
    }
    if (isCorrectOption) {
      return theme === 'dark' ? '#166534' : QuizColors.correctLight;
    }
    if (isSelected && !isCorrectOption) {
      return theme === 'dark' ? '#991b1b' : QuizColors.wrongLight;
    }
    return theme === 'dark' ? QuizColors.neutralDark : QuizColors.neutral;
  };

  const getBorderColor = () => {
    if (!isRevealed) {
      return theme === 'dark' ? '#4b5563' : '#d1d5db';
    }
    if (isCorrectOption) {
      return QuizColors.correct;
    }
    if (isSelected && !isCorrectOption) {
      return QuizColors.wrong;
    }
    return theme === 'dark' ? '#4b5563' : '#d1d5db';
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateX: translateX.value },
    ],
    opacity: bgOpacity.value === 0 ? 1 : bgOpacity.value,
  }));

  const targetBg = getBackgroundColor();
  const targetBorder = getBorderColor();

  return (
    <Pressable onPress={onPress} disabled={disabled} testID={`option-button-${index}`}>
      <Animated.View
        style={[
          styles.container,
          { backgroundColor: targetBg, borderColor: targetBorder },
          animatedStyle,
        ]}
      >
        <ThemedText style={[styles.label, isRevealed && isCorrectOption && styles.correctLabel, isRevealed && isSelected && !isCorrectOption && styles.wrongLabel]}>
          {OPTION_LABELS[index]}
        </ThemedText>
        <ThemedText
          style={[
            styles.text,
            isRevealed && isCorrectOption && styles.correctText,
            isRevealed && isSelected && !isCorrectOption && styles.wrongText,
          ]}
        >
          {text}
        </ThemedText>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    gap: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    width: 24,
    textAlign: 'center',
  },
  text: {
    fontSize: 16,
    flex: 1,
  },
  correctLabel: {
    color: QuizColors.correct,
  },
  wrongLabel: {
    color: QuizColors.wrong,
  },
  correctText: {
    color: QuizColors.correct,
    fontWeight: '600',
  },
  wrongText: {
    color: QuizColors.wrong,
  },
});
