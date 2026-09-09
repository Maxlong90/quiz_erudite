import { useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { ScreenBackground } from '@/components/screen-background';
import { T_ASSET_SLOTS } from '@/constants/t/asset-slots';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useOnboarding } from '@/hooks/use-onboarding';
import { useLiveOnboardingType } from '@/hooks/t/use-onboarding-type';
import { useTemplateTheme } from '@/hooks/t/use-template-theme';
import { showsOnboarding } from '@/lib/onboarding/onboarding-type';

/**
 * Splash for the configurable template, the engine's NETWORK WINDOW, and the
 * INTRO GATE — the one place that decides whether the onboarding stack is
 * entered at all.
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
  const colors = useTemplateTheme();
  const appTheme = useAppTheme();
  const { hasSeen } = useOnboarding();
  /**
   * LIVE, never the frozen hook. This screen is mounted before the engine
   * settles — that wait is its entire job — so a frozen read here would capture
   * INITIAL_STATE's default on every launch and make `none` unreachable without
   * a single visible symptom. hooks/t/use-onboarding-type.ts documents the split.
   */
  const onboardingType = useLiveOnboardingType();

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
    // `hasSeen` picks the DESTINATION; it is deliberately not a fourth gate.
    // Making it one would stall the splash on a slow or broken storage read and
    // cost the screen the fail-open property it is built around. Hence the
    // explicit `=== false`: `null` means the read has not resolved (or threw),
    // and the safe direction is home — a returning player must never be dropped
    // back into onboarding because storage hiccuped.
    //
    // `onboarding_type: none` REFINES THE SAME DESTINATION, and is likewise not
    // a gate: the splash leaves at the identical moment either way. There is no
    // empty onboarding screen and no stack to skip through — the stack is simply
    // never entered, which is why `none` has no entry in T_ONBOARDING_VARIANTS.
    //
    // NOTHING IS PERSISTED WHEN THE INTRO IS SKIPPED. markSeen() stays the sole
    // business of app/t/onboarding.tsx. Writing the flag here would record a lie
    // (this player has NOT seen the intro) and, worse, would make a later
    // operator flip from `none` back to `classic` permanently invisible on every
    // device that had already launched once. Recomputing each launch is what lets
    // that flip reach installed devices on their next start.
    //
    // Fail-open, exactly as the palette is: if the hard cap fired before the
    // engine settled, this reads T_ONBOARDING_DEFAULT and a `none` build shows
    // the intro for one launch, with the cache warm by the next. Holding the
    // splash open to be certain about the intro is the worse trade.
    const toOnboarding = hasSeen === false && showsOnboarding(onboardingType);
    router.replace(toOnboarding ? '/t/onboarding' : '/t');
  }, [floorDone, capped, hydrated, networkSettled, hasSeen, onboardingType]);

  return (
    <ScreenBackground>
      <View style={styles.center}>
        {/* The staged pack's logo. Which bytes these are was decided at build
            time by the copy into assets/t/ — see constants/t/asset-slots.ts. */}
        <Image
          source={T_ASSET_SLOTS['splash/logo.png']}
          style={styles.logo}
          resizeMode="contain"
          testID="t-splash-logo"
        />
        <Text style={[styles.wordmark, { color: colors.accent }]}>QUIZ</Text>
        <Text style={[styles.tagline, { color: colors.textMuted }]}>Configurable template</Text>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  logo: { width: 128, height: 128, marginBottom: 20 },
  wordmark: { fontSize: 56, fontWeight: '900', letterSpacing: 4 },
  tagline: { marginTop: 12, fontSize: 16, fontWeight: '600', letterSpacing: 0.4 },
});
