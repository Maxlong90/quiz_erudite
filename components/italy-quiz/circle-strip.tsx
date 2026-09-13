import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ItalyColors } from '@/constants/italy-quiz/theme';
import { MAX_STARS, type CircleSlot } from '@/lib/italy-quiz/circles';

/** Chip diameter and the gap between two chips — the strip's whole geometry. */
export const CIRCLE = 36;
export const CIRCLE_GAP = 8;
const PITCH = CIRCLE + CIRCLE_GAP;

/**
 * The ten circles of one place, as a horizontal strip on the map's bottom card.
 *
 * It SCROLLS rather than fits. Ten chips inside the card's ~277dp of content
 * width on a 360dp phone would be 22dp each — below any usable touch target and
 * far too small for a number plus stars. At 36dp with a 6dp hitSlop each chip is
 * a 48dp target, about six and a half are visible, and the half-cut seventh is
 * the scroll affordance (which is why the indicator is off).
 *
 * Four states, and the load-bearing distinction is between the last two:
 *
 *  - `done` — filled, numbered, stars underneath
 *  - `current` — outlined and numbered: the one circle that is live
 *  - `locked` — a padlock. A door with a key the player can go and earn.
 *  - `soon` — no border at all and no icon: a hole in the row where a circle
 *    will be. Nothing about it suggests an action, because there is none — its
 *    questions are not written yet.
 *
 * `soon` is deliberately NOT a dashed border: dashes plus a borderRadius render
 * as solid on iOS in several RN versions, which would silently collapse the two
 * shut states into one on exactly one platform.
 *
 * Selection is the same gold as the selected map pin, and is not a fifth state —
 * it means "this is what the button below will open".
 */
export function CircleStrip({
  slots,
  activeIndex,
  onSelect,
}: {
  slots: CircleSlot[];
  activeIndex: number | null;
  onSelect: (index: number) => void;
}) {
  const scrollRef = useRef<ScrollView>(null);

  // Bring the live circle into view when the card changes place. Not animated:
  // the card has only just appeared, so there is nothing to animate from.
  useEffect(() => {
    if (activeIndex == null) return;
    scrollRef.current?.scrollTo({ x: Math.max(0, (activeIndex - 1) * PITCH - 60), animated: false });
  }, [activeIndex]);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.strip}
    >
      {slots.map((slot) => (
        <CircleChip
          key={slot.index}
          slot={slot}
          selected={slot.index === activeIndex}
          onPress={() => onSelect(slot.index)}
        />
      ))}
    </ScrollView>
  );
}

function CircleChip({
  slot,
  selected,
  onPress,
}: {
  slot: CircleSlot;
  selected: boolean;
  onPress: () => void;
}) {
  const { state, index, stars } = slot;
  return (
    <Pressable
      onPress={onPress}
      disabled={!slot.playable}
      hitSlop={6}
      style={({ pressed }) => [styles.item, pressed && slot.playable && styles.pressed]}
      testID={`italy-circle-${index}`}
    >
      <View
        style={[
          styles.chip,
          state === 'done' && styles.chipDone,
          state === 'current' && styles.chipCurrent,
          state === 'locked' && styles.chipLocked,
          state === 'soon' && styles.chipSoon,
          selected && styles.chipSelected,
        ]}
      >
        {state === 'locked' ? (
          <Ionicons name="lock-closed" size={15} color="rgba(255,255,255,0.55)" />
        ) : (
          <Text
            style={[
              styles.number,
              state === 'soon' && styles.numberSoon,
              selected && styles.numberSelected,
            ]}
          >
            {index}
          </Text>
        )}
      </View>

      {/* A fixed-height row even when empty, so every chip is the same height
          and the card's height does not depend on how far the player has got.
          Always three pips: one star versus three is read by fill, not width. */}
      <View style={styles.pips}>
        {state === 'done' || state === 'current'
          ? Array.from({ length: MAX_STARS }, (_, i) => (
              <Text key={i} style={[styles.pip, i >= stars && styles.pipEmpty]}>
                ★
              </Text>
            ))
          : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  strip: { gap: CIRCLE_GAP, paddingVertical: 2, paddingHorizontal: 2 },
  item: { alignItems: 'center', gap: 3 },
  chip: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipDone: {
    backgroundColor: ItalyColors.tileDark,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  chipCurrent: {
    backgroundColor: 'rgba(158, 196, 251, 0.28)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  chipLocked: {
    backgroundColor: 'rgba(12, 26, 70, 0.55)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  chipSoon: { backgroundColor: 'rgba(255,255,255,0.07)' },
  chipSelected: {
    backgroundColor: '#FFD54A',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
  },
  number: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  numberSoon: { color: 'rgba(255,255,255,0.30)' },
  numberSelected: { color: ItalyColors.tileGlyph },

  pips: { height: 10, flexDirection: 'row', gap: 1 },
  pip: { fontSize: 9, lineHeight: 10, color: '#FFD54A' },
  pipEmpty: { color: 'rgba(255,255,255,0.25)' },

  pressed: { opacity: 0.9, transform: [{ scale: 0.96 }] },
});
