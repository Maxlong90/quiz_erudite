import { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Asset } from 'expo-asset';

import { FQColors } from '@/constants/flags-quiz/theme';

/**
 * Backgrounds for the Flags Quiz screens.
 *
 * - AppBackground: the spiral-of-flags artwork — the home & settings background.
 * - GradientBackground: a plain vertical blue gradient (light sky blue at the top
 *   → deep blue at the bottom) — the Play screen background.
 *
 * Both render as an absolute cover fill behind screen content; put them as the
 * first child of a transparent screen container.
 */

/** The flags artwork module — shared so it can be preloaded before it's drawn. */
export const FLAGS_BG = require('../../assets/flags-quiz/flags-bg.png');

/** Base colour behind the flags artwork (shown while it warms up / transitions). */
export const BG_BASE = '#0B54BC';

/**
 * Warms the flags artwork so it is decoded and cached BEFORE a screen reveals its
 * content — otherwise the (heavy) image pops in a beat after the instantly drawn
 * buttons. Screens gate their content on this so background + buttons appear
 * together. Fails open. After the first warm-up the asset is cached, so later
 * mounts resolve fast.
 */
export function useFlagsBgReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    Asset.fromModule(FLAGS_BG)
      .downloadAsync()
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return ready;
}

/** Spiral-of-flags background — home & settings. Pass `blurRadius` to soften the
 *  artwork (used by the result screen for a frosted look); RN Image blurRadius is
 *  Expo-Go-safe (no native BlurView). */
export function AppBackground({ blurRadius }: { blurRadius?: number } = {}) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Image
        source={FLAGS_BG}
        style={styles.image}
        resizeMode="cover"
        fadeDuration={0}
        blurRadius={blurRadius}
      />
    </View>
  );
}

/** Plain vertical blue gradient — the Play screen. Draws instantly (no preload). */
export function GradientBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={[FQColors.bgTop, FQColors.bgMid, FQColors.bgBottom]}
        locations={[0, 0.5, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  image: { width: '100%', height: '100%' },
});
