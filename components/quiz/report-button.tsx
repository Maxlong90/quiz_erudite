import { Pressable, StyleSheet } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTranslation } from '@/hooks/use-translation';

interface Props {
  onPress: () => void;
}

export function ReportButton({ onPress }: Props) {
  const { t } = useTranslation();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      hitSlop={12}
      accessibilityLabel={t('report.helper')}
      testID="report-button"
    >
      <IconSymbol name="flag" size={20} color="#ffffffcc" />
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
