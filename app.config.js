// Dynamic Expo config. The static base lives in app.json (the erudit app,
// unchanged). This file only diverges when the build is the Logo Quiz variant
// (EXPO_PUBLIC_APP_SLUG=logo-quiz), giving that build App 2's own store identity
// so its RevenueCat / store products resolve. Every other build returns the
// app.json base byte-for-byte, so existing erudit builds are unaffected.
//
// App 2's bundle id / package come from EXPO_PUBLIC_IOS_BUNDLE_ID /
// EXPO_PUBLIC_ANDROID_PACKAGE (set in the logo-quiz eas.json profiles). Until an
// operator supplies them they fall back to the erudit identity — the same
// degraded state described in the task: store products won't resolve, so the
// shop stays fail-closed on device (and local-grants only in Expo Go).
//
// The Expo project `slug` (quiz-erudit) is intentionally NOT changed — it
// identifies the EAS/Expo project, not the store listing; only the store
// identity (bundle id / package / name) diverges per variant.

/** @param {{ config?: any }} params */
module.exports = ({ config } = {}) => {
  // `config` is the resolved app.json `expo` object when Expo loads this file;
  // fall back to reading app.json directly so the file is also runnable/verifiable
  // standalone (e.g. a node smoke test).
  const base = config ?? require('./app.json').expo;

  const appSlug = process.env.EXPO_PUBLIC_APP_SLUG ?? 'erudite-quiz';

  // Flags Quiz variant: give it its OWN Expo project identity (name + slug) so it
  // is a separate app in Expo Go. Sharing the base "quiz-erudit" slug with the
  // logo-quiz build makes the two collide in Expo Go (opening one shows the
  // other's cached bundle). Store identity (bundle id / package) falls back to
  // the erudit identity until an operator supplies flags-quiz values.
  if (appSlug === 'flags-quiz') {
    return {
      ...base,
      name: 'Flags Quiz',
      slug: 'flags-quiz',
      ios: {
        ...base.ios,
        bundleIdentifier: process.env.EXPO_PUBLIC_IOS_BUNDLE_ID || base.ios?.bundleIdentifier,
        // Ship the first Flags Quiz release as iPhone-only — there is no tablet
        // layout yet. Overrides the erudite base (supportsTablet: true) for this
        // variant only; flip back to true once an iPad layout is added.
        supportsTablet: false,
      },
      android: {
        ...base.android,
        package: process.env.EXPO_PUBLIC_ANDROID_PACKAGE || base.android?.package,
      },
    };
  }

  // Coat of Arms variant (App Template): its own Expo project identity (name +
  // slug) so it is a separate app in Expo Go and never shows the erudite/flags
  // cached bundle. Store identity falls back to the erudite identity until an
  // operator supplies coat-of-arms values. Mirrors the flags-quiz branch above.
  if (appSlug === 'coat-of-arms') {
    return {
      ...base,
      name: 'Coat of Arms',
      slug: 'coat-of-arms',
      ios: {
        ...base.ios,
        bundleIdentifier: process.env.EXPO_PUBLIC_IOS_BUNDLE_ID || base.ios?.bundleIdentifier,
        // iPhone-only for now — no tablet layout yet (same as flags-quiz).
        supportsTablet: false,
      },
      android: {
        ...base.android,
        package: process.env.EXPO_PUBLIC_ANDROID_PACKAGE || base.android?.package,
      },
    };
  }

  // Sport Quiz variant (App Template: Sports): its own Expo project identity
  // (name + slug) so it is a separate app in Expo Go and never shows another
  // variant's cached bundle. Store identity falls back to the erudite identity
  // until an operator supplies sport-quiz values. Mirrors the branches above.
  if (appSlug === 'sport-quiz') {
    return {
      ...base,
      name: 'Sport Quiz',
      slug: 'sport-quiz',
      ios: {
        ...base.ios,
        bundleIdentifier: process.env.EXPO_PUBLIC_IOS_BUNDLE_ID || base.ios?.bundleIdentifier,
        // iPhone-only — no iPad layout yet (same as flags-quiz / coat-of-arms).
        supportsTablet: false,
      },
      android: {
        ...base.android,
        package: process.env.EXPO_PUBLIC_ANDROID_PACKAGE || base.android?.package,
      },
    };
  }

  if (appSlug !== 'logo-quiz') {
    return base;
  }

  const iosBundleIdentifier =
    process.env.EXPO_PUBLIC_IOS_BUNDLE_ID || base.ios?.bundleIdentifier;
  const androidPackage =
    process.env.EXPO_PUBLIC_ANDROID_PACKAGE || base.android?.package;

  return {
    ...base,
    name: 'Logo Quiz',
    ios: {
      ...base.ios,
      bundleIdentifier: iosBundleIdentifier,
    },
    android: {
      ...base.android,
      package: androidPackage,
    },
  };
};
