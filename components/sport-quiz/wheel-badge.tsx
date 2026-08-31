import { useEffect } from 'react';
import { Image, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { SQColors } from '@/constants/sport-quiz/theme';

/** Wheel-of-fortune icon (the Logo Quiz wheel art) — the "free spin ready" cue. */
export function WheelMark({ size = 30 }: { size?: number }) {
  return <Image source={require('../../assets/sport-quiz/wheel-icon.png')} style={{ width: size, height: size }} resizeMode="contain" />;
}

/** A pulsing "!" alert dot — PINK (not red), matching the 500-coin magenta. */
export function WheelAlertDot({
  pulse = false,
  size = 18,
  style,
}: {
  pulse?: boolean;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const scale = useSharedValue(1);
  useEffect(() => {
    if (!pulse) return;
    scale.value = withRepeat(withTiming(1.28, { duration: 650, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [pulse, scale]);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse ? scale.value : 1 }] }));

  return (
    <Animated.View
      style={[styles.dot, { width: size, height: size, borderRadius: size / 2 }, animStyle, style]}
    >
      <Text style={[styles.bang, { fontSize: size * 0.68, lineHeight: size * 0.82 }]}>!</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  dot: {
    backgroundColor: SQColors.neonPink,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  bang: { color: '#FFFFFF', fontWeight: '900' },
});
