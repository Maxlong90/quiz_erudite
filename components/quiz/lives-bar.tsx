import { StyleSheet, Text, View } from 'react-native';

interface Props {
  count: number;
}

/**
 * Compact hearts counter shown in the quiz header. We don't render N
 * separate hearts (gets ugly at 20+); just one heart + counter — the
 * same pattern Duolingo / Wordscapes use once lives are abundant.
 */
export function LivesBar({ count }: Props) {
  const empty = count <= 0;
  return (
    <View style={[styles.wrap, empty && styles.wrapEmpty]} testID="lives-bar">
      <Text style={styles.heart}>{empty ? '🤍' : '❤️'}</Text>
      <Text style={styles.count}>{count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: '#ffffff14',
  },
  heart: {
    fontSize: 14,
  },
  count: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    minWidth: 14,
    textAlign: 'right',
  },
});
