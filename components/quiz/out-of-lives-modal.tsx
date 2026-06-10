import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/hooks/use-translation';

interface Props {
  visible: boolean;
  onClose: () => void;
  onWatchAd: () => Promise<void> | void;
  onOpenShop: () => void;
}

/**
 * Shown when the player tries to play with 0 lives. Three exits:
 * watch ad (stubbed), buy lives (shop), or close (goes home).
 */
export function OutOfLivesModal({ visible, onClose, onWatchAd, onOpenShop }: Props) {
  const { t } = useTranslation();
  const [pending, setPending] = useState(false);

  async function handleWatch() {
    if (pending) return;
    setPending(true);
    try { await onWatchAd(); } finally { setPending(false); }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation?.()}>
          <Text style={styles.emoji}>💔</Text>
          <Text style={styles.title}>{t('lives.outOf.title')}</Text>
          <Text style={styles.body}>{t('lives.outOf.body')}</Text>

          <Pressable
            onPress={handleWatch}
            disabled={pending}
            style={({ pressed }) => [styles.primary, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.primaryText}>
              {pending ? t('lives.outOf.watching') : t('lives.outOf.watchAd')}
            </Text>
          </Pressable>
          <Pressable
            onPress={onOpenShop}
            style={({ pressed }) => [styles.secondary, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.secondaryText}>{t('lives.outOf.buy')}</Text>
          </Pressable>
          <Pressable onPress={onClose} style={styles.dismiss}>
            <Text style={styles.dismissText}>{t('lives.outOf.later')}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#1f1949',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 4,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  body: {
    color: '#ffffffaa',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  primary: {
    alignSelf: 'stretch',
    backgroundColor: '#7c5cff',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  secondary: {
    alignSelf: 'stretch',
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffffff33',
  },
  secondaryText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  dismiss: {
    paddingVertical: 8,
    marginTop: 4,
  },
  dismissText: {
    color: '#ffffff77',
    fontSize: 13,
  },
});
