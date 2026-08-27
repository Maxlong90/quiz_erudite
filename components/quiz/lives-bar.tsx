import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '@/hooks/use-theme-colors';
import type { EruditePalette } from '@/constants/theme';

interface Props {
  count: number;
  /** Premium: lives are unlimited — show a full heart + ∞ instead of N. */
  unlimited?: boolean;
}

/**
 * Compact hearts counter shown in the quiz header. We don't render N
 * separate hearts (gets ugly at 20+); just one heart + counter — the
 * same pattern Duolingo / Wordscapes use once lives are abundant.
 */
export function LivesBar({ count, unlimited }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const empty = !unlimited && count <= 0;
  return (
    <View style={[styles.wrap, empty && styles.wrapEmpty]} testID="lives-bar">
      <Text style={styles.heart}>{empty ? '🤍' : '❤️'}</Text>
      <Text style={styles.count}>{unlimited ? '∞' : count}</Text>
    </View>
  );
}

const makeStyles = (c: EruditePalette) => StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: '#ef444433',
  },
  wrapEmpty: {
    backgroundColor: c.borderSoft,
  },
  heart: {
    fontSize: 14,
  },
  count: {
    color: c.text,
    fontSize: 14,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    minWidth: 14,
    textAlign: 'right',
  },
});
