import { useMemo } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useSheetDrag } from '@/hooks/use-sheet-drag';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useTranslation } from '@/hooks/use-translation';
import type { EruditePalette } from '@/constants/theme';

interface Props {
  visible: boolean;
  /** Question-count options to offer (e.g. [10, 20, 30]). */
  options: readonly number[];
  onClose: () => void;
  /** Called with the chosen question count; the sheet closes and the quiz starts. */
  onPick: (count: number) => void;
}

/**
 * Timed-quiz question-count picker. Tapping the "Timed" mode card opens this
 * bottom sheet (matching the language/appearance/time-limit sheets); picking a
 * count starts the 30s-per-question run immediately. Keeps the mode card the
 * same compact size as the other mode cards.
 */
export function TimedCountModal({ visible, options, onClose, onPick }: Props) {
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
          <Text style={styles.title}>{t('mode.timed.title')}</Text>
          <Text style={styles.subtitle}>{t('mode.timed.subtitle')}</Text>

          <Text style={styles.label}>{t('mode.timed.questionsLabel')}</Text>
          <View style={styles.chipRow}>
            {options.map((n) => (
              <Pressable
                key={n}
                onPress={() => {
                  onPick(n);
                  onClose();
                }}
                style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
                testID={`timed-count-${n}`}
              >
                <Text style={styles.chipLabel}>{n}</Text>
              </Pressable>
            ))}
          </View>
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
  },
  subtitle: {
    color: c.textFaint,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 4,
  },
  label: {
    color: c.textFaint,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  chip: {
    minWidth: 72,
    paddingVertical: 16,
    paddingHorizontal: 22,
    borderRadius: 18,
    backgroundColor: c.accent,
    alignItems: 'center',
  },
  chipPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  chipLabel: {
    color: c.onAccent,
    fontSize: 18,
    fontWeight: '800',
  },
});
