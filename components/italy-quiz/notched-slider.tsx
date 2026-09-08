import { useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { ItalyColors, ItalyShadow } from '@/constants/italy-quiz/theme';

const THUMB = 36;
const TICK = 12;

const STATE_COLOURS = {
  correct: { fill: '#3FBF6A', rim: '#0A4223' },
  wrong: { fill: '#E2606A', rim: '#4E0D14' },
} as const;

/**
 * A slider with a fixed number of stops, used to answer an `estimate` question.
 *
 * It is a different *input* for an ordinary multiple-choice question, not a
 * different kind of question: the thumb snaps to one of `count` notches, each
 * notch IS one of the four options, and confirming reports that option's index
 * back through the normal answer path. Ranges are inherently ordered — earlier to
 * later, smaller to larger — so dragging along a line says something a grid of
 * four tiles does not.
 *
 * Snapping is what makes it usable. An earlier continuous version of this asked
 * the player to hit one year out of eleven centuries, which nobody can do; with
 * four stops each target is a quarter of the track wide and a sloppy drag still
 * lands where it was aimed.
 *
 * Touch mapping deliberately uses NO measurement of where the track sits on
 * screen. The previous version measured once at mount, before layout had settled,
 * and every touch landed about thirty pixels off for the life of the screen.
 * Instead the grant event's own `locationX` (already relative to this view) is the
 * anchor, and each move is that anchor plus the page-space delta — exact by
 * construction, and immune to the surrounding ScrollView moving underneath.
 * `onPanResponderTerminationRequest` returns false for the same reason: once the
 * drag starts, the ScrollView may not take the gesture away mid-stroke.
 */
export function NotchedSlider({
  count,
  value,
  onChange,
  disabled,
  /** True before the player has touched it — the thumb reads as "not chosen yet". */
  dim,
  /** Set once answered, to colour the thumb green or red. */
  state,
}: {
  count: number;
  value: number;
  onChange: (next: number) => void;
  disabled: boolean;
  dim?: boolean;
  state?: 'correct' | 'wrong' | null;
}) {
  const [trackW, setTrackW] = useState(0);
  const anchor = useRef({ loc: 0, page: 0 });

  // The PanResponder is built once, so everything it reads lives in a ref that is
  // refreshed on every render.
  const live = useRef({ count, trackW, onChange, disabled });
  live.current = { count, trackW, onChange, disabled };

  const apply = (x: number) => {
    const { count: n, trackW: w, onChange: emit, disabled: off } = live.current;
    if (off || w <= 0 || n < 2) return;
    const ratio = Math.min(1, Math.max(0, x / w));
    emit(Math.round(ratio * (n - 1)));
  };

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !live.current.disabled,
        onMoveShouldSetPanResponder: () => !live.current.disabled,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => {
          anchor.current = { loc: e.nativeEvent.locationX, page: e.nativeEvent.pageX };
          apply(e.nativeEvent.locationX - THUMB / 2);
        },
        onPanResponderMove: (_e, g) => {
          const x = anchor.current.loc + (g.moveX - anchor.current.page) - THUMB / 2;
          apply(x);
        },
      }),
    [],
  );

  const onTrackLayout = (e: LayoutChangeEvent) => setTrackW(e.nativeEvent.layout.width);

  const step = count > 1 ? trackW / (count - 1) : 0;
  const thumbX = step * Math.min(Math.max(value, 0), count - 1);
  const scheme = state ? STATE_COLOURS[state] : null;

  return (
    <View style={styles.wrap} {...responder.panHandlers}>
      <View style={styles.track} onLayout={onTrackLayout}>
        <View style={styles.trackBase} />
        <LinearGradient
          colors={[ItalyColors.tileLight, ItalyColors.tileDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.trackFill, { width: dim ? 0 : thumbX }]}
        />

        {/* One notch per option — the visible proof that there are exactly four
            answers and that the thumb can only stop on them. */}
        {Array.from({ length: count }, (_, i) => (
          <View key={i} style={[styles.tick, { left: step * i - TICK / 2 }]} pointerEvents="none" />
        ))}

        <View
          style={[
            styles.thumb,
            ItalyShadow.card,
            { left: thumbX - THUMB / 2 },
            scheme ? { backgroundColor: scheme.fill, borderColor: scheme.rim } : null,
            dim ? styles.thumbDim : null,
          ]}
          pointerEvents="none"
        >
          <View
            style={[styles.thumbInner, scheme ? { backgroundColor: '#FFFFFF' } : null]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Half a thumb of padding each side so the thumb never clips at the ends.
  wrap: { paddingHorizontal: THUMB / 2, paddingVertical: 10 },
  track: { height: THUMB, justifyContent: 'center' },
  trackBase: {
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(8, 22, 66, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(210, 224, 255, 0.45)',
  },
  trackFill: { position: 'absolute', left: 0, height: 14, borderRadius: 7 },
  tick: {
    position: 'absolute',
    width: TICK,
    height: TICK,
    borderRadius: TICK / 2,
    backgroundColor: 'rgba(230, 238, 255, 0.9)',
    borderWidth: 1,
    borderColor: ItalyColors.tileRim,
  },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: ItalyColors.tileRim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbDim: { opacity: 0.55 },
  thumbInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: ItalyColors.tileDark,
  },
});
