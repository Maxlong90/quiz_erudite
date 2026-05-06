import { Pressable, StyleSheet } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface Props {
  onPress: () => void;
}

export function ReportButton({ onPress }: Props) {
  const theme = useColorScheme() ?? 'light';
  const tint = Colors[theme].text;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      hitSlop={12}
      accessibilityLabel="Report a problem with this question"
      testID="report-button"
    >
      <IconSymbol name="flag" size={20} color={tint + 'AA'} />
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
