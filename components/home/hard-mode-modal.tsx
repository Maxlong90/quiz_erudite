import { useMemo } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useSheetDrag } from '@/hooks/use-sheet-drag';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useTranslation } from '@/hooks/use-translation';
import type { EruditePalette } from '@/constants/theme';
import type { StringKey } from '@/i18n/strings';

interface Props {
  visible: boolean;
  onClose: () => void;
  onPick: (variant: 'typing' | 'letters') => void;
}

interface Option {
  variant: 'typing' | 'letters';
  emoji: string;
  titleKey: StringKey;
  subtitleKey: StringKey;
}

const OPTIONS: Option[] = [
  {
    variant: 'typing',
    emoji: '⌨️',
    titleKey: 'home.hard.typing.title',
    subtitleKey: 'home.hard.typing.subtitle',
  },
  {
    variant: 'letters',
    emoji: '🧩',
    titleKey: 'home.hard.letters.title',
    subtitleKey: 'home.hard.letters.subtitle',
  },
];

/**
 * Picks which Hard-mode variant the player wants: type the answer
 * freely, or assemble it from a shuffled letter bank.
 */
export function HardModeModal({ visible, onClose, onPick }: Props) {
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
          <Text style={styles.title}>{t('home.hard.modalTitle')}</Text>
          <Text style={styles.subtitle}>{t('home.hard.modalSubtitle')}</Text>

          {OPTIONS.map((opt) => (
            <Pressable
              key={opt.variant}
              onPress={() => onPick(opt.variant)}
              style={({ pressed }) => [styles.option, pressed && { opacity: 0.85 }]}
              testID={`hard-variant-${opt.variant}`}
            >
              <Text style={styles.optionEmoji}>{opt.emoji}</Text>
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>{t(opt.titleKey)}</Text>
                <Text style={styles.optionSubtitle}>{t(opt.subtitleKey)}</Text>
              </View>
            </Pressable>
          ))}
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
    gap: 12,
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
    marginBottom: 4,
  },
  title: {
    color: c.text,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: c.textFaint,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 6,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 16,
    backgroundColor: c.surfaceSoft,
    borderWidth: 1,
    borderColor: c.border,
  },
  optionEmoji: {
    fontSize: 32,
    lineHeight: 38,
  },
  optionText: {
    flex: 1,
    gap: 2,
  },
  optionTitle: {
    color: c.text,
    fontSize: 16,
    fontWeight: '800',
  },
  optionSubtitle: {
    color: c.textFaint,
    fontSize: 13,
  },
});
