import { useMemo } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useSheetDrag } from '@/hooks/use-sheet-drag';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useTranslation } from '@/hooks/use-translation';
import { DAILY_GRANT } from '@/lib/lives';
import type { EruditePalette } from '@/constants/theme';
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
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
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

const makeStyles = (c: EruditePalette) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: c.scrim,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: c.sheet,
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
    backgroundColor: c.borderStrong,
  },
  title: {
    color: c.text,
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
    backgroundColor: c.surfaceSoft,
    borderWidth: 1,
    borderColor: c.border,
  },
  rowEmoji: {
    fontSize: 28,
    lineHeight: 32,
  },
  rowTitle: {
    color: c.text,
    fontSize: 15,
    fontWeight: '800',
  },
  rowSubtitle: {
    color: c.textFaint,
    fontSize: 13,
    marginTop: 2,
  },
  cta: {
    marginTop: 6,
    backgroundColor: c.accent,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  ctaText: {
    color: c.onAccent,
    fontSize: 16,
    fontWeight: '800',
  },
});
