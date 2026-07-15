import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';

import { LogoQuizColors, LogoQuizRadii } from '@/constants/logo-quiz-theme';
import { optionLetter } from '@/lib/logo-quiz';

interface LogoOptionButtonProps {
  text: string;
  index: number;
  isSelected: boolean;
  isCorrectOption: boolean;
  /** True once the answer has been submitted and correctness is shown. */
  isRevealed: boolean;
  onPress: () => void;
  disabled: boolean;
}

interface OptionVisual {
  border: string;
  background: string;
  badgeBg: string;
  badgeText: string;
  label: string;
  glow: boolean;
}

/**
 * Neon answer button for the logo quiz, matching mockup 2's states
 * (idle / selected / correct / incorrect). A dedicated component so the
 * shared main-quiz `OptionButton` and its call sites remain unchanged.
 */
export function LogoOptionButton({
  text,
  index,
  isSelected,
  isCorrectOption,
  isRevealed,
  onPress,
  disabled,
}: LogoOptionButtonProps) {
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);

  useEffect(() => {
    if (!isRevealed) {
      scale.value = 1;
      translateX.value = 0;
      return;
    }
    if (isSelected && isCorrectOption) {
      scale.value = withSequence(withSpring(1.03), withSpring(1));
    } else if (isSelected && !isCorrectOption) {
      translateX.value = withSequence(
        withTiming(-8, { duration: 50 }),
        withTiming(8, { duration: 50 }),
        withTiming(-8, { duration: 50 }),
        withTiming(8, { duration: 50 }),
        withTiming(0, { duration: 50 }),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRevealed, isSelected, isCorrectOption]);

  const visual = resolveVisual({ isSelected, isCorrectOption, isRevealed });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateX: translateX.value }],
  }));

  return (
    <Pressable onPress={onPress} disabled={disabled} testID={`logo-option-${index}`}>
      <Animated.View
        style={[
          styles.container,
          { borderColor: visual.border, backgroundColor: visual.background },
          visual.glow && { shadowColor: visual.border, ...styles.glow },
          animatedStyle,
        ]}
      >
        <View style={[styles.badge, { backgroundColor: visual.badgeBg }]}>
          <Text style={[styles.badgeLabel, { color: visual.badgeText }]}>{optionLetter(index)}</Text>
        </View>
        <Text style={[styles.text, { color: visual.label }]} numberOfLines={2}>
          {text}
        </Text>
        {isSelected && !isRevealed && (
          <View style={styles.radioOuter}>
            <View style={styles.radioInner} />
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

function resolveVisual({
  isSelected,
  isCorrectOption,
  isRevealed,
}: {
  isSelected: boolean;
  isCorrectOption: boolean;
  isRevealed: boolean;
}): OptionVisual {
  const idle: OptionVisual = {
    border: LogoQuizColors.border,
    background: LogoQuizColors.surface,
    badgeBg: LogoQuizColors.surfaceElevated,
    badgeText: LogoQuizColors.textSecondary,
    label: LogoQuizColors.text,
    glow: false,
  };

  if (!isRevealed) {
    if (isSelected) {
      return {
        border: LogoQuizColors.cyan,
        background: '#00E5FF1A',
        badgeBg: LogoQuizColors.cyan,
        badgeText: LogoQuizColors.bg,
        label: LogoQuizColors.text,
        glow: true,
      };
    }
    return idle;
  }

  if (isCorrectOption) {
    return {
      border: LogoQuizColors.green,
      background: '#39FF9E1A',
      badgeBg: LogoQuizColors.green,
      badgeText: LogoQuizColors.bg,
      label: LogoQuizColors.text,
      glow: true,
    };
  }
  if (isSelected && !isCorrectOption) {
    return {
      border: LogoQuizColors.magenta,
      background: '#FF2FD01A',
      badgeBg: LogoQuizColors.magenta,
      badgeText: LogoQuizColors.bg,
      label: LogoQuizColors.text,
      glow: true,
    };
  }
  // Revealed but neither selected nor correct — dim it.
  return { ...idle, label: LogoQuizColors.textSecondary };
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: LogoQuizRadii.md,
    borderWidth: 1.5,
    gap: 14,
  },
  glow: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 6,
  },
  badge: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeLabel: {
    fontSize: 14,
    fontWeight: '800',
  },
  text: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: LogoQuizColors.cyan,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: LogoQuizColors.cyan,
  },
});
