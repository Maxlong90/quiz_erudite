import { useCallback, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

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
 * ── Why the card's height is a NUMBER and not a percentage ──────────────────
 *
 * The sheet used to be `maxHeight: '84%'` around a `flexShrink: 1` ScrollView,
 * and it did not scroll at all: the copy overflowed the card in both directions
 * and "Got it" fell off the bottom of the screen. That was a LAYOUT bug, not a
 * gesture one.
 *
 * Yoga applies the min/max clamp to a node's available INNER dimension only
 * when that dimension is already defined — `calculateAvailableInnerDimension`
 * in ReactCommon/yoga/yoga/algorithm/CalculateLayout.cpp guards the whole clamp
 * behind `if (yoga::isDefined(availableInnerDim))`. On Android a Modal's host
 * node starts life at `Size{0, 0}` (ModalHostViewUtils.cpp) and only learns the
 * real screen size through an asynchronous state round-trip, so the first pass
 * under every Modal runs with no usable owner height. With no defined main size
 * there is no remaining free space, `distributeFreeSpace` never runs, and
 * `flexShrink` on the ScrollView is INERT — while the card's own measured box
 * still gets clamped to 84%. The result is a short box wrapped around
 * full-height children: the ScrollView's frame ends up as tall as its content,
 * so `contentSize == layoutMeasurement`, so there is physically nothing to
 * scroll and no indicator to show, and the CTA is laid out past the card edge.
 *
 * Hence: DO NOT put a percentage `maxHeight` back here. A numeric `maxHeight`
 * would hit the same `isDefined` guard — only a definite `height` gives the
 * children a main size to be measured against. It is not a magic number: it is
 * 70% of the live window from `useWindowDimensions`, bounded so the sheet is
 * neither a slab on a tablet nor a slit on a small phone. With the card height
 * definite the body wrapper can simply `flex: 1` — growing only needs positive
 * free space — and "Got it", which lives outside the scroll area, can never be
 * pushed off it.
 *
 * The backdrop is a SIBLING of the card rather than its parent, so a tap on the
 * card is not in the dismiss path at all and needs no `onPress={() => {}}` stub.
 *
 * Mirrors the Flags Quiz sheet by design — the sibling apps are copies, not
 * abstractions, and must stay independently editable.
 */
export function HelpModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const t = useItalyLabels();
  const { height: windowHeight } = useWindowDimensions();
  const cardHeight = Math.round(Math.min(560, Math.max(300, windowHeight * 0.7)));

  const sections: { title: string; body: string }[] = [
    { title: t.helpCirclesTitle, body: t.helpCirclesBody },
    { title: t.helpStarsTitle, body: t.helpStarsBody },
    { title: t.helpUnlockTitle, body: t.helpUnlockBody },
    { title: t.helpMistakesTitle, body: t.helpMistakesBody },
  ];

  // A fade that is always on is decoration; one that appears exactly when copy
  // is hidden behind it is information — and it correctly never appears if a
  // translation happens to fit. Both start "true" (= at that edge, no fade) so
  // neither flashes on open, before the first measurement has arrived.
  const [atTop, setAtTop] = useState(true);
  const [atEnd, setAtEnd] = useState(true);
  // Each callback reports only its own slice of the geometry, so all three are
  // kept in refs and both booleans are recomputed from one place.
  const offsetY = useRef(0);
  const viewportHeight = useRef(0);
  const contentHeight = useRef(0);

  const syncFades = useCallback(() => {
    const overflow = contentHeight.current - viewportHeight.current;
    const scrollable = overflow > 1; // 1px of slack: sub-pixel rounding is not overflow.
    setAtTop(!scrollable || offsetY.current <= 1);
    setAtEnd(!scrollable || offsetY.current >= overflow - 1);
  }, []);

  const onScrollLayout = useCallback(
    (e: LayoutChangeEvent) => {
      viewportHeight.current = e.nativeEvent.layout.height;
      syncFades();
    },
    [syncFades],
  );

  const onContentSizeChange = useCallback(
    (_width: number, height: number) => {
      contentHeight.current = height;
      syncFades();
    },
    [syncFades],
  );

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
      offsetY.current = contentOffset.y;
      viewportHeight.current = layoutMeasurement.height;
      contentHeight.current = contentSize.height;
      syncFades();
    },
    [syncFades],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Backdrop beside the card, not around it: tapping the card is simply
            not in the dismiss path. */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View testID="italy-help-card" style={[styles.card, { height: cardHeight }, ItalyShadow.card]}>
          <Text style={styles.title}>{t.helpTitle}</Text>
          <View style={styles.body}>
            <ScrollView
              testID="italy-help-scroll"
              style={styles.scroll}
              contentContainerStyle={styles.scrollBody}
              showsVerticalScrollIndicator
              persistentScrollbar
              scrollEventThrottle={16}
              onLayout={onScrollLayout}
              onContentSizeChange={onContentSizeChange}
              onScroll={onScroll}
            >
              <Text style={styles.lede}>{t.helpBody}</Text>
              {sections.map((s) => (
                <View key={s.title} style={styles.section}>
                  <Text style={styles.sectionTitle}>{s.title}</Text>
                  <Text style={styles.sectionBody}>{s.body}</Text>
                </View>
              ))}
            </ScrollView>
            {/* Inset from the right rim so the fades never paint over the
                scrollbar — the one thing that says "there is more". The
                transparent stop is spelled rgba(255,255,255,0), never
                'transparent': that is rgba(0,0,0,0) and Android interpolates it
                through grey, leaving a visible dirty band. */}
            {!atTop ? (
              <LinearGradient
                testID="italy-help-fade-top"
                colors={['#FFFFFF', 'rgba(255,255,255,0)']}
                style={[styles.fade, styles.fadeTop]}
                pointerEvents="none"
              />
            ) : null}
            {!atEnd ? (
              <LinearGradient
                testID="italy-help-fade-bottom"
                colors={['rgba(255,255,255,0)', '#FFFFFF']}
                style={[styles.fade, styles.fadeBottom]}
                pointerEvents="none"
              />
            ) : null}
          </View>
          <View style={styles.cta}>
            <GlossyButton label={t.gotIt} fontSize={18} paddingVertical={12} onPress={onClose} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: ItalyColors.tileDark,
    textAlign: 'center',
    marginBottom: 8,
  },
  /** Takes the whole middle of a card whose height is definite; clips the fades. */
  body: { flex: 1, overflow: 'hidden' },
  scroll: { flex: 1 },
  scrollBody: { gap: 14, paddingTop: 2, paddingBottom: 4 },
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
  sectionBody: {
    fontSize: 15,
    lineHeight: 22,
    color: '#243056',
    textAlign: 'left',
  },
  fade: { position: 'absolute', left: 0, right: 6, height: 20 },
  fadeTop: { top: 0 },
  fadeBottom: { bottom: 0 },
  cta: { marginTop: 14 },
});
