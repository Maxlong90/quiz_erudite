import { Image, StyleSheet, useWindowDimensions, View } from 'react-native';

/**
 * Decorative band of real brand logos massed along the bottom of the Welcome
 * screen. A single edge-to-edge PNG (background already knocked out to
 * transparency, with a soft top fade) so it sits cleanly over the pastel screen
 * background. Purely visual; pointer events pass through.
 */

// Artwork is 1028×382. react-native-web ignores aspectRatio on <img>, so we
// derive an explicit height from the live window width.
const STRIP_RATIO = 382 / 1028;

export function BrandStrip() {
  const { width } = useWindowDimensions();
  return (
    <View style={styles.wrap} pointerEvents="none">
      <Image
        source={require('../../assets/logo-quiz/brand-strip.png')}
        style={{ width, height: Math.round(width * STRIP_RATIO) }}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});
