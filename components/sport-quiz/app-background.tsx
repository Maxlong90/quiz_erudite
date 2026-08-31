import { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Asset } from 'expo-asset';
import { LinearGradient } from 'expo-linear-gradient';

import { SQColors } from '@/constants/sport-quiz/theme';

/**
 * Sport Quiz backdrop. Two arts are bundled while the look is being chosen:
 *  - 'color' — the colourful sports collage on a blue texture (default).
 *  - 'navy'  — the darker monochrome navy version of the same collage.
 * Shared by every Sport Quiz screen so the whole app reads as one surface. A
 * light legibility scrim keeps the art vibrant while lifting text/buttons off it.
 */
export const SPORT_BG_COLOR = require('../../assets/sport-quiz/backgrounds/sport-bg-color.png');
export const SPORT_BG_NAVY = require('../../assets/sport-quiz/backgrounds/sport-bg.png');
export const SPORT_BG = SPORT_BG_COLOR;
export const BG_BASE = SQColors.bgBase;

export type BgVariant = 'color' | 'navy';

/** Pre-warm the image cache so the first paint isn't a white/navy flash. */
export function useSportsBgReady(variant: BgVariant = 'color'): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    Asset.fromModule(variant === 'navy' ? SPORT_BG_NAVY : SPORT_BG_COLOR)
      .downloadAsync()
      .then(() => alive && setReady(true))
      .catch(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, [variant]);
  return ready;
}

export function AppBackground({ variant = 'color', dim = false }: { variant?: BgVariant; dim?: boolean }) {
  const src = variant === 'navy' ? SPORT_BG_NAVY : SPORT_BG_COLOR;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[StyleSheet.absoluteFill, { backgroundColor: BG_BASE }]} />
      <Image source={src} style={styles.img} resizeMode="cover" />
      {/* Light legibility scrim — gentle darken at top/bottom only. */}
      <LinearGradient
        colors={[
          'rgba(8,21,33,0.30)',
          'rgba(8,21,33,0.0)',
          'rgba(8,21,33,0.0)',
          'rgba(8,21,33,0.5)',
        ]}
        locations={[0, 0.2, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />
      {dim && <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(6,16,26,0.55)' }]} />}
    </View>
  );
}

const styles = StyleSheet.create({
  img: { width: '100%', height: '100%' },
});
