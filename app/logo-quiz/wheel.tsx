import { useCallback, useRef, useState } from 'react';
import { Dimensions, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { AppBackground } from '@/components/logo-quiz/app-background';
import { BlueShinySurface, GoldSurface } from '@/components/logo-quiz/gold-gradient';
import { CoinIcon } from '@/components/logo-quiz/coin-icon';
import { Confetti } from '@/components/logo-quiz/confetti';
import { CoinPill, LivesPill } from '@/components/logo-quiz/hud';
import { WheelPrizeIcons, WheelSvg } from '@/components/logo-quiz/wheel-svg';
import { GOLD_TEXT, LQColors, LQRadius, LQShadow } from '@/constants/logo-quiz/theme';
import { useLQLabels, type LQLabels } from '@/constants/logo-quiz/labels';
import { useLogoQuiz, useNow } from '@/hooks/logo-quiz/use-logo-quiz';
import {
  WHEEL_PRIZES,
  WHEEL_SEGMENTS,
  formatCountdownHMS,
  pickWheelPrizeIndex,
  segmentsForPrize,
  wheelCooldownRemaining,
  type WheelPrize,
} from '@/lib/logo-quiz/economy';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
// 5% larger than the previous Math.min(width-72, 320) — still centred, and every
// derived measure (pointer, prize-icon overlay, hub) scales off this, so the
// prize-stop maths and the #848 icon angle mapping are unaffected.
const WHEEL_SIZE = Math.min(SCREEN_W - 72, 320) * 1.05;
const SEG_DEG = 360 / WHEEL_SEGMENTS.length;
const SPIN_DURATION_MS = 5000;
const SPIN_FULL_TURNS = 6;
const CONFETTI_DURATION_MS = 3000;
const CONFETTI_COUNT = 150;
// Screen-scaled burst so shards spray across the WHOLE screen (module constants →
// stable references, so the shard cloud isn't re-randomised every render).
const CONFETTI_SPREAD = Math.max(SCREEN_W, SCREEN_H);
const CONFETTI_DISTANCE: readonly [number, number] = [CONFETTI_SPREAD * 0.22, CONFETTI_SPREAD * 0.62];
const CONFETTI_GRAVITY: readonly [number, number] = [SCREEN_H * 0.4, SCREEN_H * 0.95];

/** Localized label for a prize id (also used by the odds list). */
function prizeLabel(id: string, t: LQLabels): string {
  switch (id) {
    case 'coins100':
      return t.wheelPrizeCoins100;
    case 'lives3':
      return t.wheelPrizeLives3;
    case 'coins500':
      return t.wheelPrizeCoins500;
    case 'lives10':
      return t.wheelPrizeLives10;
    case 'coins1000':
      return t.wheelPrizeCoins1000;
    default:
      return id;
  }
}

export default function LogoQuizWheel() {
  const t = useLQLabels();
  const { coins, isPremium, livesState, wheelLastSpinAt, spinWheel } =
    useLogoQuiz();
  const now = useNow(1000);
  const remaining = wheelCooldownRemaining(wheelLastSpinAt, now);
  const available = remaining <= 0;

  const rotation = useSharedValue(0);
  const [spinning, setSpinning] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [wonPrize, setWonPrize] = useState<WheelPrize | null>(null);
  const [showOdds, setShowOdds] = useState(false);
  const selectedRef = useRef<WheelPrize | null>(null);

  const wheelStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  // Runs on the JS thread once the 5s spin animation settles on the prize wedge.
  const onSpinEnd = useCallback(() => {
    const prize = selectedRef.current;
    setSpinning(false);
    if (!prize) return;
    spinWheel(prize); // credit coins/lives + start the 24h cooldown (persisted)
    setWonPrize(prize);
    setShowConfetti(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setTimeout(() => setShowConfetti(false), CONFETTI_DURATION_MS);
  }, [spinWheel]);

  const onSpin = useCallback(() => {
    if (spinning || !available) return;
    setWonPrize(null);
    setSpinning(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    // WEIGHTED prize pick (45/45/4/4/2), THEN choose one of that prize's wedges.
    const prize = WHEEL_PRIZES[pickWheelPrizeIndex(Math.random())];
    selectedRef.current = prize;
    const wedges = segmentsForPrize(prize.id);
    const wedge = wedges[Math.floor(Math.random() * wedges.length)];

    // Land the chosen wedge's centre under the fixed top pointer, after N turns.
    const center = (wedge + 0.5) * SEG_DEG;
    const rest = (360 - (center % 360)) % 360;
    const currentMod = ((rotation.value % 360) + 360) % 360;
    let delta = rest - currentMod;
    if (delta < 0) delta += 360;
    const target = rotation.value + SPIN_FULL_TURNS * 360 + delta;

    rotation.value = withTiming(
      target,
      { duration: SPIN_DURATION_MS, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(onSpinEnd)();
      },
    );
  }, [spinning, available, rotation, onSpinEnd]);

  return (
    <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
      <AppBackground />
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Pressable style={[styles.iconBtn, LQShadow.card]} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={LQColors.text} />
        </Pressable>
        <View style={styles.headerRight}>
          <LivesPill livesState={livesState} isPremium={isPremium} />
          <CoinPill coins={coins} />
          <Pressable
            style={[styles.iconBtn, LQShadow.card]}
            onPress={() => setShowOdds(true)}
            hitSlop={8}
            accessibilityLabel={t.wheelOdds}
          >
            <Ionicons name="information-circle-outline" size={24} color={LQColors.text} />
          </Pressable>
        </View>
      </View>

      <View style={styles.center}>
        <View style={styles.title}>
          <Image
            source={require('../../assets/logo-quiz/wheel-title.png')}
            style={{ width: WHEEL_SIZE * 0.7, height: (WHEEL_SIZE * 0.7 * 462) / 826 }}
            resizeMode="contain"
          />
        </View>

        <View style={styles.wheelWrap}>
          <Animated.View style={wheelStyle}>
            {/* SVG wedges + a synchronized overlay of the app's real coin/heart
                icons, both inside ONE rotating container so the icons spin with
                the wheel without shifting where it lands on the won prize. */}
            <WheelSvg size={WHEEL_SIZE} showLabels={false} />
            <WheelPrizeIcons size={WHEEL_SIZE} />
          </Animated.View>
          {/* Fixed pointer at the top, overlaying the rotating wheel. */}
          <View style={styles.pointer} pointerEvents="none" />
        </View>

        {wonPrize && !spinning ? (
          <PrizePanel prize={wonPrize} t={t} />
        ) : (
          <View style={styles.prizePanelSpacer} />
        )}

        {available ? (
          <Pressable
            disabled={spinning}
            onPress={onSpin}
            style={({ pressed }) => [
              styles.spinBtn,
              LQShadow.card,
              spinning && styles.spinBtnDisabled,
              pressed && !spinning && { transform: [{ scale: 0.98 }] },
            ]}
          >
            <BlueShinySurface radius={LQRadius.pill} style={styles.spinSurface}>
              <Text style={styles.spinText}>{t.wheelSpin}</Text>
            </BlueShinySurface>
          </Pressable>
        ) : (
          <View style={[styles.cooldown, LQShadow.card]}>
            <Ionicons name="time-outline" size={18} color={LQColors.surfaceAlt} />
            <Text style={styles.cooldownLabel}>{t.wheelNextSpinIn}</Text>
            <Text style={styles.cooldownTime}>{formatCountdownHMS(remaining)}</Text>
          </View>
        )}
      </View>

      {/* Full-screen confetti burst from the centre for 3s after a spin. */}
      {showConfetti && (
        <View style={styles.confettiLayer} pointerEvents="none">
          <Confetti
            count={CONFETTI_COUNT}
            distanceRange={CONFETTI_DISTANCE}
            gravityRange={CONFETTI_GRAVITY}
          />
        </View>
      )}

      <OddsModal visible={showOdds} onClose={() => setShowOdds(false)} t={t} />
    </SafeAreaView>
  );
}

function OddsModal({
  visible,
  onClose,
  t,
}: {
  visible: boolean;
  onClose: () => void;
  t: LQLabels;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={[styles.modalCard, LQShadow.card]} onPress={() => {}}>
          <Text style={styles.modalTitle}>{t.wheelOdds}</Text>
          {WHEEL_PRIZES.map((p) => (
            <View key={p.id} style={styles.oddsRow}>
              <Text style={styles.oddsName}>{prizeLabel(p.id, t)}</Text>
              <Text style={styles.oddsPct}>{p.weight}%</Text>
            </View>
          ))}
          <Pressable style={styles.modalClose} onPress={onClose}>
            <Text style={styles.modalCloseText}>{t.ok}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/**
 * The won-prize panel: a big amount + its icon (coin or heart), on a tier-driven
 * background — base = flat grey (surfaceAlt), rare = shimmering blue, legendary =
 * shimmering gold. Amount/label colours are chosen per tier to stay readable, and
 * the brand icons (gold coin / red heart) are unchanged on every fill.
 */
function PrizePanel({ prize, t }: { prize: WheelPrize; t: LQLabels }) {
  const isCoins = prize.reward.coins != null;
  const amount = isCoins ? prize.reward.coins : prize.reward.lives;

  // "You won" label + amount colours per tier (readability first).
  const tone =
    prize.tier === 'legendary'
      ? { label: GOLD_TEXT, amount: GOLD_TEXT }
      : prize.tier === 'rare'
        ? { label: '#FFFFFF', amount: '#FFFFFF' }
        : { label: LQColors.primary, amount: LQColors.text };

  const body = (
    <>
      <Text style={[styles.prizeWonLabel, { color: tone.label }]}>{t.wheelPrizeWon}</Text>
      <View style={styles.prizeAmountRow}>
        <Text style={[styles.prizeAmount, { color: tone.amount }]}>{amount}</Text>
        {isCoins ? (
          <CoinIcon size={30} />
        ) : (
          <Ionicons name="heart" size={28} color={LQColors.heart} />
        )}
      </View>
    </>
  );

  if (prize.tier === 'legendary') {
    return (
      <GoldSurface radius={LQRadius.md} style={[styles.prizePanelSurface, LQShadow.card]}>
        {body}
      </GoldSurface>
    );
  }
  if (prize.tier === 'rare') {
    return (
      <BlueShinySurface radius={LQRadius.md} style={[styles.prizePanelSurface, LQShadow.card]}>
        {body}
      </BlueShinySurface>
    );
  }
  return <View style={[styles.prizePanel, LQShadow.card]}>{body}</View>;
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: LQColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  title: { alignItems: 'center', marginBottom: 20 },

  wheelWrap: {
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // A downward-pointing triangle at the top centre of the wheel.
  pointer: {
    position: 'absolute',
    top: -6,
    left: WHEEL_SIZE / 2 - 15,
    width: 0,
    height: 0,
    borderLeftWidth: 15,
    borderRightWidth: 15,
    borderTopWidth: 24,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: LQColors.wrong,
  },

  // base tier: a flat grey card (surfaceAlt — same fill as the low-tier wedges).
  prizePanel: {
    marginTop: 22,
    backgroundColor: LQColors.surfaceAlt,
    borderRadius: LQRadius.md,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: LQColors.border,
  },
  // rare/legendary tiers: the shimmer surface supplies the fill + rounded corners,
  // so only spacing/alignment live here.
  prizePanelSurface: {
    marginTop: 22,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  prizePanelSpacer: { marginTop: 22, height: 64 },
  prizeWonLabel: { fontSize: 26, fontWeight: '800' },
  prizeAmountRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  prizeAmount: { fontSize: 30, fontWeight: '900' },

  spinBtn: {
    marginTop: 24,
    borderRadius: LQRadius.pill,
  },
  spinSurface: {
    paddingVertical: 18,
    paddingHorizontal: 56,
    alignItems: 'center',
  },
  spinBtnDisabled: { opacity: 0.5 },
  spinText: { color: LQColors.surfaceAlt, fontWeight: '900', fontSize: 26, letterSpacing: 1 },

  // Blue pill (primary) so the light-grey (surfaceAlt) label + timer read clearly.
  cooldown: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: LQColors.primary,
    borderRadius: LQRadius.pill,
    paddingVertical: 14,
    paddingHorizontal: 22,
  },
  cooldownLabel: { fontSize: 14, fontWeight: '700', color: LQColors.surfaceAlt },
  cooldownTime: { fontSize: 16, fontWeight: '900', color: LQColors.surfaceAlt },


  confettiLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(10,14,30,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: LQColors.surface,
    borderRadius: LQRadius.lg,
    padding: 22,
  },
  modalTitle: { fontSize: 18, fontWeight: '900', color: LQColors.text, marginBottom: 14 },
  oddsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: LQColors.border,
  },
  oddsName: { fontSize: 16, fontWeight: '700', color: LQColors.text },
  oddsPct: { fontSize: 16, fontWeight: '900', color: LQColors.primary },
  modalClose: {
    marginTop: 18,
    backgroundColor: LQColors.primary,
    borderRadius: LQRadius.pill,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCloseText: { color: '#FFFFFF', fontWeight: '900', fontSize: 16 },
});
