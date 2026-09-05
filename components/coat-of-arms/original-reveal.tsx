import { StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Image } from 'expo-image';

/**
 * How long the original takes to develop in. It starts on the same beat as the
 * note/"Next" button but runs SLOWER, so it is still developing after the UI has
 * settled and pulls the eye back up to the picture.
 */
export const COAT_REVEAL_MS = 600;

interface CoatOriginalRevealProps {
  /** The archived master artwork — the coat that still carries the name. */
  uri: string;
  /** Side of the square picture box; must match the base coat exactly. */
  size: number;
  /** Delay before the dissolve starts — normally the answer glide (MOVE_MS). */
  delayMs: number;
  testID?: string;
}

/**
 * The reward overlay: the ORIGINAL coat of arms — the one that still shows the
 * country name on its banner — dissolves in ON TOP of the played (cleaned) coat
 * after a correct answer. Shared by BOTH modes: "All countries" reveals it on
 * the question plate (app/coat-of-arms/quiz.tsx), "By continent" on the
 * surviving correct option (app/coat-of-arms/continent-quiz.tsx).
 *
 * Only fires where the backend ships an original — 64 of 195 countries have
 * archived master artwork, so most answers reveal nothing at all. A missing
 * original is NOT an error and NOT a loading state: the caller simply doesn't
 * render this component.
 *
 * TWO THINGS THAT LOOK LIKE STYLE BUT ARE LOAD-BEARING:
 *
 * 1. This is an OVERLAY, never a cross-fade — the played coat stays FULLY
 *    OPAQUE underneath. Both layers are the same artwork at the same geometry,
 *    so holding the base opaque keeps the picture solid all the way through and
 *    only the banner text "develops" in. A true cross-fade would dip the
 *    composite to ~75% alpha at the midpoint over the white plate (a visible
 *    flicker) and, more importantly, an original that fails to load would fade
 *    the picture away to nothing. A linked origin with no stored master 404s and
 *    never falls back to the clean image, so stacking is what degrades a failed
 *    load to "no visible change".
 *
 * 2. Mount it as the last child of a container sized to the PICTURE BOX itself,
 *    never of a padded frame. An absolutely positioned child resolves against
 *    the parent's padding box and skips its padding, so an overlay pinned to a
 *    padded frame comes out larger than the base image and the two coats stop
 *    registering pixel-for-pixel.
 *
 * Key it by question id at the call site so the entering animation re-fires on
 * every question.
 */
export function CoatOriginalReveal({
  uri,
  size,
  delayMs,
  testID = 'coat-image-original',
}: CoatOriginalRevealProps) {
  return (
    <Animated.View
      style={styles.coatReveal}
      pointerEvents="none"
      entering={FadeIn.delay(delayMs).duration(COAT_REVEAL_MS)}
    >
      <Image
        source={{ uri }}
        style={{ width: size, height: size }}
        contentFit="contain"
        transition={0}
        testID={testID}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  /** Covers the picture box exactly — see the note on point 2 above. */
  coatReveal: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
});
