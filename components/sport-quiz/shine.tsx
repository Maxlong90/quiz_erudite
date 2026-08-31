import { useEffect, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { SQColors, SQRadius } from '@/constants/sport-quiz/theme';
import { neonGlow } from '@/components/sport-quiz/ui';

/**
 * The Logo-Quiz "premium shine" mechanic, ported for Sport Quiz — a looping
 * diagonal white sheen sweep plus a scatter of twinkling diamond glints, over a
 * green gradient. Used for the Wheel's Spin CTA (same size as Logo Quiz).
 */

/** Diagonal white sheen sweep (2.2s loop), clipped to the parent. */
function ShineOverlay({ radius = 0 }: { radius?: number }) {
  const progress = useSharedValue(0);
  const width = useSharedValue(0);
  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 2200, easing: Easing.linear }), -1, false);
  }, [progress]);
  const sheenStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(progress.value, [0, 1], [-140, width.value + 140]) },
      { skewX: '-18deg' },
    ],
  }));
  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}
      onLayout={(e) => {
        width.value = e.nativeEvent.layout.width;
      }}
    >
      <Animated.View pointerEvents="none" style={[styles.sheen, sheenStyle]}>
        <LinearGradient colors={['#ffffff00', '#ffffffaa', '#ffffff00']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
    </View>
  );
}

const GLINTS = [
  { left: '14%', top: '30%', size: 7, delay: 0 },
  { left: '82%', top: '26%', size: 6, delay: 500 },
  { left: '70%', top: '62%', size: 8, delay: 1000 },
  { left: '30%', top: '66%', size: 5, delay: 1500 },
] as const;

function Glint({ left, top, size, delay }: { left: string; top: string; size: number; delay: number }) {
  const twinkle = useSharedValue(0);
  useEffect(() => {
    twinkle.value = withDelay(delay, withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, true));
  }, [twinkle, delay]);
  const glintStyle = useAnimatedStyle(() => ({
    opacity: interpolate(twinkle.value, [0, 1], [0.15, 0.9]),
    transform: [{ rotate: '45deg' }, { scale: interpolate(twinkle.value, [0, 1], [0.7, 1]) }],
  }));
  return (
    <Animated.View style={[styles.glint, { left: left as `${number}%`, top: top as `${number}%`, width: size, height: size }, glintStyle]} />
  );
}

function DiamondGlints() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {GLINTS.map((g, i) => (
        <Glint key={i} left={g.left} top={g.top} size={g.size} delay={g.delay} />
      ))}
    </View>
  );
}

/** Green shiny surface (gradient + diamond glints + sheen). Wrap any content. */
export function GreenShinySurface({ children, style, radius = SQRadius.pill }: { children?: ReactNode; style?: StyleProp<ViewStyle>; radius?: number }) {
  return (
    <View style={[{ borderRadius: radius, overflow: 'hidden' }, style]}>
      <LinearGradient colors={['#4CFF9E', '#1FE39C', '#0FB07C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <DiamondGlints />
      <ShineOverlay radius={radius} />
      {children}
    </View>
  );
}

/** The Wheel's Spin CTA — same size as Logo Quiz, green, with diamond sparkle. */
export function SpinButton({ label, onPress, disabled }: { label: ReactNode; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.spinBtn,
        neonGlow(SQColors.neon, 16),
        { opacity: disabled ? 0.5 : 1 },
        pressed && !disabled && { transform: [{ scale: 0.98 }] },
      ]}
    >
      <GreenShinySurface radius={SQRadius.pill} style={styles.spinSurface}>
        {label}
      </GreenShinySurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sheen: { position: 'absolute', top: -20, bottom: -20, width: 70 },
  glint: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 1.5,
    shadowColor: '#FFFFFF',
    shadowOpacity: 0.9,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  spinBtn: { marginTop: 24, borderRadius: SQRadius.pill },
  spinSurface: { paddingVertical: 18, paddingHorizontal: 56, alignItems: 'center', justifyContent: 'center' },
});
