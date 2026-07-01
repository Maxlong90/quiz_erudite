import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import Animated, { FadeInDown, SlideInRight } from 'react-native-reanimated';

import { useTranslation } from '@/hooks/use-translation';
import type { Question } from '@/api/types';

export type HardVariant = 'typing' | 'letters';

interface Props {
  question: Question;
  variant: HardVariant;
  isRevealed: boolean;
  isCorrectSubmitted: boolean;
  /** Caller should dispatch ANSWER with this index based on the result. */
  onSubmit: (matchesCorrect: boolean) => void;
}

/**
 * Strip diacritics, lowercase, trim, collapse whitespace — so "París"
 * and "paris " both match "Paris".
 */
function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

export function HardQuestionCard({
  question,
  variant,
  isRevealed,
  isCorrectSubmitted,
  onSubmit,
}: Props) {
  const correctText = question.options[question.correct_option] ?? '';

  return (
    <Animated.View entering={SlideInRight.duration(300)} key={question.id} style={styles.container}>
      {question.image_url && (
        <View style={styles.imageWrapper}>
          <Image
            source={{ uri: question.image_url }}
            style={styles.image}
            contentFit="cover"
            transition={200}
            testID="question-image"
          />
        </View>
      )}

      <Text style={styles.questionText}>{question.question}</Text>

      {variant === 'typing' ? (
        <TypingVariant
          correctText={correctText}
          isRevealed={isRevealed}
          isCorrectSubmitted={isCorrectSubmitted}
          onSubmit={onSubmit}
        />
      ) : (
        <LettersVariant
          correctText={correctText}
          isRevealed={isRevealed}
          isCorrectSubmitted={isCorrectSubmitted}
          onSubmit={onSubmit}
        />
      )}

      {isRevealed && question.explanation && (
        <Animated.View
          entering={FadeInDown.delay(300).duration(400)}
          style={styles.explanationBox}
        >
          <Text style={styles.explanationText}>{question.explanation}</Text>
        </Animated.View>
      )}
    </Animated.View>
  );
}

// ─── Typing variant ─────────────────────────────────────────────────────

interface VariantProps {
  correctText: string;
  isRevealed: boolean;
  isCorrectSubmitted: boolean;
  onSubmit: (matchesCorrect: boolean) => void;
}

function TypingVariant({
  correctText,
  isRevealed,
  isCorrectSubmitted,
  onSubmit,
}: VariantProps) {
  const { t } = useTranslation();
  const [value, setValue] = useState('');
  useEffect(() => {
    if (!isRevealed) setValue('');
  }, [isRevealed]);

  const matches = normalize(value) === normalize(correctText);

  function handleSubmit() {
    if (isRevealed || value.trim().length === 0) return;
    onSubmit(matches);
  }

  const borderColor = !isRevealed
    ? '#ffffff44'
    : isCorrectSubmitted ? '#22c55e' : '#ef4444';

  return (
    <View style={styles.section}>
      <Text style={styles.hint}>
        {t('hard.typing.lengthHint', { n: correctText.length })}
      </Text>
      <TextInput
        value={isRevealed ? correctText : value}
        onChangeText={setValue}
        editable={!isRevealed}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder={t('hard.typing.placeholder')}
        placeholderTextColor="#ffffff55"
        style={[styles.input, { borderColor }]}
        onSubmitEditing={handleSubmit}
        returnKeyType="done"
        testID="hard-typing-input"
      />
      {!isRevealed && (
        <Pressable
          onPress={handleSubmit}
          disabled={value.trim().length === 0}
          style={({ pressed }) => [
            styles.checkButton,
            value.trim().length === 0 && styles.checkButtonDisabled,
            pressed && styles.pressed,
          ]}
          testID="hard-check-button"
        >
          <Text style={styles.checkText}>{t('hard.check')}</Text>
        </Pressable>
      )}
    </View>
  );
}

// ─── Letter bank variant ────────────────────────────────────────────────

interface BankState {
  /** Letters available to tap into a slot. null = already used. */
  bank: (string | null)[];
  /** Slots, one per letter of the answer (spaces auto-placed). null = empty. */
  slots: { letter: string; bankIdx: number | null; locked: boolean }[];
}

