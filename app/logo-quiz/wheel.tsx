import { useCallback, useRef, useState } from 'react';
import { Dimensions, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
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
import { Confetti } from '@/components/logo-quiz/confetti';
import { CoinPill, LivesPill } from '@/components/logo-quiz/hud';
import { WheelSvg } from '@/components/logo-quiz/wheel-svg';
import { LQColors, LQRadius, LQShadow } from '@/constants/logo-quiz/theme';
import { useLQLabels, type LQLabels } from '@/constants/logo-quiz/labels';
import { useLogoQuiz, useNow } from '@/hooks/logo-quiz/use-logo-quiz';
import {
  WHEEL_COOLDOWN_MS,
  WHEEL_PRIZES,
  WHEEL_SEGMENTS,
  formatCountdownHMS,
  pickWheelPrizeIndex,
  segmentsForPrize,
  type WheelPrize,
} from '@/lib/logo-quiz/economy';

const WHEEL_SIZE = Math.min(Dimensions.get('window').width - 72, 320);
const SEG_DEG = 360 / WHEEL_SEGMENTS.length;
const SPIN_DURATION_MS = 5000;
const SPIN_FULL_TURNS = 6;
const CONFETTI_DURATION_MS = 3000;

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
  const { coins, isPremium, livesState, wheelLastSpinAt, spinWheel } = useLogoQuiz();
  const now = useNow(1000);
  const remaining = Math.max(0, WHEEL_COOLDOWN_MS - (now - wheelLastSpinAt));
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
        <Text style={styles.title}>{t.wheelTitle}</Text>

        <View style={styles.wheelWrap}>
          <Animated.View style={wheelStyle}>
            <WheelSvg size={WHEEL_SIZE} />
          </Animated.View>
          {/* Fixed pointer at the top, overlaying the rotating wheel. */}
          <View style={styles.pointer} pointerEvents="none" />
        </View>

        {wonPrize && !spinning ? (
          <View style={[styles.prizePanel, LQShadow.card]}>
            <Text style={styles.prizeWonLabel}>{t.wheelPrizeWon}</Text>
            <Text style={styles.prizeName}>{prizeLabel(wonPrize.id, t)}</Text>
          </View>
        ) : (
          <View style={styles.prizePanelSpacer} />
        )}

        {available ? (
          <Pressable
            disabled={spinning}
            onPress={onSpin}
            style={({ pressed }) => [
              styles.spinBtn,
              LQShadow.gold,
              spinning && styles.spinBtnDisabled,
              pressed && !spinning && { transform: [{ scale: 0.98 }] },
            ]}
          >
            <Text style={styles.spinText}>{t.wheelSpin}</Text>
          </Pressable>
        ) : (
          <View style={[styles.cooldown, LQShadow.card]}>
            <Ionicons name="time-outline" size={18} color={LQColors.textMuted} />
            <Text style={styles.cooldownLabel}>{t.wheelNextSpinIn}</Text>
            <Text style={styles.cooldownTime}>{formatCountdownHMS(remaining)}</Text>
          </View>
        )}
      </View>

      {/* Full-screen confetti burst from the centre for 3s after a spin. */}
      {showConfetti && (
        <View style={styles.confettiLayer} pointerEvents="none">
          <Confetti count={90} />
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
  title: { fontSize: 26, fontWeight: '900', color: LQColors.text, marginBottom: 20 },

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

  prizePanel: {
    marginTop: 22,
    backgroundColor: LQColors.surface,
    borderRadius: LQRadius.md,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: LQColors.border,
  },
  prizePanelSpacer: { marginTop: 22, height: 64 },
  prizeWonLabel: { fontSize: 13, fontWeight: '800', color: LQColors.textMuted },
  prizeName: { fontSize: 22, fontWeight: '900', color: LQColors.text, marginTop: 2 },

  spinBtn: {
    marginTop: 24,
    backgroundColor: LQColors.coin,
    borderRadius: LQRadius.pill,
    paddingVertical: 18,
    paddingHorizontal: 56,
    alignItems: 'center',
  },
  spinBtnDisabled: { opacity: 0.5 },
  spinText: { color: '#FFFFFF', fontWeight: '900', fontSize: 26, letterSpacing: 1 },

  cooldown: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: LQColors.surface,
    borderRadius: LQRadius.pill,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderWidth: 1,
    borderColor: LQColors.border,
  },
  cooldownLabel: { fontSize: 14, fontWeight: '700', color: LQColors.textMuted },
  cooldownTime: { fontSize: 16, fontWeight: '900', color: LQColors.text },

  confettiLayer: {
    ...StyleSheet.absoluteFillObject,
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
