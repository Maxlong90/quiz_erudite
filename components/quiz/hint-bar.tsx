import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/hooks/use-translation';
import { useThemeColors } from '@/hooks/use-theme-colors';
import type { EruditePalette } from '@/constants/theme';
import type { HintKind, HintsState } from '@/lib/hints';
import type { StringKey } from '@/i18n/strings';

interface HintDef {
  kind: HintKind;
  emoji: string;
  labelKey: StringKey;
}

// The canonical three. 50/50 and statistics act on multiple-choice
// options, so they only appear in regular modes; replaceQuestion works
// in every mode (there is always another question to pull in), which is
// why it is the sole hint offered in Hard mode — so no purchased hint is
// ever globally unusable.
const REGULAR: HintDef[] = [
  { kind: 'fiftyFifty', emoji: '½', labelKey: 'hint.fiftyFifty' },
  { kind: 'statistics', emoji: '📊', labelKey: 'hint.statistics' },
  { kind: 'replaceQuestion', emoji: '🔄', labelKey: 'hint.replaceQuestion' },
];

const HARD: HintDef[] = [
  { kind: 'replaceQuestion', emoji: '🔄', labelKey: 'hint.replaceQuestion' },
];

interface Props {
  state: HintsState;
  /** Hints already consumed for the CURRENT question — disable button. */
  used: Set<HintKind>;
  /** Disable the whole bar after answer revealed (no late hints). */
  disabled?: boolean;
  /** Show the Hard-mode set instead of the regular three. */
  hard?: boolean;
  /** Premium: hints are unlimited — never gate on the remaining count. */
  unlimited?: boolean;
  onUse: (kind: HintKind) => void;
}

/**
 * Row of hint buttons placed under the question. Disabled when the
 * player has 0 of that hint left (unless premium/unlimited), or has
 * already used a hint on this question. After answering, the whole bar
 * locks until the next question to keep the post-reveal state clean.
 */
export function HintBar({ state, used, disabled, hard, unlimited, onUse }: Props) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const defs = hard ? HARD : REGULAR;
  return (
    <View style={styles.row}>
      {defs.map((d) => {
        const left = state[d.kind] ?? 0;
        const isOff = disabled || used.has(d.kind) || (!unlimited && left <= 0);
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
            <Text style={[styles.label, isOff && styles.labelOff]}>{t(d.labelKey)}</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unlimited ? '∞' : left}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = (c: EruditePalette) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    // Drop the hint row lower, ~half an answer-option button's height below
    // the question's options, so it reads as a separate control cluster.
    marginTop: 26,
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
    backgroundColor: c.accentBgSoft,
    borderWidth: 1,
    borderColor: c.accentBorderSoft,
  },
  btnOff: {
    backgroundColor: c.borderSoft,
    borderColor: c.borderSoft,
  },
  btnPressed: {
    opacity: 0.7,
  },
  emoji: {
    fontSize: 16,
  },
  label: {
    color: c.text,
    fontSize: 13,
    fontWeight: '700',
  },
  labelOff: {
    color: c.textDisabled,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: c.borderStrong,
    minWidth: 22,
    alignItems: 'center',
  },
  badgeText: {
    color: c.text,
    fontSize: 11,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
});
