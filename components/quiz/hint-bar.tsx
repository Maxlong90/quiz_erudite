import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { HintKind, HintsState } from '@/lib/hints';

interface HintDef {
  kind: HintKind;
  emoji: string;
  label: string;
}

const REGULAR: HintDef[] = [
  { kind: 'fiftyFifty', emoji: '½', label: '50/50' },
  { kind: 'statistics', emoji: '📊', label: 'Stats' },
  { kind: 'ai', emoji: '🤖', label: 'AI' },
];

const HARD: HintDef[] = [
  { kind: 'letter', emoji: '🔤', label: 'Letter' },
  { kind: 'ai', emoji: '🤖', label: 'AI' },
];

interface Props {
  state: HintsState;
  /** Hints already consumed for the CURRENT question — disable button. */
  used: Set<HintKind>;
  /** Disable the whole bar after answer revealed (no late hints). */
  disabled?: boolean;
  /** Show the Hard-mode set instead of the regular three. */
  hard?: boolean;
  onUse: (kind: HintKind) => void;
}

/**
 * Row of hint buttons placed under the question. Disabled when the
 * player has 0 of that hint left, or has already used a hint on this
 * question. After answering, the whole bar locks until the next
 * question to keep the post-reveal state clean.
 */
export function HintBar({ state, used, disabled, hard, onUse }: Props) {
  const defs = hard ? HARD : REGULAR;
  return (
    <View style={styles.row}>
      {defs.map((d) => {
        const left = state[d.kind] ?? 0;
        const isOff = disabled || used.has(d.kind) || left <= 0;
        return (
          <Pressable
            key={d.kind}
            onPress={() => onUse(d.kind)}
            disabled={isOff}
            style={({ pressed }) => [
              styles.btn,
              isOff && styles.btnOff,
              pressed && !isOff && styles.btnPressed,
            ]}
            testID={`hint-${d.kind}`}
          >
            <Text style={styles.emoji}>{d.emoji}</Text>
            <Text style={[styles.label, isOff && styles.labelOff]}>{d.label}</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{left}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 4,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: '#7c5cff22',
    borderWidth: 1,
    borderColor: '#7c5cff66',
  },
  btnOff: {
    backgroundColor: '#ffffff08',
    borderColor: '#ffffff14',
  },
  btnPressed: {
    opacity: 0.7,
  },
  emoji: {
    fontSize: 16,
  },
  label: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  labelOff: {
    color: '#ffffff66',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#ffffff22',
    minWidth: 22,
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
});
