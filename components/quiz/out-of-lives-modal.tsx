import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/hooks/use-translation';
import { useThemeColors } from '@/hooks/use-theme-colors';
import type { EruditePalette } from '@/constants/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onWatchAd: () => Promise<void> | void;
  onOpenShop: () => void;
  /**
   * Whether a rewarded ad can actually be served. When false (Expo Go / web /
   * iOS / no native module) the watch-ad button is hidden so we never offer a
   * reward that can't be earned. Defaults to true.
   */
  adAvailable?: boolean;
}

/**
 * Shown when the player tries to play with 0 lives. Exits: watch a rewarded ad
 * (when available), buy lives (shop), or close (goes home).
 */
export function OutOfLivesModal({
  visible,
  onClose,
  onWatchAd,
  onOpenShop,
  adAvailable = true,
}: Props) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
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

          {adAvailable && (
            <Pressable
              onPress={handleWatch}
              disabled={pending}
              style={({ pressed }) => [styles.primary, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.primaryText}>
                {pending ? t('lives.outOf.watching') : t('lives.outOf.watchAd')}
              </Text>
            </Pressable>
          )}
          <Pressable
            onPress={onOpenShop}
            style={({ pressed }) => [
              adAvailable ? styles.secondary : styles.primary,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={adAvailable ? styles.secondaryText : styles.primaryText}>
              {t('lives.outOf.buy')}
            </Text>
          </Pressable>
          <Pressable onPress={onClose} style={styles.dismiss}>
            <Text style={styles.dismissText}>{t('lives.outOf.later')}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const makeStyles = (c: EruditePalette) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: c.scrim,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: c.sheet,
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
    color: c.text,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  body: {
    color: c.textFaint,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  primary: {
    alignSelf: 'stretch',
    backgroundColor: c.accent,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryText: {
    color: c.onAccent,
    fontSize: 16,
    fontWeight: '800',
  },
  secondary: {
    alignSelf: 'stretch',
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: c.borderStrong,
  },
  secondaryText: {
    color: c.text,
    fontSize: 15,
    fontWeight: '700',
  },
  dismiss: {
    paddingVertical: 8,
    marginTop: 4,
  },
  dismissText: {
    color: c.textDisabled,
    fontSize: 13,
  },
});
