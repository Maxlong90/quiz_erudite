import type { ContentSnapshot } from '@/lib/content-cache';

/**
 * The bits of the snapshot's `app` config this helper reads. Kept to just the
 * store-URL fields (a `Pick` of the full snapshot type) so callers can pass
 * `snapshot?.app` directly while tests can pass minimal fixtures.
 */
type AppConfig = Pick<ContentSnapshot['app'], 'app_url_ios' | 'app_url_android'> | null | undefined;

// DEFAULT store identifiers. Used whenever the per-app snapshot fields are
// empty or unparseable, so apps whose store URLs haven't been filled in yet
// keep the exact pre-existing behavior instead of regressing to a broken link.
const APP_BUNDLE_ID = 'com.quizzzes.erudite';
const DEFAULT_IOS_APP_ID = '0000000000';
const DEFAULT_APP_STORE_URL = `https://apps.apple.com/app/id${DEFAULT_IOS_APP_ID}`;
const DEFAULT_PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${APP_BUNDLE_ID}`;

export interface StoreLinks {
  /** Public listing URL — used for Share / Recommend. */
  storeUrl: string;
  /** Deep link that opens the native "write a review" flow. */
  rateDeepLink: string;
  /** Where to send the user if the review deep link cannot open (= storeUrl). */
  rateFallbackUrl: string;
}

function trimmed(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Extracts the Android package id from a Play Store listing URL's `?id=`
 * query parameter. Falls back to the DEFAULT bundle id when the URL is
 * empty or carries no parseable package.
 */
export function getAndroidPackage(app: AppConfig): string {
  const match = trimmed(app?.app_url_android).match(/[?&]id=([^&]+)/);
  return match ? match[1] : APP_BUNDLE_ID;
}

function iosLinks(app: AppConfig): StoreLinks {
  const url = trimmed(app?.app_url_ios);
  // Keep whatever listing URL the operator entered for Share/Recommend, but
  // only derive the review deep link from a parseable numeric App Store id.
  const storeUrl = url || DEFAULT_APP_STORE_URL;
  const idMatch = url.match(/id(\d+)/);
  const appId = idMatch ? idMatch[1] : DEFAULT_IOS_APP_ID;
  return {
    storeUrl,
    rateDeepLink: `itms-apps://itunes.apple.com/app/id${appId}?action=write-review`,
    rateFallbackUrl: storeUrl,
  };
}

function androidLinks(app: AppConfig): StoreLinks {
  const url = trimmed(app?.app_url_android);
  const storeUrl = url || DEFAULT_PLAY_STORE_URL;
  return {
    storeUrl,
    rateDeepLink: `market://details?id=${getAndroidPackage(app)}`,
    rateFallbackUrl: storeUrl,
  };
}

/**
 * Builds the store links for the current platform from the app config
 * carried in the content snapshot. Pure by design — the platform is passed
 * in (rather than importing react-native's `Platform`) so it stays trivially
 * unit-testable. Falls back to the historical hardcoded identifiers whenever
 * a field is missing or unparseable, so store links never break.
 */
export function getStoreLinks(app: AppConfig, platformOS: string): StoreLinks {
  return platformOS === 'ios' ? iosLinks(app) : androidLinks(app);
}
