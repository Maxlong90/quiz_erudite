import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useSheetDrag } from '@/hooks/use-sheet-drag';
import { useTranslation } from '@/hooks/use-translation';
import { DAILY_GRANT } from '@/lib/lives';
import type { StringKey } from '@/i18n/strings';

interface Props {
  visible: boolean;
  onClose: () => void;
}

interface Item { emoji: string; titleKey: StringKey; subtitleKey: StringKey; }

const ITEMS: Item[] = [
  {
    emoji: '🎁',
    titleKey: 'lives.info.daily.title',
    subtitleKey: 'lives.info.daily.subtitle',
  },
  {
    emoji: '🎬',
    titleKey: 'lives.info.ad.title',
    subtitleKey: 'lives.info.ad.subtitle',
  },
  {
    emoji: '🛍️',
    titleKey: 'lives.info.buy.title',
    subtitleKey: 'lives.info.buy.subtitle',
  },
];

/**
 * Bottom-sheet info card explaining the three ways a player can pick
 * up more lives: daily claim (auto on each new local day), rewarded
 * ads, and outright purchase. Triggered from the shop's lives balance
 * tile so the rules are one tap away.
 */
export function LivesInfoModal({ visible, onClose }: Props) {
  const { t } = useTranslation();
  const { panHandlers, animatedStyle } = useSheetDrag(onClose, visible);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View style={[styles.sheet, animatedStyle]} onStartShouldSetResponder={() => true}>
          <View style={styles.handleArea} {...panHandlers}>
            <View style={styles.handle} />
          </View>
          <Text style={styles.title}>{t('lives.info.title')}</Text>

          {ITEMS.map((it) => (
            <View key={it.titleKey} style={styles.row}>
              <Text style={styles.rowEmoji}>{it.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>
                  {t(it.titleKey, { n: DAILY_GRANT })}
                </Text>
                <Text style={styles.rowSubtitle}>{t(it.subtitleKey)}</Text>
              </View>
            </View>
          ))}

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.ctaText}>{t('lives.info.dismiss')}</Text>
          </Pressable>
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
    gap: 12,
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
    fontSize: 28,
    lineHeight: 32,
  },
  rowTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  rowSubtitle: {
    color: '#ffffffaa',
    fontSize: 13,
    marginTop: 2,
  },
  cta: {
    marginTop: 6,
    backgroundColor: '#7c5cff',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  ctaText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});
