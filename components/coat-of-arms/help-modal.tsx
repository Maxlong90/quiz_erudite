import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { GlossyButton } from '@/components/flags-quiz/glossy-button';
import { FQColors, FQShadow } from '@/constants/flags-quiz/theme';
import { useCoaLabels } from '@/constants/coat-of-arms/labels';

// Set once the help sheet has been shown automatically, so the first-run nudge
// fires only ONCE across the whole app (either game mode / any category).
const HELP_SEEN_KEY = 'coat.help.seen.v1';

/**
 * Owns the help-sheet open state AND the first-run auto-open. Pass `ready = true`
 * once the quiz screen actually has a question to show; the very first time a
 * player reaches gameplay (any category) the sheet pops up on its own and the
 * "seen" flag is persisted so it never auto-opens again. The returned setter
 * still lets the "?" button open it manually anytime.
 */
export function useCoatHelp(ready: boolean) {
  const [helpOpen, setHelpOpen] = useState(false);
  const checked = useRef(false);
  useEffect(() => {
    if (checked.current || !ready) return;
    checked.current = true;
    AsyncStorage.getItem(HELP_SEEN_KEY)
      .then((seen) => {
        if (!seen) {
          setHelpOpen(true);
          AsyncStorage.setItem(HELP_SEEN_KEY, '1').catch(() => {});
        }
      })
      .catch(() => {});
  }, [ready]);
  return { helpOpen, setHelpOpen };
}

/**
 * Coat of Arms in-game help sheet. Opened from the "?" button in the quiz HUD
 * (same glossy tile as Report / Share). Explains the app's review-your-mistakes
 * flow so players know up-front that every wrong answer can be replayed at the
 * end of a run. A dimmed backdrop with a centred white card; tapping the
 * backdrop or the CTA closes it.
 */
export function CoatHelpModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const c = useCoaLabels();
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
          <Text style={styles.title}>{c.helpTitle}</Text>
          <Text style={styles.body}>{c.helpBody}</Text>
          <View style={styles.cta}>
            <GlossyButton label={c.helpCta} fontSize={20} paddingVertical={14} onPress={onClose} />
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
