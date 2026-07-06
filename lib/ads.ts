import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

import { addLives } from '@/lib/lives';

/**
 * AdMob rewarded-ad integration for the "watch ad → +1 life" reward. Mirrors
 * lib/revenuecat.ts: all react-native-google-mobile-ads usage is contained in
 * this file, the native module is only ever `require`d behind an availability
 * guard, and the module degrades gracefully. Gating is capability-driven, NOT
 * platform-hardcoded: rewarded ads are enabled on any native platform that has
 * a configured rewarded unit id. Android ships with a test-unit fallback so it
 * is always on; iOS has NO production fallback, so it stays DISABLED until the
 * owner supplies EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID_IOS (and a real iOS AdMob
 * App ID in app.json) — then it lights up automatically. In Expo Go, on web,
 * or when the native module is missing it also stays DISABLED and the watch-ad
 * buttons hide themselves — a free life is NEVER granted where a real ad
 * cannot be served.
 *
 * A life is granted ONLY inside the SDK's EARNED_REWARD callback. A dismiss
 * without reward, a load/show failure, or a no-fill grant nothing. The AdMob
 * reward value/item is ignored — the app always grants exactly +1 life itself.
 */

// Google's official Android TEST rewarded unit id — the safe default so dev /
// Expo Go / a preview build without the env var never touch the real unit and
// risk a policy strike. The real unit id is injected ONLY in preview/production
// via EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID (see eas.json); it is never hardcoded.
const TEST_REWARDED_UNIT_ID = 'ca-app-pub-3940256099942544/5224354917';

// Android keeps its test-unit fallback (always has a unit). iOS has NO
// fallback: until EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID_IOS is provided the id is
// empty, so the capability flag below is false and iOS ads stay off.
const REWARDED_UNIT_ID =
  Platform.OS === 'ios'
    ? process.env.EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID_IOS || ''
    : process.env.EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID || TEST_REWARDED_UNIT_ID;

// Expo Go ships no custom native modules, so the SDK is absent there.
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
// Capability-driven: enabled on any native platform that has a rewarded unit
// id configured. Never on web. iOS stays off until its unit id (and real
// AdMob App ID) are supplied, then lights up automatically — no platform
// hardcoding. Matches the RevenueCat capability gating.
const isSupportedPlatform = Platform.OS !== 'web' && !!REWARDED_UNIT_ID;

type GoogleMobileAdsModule = typeof import('react-native-google-mobile-ads');

let adsModule: GoogleMobileAdsModule | null = null;
let enabled = false;

if (isSupportedPlatform && !isExpoGo) {
  try {
    // Lazy require so the native module is never touched in Expo Go / web / Jest.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-google-mobile-ads') as GoogleMobileAdsModule;
    adsModule = mod;
    // Initialize the SDK once (safe to call repeatedly). Fire-and-forget.
    void mod.default().initialize();
    enabled = true;
  } catch {
    // Native module unavailable (e.g. JS running without a prebuild) — stay
    // disabled so callers hide the button and never grant a free life.
    adsModule = null;
    enabled = false;
  }
}

/** True when the rewarded-ad SDK is present (Android device/emulator builds). */
export const adsEnabled = enabled;

/** Outcome of a watch-ad attempt. Only 'granted' means a life was added. */
export type AdRewardResult = 'granted' | 'no-reward' | 'unavailable';

type RewardedOutcome = 'earned' | 'dismissed' | 'failed';

/**
 * Load and present a single rewarded ad. Resolves 'earned' when the user
 * watched to the reward point, 'dismissed' when they closed it early, and
 * 'failed' on a load/show error or no-fill. Resolves EXACTLY ONCE and detaches
 * every listener, so a single tap can never grant twice.
 */
function showRewardedAd(mod: GoogleMobileAdsModule): Promise<RewardedOutcome> {
  const { RewardedAd, RewardedAdEventType, AdEventType } = mod;
  return new Promise<RewardedOutcome>((resolve) => {
    const rewarded = RewardedAd.createForAdRequest(REWARDED_UNIT_ID, {
      requestNonPersonalizedAdsOnly: true,
    });

    let earned = false;
    let settled = false;
    const unsubscribers: (() => void)[] = [];

    const cleanup = () => {
      for (const unsubscribe of unsubscribers) {
        try {
          unsubscribe();
        } catch {
          // Listener already detached — ignore.
        }
      }
      unsubscribers.length = 0;
    };
    const settle = (outcome: RewardedOutcome) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(outcome);
    };

    unsubscribers.push(
      rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
        // Show as soon as the ad is ready.
        try {
          rewarded.show();
        } catch {
          settle('failed');
        }
      }),
    );
    unsubscribers.push(
      rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
        // Reward value/item ignored — the app grants +1 itself once CLOSED.
        earned = true;
      }),
    );
    unsubscribers.push(
      rewarded.addAdEventListener(AdEventType.CLOSED, () => {
        settle(earned ? 'earned' : 'dismissed');
      }),
    );
    unsubscribers.push(
      rewarded.addAdEventListener(AdEventType.ERROR, () => {
        settle('failed');
      }),
    );

    try {
      rewarded.load();
    } catch {
      settle('failed');
    }
  });
}

/**
 * Show a rewarded ad and grant +1 life ONLY if the user earned the reward.
 * Returns 'granted' when a life was added, 'no-reward' when the ad was
 * dismissed early / failed / did not fill, and 'unavailable' when ads can't be
 * served (Expo Go, web, a platform with no configured rewarded unit id, or a
 * missing native module) — in which case nothing is granted and callers should
 * hide the button.
 */
export async function watchAdForLife(): Promise<AdRewardResult> {
  if (!enabled || !adsModule) return 'unavailable';
  const outcome = await showRewardedAd(adsModule);
  if (outcome === 'earned') {
    await addLives(1);
    return 'granted';
  }
  return 'no-reward';
}
