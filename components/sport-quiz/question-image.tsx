/**
 * The framed question picture, with a loading state so the neon frame is never
 * just EMPTY while the bitmap is on its way.
 *
 * Why an overlay and not expo-image's own `placeholder` prop: that prop takes an
 * image SOURCE (a blurhash/thumbhash or a bundled asset), and snapshot questions
 * carry no per-question hash — one shared blurhash across every question reads as
 * a BROKEN image rather than a loading one. It also can't be delayed, can't draw
 * our own palette, and can't show a spinner.
 *
 * The overlay sits ABOVE the image, never behind it: contentFit="contain"
 * letterboxes, and anything behind would keep bleeding through the bars after the
 * picture paints. The skeleton is nearly the frame's own fill so a one-frame
 * appearance is invisible; only the SPINNER is jarring, so only the spinner is
 * delayed — a warm file:// image loads in a frame or two and must never flash one.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

import { neonGlow } from '@/components/sport-quiz/ui';
import { SQColors, SQRadius } from '@/constants/sport-quiz/theme';

/** How long a load may take before we admit to it with a spinner. */
const SPINNER_DELAY_MS = 180;
/** Cross-fade once the bitmap is decoded. */
const FADE_IN_MS = 140;

interface QuestionImageProps {
  /** Local (file://) or remote URI of the question artwork. */
  uri: string;
  /** Frame styling from the calling screen (margins, sizing overrides). */
  style?: StyleProp<ViewStyle>;
  /** Localized "Loading…" — announced while the picture is pending. */
  loadingLabel?: string;
  /** Drawn inside the frame, above the image (e.g. the Legends reveal grid). */
  children?: ReactNode;
}

/**
 * A question image in the Sport Quiz neon frame. Reset by REMOUNT: give it
 * `key={uri}` so a new question starts from a clean loading state.
 */
export function QuestionImage({ uri, style, loadingLabel, children }: QuestionImageProps) {
  const [pending, setPending] = useState(true);
  const [showSpinner, setShowSpinner] = useState(false);

  useEffect(() => {
    if (!pending) return;
    const timer = setTimeout(() => setShowSpinner(true), SPINNER_DELAY_MS);
    return () => clearTimeout(timer);
  }, [pending]);

  return (
    <View style={[styles.frame, neonGlow(SQColors.neon, 10), style]}>
      <Image
        source={{ uri }}
        style={styles.image}
        contentFit="contain"
        cachePolicy="memory-disk"
        recyclingKey={uri}
        transition={FADE_IN_MS}
        // onLoadEnd, NOT onLoad: it fires on FAILURE too, so a dead URL clears
        // the placeholder instead of spinning forever.
        onLoadEnd={() => setPending(false)}
      />
      {pending ? (
        <View
          style={styles.placeholder}
          pointerEvents="none"
          testID="question-image-placeholder"
        >
          <LinearGradient
            colors={['rgba(9,24,40,0.85)', 'rgba(18,185,138,0.10)', 'rgba(9,24,40,0.85)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {showSpinner ? (
            <ActivityIndicator
              color={SQColors.neon}
              accessibilityLabel={loadingLabel}
              testID="question-image-spinner"
            />
          ) : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignSelf: 'center',
    width: '86%',
    height: 180,
    borderRadius: SQRadius.md,
    borderWidth: 1.5,
    borderColor: SQColors.glassBorder,
    backgroundColor: 'rgba(9,24,40,0.5)',
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
  placeholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
