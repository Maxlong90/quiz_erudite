import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useEffect, useMemo } from 'react';

import type { EruditePalette } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';

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
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
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
      return colors.optIdleBg;
    }
    if (isCorrectOption) {
      return colors.optCorrectBg;
    }
    if (isSelected && !isCorrectOption) {
      return colors.optWrongBg;
    }
    return colors.optIdleBg;
  };

  const getBorderColor = () => {
    if (!isRevealed) {
      return colors.optIdleBorder;
    }
    if (isCorrectOption) {
      return colors.success;
    }
    if (isSelected && !isCorrectOption) {
      return colors.danger;
    }
    return colors.optIdleBorder;
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
        <Text style={[styles.label, isRevealed && isCorrectOption && styles.correctLabel, isRevealed && isSelected && !isCorrectOption && styles.wrongLabel]}>
          {OPTION_LABELS[index]}
        </Text>
        <Text
          style={[
            styles.text,
            isRevealed && isCorrectOption && styles.correctText,
            isRevealed && isSelected && !isCorrectOption && styles.wrongText,
          ]}
        >
          {text}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const makeStyles = (c: EruditePalette) => StyleSheet.create({
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
    color: c.text,
  },
  text: {
    fontSize: 16,
    flex: 1,
    color: c.text,
  },
  correctLabel: {
    color: c.success,
  },
  wrongLabel: {
    color: c.danger,
  },
  correctText: {
    color: c.success,
    fontWeight: '600',
  },
  wrongText: {
    color: c.danger,
  },
});
