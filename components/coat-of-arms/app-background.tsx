import { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Asset } from 'expo-asset';

/**
 * Background for the Coat of Arms screens.
 *
 * AppBackground: the spiral-of-coats artwork (9:16) generated for this app — the
 * home & settings background. Mirrors the Flags Quiz background component exactly
 * (absolute cover fill, warm-up gate), only the artwork differs so the whole
 * Coat of Arms flow reuses the Flags Quiz screens/buttons unchanged.
 */

/** The coats artwork module — shared so it can be preloaded before it's drawn. */
export const COAT_BG = require('../../assets/coat-of-arms/coat-of-arms-bg.png');

/** Base colour behind the coats artwork (shown while it warms up / transitions). */
export const BG_BASE = '#0B54BC';

/**
 * Warms the coats artwork so it is decoded and cached BEFORE a screen reveals its
 * content — otherwise the (heavy) image pops in a beat after the instantly drawn
 * buttons. Screens gate their content on this so background + buttons appear
 * together. Fails open. After the first warm-up the asset is cached, so later
 * mounts resolve fast.
 */
export function useCoatBgReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    Asset.fromModule(COAT_BG)
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

/** Spiral-of-coats background — home & settings. Pass `blurRadius` to soften the
 *  artwork; RN Image blurRadius is Expo-Go-safe (no native BlurView). */
export function AppBackground({ blurRadius }: { blurRadius?: number } = {}) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Image
        source={COAT_BG}
        style={styles.image}
        resizeMode="cover"
        fadeDuration={0}
        blurRadius={blurRadius}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  image: { width: '100%', height: '100%' },
});
