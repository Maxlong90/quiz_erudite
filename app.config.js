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
const buildConfig = ({ config } = {}) => {
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
      // Flags Quiz's OWN launcher / Expo Go icon (the four-flags "?" mark from the
      // backend), so it never shows the erudite base's logo-quiz icon. Overrides
      // both the top-level icon (iOS + Expo Go project screen) and the Android
      // adaptive foreground for this variant only.
      icon: './assets/images/flags-quiz-icon.png',
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
        adaptiveIcon: {
          ...base.android?.adaptiveIcon,
          foregroundImage: './assets/images/flags-quiz-icon.png',
        },
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
      // Coat of Arms' OWN launcher / Expo Go icon (the crest from the backend),
      // so it never shows the erudite base's logo-quiz icon. Overrides both the
      // top-level icon (iOS + Expo Go project screen) and the Android adaptive
      // foreground for this variant only.
      icon: './assets/images/coat-of-arms-icon.png',
      ios: {
        ...base.ios,
        bundleIdentifier: process.env.EXPO_PUBLIC_IOS_BUNDLE_ID || base.ios?.bundleIdentifier,
        // iPhone-only for now — no tablet layout yet (same as flags-quiz).
        supportsTablet: false,
      },
      android: {
        ...base.android,
        package: process.env.EXPO_PUBLIC_ANDROID_PACKAGE || base.android?.package,
        adaptiveIcon: {
          ...base.android?.adaptiveIcon,
          foregroundImage: './assets/images/coat-of-arms-icon.png',
        },
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

  // Italy Quiz variant (App Template: World, backend slug
  // `italy-history-and-geography-quiz`): its own Expo project identity (name +
  // slug) so it is a separate app in Expo Go and never shows another variant's
  // cached bundle. Store identity falls back to the erudite identity until an
  // operator supplies italy-quiz values. Mirrors the branches above.
  if (appSlug === 'italy-history-and-geography-quiz') {
    // Strip the EAS-Update fields from the base config for this variant. A pinned
    // `runtimeVersion` (committed for the erudite iOS OTA builds) + `updates` +
    // an `extra.eas` link make Expo Go treat the project as an updates-enabled app
    // and demand an account sign-in ("You need to be signed in to Expo Go…"),
    // which the offline dev server can't satisfy. Italy Quiz has no EAS build yet,
    // so dropping them here yields a plain, Expo-Go-friendly dev manifest without
    // affecting any other variant. Re-add proper eas/runtimeVersion once Italy
    // Quiz gets its own EAS build.
    const { runtimeVersion, updates, ...baseNoUpdates } = base;
    const extra = { ...(base.extra || {}) };
    delete extra.eas;
    return {
      ...baseNoUpdates,
      extra,
      name: 'Italy Quiz',
      slug: 'italy-quiz',
      // Scope the Expo Go dev manifest to the tester's personal account so the
      // account-signed-in device can open it. iOS Expo Go opens a self-hosted
      // (non-exp.direct) dev tunnel only when the manifest's owner matches the
      // account the device is signed into AND the dev server (CLI) is signed into
      // that same account (we start Metro with that account's EXPO_TOKEN). Set via
      // env so it isn't hard-coded to one tester: EXPO_DEV_OWNER, default the
      // current tester `uladushka`. Not used by any store build.
      owner: process.env.EXPO_DEV_OWNER || 'uladushka',
      ios: {
        ...base.ios,
        bundleIdentifier: process.env.EXPO_PUBLIC_IOS_BUNDLE_ID || base.ios?.bundleIdentifier,
        // iPhone-only for now — no iPad layout yet. Disable iPad explicitly per the
        // brief ("отключаем сразу iPad"); flip back to true once an iPad layout is
        // added.
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
      // iPhone-only — no iPad layout yet (same as flags-quiz / coat-of-arms /
      // sport-quiz). Overrides the erudite base (supportsTablet: true) so Apple
      // reviews on iPhone; flip back to true once an iPad layout is added.
      supportsTablet: false,
    },
    android: {
      ...base.android,
      package: androidPackage,
    },
  };
};

// Dev-tunnel (Expo Go) manifests must NOT look like an "updates-enabled" EAS app,
// or Expo Go demands an Expo-account sign-in ("signed in to Expo Go as X but not
// signed in to Expo CLI") that the offline dev server can't satisfy. When serving
// an offline dev tunnel (expo start with EXPO_OFFLINE=1 — e.g. scripts/expo-qr.sh),
// strip runtimeVersion/updates/extra.eas → a plain, Expo-Go-friendly manifest, and
// scope its owner to the tester's account via EXPO_DEV_OWNER (removed entirely when
// unset, so any signed-in Expo Go can open it). EAS/store builds never set
// EXPO_OFFLINE, so their config is returned byte-for-byte unchanged.
module.exports = (params = {}) => {
  const cfg = buildConfig(params);
  // Dev-tunnel mode = serving an offline dev tunnel (EXPO_OFFLINE) OR an
  // account-scoped tunnel where we pin the manifest owner (EXPO_DEV_OWNER, used
  // with the tester's EXPO_TOKEN so a signed-in Expo Go can open it). Either way
  // we strip the base project's EAS/updates link (which points at a different
  // account's project and would make Expo Go reject the tester).
  const isDevTunnel =
    process.env.EXPO_OFFLINE === '1' ||
    process.env.EXPO_OFFLINE === 'true' ||
    !!process.env.EXPO_DEV_OWNER;
  if (!isDevTunnel) return cfg;

  const { runtimeVersion, updates, owner, ...rest } = cfg;
  const extra = { ...(cfg.extra || {}) };
  delete extra.eas;
  const devOwner = process.env.EXPO_DEV_OWNER;
  return devOwner ? { ...rest, extra, owner: devOwner } : { ...rest, extra };
};
