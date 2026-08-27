import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { CategoryPicker } from '@/components/home/category-picker';
import { useContentCache } from '@/hooks/use-content-cache';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useTranslation } from '@/hooks/use-translation';
import type { EruditePalette } from '@/constants/theme';

const COUNT_OPTIONS = [10, 20, 30, 40, 50] as const;
const PER_QUESTION_OPTIONS = [20, 40, 60, 80, 100, 120] as const;

interface Props {
  visible: boolean;
  title: string;
  withTimer?: boolean;
  onClose: () => void;
  onStart: (config: { categorySlugs: string[]; count: number; perQuestionSeconds?: number }) => void;
}

/**
 * Bottom-sheet modal that gathers everything a topic-based quiz needs:
 * which categories to draw from, how many questions, and (when timed)
 * how long the player has per question.
 */
export function QuizConfigModal({ visible, title, withTimer, onClose, onStart }: Props) {
  const { t, locale } = useTranslation();
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { snapshot } = useContentCache();
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [count, setCount] = useState<number>(10);
  const [perQ, setPerQ] = useState<number>(40);

  // Reset to defaults each time the modal opens so a previous session
  // doesn't bleed into the next one.
  useEffect(() => {
    if (visible) {
      setSelected(new Set());
      setCount(10);
      setPerQ(40);
    }
  }, [visible]);

  function handleStart() {
    onStart({
      categorySlugs: Array.from(selected),
      count,
      perQuestionSeconds: withTimer ? perQ : undefined,
    });
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>{title}</Text>

          <Text style={styles.sectionLabel}>Categories</Text>
          <CategoryPicker
            snapshot={snapshot}
            locale={locale}
            selected={selected}
            onChange={setSelected}
          />

          <Text style={styles.sectionLabel}>Questions</Text>
          <ChipGroup
            options={COUNT_OPTIONS}
            value={count}
            onChange={setCount}
            renderLabel={(n) => String(n)}
          />

          {withTimer && (
            <>
              <Text style={styles.sectionLabel}>Time per question</Text>
              <ChipGroup
                options={PER_QUESTION_OPTIONS}
                value={perQ}
                onChange={setPerQ}
                renderLabel={(n) => `${n}s`}
              />
            </>
          )}

          <Pressable
            onPress={handleStart}
            style={({ pressed }) => [
              styles.startButton,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={styles.startText}>{t('home.config.start')}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

interface ChipGroupProps<T extends number> {
  options: readonly T[];
  value: T;
  onChange: (next: T) => void;
  renderLabel: (v: T) => string;
}

function ChipGroup<T extends number>({ options, value, onChange, renderLabel }: ChipGroupProps<T>) {
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.chipRow}>
      {options.map((opt) => {
        const active = opt === value;
        return (
          <Pressable
            key={opt}
            onPress={() => onChange(opt)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
              {renderLabel(opt)}
            </Text>
          </Pressable>
        );
      })}
    </View>
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
    gap: 8,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.borderStrong,
    marginBottom: 8,
  },
  title: {
    color: c.text,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  sectionLabel: {
    color: c.textFaint,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 12,
    marginBottom: 4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: c.borderSoft,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipActive: {
    backgroundColor: c.accent,
    borderColor: c.accent,
  },
  chipLabel: {
    color: c.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  chipLabelActive: {
    color: c.onAccent,
  },
  startButton: {
    marginTop: 20,
    backgroundColor: c.accent,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  startText: {
    color: c.onAccent,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
