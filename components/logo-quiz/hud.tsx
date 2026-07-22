import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { GoldSurface } from '@/components/logo-quiz/gold-gradient';
import { CoinIcon } from '@/components/logo-quiz/coin-icon';
import { LQColors, LQRadius, LQShadow, GOLD_TEXT } from '@/constants/logo-quiz/theme';
import {
  MAX_LIVES,
  formatCountdown,
  msUntilNextLife,
  reconcileLives,
  type LivesState,
} from '@/lib/logo-quiz/economy';
import { useNow } from '@/hooks/logo-quiz/use-logo-quiz';
import { useLQLabels } from '@/constants/logo-quiz/labels';

/**
 * White pill showing the player's coin balance. When `onPress` is supplied the
 * pill becomes tappable (used to jump to the Shop from any header).
 */
export function CoinPill({
  coins,
  onPress,
  style,
}: {
  coins: number;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const inner = (
    <>
      <CoinIcon size={16} />
      <Text style={styles.coinText}>{coins}</Text>
    </>
  );
  if (onPress) {
    return (
      <Pressable onPress={onPress} hitSlop={8} style={[styles.coinPill, LQShadow.card, style]}>
        {inner}
      </Pressable>
    );
  }
  return <View style={[styles.coinPill, LQShadow.card, style]}>{inner}</View>;
}

/**
 * White pill showing the player's current life count — a compact counterpart to
 * CoinPill for headers. Shows the reconciled count (which can exceed MAX_LIVES
 * when the player has bought life packs); premium regenerates 3× faster.
 *
 * When the bar is not full (0–2 lives), tapping the pill toggles it to show the
 * live regen countdown (M:SS) until the next life instead of the number.
 */
export function LivesPill({
  livesState,
  isPremium,
  style,
}: {
  livesState: LivesState;
  isPremium: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const now = useNow(1000);
  const lives = reconcileLives(livesState, now, isPremium).lives;
  const nextMs = msUntilNextLife(livesState, now, isPremium);
  // Only a partial bar (0–2 lives) has a running timer to reveal.
  const canShowTimer = nextMs != null;
  // At zero lives the countdown is the player's key info, so it is always shown
  // (in every place the pill appears) instead of the "0" — no tap required.
  const forceTimer = lives <= 0 && canShowTimer;
  const [showTimer, setShowTimer] = useState(false);

  // Auto-revert to the number once the bar fills (nothing left to count down).
  useEffect(() => {
    if (!canShowTimer && showTimer) setShowTimer(false);
  }, [canShowTimer, showTimer]);

  const showingTimer = forceTimer || (showTimer && canShowTimer);

  // Auto-hide the tap-revealed timer 5s after it is shown — but keep it pinned
  // while it is force-shown at zero lives.
  useEffect(() => {
    if (!showingTimer || forceTimer) return;
    const id = setTimeout(() => setShowTimer(false), 5000);
    return () => clearTimeout(id);
  }, [showingTimer, forceTimer]);

  return (
    <Pressable
      onPress={() => canShowTimer && !forceTimer && setShowTimer((v) => !v)}
      hitSlop={8}
      style={[styles.coinPill, LQShadow.card, style]}
    >
      <Ionicons name={showingTimer ? 'time-outline' : 'heart'} size={16} color={LQColors.heart} />
      <Text style={styles.coinText}>{showingTimer ? formatCountdown(nextMs ?? 0) : lives}</Text>
    </Pressable>
  );
}

/** Account status chip — grey for Basic, animated gold for Premium. */
export function StatusChip({ isPremium }: { isPremium: boolean }) {
  const t = useLQLabels();
  if (isPremium) {
    return (
      <GoldSurface radius={LQRadius.pill} style={[styles.chip, LQShadow.gold]}>
        <Text style={styles.chipGoldText}>👑 {t.premium}</Text>
      </GoldSurface>
    );
  }
  return (
    <View style={[styles.chip, styles.chipBasic]}>
      <Text style={styles.chipBasicText}>{t.basic}</Text>
    </View>
  );
}

/**
 * Hearts row with a live regen countdown. Both tiers see filled/empty hearts
 * and, when not full, the time until the next life regenerates — premium simply
 * regenerates 3× faster (1 per 10 min vs 1 per 30 min).
 */
export function LivesBar({
  livesState,
  isPremium,
  style,
}: {
  livesState: LivesState;
  isPremium: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const now = useNow(1000);

  const { lives } = reconcileLives(livesState, now, isPremium);
  const nextMs = msUntilNextLife(livesState, now, isPremium);

  // Purchased lives can stock above the bar — show a single heart with a count.
  if (lives > MAX_LIVES) {
    return (
      <View style={[styles.livesRow, style]}>
        <Ionicons name="heart" size={22} color={LQColors.heart} />
        <Text style={styles.livesCount}>×{lives}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.livesRow, style]}>
      {Array.from({ length: MAX_LIVES }, (_, i) => (
        <Ionicons
          key={i}
          name={i < lives ? 'heart' : 'heart-outline'}
          size={22}
          color={i < lives ? LQColors.heart : LQColors.disabled}
          style={{ marginRight: 3 }}
        />
      ))}
      {nextMs != null && (
        <Text style={styles.regenText}>  {formatCountdown(nextMs)}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  coinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LQColors.surface,
    borderRadius: LQRadius.pill,
    paddingVertical: 7,
    paddingHorizontal: 14,
    gap: 6,
  },
  coinEmoji: { fontSize: 16 },
  coinText: { color: LQColors.text, fontWeight: '800', fontSize: 16 },

  chip: {
    borderRadius: LQRadius.pill,
    paddingVertical: 7,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipGoldText: { color: GOLD_TEXT, fontWeight: '900', fontSize: 13 },
  chipBasic: { backgroundColor: LQColors.bgAlt, borderWidth: 1, borderColor: LQColors.border },
  chipBasicText: { color: LQColors.textMuted, fontWeight: '800', fontSize: 13 },

  livesRow: { flexDirection: 'row', alignItems: 'center' },
  livesCount: { color: LQColors.heart, fontWeight: '900', fontSize: 16, marginLeft: 4 },
  regenText: { color: LQColors.textMuted, fontWeight: '700', fontSize: 13 },
});
