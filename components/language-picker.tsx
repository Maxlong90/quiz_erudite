import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { SupportedLocale } from '@/hooks/use-locale';

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

const styles = StyleSheet.create({
  list: {
    gap: 14,
    width: '100%',
  },
  button: {
    paddingVertical: 18,
    borderRadius: 28,
    alignItems: 'center',
    backgroundColor: '#ffffff14',
    borderWidth: 1,
    borderColor: '#ffffff22',
  },
  buttonSelected: {
    backgroundColor: '#7c5cff',
    borderColor: '#a78bff',
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffffcc',
    letterSpacing: 0.3,
  },
  labelSelected: {
    color: '#fff',
  },
});
