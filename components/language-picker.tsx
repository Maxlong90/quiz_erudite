import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '@/hooks/use-theme-colors';
import type { SupportedLocale } from '@/hooks/use-locale';
import type { EruditePalette } from '@/constants/theme';

const LANGUAGES: { value: SupportedLocale; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'ru', label: 'Русский' },
];

interface Props {
  selected?: SupportedLocale | null;
  onPick: (locale: SupportedLocale) => void;
}

export function LanguagePicker({ selected, onPick }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.list}>
      {LANGUAGES.map((lang) => {
        const isSelected = selected === lang.value;
        return (
          <Pressable
            key={lang.value}
            onPress={() => onPick(lang.value)}
            style={({ pressed }) => [
              styles.button,
              isSelected && styles.buttonSelected,
              pressed && styles.buttonPressed,
            ]}
            testID={`lang-${lang.value}`}
          >
            <Text style={[styles.label, isSelected && styles.labelSelected]}>
              {lang.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = (c: EruditePalette) => StyleSheet.create({
  list: {
    gap: 14,
    width: '100%',
  },
  button: {
    paddingVertical: 18,
    borderRadius: 28,
    alignItems: 'center',
    backgroundColor: c.borderSoft,
    borderWidth: 1,
    borderColor: c.border,
  },
  buttonSelected: {
    backgroundColor: c.accent,
    borderColor: c.accentSoft,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: c.textMuted,
    letterSpacing: 0.3,
  },
  labelSelected: {
    color: c.onAccent,
  },
});
