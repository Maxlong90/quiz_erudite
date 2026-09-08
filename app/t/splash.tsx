import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { ScreenBackground } from '@/components/screen-background';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useThemeColors } from '@/hooks/use-theme-colors';

/**
 * Splash for the configurable template, and the engine's NETWORK WINDOW.
 *
 * It holds for a brand floor and, within a hard cap, waits for the theme engine
 * to settle its cache read and its conditional GET. What that buys is one thing:
 * on a FIRST-EVER launch the very first painted screen already carries the
 * operator's colours, instead of flashing the bundled erudite palette and then
 * flipping to the real one a moment later. On every later launch the wait is
 * free — a 304 resolves well inside the floor.
 *
 * Two independent timers rather than a Promise.race, for the same reason as the
 * Sport Quiz splash: the gates being waited on live in React STATE, which a
 * promise chain captured in a mount-once effect could never observe.
 *
 * The numbers are smaller than Sport Quiz's 3000/6000 because what is awaited is
 * a ~600-byte conditional GET, not a multi-megabyte image batch.
 */
const T_SPLASH_FLOOR_MS = 1500;
/**
 * Hard cap. Above THEME_FETCH_TIMEOUT_MS (2500) on purpose, so the fetch's own
 * timeout is the normal exit on a black-hole network and this stays a backstop
 * that nothing can cancel.
 */
const T_SPLASH_CAP_MS = 3500;

export default function TTemplateSplash() {
  const colors = useThemeColors();
  const appTheme = useAppTheme();

  // Rendered without the provider (or on a build where the engine is inert)
  // there is nothing to wait for, so both gates read as already settled.
  const hydrated = appTheme?.hydrated ?? true;
  const networkSettled = appTheme?.networkSettled ?? true;

  const [floorDone, setFloorDone] = useState(false);
  const [capped, setCapped] = useState(false);
  const navigated = useRef(false);

  useEffect(() => {
    const floorTimer = setTimeout(() => setFloorDone(true), T_SPLASH_FLOOR_MS);
    const capTimer = setTimeout(() => setCapped(true), T_SPLASH_CAP_MS);
    return () => {
      clearTimeout(floorTimer);
      clearTimeout(capTimer);
      // Unmounted: never navigate from under a screen that is already gone.
      navigated.current = true;
    };
  }, []);

  useEffect(() => {
    if (navigated.current) return;
    // Fail-open is absolute here: `networkSettled` flips on ANY settlement,
    // including a timeout or an outright failure, and the cap fires regardless.
    if (!capped && !(floorDone && hydrated && networkSettled)) return;
    navigated.current = true;
    router.replace('/t');
  }, [floorDone, capped, hydrated, networkSettled]);

  return (
    <ScreenBackground>
      <View style={styles.center}>
        <Text style={[styles.wordmark, { color: colors.accent }]}>QUIZ</Text>
        <Text style={[styles.tagline, { color: colors.textMuted }]}>Configurable template</Text>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  wordmark: { fontSize: 56, fontWeight: '900', letterSpacing: 4 },
  tagline: { marginTop: 12, fontSize: 16, fontWeight: '600', letterSpacing: 0.4 },
});
