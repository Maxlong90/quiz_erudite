import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import type * as NavigationBarModule from 'expo-navigation-bar';

// How long the Android system navigation bar stays visible after the user
// swipes it up before we hide it again (milliseconds).
const AUTO_HIDE_DELAY = 3000;

// expo-navigation-bar resolves its native binding EAGERLY at import time
// (ExpoNavigationBar.android.js runs `requireNativeModule('ExpoNavigationBar')`
// at module scope), which throws synchronously when the module isn't linked into
// the binary — Expo Go, or a dev build that predates the dependency. A static
// `import` would therefore crash the whole app at load (white screen) before any
// effect runs, and a Promise `.catch()` can't help. So require it defensively:
// if the native binding is missing we degrade to a no-op instead of crashing.
let NavigationBar: typeof NavigationBarModule | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  NavigationBar = require('expo-navigation-bar');
} catch {
  NavigationBar = null;
}

/**
 * Puts the Android system navigation bar (Back / Home / Recent) into a
 * sticky-immersive mode across every screen: hidden by default, revealed as
 * a transient overlay when the user swipes up from the bottom edge, then
 * auto-hidden again after AUTO_HIDE_DELAY.
 *
 * No-op on iOS/web, and no-op when the expo-navigation-bar native module is
 * absent (see the guarded require above) — the immersive behavior only takes
 * effect in a build that actually links the module.
 */
export function useImmersiveNavBar() {
  useEffect(() => {
    if (Platform.OS !== 'android' || !NavigationBar) return;
    const nav = NavigationBar;

    let hideTimer: ReturnType<typeof setTimeout> | null = null;

    const clearTimer = () => {
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
    };

    const hide = () => {
      nav.setVisibilityAsync('hidden').catch(() => {});
    };

    // Transient overlay bars that appear on a bottom-edge swipe, hidden base state.
    nav.setBehaviorAsync('overlay-swipe').catch(() => {});
    hide();

    // When the bar becomes visible (user swiped up) start the countdown to
    // hide it again; when it goes back to hidden, cancel any pending timer.
    const visibilitySub = nav.addVisibilityListener(({ visibility }) => {
      clearTimer();
      if (visibility === 'visible') {
        hideTimer = setTimeout(hide, AUTO_HIDE_DELAY);
      }
    });

    // Returning to the app (e.g. after multitasking) can restore the bar;
    // re-hide so the immersive state stays consistent across the whole app.
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') hide();
    });

    return () => {
      clearTimer();
      visibilitySub.remove();
      appStateSub.remove();
    };
  }, []);
}
