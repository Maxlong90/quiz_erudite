import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Asset } from 'expo-asset';
import { LinearGradient } from 'expo-linear-gradient';

import { SQColors } from '@/constants/sport-quiz/theme';

/**
 * Sport Quiz backdrop. Three arts are bundled:
 *  - 'color' — the colourful sports collage on a blue texture (default).
 *  - 'navy'  — the darker monochrome navy version of the same collage.
 *  - 'deep'  — a plain deep-blue textured backdrop (no collage) for the in-level
 *    quiz screen, so the question/answers read cleanly.
 * Rendered with expo-image (memory-disk cache) so once an art is warmed it paints
 * INSTANTLY on every later mount — no load-in flash when re-entering a screen.
 */
export const SPORT_BG_COLOR = require('../../assets/sport-quiz/backgrounds/sport-bg-color.png');
export const SPORT_BG_NAVY = require('../../assets/sport-quiz/backgrounds/sport-bg.png');
export const SPORT_BG_DEEP = require('../../assets/sport-quiz/backgrounds/sport-bg-deep.png');
export const SPORT_BG = SPORT_BG_COLOR;
export const BG_BASE = SQColors.bgBase;

export type BgVariant = 'color' | 'navy' | 'deep';

function moduleFor(variant: BgVariant) {
  return variant === 'navy' ? SPORT_BG_NAVY : variant === 'deep' ? SPORT_BG_DEEP : SPORT_BG_COLOR;
}

/**
 * Warm a backdrop into expo-image's memory-disk cache. Call it on a screen the
 * user reaches BEFORE the one that shows the art (e.g. the level list warms the
 * quiz 'deep' bg) so the target screen paints its background with no delay.
 */
export function useSportsBgReady(variant: BgVariant = 'color'): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const asset = Asset.fromModule(moduleFor(variant));
        await asset.downloadAsync();
        const uri = asset.localUri ?? asset.uri;
        if (uri) await Image.prefetch(uri, { cachePolicy: 'memory-disk' });
      } catch {
        // best-effort warm — the <Image> below still loads normally
      }
      if (alive) setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, [variant]);
  return ready;
}

export function AppBackground({ variant = 'color', dim = false }: { variant?: BgVariant; dim?: boolean }) {
  const src = moduleFor(variant);
  // The 'deep' art is already a finished, evenly-lit backdrop — skip the collage
  // legibility scrim so it stays a clean flat blue.
  const isDeep = variant === 'deep';
  // Base fill painted BEHIND the art so there is no flash before the image
  // decodes. For 'deep' it matches the art's own average blue (#0B365B) so any
  // load delay is imperceptible; other variants use the dark navy base.
  const base = isDeep ? '#0B365B' : BG_BASE;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[StyleSheet.absoluteFill, { backgroundColor: base }]} />
      <Image
        source={src}
        style={styles.img}
        contentFit="cover"
        cachePolicy="memory-disk"
        priority="high"
        transition={0}
      />
      {/* Light legibility scrim — gentle darken at top/bottom only. */}
      {!isDeep && (
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
      )}
      {dim && <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(6,16,26,0.55)' }]} />}
    </View>
  );
}

const styles = StyleSheet.create({
  img: { width: '100%', height: '100%' },
});
