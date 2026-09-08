import { useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBackground } from '@/components/football-quiz/app-background';
import { FQWheelPrizeLabels, FQWheelSvg } from '@/components/football-quiz/wheel-svg';
import { CoinIcon, CoinPill, FQIconButton, FQModalCard, GoldCta, goldGlow } from '@/components/football-quiz/ui';
import { FQColors, FQRadius } from '@/constants/football-quiz/theme';
import { useSQLabels, type SQLabels } from '@/constants/sport-quiz/labels';
import { MOCK_COINS, MOCK_WHEEL_PRIZES, pickWheelPrize } from '@/lib/football-quiz/mock';

/**
 * Football Quiz wheel of fortune — same structure as app/sport-quiz/wheel.tsx:
 * back + coins/info header, the wheel with a fixed pointer, the prize panel and
 * the SPIN button, plus the odds modal behind the "i".
 *
 * The odds come straight from the shared prize table (90 / 8 / 2), so the sheet
 * shows the same numbers Sport Quiz does.
 */
const { width: SCREEN_W } = Dimensions.get('window');
const WHEEL_SIZE = Math.min(SCREEN_W - 72, 320) * 1.05;

function prizeLabel(id: string, t: SQLabels): string {
  if (id === 'coins100') return t.wheelPrizeCoins100;
  if (id === 'coins500') return t.wheelPrizeCoins500;
  return t.wheelPrizeCoins1000;
}

function OddsModal({ visible, onClose, t }: { visible: boolean; onClose: () => void; t: SQLabels }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalHit} onPress={() => {}}>
          <FQModalCard>
            <Text style={styles.modalTitle}>{t.wheelOdds}</Text>
            {MOCK_WHEEL_PRIZES.map((p) => (
              <View key={p.id} style={styles.oddsRow}>
                <Text style={styles.oddsName}>{prizeLabel(p.id, t)}</Text>
                <Text style={styles.oddsPct}>{p.weight}%</Text>
              </View>
            ))}
            <GoldCta label={t.ok} onPress={onClose} style={styles.modalClose} />
          </FQModalCard>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function FootballQuizWheel() {
  const t = useSQLabels();
  const spin = useRef(new Animated.Value(0)).current;
  const [spinning, setSpinning] = useState(false);
  const [won, setWon] = useState<number | null>(null);
  const [showOdds, setShowOdds] = useState(false);
  const turns = useRef(0);

  const onSpin = () => {
    if (spinning) return;
    setSpinning(true);
    setWon(null);
    turns.current += 5 + Math.floor(Math.random() * 3);
    Animated.timing(spin, {
      toValue: turns.current,
      duration: 3200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setSpinning(false);
      setWon(pickWheelPrize(Math.random()).coins);
    });
  };

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={styles.fill}>
      <AppBackground variant="haze" />
      <StatusBar style="light" />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <FQIconButton glyph="chevron-back" size={44} onPress={() => router.back()} />
          <View style={styles.headerRight}>
            <CoinPill coins={MOCK_COINS} size="lg" />
            <FQIconButton glyph="information-circle" size={44} glyphScale={0.82} onPress={() => setShowOdds(true)} />
          </View>
        </View>

        <View style={styles.center}>
          <View style={styles.wheelWrap}>
            <Animated.View style={{ transform: [{ rotate }] }}>
              <FQWheelSvg size={WHEEL_SIZE} />
              <FQWheelPrizeLabels size={WHEEL_SIZE} />
            </Animated.View>
            <View style={styles.pointer} pointerEvents="none" />
          </View>

          {won != null && !spinning ? (
            <View style={[styles.prizePanel, goldGlow(16, 0.55)]}>
              <Text style={styles.prizeWonLabel}>{t.wheelPrizeWon}</Text>
              <View style={styles.prizeAmountRow}>
                <Text style={styles.prizeAmount}>{won}</Text>
                <CoinIcon size={30} />
              </View>
            </View>
          ) : (
            <View style={styles.prizePanelSpacer} />
          )}

          <Pressable
            onPress={onSpin}
            disabled={spinning}
            style={({ pressed }) => [styles.spinBtn, goldGlow(24, 0.7), { opacity: spinning ? 0.5 : pressed ? 0.9 : 1 }]}
          >
            <Text style={styles.spinText}>{t.wheelSpin}</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      <OddsModal visible={showOdds} onClose={() => setShowOdds(false)} t={t} />
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

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 22 },
  wheelWrap: { width: WHEEL_SIZE, height: WHEEL_SIZE, alignItems: 'center', justifyContent: 'center' },
  pointer: {
    position: 'absolute',
    top: -14,
    width: 0,
    height: 0,
    borderLeftWidth: 15,
    borderRightWidth: 15,
    borderTopWidth: 26,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: FQColors.goldLight,
  },

  prizePanelSpacer: { height: 86 },
  prizePanel: {
    borderRadius: FQRadius.md,
    borderWidth: 1.5,
    borderColor: FQColors.glassBorder,
    backgroundColor: FQColors.glassStrong,
    paddingVertical: 14,
    paddingHorizontal: 26,
    alignItems: 'center',
    height: 86,
    justifyContent: 'center',
  },
  prizeWonLabel: {
    color: FQColors.textMuted,
    fontWeight: '900',
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  prizeAmountRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  prizeAmount: { color: FQColors.goldLight, fontWeight: '900', fontSize: 34 },

  spinBtn: {
    width: 230,
    height: 70,
    borderRadius: FQRadius.pill,
    backgroundColor: FQColors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinText: { color: FQColors.ink, fontWeight: '900', fontSize: 28, letterSpacing: 2 },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(4,6,8,0.62)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  modalHit: { width: '100%', alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '900', color: FQColors.text, textAlign: 'center', marginBottom: 4 },
  oddsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  oddsName: { color: FQColors.text, fontWeight: '800', fontSize: 16 },
  oddsPct: { color: FQColors.goldLight, fontWeight: '900', fontSize: 16 },
  modalClose: { marginTop: 8, height: 48 },
});
