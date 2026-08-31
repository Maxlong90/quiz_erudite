import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { GlossyButton } from '@/components/flags-quiz/glossy-button';
import { FQColors, FQShadow } from '@/constants/flags-quiz/theme';
import { useFQLabels } from '@/constants/flags-quiz/labels';

/**
 * Flags Quiz in-game help sheet. Opened from the "?" button in the quiz HUD
 * (same glossy tile as Report / Share) and shown ONCE automatically on the very
 * first entry into the questions (see useFirstRunHelp). Explains the app's
 * review-your-mistakes flow so players know up-front that every wrong flag can
 * be replayed at the end of a run. Visually identical to the Coat of Arms help
 * sheet — a dimmed backdrop with a centred white card; tapping the backdrop or
 * the CTA closes it.
 */
export function HelpModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const t = useFQLabels();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        {/* Stop propagation so a tap on the card itself doesn't dismiss. */}
        <Pressable style={[styles.card, FQShadow.card]} onPress={() => {}}>
          <Text style={styles.title}>{t.helpTitle}</Text>
          <Text style={styles.body}>{t.helpBody}</Text>
          <View style={styles.cta}>
            <GlossyButton label={t.gotIt} fontSize={20} paddingVertical={14} onPress={onClose} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(4, 24, 60, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 2,
    borderColor: FQColors.tileRim,
    paddingVertical: 22,
    paddingHorizontal: 22,
  },
  title: {
    color: FQColors.tileGlyph,
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 12,
  },
  body: {
    color: FQColors.tileGlyph,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 23,
    marginBottom: 20,
  },
  cta: { width: '70%', alignSelf: 'center' },
});
