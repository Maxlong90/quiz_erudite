import { useMemo } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useSheetDrag } from '@/hooks/use-sheet-drag';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useTranslation } from '@/hooks/use-translation';
import type { SupportedLocale } from '@/hooks/use-locale';
import type { EruditePalette } from '@/constants/theme';

const LANGUAGES: { value: SupportedLocale; label: string; flag: string }[] = [
  { value: 'en', label: 'English', flag: '🇬🇧' },
  { value: 'es', label: 'Español', flag: '🇪🇸' },
  { value: 'ru', label: 'Русский', flag: '🇷🇺' },
];

interface Props {
  visible: boolean;
  selected: SupportedLocale | null;
  onClose: () => void;
  onPick: (locale: SupportedLocale) => void;
}

/**
 * Bottom-sheet language switcher, matching the visual style of other
 * settings/config modals (handle on top, dark purple sheet, rounded
 * row tiles with a check on the active language).
 */
export function LanguageModal({ visible, selected, onClose, onPick }: Props) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { panHandlers, animatedStyle } = useSheetDrag(onClose, visible);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View style={[styles.sheet, animatedStyle]} onStartShouldSetResponder={() => true}>
          <View style={styles.handleArea} {...panHandlers}>
            <View style={styles.handle} />
          </View>
          <Text style={styles.title}>{t('settings.languageModal.title')}</Text>

          {LANGUAGES.map((lang) => {
            const active = selected === lang.value;
            return (
              <Pressable
                key={lang.value}
                onPress={() => {
                  onPick(lang.value);
                  onClose();
                }}
                style={({ pressed }) => [
                  styles.row,
                  active && styles.rowActive,
                  pressed && { opacity: 0.85 },
                ]}
                testID={`lang-modal-${lang.value}`}
              >
                <Text style={styles.flag}>{lang.flag}</Text>
                <Text style={[styles.label, active && styles.labelActive]}>
                  {lang.label}
                </Text>
                {active && <View style={styles.check} />}
              </Pressable>
            );
          })}
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const makeStyles = (c: EruditePalette) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: c.scrim,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: c.sheet,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 10,
  },
  handleArea: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingVertical: 8,
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.borderStrong,
  },
  title: {
    color: c.text,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: c.surfaceSoft,
    borderWidth: 1,
    borderColor: c.border,
  },
  rowActive: {
    backgroundColor: c.accentBg,
    borderColor: c.accent,
  },
  flag: {
    fontSize: 22,
  },
  label: {
    flex: 1,
    color: c.text,
    fontSize: 16,
    fontWeight: '600',
  },
  labelActive: {
    color: c.text,
  },
  check: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: c.accent,
  },
});
