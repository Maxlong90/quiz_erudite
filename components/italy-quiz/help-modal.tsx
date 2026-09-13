import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { GlossyButton } from '@/components/italy-quiz/glossy-button';
import { ItalyColors, ItalyShadow } from '@/constants/italy-quiz/theme';
import { useItalyLabels } from '@/constants/italy-quiz/labels';

/**
 * Italy Quiz help sheet. Opened from the "?" button on the map and in the quiz
 * HUD, and shown ONCE automatically on the very first run (see
 * hooks/italy-quiz/use-first-run-help).
 *
 * It explains the whole progression — what a circle is, why its twenty never
 * change, what ten of twenty earns, and the difference between the two ways a
 * circle can be shut — because none of that is guessable from the strip alone.
 * That is four times the copy the old single paragraph carried, so it is split
 * into titled sections and scrolls: an undifferentiated twenty-line wall is
 * unreadable even on a screen tall enough to hold it. The scroll indicator is
 * deliberately left ON (it is off everywhere else in the app) because it is the
 * only signal that there is more below the fold.
 *
 * Mirrors the Flags Quiz sheet by design — the sibling apps are copies, not
 * abstractions, and must stay independently editable.
 */
export function HelpModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const t = useItalyLabels();
  const sections: { title: string; body: string }[] = [
    { title: t.helpCirclesTitle, body: t.helpCirclesBody },
    { title: t.helpStarsTitle, body: t.helpStarsBody },
    { title: t.helpUnlockTitle, body: t.helpUnlockBody },
    { title: t.helpMistakesTitle, body: t.helpMistakesBody },
  ];

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
          {/* flexShrink is what pins "Got it" to the card instead of letting it
              scroll away with the copy. */}
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollBody}>
            <Text style={styles.lede}>{t.helpBody}</Text>
            {sections.map((s) => (
              <View key={s.title} style={styles.section}>
                <Text style={styles.sectionTitle}>{s.title}</Text>
                <Text style={styles.body}>{s.body}</Text>
              </View>
            ))}
          </ScrollView>
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
    maxHeight: '84%',
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
  scroll: { flexShrink: 1 },
  scrollBody: { gap: 14, paddingBottom: 2 },
  lede: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
    color: '#243056',
    textAlign: 'center',
  },
  section: { gap: 3 },
  sectionTitle: { fontSize: 15, fontWeight: '900', color: ItalyColors.tileDark },
  /** Left-aligned: centring reads fine over three lines and fights the eye over twenty. */
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: '#243056',
    textAlign: 'left',
  },
  cta: { marginTop: 18 },
});
