import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';

// How long the Android system navigation bar stays visible after the user
// swipes it up before we hide it again (milliseconds).
const AUTO_HIDE_DELAY = 3000;

/**
 * Puts the Android system navigation bar (Back / Home / Recent) into a
 * sticky-immersive mode across every screen: hidden by default, revealed as
 * a transient overlay when the user swipes up from the bottom edge, then
 * auto-hidden again after AUTO_HIDE_DELAY.
 *
 * No-op on iOS/web. Guarded with catch() so it's harmless in Expo Go where
 * the native module may be absent — the immersive behavior only takes effect
 * in a dev/production build.
 */
export function useImmersiveNavBar() {
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    let hideTimer: ReturnType<typeof setTimeout> | null = null;

    const hide = () => {
      NavigationBar.setVisibilityAsync('hidden').catch(() => {});
    };

    const clearTimer = () => {
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
    };

    // Transient overlay bars that appear on a bottom-edge swipe, hidden base state.
    NavigationBar.setBehaviorAsync('overlay-swipe').catch(() => {});
    hide();

    // When the bar becomes visible (user swiped up) start the countdown to
    // hide it again; when it goes back to hidden, cancel any pending timer.
    const visibilitySub = NavigationBar.addVisibilityListener(({ visibility }) => {
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
