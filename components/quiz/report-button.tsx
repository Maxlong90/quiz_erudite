import { Pressable, StyleSheet } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTranslation } from '@/hooks/use-translation';
import { useThemeColors } from '@/hooks/use-theme-colors';

interface Props {
  onPress: () => void;
}

export function ReportButton({ onPress }: Props) {
  const { t } = useTranslation();
  const colors = useThemeColors();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      hitSlop={12}
      accessibilityLabel={t('report.helper')}
      testID="report-button"
    >
      <IconSymbol name="flag" size={20} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 6,
  },
  pressed: {
    opacity: 0.5,
  },
});
