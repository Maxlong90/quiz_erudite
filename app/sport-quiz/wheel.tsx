import { useCallback, useRef, useState } from 'react';
import { Dimensions, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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

import { AppBackground } from '@/components/sport-quiz/app-background';
import { FootballBurst } from '@/components/sport-quiz/football-burst';
import { CoinIcon, CoinPill, GlassIconButton, neonGlow } from '@/components/sport-quiz/ui';
import { SpinButton } from '@/components/sport-quiz/shine';
import { WheelPrizeIcons, WheelSvg } from '@/components/sport-quiz/wheel-svg';
import { SQColors, SQRadius } from '@/constants/sport-quiz/theme';
import { useSQLabels, type SQLabels } from '@/constants/sport-quiz/labels';
import { useNow, useSportQuiz } from '@/hooks/sport-quiz/use-sport-quiz';
import {
  WHEEL_PRIZES,
  WHEEL_SEGMENTS,
  formatCountdownHMS,
  pickWheelPrizeIndex,
  segmentsForPrize,
  wheelCooldownRemaining,
  type WheelPrize,
} from '@/lib/sport-quiz/economy';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const WHEEL_SIZE = Math.min(SCREEN_W - 72, 320) * 1.05;
const SEG_DEG = 360 / WHEEL_SEGMENTS.length;
const SPIN_DURATION_MS = 5000;
const SPIN_FULL_TURNS = 6;

// Football burst on a win — mirrors the Logo Quiz wheel's confetti: a screen-wide
// spray of soccer balls that plays once, then clears.
const BALLS_DURATION_MS = 3000;
const BALLS_COUNT = 28;
const BALLS_SPREAD = Math.max(SCREEN_W, SCREEN_H);
const BALLS_DISTANCE: readonly [number, number] = [BALLS_SPREAD * 0.22, BALLS_SPREAD * 0.62];
const BALLS_GRAVITY: readonly [number, number] = [SCREEN_H * 0.4, SCREEN_H * 0.95];

/** Localized coin label for a prize id (also used by the odds list). */
function prizeLabel(id: string, t: SQLabels): string {
  switch (id) {
    case 'coins100':
      return t.wheelPrizeCoins100;
    case 'coins500':
      return t.wheelPrizeCoins500;
    case 'coins1000':
      return t.wheelPrizeCoins1000;
    default:
      return id;
  }
}

export default function SportQuizWheel() {
  const t = useSQLabels();
  const { coins, wheelLastSpinAt, spinWheel, resetWheelCooldown } = useSportQuiz();
  const now = useNow(1000);
  const remaining = wheelCooldownRemaining(wheelLastSpinAt, now);
  const available = remaining <= 0;

  const rotation = useSharedValue(0);
  const [spinning, setSpinning] = useState(false);
  const [wonPrize, setWonPrize] = useState<WheelPrize | null>(null);
  const [showBalls, setShowBalls] = useState(false);
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
    spinWheel(prize); // credit coins + start the 24h cooldown (persisted)
    setWonPrize(prize);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    // Fire the football burst for a few seconds, then clear it.
    setShowBalls(true);
    setTimeout(() => setShowBalls(false), BALLS_DURATION_MS);
  }, [spinWheel]);

  const onSpin = useCallback(() => {
    if (spinning || !available) return;
    setWonPrize(null);
    setShowBalls(false);
    setSpinning(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    // WEIGHTED prize pick (90/8/2), THEN choose one of that prize's wedges.
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
      <AppBackground variant="navy" />
      <StatusBar style="light" />

      <View style={styles.header}>
        <GlassIconButton glyph="chevron-back" size={44} onPress={() => router.back()} />
        <View style={styles.headerRight}>
          <CoinPill coins={coins} size="lg" />
          <GlassIconButton glyph="information-circle" size={44} onPress={() => setShowOdds(true)} />
        </View>
      </View>

      <View style={styles.center}>
        <View style={styles.wheelWrap}>
          <Animated.View style={wheelStyle}>
            {/* SVG wedges + a synchronized overlay of the app's real coin icons,
                both inside ONE rotating container so the icons spin with the wheel
                without shifting where it lands on the won prize. */}
            <WheelSvg size={WHEEL_SIZE} />
            <WheelPrizeIcons size={WHEEL_SIZE} />
          </Animated.View>
          {/* Fixed pointer at the top, overlaying the rotating wheel. */}
          <View style={styles.pointer} pointerEvents="none" />
        </View>

        {wonPrize && !spinning ? <PrizePanel prize={wonPrize} t={t} /> : <View style={styles.prizePanelSpacer} />}

        {available ? (
          <SpinButton
            label={<Text style={styles.spinText}>{t.wheelSpin}</Text>}
            onPress={onSpin}
            disabled={spinning}
          />
        ) : (
          <View style={[styles.cooldown, neonGlow(SQColors.neonBlue, 10)]}>
            <LinearGradient
              colors={[SQColors.glassStrong, SQColors.glass]}
              style={[StyleSheet.absoluteFill, { borderRadius: SQRadius.pill }]}
            />
            <Ionicons name="time-outline" size={18} color={SQColors.neonBlue} />
            <Text style={styles.cooldownLabel}>{t.wheelNextSpinIn}</Text>
            <Text style={styles.cooldownTime}>{formatCountdownHMS(remaining)}</Text>
          </View>
        )}
      </View>

      {/* DEV: reset the cooldown so the free spin is available immediately. */}
      {__DEV__ && (
        <Pressable
          onPress={resetWheelCooldown}
          style={({ pressed }) => [styles.devBtn, pressed && { opacity: 0.8 }]}
        >
          <Ionicons name="build" size={18} color="#FFB65C" />
          <Text style={styles.devBtnText}>DEV: reset timer</Text>
        </Pressable>
      )}

      {/* Full-screen football burst from the centre for a few seconds after a win. */}
      {showBalls && (
        <View style={styles.ballsLayer} pointerEvents="none">
          <FootballBurst count={BALLS_COUNT} distanceRange={BALLS_DISTANCE} gravityRange={BALLS_GRAVITY} />
        </View>
      )}

      <OddsModal visible={showOdds} onClose={() => setShowOdds(false)} t={t} />
    </SafeAreaView>
  );
}

function OddsModal({ visible, onClose, t }: { visible: boolean; onClose: () => void; t: SQLabels }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={[styles.modalCard, neonGlow(SQColors.neon, 14)]} onPress={() => {}}>
          <LinearGradient
            colors={[SQColors.glassStrong, SQColors.glass]}
            style={[StyleSheet.absoluteFill, { borderRadius: SQRadius.lg }]}
          />
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
 * The won-prize panel: "You won" + a big amount + the gold coin icon, on a
 * tier-driven glass surface — base = quiet glass, rare = magenta glow, legendary =
 * gold glow.
 */
function PrizePanel({ prize, t }: { prize: WheelPrize; t: SQLabels }) {
  const glow =
    prize.tier === 'legendary' ? SQColors.coin : prize.tier === 'rare' ? SQColors.neonPink : SQColors.neon;
  return (
    <View style={[styles.prizePanel, neonGlow(glow, 16)]}>
      <LinearGradient
        colors={[SQColors.glassStrong, SQColors.glass]}
        style={[StyleSheet.absoluteFill, { borderRadius: SQRadius.md }]}
      />
      <Text style={styles.prizeWonLabel}>{t.wheelPrizeWon}</Text>
      <View style={styles.prizeAmountRow}>
        <Text style={styles.prizeAmount}>{prize.reward.coins}</Text>
        <CoinIcon size={30} />
      </View>
    </View>
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
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },

  // Full-screen overlay the football burst plays on (centred origin).
  ballsLayer: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },

  wheelWrap: { width: WHEEL_SIZE, height: WHEEL_SIZE, alignItems: 'center', justifyContent: 'center' },
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
    borderTopColor: SQColors.neonPink,
  },

  prizePanel: {
    marginTop: 22,
    borderRadius: SQRadius.md,
    borderWidth: 1.5,
    borderColor: SQColors.glassBorder,
    overflow: 'hidden',
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  prizePanelSpacer: { marginTop: 22, height: 64 },
  prizeWonLabel: { fontSize: 22, fontWeight: '800', color: SQColors.textMuted },
  prizeAmountRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  prizeAmount: { fontSize: 32, fontWeight: '900', color: SQColors.text },

  ctaWrap: { marginTop: 24 },
  spinText: { color: SQColors.textOnNeon, fontWeight: '900', fontSize: 26, letterSpacing: 1 },
  cooldown: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: SQRadius.pill,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderWidth: 1.5,
    borderColor: SQColors.glassBorder,
    overflow: 'hidden',
  },
  cooldownLabel: { fontSize: 14, fontWeight: '700', color: SQColors.text },
  cooldownTime: { fontSize: 16, fontWeight: '900', color: SQColors.text },

  // DEV button — off-brand dashed amber pill so it reads as a tool.
  devBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'center',
    marginBottom: 14,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: SQRadius.pill,
    borderWidth: 1.5,
    borderColor: '#FFB65C',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(6,16,26,0.6)',
  },
  devBtnText: { color: '#FFB65C', fontWeight: '800', fontSize: 14 },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(4,12,20,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: SQRadius.lg,
    borderWidth: 1.5,
    borderColor: SQColors.glassBorder,
    overflow: 'hidden',
    padding: 22,
  },
  modalTitle: { fontSize: 18, fontWeight: '900', color: SQColors.text, marginBottom: 14 },
  oddsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: SQColors.glassBorderDim,
  },
  oddsName: { fontSize: 16, fontWeight: '700', color: SQColors.text },
  oddsPct: { fontSize: 16, fontWeight: '900', color: SQColors.neon },
  modalClose: {
    marginTop: 18,
    backgroundColor: SQColors.neon,
    borderRadius: SQRadius.pill,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCloseText: { color: SQColors.textOnNeon, fontWeight: '900', fontSize: 16 },
});
