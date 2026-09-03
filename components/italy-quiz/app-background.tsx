import { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Asset } from 'expo-asset';

/**
 * Full-screen background for the Italy Quiz screens: the cartoon-3D Italian
 * landmarks artwork (map of Italy in the flag colours, Leaning Tower, Colosseum,
 * Pantheon, Vespa, grapes, centurion helmet). Rendered as an absolute cover fill
 * behind screen content — put it as the first child of a transparent screen
 * container. `resizeMode="cover"` fills the whole screen edge-to-edge with no
 * letterbox bars (the artwork is cropped slightly at the sides on tall phones).
 */

/** The Italy artwork module — shared so it can be preloaded before it's drawn. */
export const ITALY_BG = require('../../assets/italy-quiz/home-bg.png');

/** Base colour behind the artwork (shown while it warms up / transitions). Matches
 *  the artwork's dusk sky so the reveal is seamless. */
export const BG_BASE = '#7C74C9';

/**
 * Warms the artwork so it is decoded and cached BEFORE a screen reveals its
 * content — otherwise the (heavy) image pops in a beat after the instantly drawn
 * buttons. Screens gate their content on this so background + buttons appear
 * together. Fails open. After the first warm-up the asset is cached, so later
 * mounts resolve fast.
 */
export function useItalyBgReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    Asset.fromModule(ITALY_BG)
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

/** Italian landmarks background — home & settings. Pass `blurRadius` to soften the
 *  artwork; RN Image blurRadius is Expo-Go-safe (no native BlurView). */
export function AppBackground({ blurRadius }: { blurRadius?: number } = {}) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Image
        source={ITALY_BG}
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
