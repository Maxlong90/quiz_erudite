import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { CoinIcon, neonGlow } from '@/components/sport-quiz/ui';
import {
  CORRECT_REWARD_COINS,
  HINT_SKIP_COST,
  LEGEND_CORRECT_REWARD_COINS,
  LEGEND_REVEAL_COST,
  LEGEND_WRONG_PENALTY_COINS,
  WRONG_PENALTY_COINS,
} from '@/lib/sport-quiz/economy';
import { SQColors, SQRadius } from '@/constants/sport-quiz/theme';
import { useSQLabels } from '@/constants/sport-quiz/labels';

/** Which mode(s) the sheet explains — `all` is the mode-select overview. */
export type InfoMode = 'all' | 'classic' | 'legends';

/** One economy line: label on the left, signed coin amount on the right. */
function CoinRow({ label, amount }: { label: string; amount: number }) {
  const positive = amount > 0;
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowValue}>
        <Text style={[styles.rowAmount, { color: positive ? SQColors.neon : '#FF6B7F' }]}>
          {positive ? `+${amount}` : amount}
        </Text>
        <CoinIcon size={20} />
      </View>
    </View>
  );
}

function ModeBlock({ mode }: { mode: 'classic' | 'legends' }) {
  const t = useSQLabels();
  const isClassic = mode === 'classic';
  return (
    <View style={styles.block}>
      <Text style={styles.blockTitle}>{isClassic ? t.modeClassic : t.modeLegends}</Text>
      <Text style={styles.blockText}>{isClassic ? t.infoClassicText : t.infoLegendsText}</Text>
      <CoinRow
        label={t.infoCorrectAnswer}
        amount={isClassic ? CORRECT_REWARD_COINS : LEGEND_CORRECT_REWARD_COINS}
      />
      <CoinRow
        label={t.infoWrongAnswer}
        amount={-(isClassic ? WRONG_PENALTY_COINS : LEGEND_WRONG_PENALTY_COINS)}
      />
      {!isClassic && <CoinRow label={t.infoRevealPlate} amount={-LEGEND_REVEAL_COST} />}
      <CoinRow label={t.infoSkipCost} amount={-HINT_SKIP_COST} />
    </View>
  );
}

/**
 * The "how this mode works" sheet — a centred glass card in the Sport Quiz style
 * (same look as the wheel's odds modal). Opened by the small "?" buttons on the
 * mode-select screen (overview of both modes) and on each mode's own screens
 * (that mode only). Explains the mode in a line and lists its coin maths, read
 * straight from lib/sport-quiz/economy so the numbers can never drift from play.
 */
export function ModeInfoModal({
  visible,
  onClose,
  mode,
}: {
  visible: boolean;
  onClose: () => void;
  mode: InfoMode;
}) {
  const t = useSQLabels();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.card, neonGlow(SQColors.neon, 14)]} onPress={() => {}}>
          <LinearGradient
            colors={[SQColors.glassStrong, SQColors.glass]}
            style={[StyleSheet.absoluteFill, { borderRadius: SQRadius.lg }]}
          />
          <Text style={styles.title}>{t.infoTitle}</Text>
          {(mode === 'all' || mode === 'classic') && <ModeBlock mode="classic" />}
          {(mode === 'all' || mode === 'legends') && <ModeBlock mode="legends" />}
          <Pressable style={styles.close} onPress={onClose}>
            <Text style={styles.closeText}>{t.ok}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(4,12,20,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: SQRadius.lg,
    borderWidth: 1.5,
    borderColor: SQColors.glassBorder,
    overflow: 'hidden',
    padding: 22,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: SQColors.text,
    marginBottom: 14,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  block: { marginBottom: 16 },
  blockTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: SQColors.neonPink,
    marginBottom: 4,
    textShadowColor: SQColors.neonPink,
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 0 },
  },
  blockText: { fontSize: 13, fontWeight: '600', color: SQColors.textMuted, lineHeight: 18, marginBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderTopWidth: 1,
    borderTopColor: SQColors.glassBorderDim,
  },
  rowLabel: { flex: 1, fontSize: 14, fontWeight: '700', color: SQColors.text },
  rowValue: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowAmount: { fontSize: 15, fontWeight: '900' },
  close: {
    marginTop: 4,
    backgroundColor: SQColors.neon,
    borderRadius: SQRadius.pill,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeText: { color: SQColors.textOnNeon, fontWeight: '900', fontSize: 16 },
});
