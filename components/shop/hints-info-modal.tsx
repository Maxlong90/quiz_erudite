import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useSheetDrag } from '@/hooks/use-sheet-drag';
import { useTranslation } from '@/hooks/use-translation';
import type { HintKind, HintsState } from '@/lib/hints';
import type { StringKey } from '@/i18n/strings';

interface Props {
  visible: boolean;
  hints: HintsState;
  onClose: () => void;
}

interface HintRow {
  kind: HintKind;
  emoji: string;
  titleKey: StringKey;
  subtitleKey: StringKey;
}

const HINT_ROWS: HintRow[] = [
  { kind: 'fiftyFifty', emoji: '½', titleKey: 'hintsInfo.fiftyFifty.title', subtitleKey: 'hintsInfo.fiftyFifty.subtitle' },
  { kind: 'statistics', emoji: '📊', titleKey: 'hintsInfo.statistics.title', subtitleKey: 'hintsInfo.statistics.subtitle' },
  { kind: 'ai', emoji: '🤖', titleKey: 'hintsInfo.ai.title', subtitleKey: 'hintsInfo.ai.subtitle' },
  { kind: 'letter', emoji: '🔤', titleKey: 'hintsInfo.letter.title', subtitleKey: 'hintsInfo.letter.subtitle' },
];

interface SourceRow {
  emoji: string;
  titleKey: StringKey;
  subtitleKey: StringKey;
}

const SOURCE_ROWS: SourceRow[] = [
  { emoji: '🎬', titleKey: 'hintsInfo.source.ad.title', subtitleKey: 'hintsInfo.source.ad.subtitle' },
  { emoji: '🛍️', titleKey: 'hintsInfo.source.buy.title', subtitleKey: 'hintsInfo.source.buy.subtitle' },
];

/**
 * Bottom-sheet info card for the Shop's "Hints" balance tile. Splits
 * into two sections: a current-balance breakdown per hint type, and a
 * "how to get more" list with ads + purchase paths.
 */
export function HintsInfoModal({ visible, hints, onClose }: Props) {
  const { t } = useTranslation();
  const { panHandlers, animatedStyle } = useSheetDrag(onClose, visible);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View style={[styles.sheet, animatedStyle]} onStartShouldSetResponder={() => true}>
          <View style={styles.handleArea} {...panHandlers}>
            <View style={styles.handle} />
          </View>
          <Text style={styles.title}>{t('hintsInfo.title')}</Text>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
            <Text style={styles.sectionLabel}>{t('hintsInfo.balanceSection')}</Text>
            <View style={styles.card}>
              {HINT_ROWS.map((r, idx) => (
                <View key={r.kind}>
                  {idx > 0 && <View style={styles.divider} />}
                  <View style={styles.row}>
                    <Text style={styles.emoji}>{r.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle}>{t(r.titleKey)}</Text>
                      <Text style={styles.rowSubtitle} numberOfLines={2}>
                        {t(r.subtitleKey)}
                      </Text>
                    </View>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{hints[r.kind] ?? 0}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>

            <Text style={styles.sectionLabel}>{t('hintsInfo.sourcesSection')}</Text>
            <View style={styles.card}>
              {SOURCE_ROWS.map((r, idx) => (
                <View key={r.titleKey}>
                  {idx > 0 && <View style={styles.divider} />}
                  <View style={styles.row}>
                    <Text style={styles.emoji}>{r.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle}>{t(r.titleKey)}</Text>
                      <Text style={styles.rowSubtitle} numberOfLines={2}>
                        {t(r.subtitleKey)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.ctaText}>{t('hintsInfo.dismiss')}</Text>
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
    paddingBottom: 28,
    gap: 12,
    // Cap to 85% so even on short screens both sections + the CTA
    // remain reachable. ScrollView inside takes the slack via flex:1
    // so the button always sits anchored at the bottom of the sheet.
    maxHeight: '85%',
    flexShrink: 1,
  },
  // Generous tap target around the visible handle so the player can
  // grab and swipe from a wide area, not just the 4px pill.
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
  scroll: {
    flexShrink: 1,
  },
  sectionLabel: {
    color: '#ffffff99',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: '#ffffff0d',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ffffff1f',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
  },
  emoji: {
    fontSize: 24,
    lineHeight: 28,
    width: 30,
    textAlign: 'center',
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
    lineHeight: 17,
  },
  badge: {
    minWidth: 36,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#7c5cff',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#ffffff1f',
    marginLeft: 58,
  },
  cta: {
    backgroundColor: '#7c5cff',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  ctaText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});
