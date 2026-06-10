import { useEffect, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useSheetDrag } from '@/hooks/use-sheet-drag';
import { useTranslation } from '@/hooks/use-translation';

const OPTIONS_MIN = [5, 10, 15, 20] as const;

interface Props {
  visible: boolean;
  onClose: () => void;
  onStart: (totalSeconds: number) => void;
}

/**
 * Whole-quiz time limit picker. Player picks one of 5/10/15/20 minutes
 * and the quiz then runs across mixed categories with no per-question
 * cap until the total timer runs out.
 */
export function TimeLimitModal({ visible, onClose, onStart }: Props) {
  const { t } = useTranslation();
  const [minutes, setMinutes] = useState<number>(10);
  const { panHandlers, animatedStyle } = useSheetDrag(onClose, visible);

  useEffect(() => {
    if (visible) setMinutes(10);
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View style={[styles.sheet, animatedStyle]} onStartShouldSetResponder={() => true}>
          <View style={styles.handleArea} {...panHandlers}>
            <View style={styles.handle} />
          </View>
          <Text style={styles.title}>{t('home.mode.timeLimit.title')}</Text>
          <Text style={styles.subtitle}>{t('home.timeLimit.subtitle')}</Text>

          <View style={styles.chipRow}>
            {OPTIONS_MIN.map((m) => {
              const active = m === minutes;
              return (
                <Pressable
                  key={m}
                  onPress={() => setMinutes(m)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                    {m} min
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={() => onStart(minutes * 60)}
            style={({ pressed }) => [styles.startButton, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.startText}>{t('home.config.start')}</Text>
          </Pressable>
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
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  chip: {
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 999,
    backgroundColor: '#ffffff14',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipActive: {
    backgroundColor: '#7c5cff',
    borderColor: '#7c5cff',
  },
  chipLabel: {
    color: '#ffffffcc',
    fontSize: 15,
    fontWeight: '700',
  },
  chipLabelActive: {
    color: '#fff',
  },
  startButton: {
    marginTop: 12,
    backgroundColor: '#7c5cff',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  startText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
