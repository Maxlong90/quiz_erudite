import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { GlossyButton } from '@/components/flags-quiz/glossy-button';
import { FQColors } from '@/constants/flags-quiz/theme';
import { useFQLabels } from '@/constants/flags-quiz/labels';

/**
 * Flags Quiz help sheet, opened from the "?" icon on the gameplay screens. It
 * explains the app's "work on your mistakes" flow — every wrong flag is saved
 * and can be retried at the end of the round — so the player understands up front
 * that missed flags are never lost. Styled in the Flags Quiz language: a white
 * card with a navy title and a glossy-blue close button, matching the settings
 * language picker.
 */
export function HelpModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const t = useFQLabels();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={styles.iconCircle}>
            <Ionicons name="help" size={30} color="#FFFFFF" />
          </View>
          <Text style={styles.title}>{t.helpTitle}</Text>
          <ScrollView
            style={styles.bodyScroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.bodyContent}
          >
            <Text style={styles.body}>{t.helpBody}</Text>
          </ScrollView>
          <GlossyButton label={t.gotIt} onPress={onClose} fontSize={20} paddingVertical={16} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 22,
    alignItems: 'center',
    gap: 14,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: FQColors.tileDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: FQColors.tileGlyph,
    textAlign: 'center',
  },
  bodyScroll: { maxHeight: 260, alignSelf: 'stretch' },
  bodyContent: { paddingHorizontal: 2 },
  body: {
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '600',
    color: FQColors.tileGlyph,
    textAlign: 'center',
  },
});
