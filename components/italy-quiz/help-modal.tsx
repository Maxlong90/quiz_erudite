import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { GlossyButton } from '@/components/italy-quiz/glossy-button';
import { ItalyColors, ItalyShadow } from '@/constants/italy-quiz/theme';
import { useItalyLabels } from '@/constants/italy-quiz/labels';

/**
 * Italy Quiz in-game help sheet. Opened from the "?" button in the quiz HUD
 * (same glossy navy tile as Report / Share) and shown ONCE automatically on the
 * very first run (see hooks/italy-quiz/use-first-run-help). Explains the
 * review-your-mistakes flow so players know up-front that a wrong answer is not
 * lost — it comes back at the end of the run. Mirrors the Flags Quiz sheet,
 * recoloured to the Italy language.
 */
export function HelpModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const t = useItalyLabels();
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
        <Pressable style={[styles.card, ItalyShadow.card]} onPress={() => {}}>
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
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 22,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: ItalyColors.tileDark,
    textAlign: 'center',
    marginBottom: 10,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: '#243056',
    textAlign: 'center',
  },
  cta: { marginTop: 18 },
});