function LettersVariant({
  correctText,
  isRevealed,
  isCorrectSubmitted,
  onSubmit,
}: VariantProps) {
  const { t } = useTranslation();
  const initialRef = useRef<BankState | null>(null);

  const initialState = useMemo<BankState>(() => {
    const letters = Array.from(correctText);
    // Slots reflect the answer shape — spaces are pre-filled & locked.
    const slots = letters.map((ch) => ({
      letter: ch === ' ' ? ' ' : '',
      bankIdx: null as number | null,
      locked: ch === ' ',
    }));
    // Bank = non-space letters of the answer, shuffled.
    const bankSrc = letters.filter((ch) => ch !== ' ').map((ch) => ch.toUpperCase());
    for (let i = bankSrc.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [bankSrc[i], bankSrc[j]] = [bankSrc[j], bankSrc[i]];
    }
    return { bank: bankSrc as (string | null)[], slots };
  }, [correctText]);

  const [state, setState] = useState<BankState>(initialState);

  // Reset when the question changes (initialState gets a new identity).
  useEffect(() => {
    initialRef.current = initialState;
    setState(initialState);
  }, [initialState]);

  function placeLetter(bankIdx: number) {
    if (isRevealed) return;
    const ch = state.bank[bankIdx];
    if (!ch) return;
    // Find first empty unlocked slot.
    const slotIdx = state.slots.findIndex((s) => !s.locked && !s.letter);
    if (slotIdx === -1) return;
    const nextBank = [...state.bank];
    nextBank[bankIdx] = null;
    const nextSlots = state.slots.map((s, i) =>
      i === slotIdx ? { ...s, letter: ch, bankIdx } : s,
    );
    setState({ bank: nextBank, slots: nextSlots });
  }

  function clearSlot(slotIdx: number) {
    if (isRevealed) return;
    const slot = state.slots[slotIdx];
    if (slot.locked || !slot.letter || slot.bankIdx == null) return;
    const nextBank = [...state.bank];
    nextBank[slot.bankIdx] = slot.letter;
    const nextSlots = state.slots.map((s, i) =>
      i === slotIdx ? { ...s, letter: '', bankIdx: null } : s,
    );
    setState({ bank: nextBank, slots: nextSlots });
  }

  function handleSubmit() {
    if (isRevealed) return;
    const assembled = state.slots.map((s) => s.letter || ' ').join('');
    onSubmit(normalize(assembled) === normalize(correctText));
  }

  const allFilled = state.slots.every((s) => s.letter !== '');
  const slotsBg = (filled: boolean) =>
    !isRevealed
      ? filled ? '#7c5cff' : '#ffffff14'
      : isCorrectSubmitted ? '#22c55e' : '#ef4444';

  return (
    <View style={styles.section}>
      <Text style={styles.hint}>{t('hard.letters.assemble')}</Text>

      <View style={styles.slotRow}>
        {state.slots.map((s, i) => {
          if (s.locked && s.letter === ' ') {
            return <View key={i} style={styles.slotSpacer} />;
          }
          const filled = s.letter !== '';
          return (
            <Pressable
              key={i}
              onPress={() => clearSlot(i)}
              disabled={isRevealed || !filled}
              style={[
                styles.slot,
                { backgroundColor: slotsBg(filled), borderColor: filled ? 'transparent' : '#ffffff33' },
              ]}
            >
              <Text style={[styles.slotLetter, !filled && { color: '#ffffff55' }]}>
                {isRevealed ? Array.from(correctText)[i]?.toUpperCase() : s.letter}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {!isRevealed && (
        <>
          <Text style={[styles.hint, { marginTop: 14 }]}>{t('hard.letters.available')}</Text>
          <View style={styles.bankRow}>
            {state.bank.map((ch, i) => (
              <Pressable
                key={i}
                onPress={() => placeLetter(i)}
                disabled={!ch}
                style={[styles.bankTile, !ch && styles.bankTileUsed]}
              >
                <Text style={[styles.slotLetter, !ch && { color: 'transparent' }]}>
                  {ch ?? ''}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            onPress={handleSubmit}
            disabled={!allFilled}
            style={({ pressed }) => [
              styles.checkButton,
              !allFilled && styles.checkButtonDisabled,
              pressed && styles.pressed,
            ]}
            testID="hard-check-button"
          >
            <Text style={styles.checkText}>{t('hard.check')}</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    gap: 16,
  },
  imageWrapper: {
    alignItems: 'center',
    backgroundColor: '#0e0e2a',
    borderRadius: 16,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 200,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 26,
    color: '#fff',
  },
  section: {
    gap: 12,
  },
  hint: {
    color: '#ffffff99',
    fontSize: 13,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#ffffff10',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  checkButton: {
    backgroundColor: '#7c5cff',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  checkButtonDisabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.85,
  },
  checkText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  slotRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
  },
  slot: {
    width: 38,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotSpacer: {
    width: 14,
  },
  slotLetter: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  bankRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
  },
  bankTile: {
    width: 38,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#ffffff14',
    borderWidth: 1,
    borderColor: '#ffffff22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bankTileUsed: {
    backgroundColor: '#ffffff05',
    borderColor: '#ffffff14',
  },
  explanationBox: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#0e1a3a',
    borderWidth: 1,
    borderColor: '#ffffff14',
  },
  explanationText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#ffffffd9',
    fontStyle: 'italic',
  },
});
