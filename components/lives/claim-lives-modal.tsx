import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/hooks/use-translation';
import { DAILY_GRANT } from '@/lib/lives';

interface Props {
  visible: boolean;
  /** Called after the claim has been processed. */
  onClaim: () => Promise<void> | void;
  /** Soft-dismiss without claiming (player can still tap later in shop). */
  onClose: () => void;
}

/**
 * Celebrational pop-up shown on Home once per local day: "Claim your
 * 10 lives". Big heart, single primary button, optional dismiss. The
 * claim is non-skippable in the sense that lives are only granted via
 * the button — closing the modal without tapping leaves them on the
 * table until the player opens the shop (where the same info is
 * surfaced) or comes back tomorrow.
 */
export function ClaimLivesModal({ visible, onClaim, onClose }: Props) {
  const { t } = useTranslation();
  const [pending, setPending] = useState(false);

  async function handleClaim() {
    if (pending) return;
    setPending(true);
    try { await onClaim(); } finally { setPending(false); }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation?.()}>
          <Text style={styles.heart}>❤️</Text>
          <Text style={styles.amount}>+{DAILY_GRANT}</Text>
          <Text style={styles.title}>{t('lives.claim.title')}</Text>
          <Text style={styles.body}>{t('lives.claim.body')}</Text>

          <Pressable
            onPress={handleClaim}
            disabled={pending}
            style={({ pressed }) => [styles.primary, pressed && { opacity: 0.85 }]}
            testID="claim-lives-button"
          >
            <Text style={styles.primaryText}>
              {pending ? t('lives.claim.claiming') : t('lives.claim.cta')}
            </Text>
          </Pressable>
          <Pressable onPress={onClose} style={styles.dismiss}>
            <Text style={styles.dismissText}>{t('lives.claim.later')}</Text>
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
    gap: 8,
  },
  heart: {
    fontSize: 64,
    marginBottom: 4,
  },
  amount: {
    color: '#ef4444',
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: 1,
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
    letterSpacing: 0.3,
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
