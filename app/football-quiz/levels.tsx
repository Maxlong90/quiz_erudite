import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBackground } from '@/components/football-quiz/app-background';
import { CoinPill, FQIconButton, ScreenTitle, goldGlow } from '@/components/football-quiz/ui';
import { FQColors, FQRadius, FQ_FILL, FQ_GOLD_GRADIENT } from '@/constants/football-quiz/theme';
import { useSQLabels } from '@/constants/sport-quiz/labels';
import { MOCK_COINS, MOCK_LEVELS, type MockLevel } from '@/lib/football-quiz/mock';

/**
 * Football Quiz "Select Level" — same structure as app/sport-quiz/levels.tsx and
 * components/sport-quiz/level-card.tsx: number chip, "Level N", progress bar and
 * a solved/total count; a finished level gets a check badge, a locked one a
 * padlock and the "finish the previous level" hint. Same big "?" as mode select.
 */
function LevelCard({ row, onPress }: { row: MockLevel; onPress: () => void }) {
  const t = useSQLabels();
  const title = t.levelLabel.replace('{n}', String(row.level));
  const done = row.total > 0 && row.solved >= row.total;
  const ratio = row.total > 0 ? Math.min(1, row.solved / row.total) : 0;

  if (!row.unlocked) {
    return (
      <View style={[styles.card, styles.cardLocked]}>
        <LinearGradient
          colors={[FQColors.glassStrong, FQColors.glass]}
          style={[StyleSheet.absoluteFill, { borderRadius: FQRadius.lg }]}
        />
        <View style={styles.lockChip}>
          <Ionicons name="lock-closed" size={18} color={FQColors.textMuted} />
        </View>
        <View style={styles.body}>
          <Text style={styles.titleLocked}>{title}</Text>
          <Text style={styles.lockedHint}>{t.finishPrevious}</Text>
        </View>
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, goldGlow(12, 0.45), pressed && { transform: [{ scale: 0.98 }], opacity: 0.92 }]}
    >
      <LinearGradient
        colors={[FQColors.glassStrong, FQColors.glass]}
        style={[StyleSheet.absoluteFill, { borderRadius: FQRadius.lg }]}
      />
      <View style={styles.numberChip}>
        <Text style={styles.numberText}>{row.level}</Text>
      </View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
          {done && (
            <View style={styles.doneBadge}>
              <Ionicons name="checkmark" size={13} color={FQColors.ink} />
            </View>
          )}
        </View>
        <View style={styles.track}>
          <LinearGradient colors={FQ_GOLD_GRADIENT} style={[styles.barFill, { width: `${ratio * 100}%` }]} />
        </View>
        <Text style={styles.count}>
          {row.solved}/{row.total}
        </Text>
      </View>
    </Pressable>
  );
}

export default function FootballQuizLevels() {
  const t = useSQLabels();

  return (
    <View style={styles.fill}>
      <AppBackground variant="haze" />
      <StatusBar style="light" />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <FQIconButton glyph="chevron-back" size={44} onPress={() => router.back()} />
          <View style={styles.headerRight}>
            <FQIconButton glyph="help" size={44} glyphScale={0.82} onPress={() => {}} />
            <Pressable onPress={() => router.push('/football-quiz/shop')} hitSlop={8}>
              <CoinPill coins={MOCK_COINS} size="lg" />
            </Pressable>
          </View>
        </View>

        <View style={styles.titleWrap}>
          <ScreenTitle>{t.selectLevel}</ScreenTitle>
        </View>

        <FlatList
          data={MOCK_LEVELS}
          keyExtractor={(r) => String(r.level)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <LevelCard
              row={item}
              onPress={() => router.push({ pathname: '/football-quiz/quiz', params: { level: String(item.level) } })}
            />
          )}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: FQColors.bgBase },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  titleWrap: { marginTop: 4, marginBottom: 16 },

  listContent: { paddingHorizontal: 16, paddingBottom: 28, rowGap: 12 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: FQRadius.lg,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: FQColors.glassBorder,
    overflow: 'hidden',
  },
  cardLocked: { borderColor: FQColors.glassBorderDim, opacity: 0.75 },
  numberChip: {
    width: 46,
    height: 46,
    borderRadius: FQRadius.md,
    backgroundColor: FQ_FILL,
    borderWidth: 1.5,
    borderColor: FQColors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: { color: FQColors.text, fontWeight: '900', fontSize: 20 },
  lockChip: {
    width: 46,
    height: 46,
    borderRadius: FQRadius.md,
    backgroundColor: 'rgba(167,155,134,0.12)',
    borderWidth: 1.5,
    borderColor: FQColors.glassBorderDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: FQColors.text, fontWeight: '900', fontSize: 18 },
  titleLocked: { color: FQColors.textMuted, fontWeight: '900', fontSize: 18 },
  lockedHint: { color: FQColors.textMuted, fontWeight: '700', fontSize: 13, marginTop: 4 },
  track: { height: 8, borderRadius: FQRadius.pill, backgroundColor: 'rgba(167,155,134,0.25)', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: FQRadius.pill },
  count: { color: FQColors.text, fontWeight: '800', fontSize: 14 },
  doneBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: FQColors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
