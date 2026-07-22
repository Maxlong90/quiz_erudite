/**
 * Web build of lib/ads. Rewarded ads (react-native-google-mobile-ads) are a
 * native-only capability and the package imports React Native internals that
 * cannot be bundled for web. Metro resolves this `.web.ts` variant on web so
 * the native module is never pulled into the web bundle. Behaviour matches the
 * native module's web/Expo-Go path: ads are always DISABLED, the watch-ad
 * buttons hide themselves, and no life is ever granted.
 *
 * Keep this in sync with the public surface of lib/ads.ts (adsEnabled,
 * AdRewardResult, watchAdForLife).
 */

/** Rewarded ads are never available on web. */
export const adsEnabled = false;

/** Outcome of a watch-ad attempt. Only 'granted' means a life was added. */
export type AdRewardResult = 'granted' | 'no-reward' | 'unavailable';

/** No ad can be served on web — always resolves 'unavailable', grants nothing. */
export async function watchAdForLife(): Promise<AdRewardResult> {
  return 'unavailable';
}
