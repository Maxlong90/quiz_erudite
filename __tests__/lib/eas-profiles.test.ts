/**
 * Invariants for the EAS build profiles (eas.json) that decide each app's STORE
 * IDENTITY. These are not style checks: every assertion here corresponds to a
 * way a release build can silently lose the ability to charge.
 *
 * A RevenueCat public key belongs to exactly ONE RevenueCat project, and
 * StoreKit resolves products by the BINARY's bundle id. So a profile carrying
 * another app's key, or a bundle id that doesn't match the App Store Connect app
 * the products were provisioned against, produces an EMPTY catalog rather than
 * an error — the failure mode is silence, which is why it is pinned by tests.
 *
 * Sport Quiz's RevenueCat iOS key is still an operator step (the value lives in
 * the backend's `apps.revenuecat_apple_public_api_key` and in the RevenueCat
 * dashboard, and is deliberately not committed anywhere in this repo). These
 * tests are written so that pasting the REAL key keeps them green, while pasting
 * something malformed — or filling only ONE of the two mirrored profiles —
 * fails.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

interface EasProfile {
  channel?: string;
  distribution?: string;
  env?: Record<string, string>;
}

const easJson = JSON.parse(
  readFileSync(join(__dirname, '..', '..', 'eas.json'), 'utf8'),
) as { build: Record<string, EasProfile> };

const profiles = easJson.build;
const envOf = (name: string): Record<string, string> => profiles[name]?.env ?? {};

/** A placeholder an operator has not filled in yet. lib/revenuecat.ts treats these as "no key". */
const isPlaceholder = (value: string) => value.startsWith('REPLACE_WITH_');

const ERUDITE_ANDROID_KEY = 'goog_hFgRbNrOlUHcMtKClkwWcYIBLvd';
const ERUDITE_IOS_KEY = 'appl_jyYmIsbOlESyBjTzHvVvzcSVKYf';
const ERUDITE_BUNDLE_ID = 'com.quizzzes.erudite';

/** The App Store Connect app the sportquiz_coins_* consumables were provisioned against. */
const SPORT_QUIZ_BUNDLE_ID = 'com.quizzzes.sport';

const SPORT_QUIZ_PROFILES = ['sport-quiz-preview', 'sport-quiz-production'];
const SIBLING_PROFILES = [
  'logo-quiz-preview',
  'logo-quiz-production',
  ...SPORT_QUIZ_PROFILES,
];

describe('store keys are either real keys or explicit placeholders', () => {
  // A key that is neither (a typo, a truncated paste, a leftover value) would
  // configure the SDK with garbage. lib/revenuecat.ts rejects it at runtime by
  // prefix; this catches it at review time.
  it.each(Object.keys(profiles))('%s carries no malformed store key', (name) => {
    const env = envOf(name);
    const androidKey = env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;
    const iosKey = env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;

    if (androidKey !== undefined) {
      expect(androidKey.startsWith('goog_') || isPlaceholder(androidKey)).toBe(true);
    }
    if (iosKey !== undefined) {
      expect(iosKey.startsWith('appl_') || isPlaceholder(iosKey)).toBe(true);
    }
  });
});

describe('no sibling app inherits the Erudite store identity', () => {
  // The bug this guards: a sibling build pointing at Erudite's RevenueCat
  // project (empty catalog + foreign install events) or shipping under
  // Erudite's bundle id.
  it.each(SIBLING_PROFILES)('%s uses its own keys and bundle id', (name) => {
    const env = envOf(name);
    expect(env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY).not.toBe(ERUDITE_ANDROID_KEY);
    expect(env.EXPO_PUBLIC_REVENUECAT_IOS_KEY).not.toBe(ERUDITE_IOS_KEY);
    expect(env.EXPO_PUBLIC_IOS_BUNDLE_ID).not.toBe(ERUDITE_BUNDLE_ID);
    // A sibling profile must set its own slug, or it builds the Erudite app.
    expect(env.EXPO_PUBLIC_APP_SLUG).toBeTruthy();
    expect(env.EXPO_PUBLIC_APP_SLUG).not.toBe('erudite-quiz');
  });

  it('keeps the Erudite profiles on their own real keys', () => {
    for (const name of ['preview', 'production']) {
      const env = envOf(name);
      expect(env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY).toBe(ERUDITE_ANDROID_KEY);
      expect(env.EXPO_PUBLIC_REVENUECAT_IOS_KEY).toBe(ERUDITE_IOS_KEY);
    }
  });
});

describe('Sport Quiz profiles', () => {
  it.each(SPORT_QUIZ_PROFILES)('%s builds the sport-quiz app', (name) => {
    expect(profiles[name]).toBeDefined();
    expect(envOf(name).EXPO_PUBLIC_APP_SLUG).toBe('sport-quiz');
  });

  it.each(SPORT_QUIZ_PROFILES)(
    '%s ships the bundle id the ASC consumables were provisioned against',
    (name) => {
      // StoreKit resolves sportquiz_coins_* by the binary's bundle id. A wrong
      // value here yields an empty catalog with no error at all.
      expect(envOf(name).EXPO_PUBLIC_IOS_BUNDLE_ID).toBe(SPORT_QUIZ_BUNDLE_ID);
    },
  );

  it.each(SPORT_QUIZ_PROFILES)(
    '%s carries NO Android RevenueCat key — there is no Google Play catalog',
    (name) => {
      // Omitted on purpose: with no committed key for this slug either, Android
      // keeps billing disabled and coin purchases fail closed instead of being
      // granted for free. A placeholder here would re-enable the SDK.
      expect(envOf(name).EXPO_PUBLIC_REVENUECAT_ANDROID_KEY).toBeUndefined();
    },
  );

  it('keeps preview and production on an IDENTICAL store identity', () => {
    // The live risk while the iOS key is an unfilled operator step: pasting the
    // real key into one profile and leaving the other on the placeholder, which
    // ships a TestFlight build that cannot sell anything.
    const [preview, production] = SPORT_QUIZ_PROFILES.map(envOf);
    for (const key of [
      'EXPO_PUBLIC_APP_SLUG',
      'EXPO_PUBLIC_REVENUECAT_IOS_KEY',
      'EXPO_PUBLIC_IOS_BUNDLE_ID',
      'EXPO_PUBLIC_ANDROID_PACKAGE',
    ]) {
      expect([key, preview[key]]).toEqual([key, production[key]]);
    }
  });
});
