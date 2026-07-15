// Web stub for lib/ads (Metro resolves *.web.ts ahead of *.ts on web).
// The web bundle must not pull in the native-only react-native-google-mobile-ads
// SDK. Rewarded ads don't exist on web, so the capability is off and watching an
// ad is a no-op — mirroring the disabled branch of the native module.
export const adsEnabled = false;

export type AdRewardResult = 'granted' | 'no-reward' | 'unavailable';

export async function watchAdForLife(): Promise<AdRewardResult> {
  return 'unavailable';
}
