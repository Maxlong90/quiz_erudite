import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useSheetDrag } from '@/hooks/use-sheet-drag';
import { useTranslation } from '@/hooks/use-translation';

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

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1f1949',
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
    backgroundColor: '#ffffff33',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: '#ffffffaa',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 4,
  },
  label: {
    color: '#ffffff99',
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
    backgroundColor: '#7c5cff',
    alignItems: 'center',
  },
  chipPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  chipLabel: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
});
