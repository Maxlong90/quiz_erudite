import { useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { ItalyColors, ItalyShadow } from '@/constants/italy-quiz/theme';

/**
 * The slider behind a `scale` question — drag to place a guess between `min` and
 * `max`.
 *
 * Built on the core PanResponder rather than a slider package on purpose: Italy
 * Quiz is previewed in Expo Go, which only carries the native modules baked into
 * it, so a new native dependency would mean a full rebuild before anyone could
 * look at the screen. This is a plain View with a touch handler and costs nothing.
 *
 * After the answer is locked in, `answer` is marked on the track so the player can
 * see how far off they were — unlike a wrong multiple-choice pick, which never
 * reveals the right option. A number is worth nothing without the real number
 * beside it.
 */
export function ScaleSlider({
  min,
  max,
  value,
  onChange,
  disabled,
  answer,
  correct,
}: {
  min: number;
  max: number;
  value: number;
  onChange: (next: number) => void;
  disabled: boolean;
  /** Once answered, the true value — drawn as a marker on the track. */
  answer?: number;
  /** Whether the locked-in guess counted as correct (colours the marker). */
  correct?: boolean;
}) {
  const [trackW, setTrackW] = useState(0);
  const geom = useRef({ pageX: 0, width: 0 });

  // The PanResponder is built once, so everything it reads lives in a ref that is
  // refreshed on every render — otherwise it would answer with the first render's
  // props for the whole life of the screen.
  const live = useRef({ min, max, onChange, disabled });
  live.current = { min, max, onChange, disabled };

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !live.current.disabled,
        onMoveShouldSetPanResponder: () => !live.current.disabled,
        onPanResponderGrant: (e) => applyPageX(e.nativeEvent.pageX),
        onPanResponderMove: (_e, g) => applyPageX(g.moveX),
      }),
    [],
  );

  function applyPageX(pageX: number) {
    const { pageX: left, width } = geom.current;
    if (width <= 0 || live.current.disabled) return;
    const ratio = Math.min(1, Math.max(0, (pageX - left) / width));
    const { min: lo, max: hi } = live.current;
    live.current.onChange(Math.round(lo + ratio * (hi - lo)));
  }

  const onTrackLayout = (e: LayoutChangeEvent) => {
    const { width } = e.nativeEvent.layout;
    setTrackW(width);
    geom.current.width = width;
  };

  const fraction = max > min ? (value - min) / (max - min) : 0;
  const answerFraction =
    answer != null && max > min
      ? Math.min(1, Math.max(0, (answer - min) / (max - min)))
      : null;

  return (
    <View style={styles.wrap}>
      <View
        style={styles.track}
        onLayout={onTrackLayout}
        // Re-measured on every layout pass so a rotation or a keyboard push
        // doesn't leave the touch mapping pointing at the old position.
        onTouchStart={() => {}}
        ref={(node) => {
          node?.measureInWindow?.((x) => {
            geom.current.pageX = x;
          });
        }}
        {...responder.panHandlers}
      >
        <View style={styles.trackBase} />
        <LinearGradient
          colors={[ItalyColors.tileLight, ItalyColors.tileDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.trackFill, { width: Math.max(0, fraction * trackW) }]}
        />

        {/* Where the truth actually was — only after the guess is locked in. */}
        {answerFraction != null ? (
          <View
            style={[
              styles.answerMark,
              { left: answerFraction * trackW - 2, backgroundColor: correct ? '#3FBF6A' : '#FFD54A' },
            ]}
            pointerEvents="none"
          />
        ) : null}

        <View
          style={[styles.thumb, ItalyShadow.card, { left: fraction * trackW - THUMB / 2 }]}
          pointerEvents="none"
        >
          <View style={styles.thumbInner} />
        </View>
      </View>
    </View>
  );
}

/** Value bubble drawn above the slider — kept separate so the quiz screen can
 *  style and position the reading independently of the track. */
export function ScaleReadout({ text, muted }: { text: string; muted?: boolean }) {
  return (
    <Text style={[styles.readout, muted && styles.readoutMuted]} numberOfLines={1}>
      {text}
    </Text>
  );
}

const THUMB = 34;

const styles = StyleSheet.create({
  wrap: { paddingVertical: 6 },
  track: {
    height: THUMB,
    justifyContent: 'center',
  },
  trackBase: {
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(8, 22, 66, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(210, 224, 255, 0.45)',
  },
  trackFill: {
    position: 'absolute',
    left: 0,
    height: 12,
    borderRadius: 6,
  },
  answerMark: {
    position: 'absolute',
    width: 4,
    height: 26,
    borderRadius: 2,
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
  thumbInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: ItalyColors.tileDark,
  },
  readout: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  readoutMuted: { color: '#D6DEFF', fontSize: 18 },
});
