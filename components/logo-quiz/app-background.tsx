import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

/**
 * Soft pastel mesh background shared by every Logo Quiz screen, matching the
 * reference: a periwinkle base with a white radial bloom up top and a pink
 * radial bloom low-centre. Uses real SVG radial gradients (react-native-svg)
 * so the blooms have smooth circular falloff — objectBoundingBox units stretch
 * them to the screen aspect, so they fill any size. Rendered as an absolute
 * fill behind screen content; put it as the first child of a transparent
 * screen container.
 */

/** Base colour behind the gradient (used for stack transitions / loaders). */
export const BG_BASE = '#AEC1F5';

export function AppBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id="lqBase" x1="0" y1="0" x2="0.35" y2="1">
            <Stop offset="0" stopColor="#A8BDF3" />
            <Stop offset="1" stopColor="#B9C3F1" />
          </LinearGradient>
          <RadialGradient id="lqWhite" cx="0.56" cy="0.08" r="0.9">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.96" />
            <Stop offset="0.55" stopColor="#FFFFFF" stopOpacity="0.28" />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="lqPink" cx="0.42" cy="0.87" r="0.8">
            <Stop offset="0" stopColor="#FF83E4" stopOpacity="0.92" />
            <Stop offset="0.5" stopColor="#FF97E7" stopOpacity="0.42" />
            <Stop offset="1" stopColor="#FF97E7" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#lqBase)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#lqPink)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#lqWhite)" />
      </Svg>
    </View>
  );
}
