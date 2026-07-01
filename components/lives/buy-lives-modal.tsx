import { useState } from 'react';
import { Alert, Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useSheetDrag } from '@/hooks/use-sheet-drag';
import { useTranslation } from '@/hooks/use-translation';
import { BUNDLES, purchaseBundle, type ShopBundle } from '@/lib/iap';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Called after a successful purchase (lives already credited). */
  onPurchased: () => void;
}

const LIVES_BUNDLES = BUNDLES.filter((b) => b.category === 'lives');

/**
 * Quick lives-purchase sheet shown straight from the out-of-lives gate
 * so the player can top up without leaving the quiz. Mirrors the shop's
 * lives bundles; on success it credits lives, fires onPurchased and the
 * caller dismisses the whole gate so play resumes.
 */
export function BuyLivesModal({ visible, onClose, onPurchased }: Props) {
  const { t } = useTranslation();
  const { panHandlers, animatedStyle } = useSheetDrag(onClose, visible);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function handleBuy(bundle: ShopBundle) {
    if (pendingId) return;
    setPendingId(bundle.id);
    try {
      await purchaseBundle(bundle);
      onPurchased();
    } catch {
      // A failed / unavailable store must be visible to the player — never
      // swallow it (that would look like a silent no-op after a tap). Mirror
      // the shop screen's error alert.
      Alert.alert(t('shop.error.title'), t('shop.error.body'));
    } finally {
      setPendingId(null);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View style={[styles.sheet, animatedStyle]} onStartShouldSetResponder={() => true}>
          <View style={styles.handleArea} {...panHandlers}>
            <View style={styles.handle} />
          </View>
          <Text style={styles.title}>{t('buyLives.title')}</Text>
          <Text style={styles.subtitle}>{t('buyLives.subtitle')}</Text>

          {LIVES_BUNDLES.map((b) => (
            <Pressable
              key={b.id}
              onPress={() => handleBuy(b)}
              disabled={!!pendingId}
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
              testID={`buy-lives-${b.id}`}
            >
              <Text style={styles.rowEmoji}>{b.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{t(b.titleKey)}</Text>
                <Text style={styles.rowSubtitle} numberOfLines={1}>{t(b.subtitleKey)}</Text>
              </View>
              <View style={styles.price}>
                <Text style={styles.priceText}>{pendingId === b.id ? '…' : b.price}</Text>
              </View>
            </Pressable>
          ))}
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1f1949',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 10,
  },
  handleArea: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingVertical: 8,
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ffffff33',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: '#ffffffaa',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#ffffff0d',
    borderWidth: 1,
    borderColor: '#ffffff1f',
  },
  rowEmoji: {
    fontSize: 26,
    lineHeight: 30,
    width: 32,
    textAlign: 'center',
  },
  rowTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  rowSubtitle: {
    color: '#ffffffaa',
    fontSize: 12,
    marginTop: 2,
  },
  price: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#7c5cff',
  },
  priceText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
});
