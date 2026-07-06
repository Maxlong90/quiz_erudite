# iOS Monetization Parity

The app's monetization (paywall, in-app purchases, rewarded ads) used to be
hardcoded to Android only via `Platform.OS === 'android'` checks. That gating is
now **capability/config-driven**: each feature turns on for any native platform
that has the required key/product configured. Android ships with committed
fallbacks so it is always on; **iOS has no fallbacks, so it stays safely
disabled until the credentials below are supplied** — at which point it lights
up automatically with no further code change.

Until then iOS behaves exactly as before: no forced paywall, no purchases, no
rewarded ads, and — critically — the paywall can never grant premium for free on
a real device (subscribe fails closed off-store, mirroring `lib/iap.ts`).

## How the gating works now

| Feature | Capability flag (code) | Enabled when |
|---------|------------------------|--------------|
| RevenueCat (paywall + IAP) | `revenueCatEnabled` in `lib/revenuecat.ts` | native platform **and** a public key exists for it (`keyForPlatform`) |
| Rewarded ads | `adsEnabled` in `lib/ads.ts` | native platform **and** a rewarded unit id exists for it (`REWARDED_UNIT_ID`) |
| Forced post-onboarding paywall | `app/onboarding.tsx` | `revenueCatEnabled` **and** per-platform backend flag (`show_paywall_ios` / `show_paywall_android`) |
| Paywall reviewer-unlock button | `app/paywall.tsx` | `revenueCatEnabled` **and** `show_paywall_review_button` (from the snapshot) |

The per-platform paywall flags are delivered by the backend content snapshot
(`GET /v1/apps/{slug}/snapshot`) and toggled per-app in Nova (App resource →
"Show Paywall iOS", "Show Paywall Review Button").

## What the owner must supply for full iOS parity

Nothing about this ships iOS on by accident. To bring iOS to parity, provide:

### 1. iOS RevenueCat API key (unlocks the paywall + in-app purchases)
- Create/locate the **App Store** app in the RevenueCat dashboard and copy its
  **public Apple API key** (starts with `appl_…`).
- Set it as the build-time env var **`EXPO_PUBLIC_REVENUECAT_IOS_KEY`** in
  `eas.json` under the `preview` and `production` build profiles (next to the
  existing `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`).
- Effect: `revenueCatEnabled` becomes true on iOS, so the paywall/IAP and the
  onboarding/reviewer gates begin to honor the iOS backend flags.

### 2. App Store Connect IAP / subscription catalog (matching the Android one)
- In App Store Connect, create the **subscription group + products** and the
  **consumable products** so their identifiers match the ones the app already
  uses on Android:
  - Subscription offering `default` with the weekly / monthly / annual packages
    (RevenueCat package ids `$rc_weekly`, `$rc_monthly`, `$rc_annual`) and the
    `premium` entitlement attached.
  - Consumables — the store product ids in `lib/iap.ts` `BUNDLES` (must not
    change): `lives.10`, `lives.30`, `lives.100`, `hints.5`, `hints.10`,
    `hints.20`, `combo.10.5`, `combo.30.10`, `combo.100.20`.
- Wire these products into the same RevenueCat project/offering used for
  Android so the shared offering resolves on both stores.

### 3. iOS AdMob rewarded ads (unlocks "watch ad → +1 life")
- Create a **rewarded ad unit** for the iOS app in the AdMob console and set its
  id as **`EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID_IOS`** in `eas.json`
  (preview/production), alongside `EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID`.
- Replace the **placeholder iOS AdMob App ID** in `app.json`
  (`plugins → react-native-google-mobile-ads → iosAppId`, currently the Google
  test id `ca-app-pub-3940256099942544~1458002511`) with the real iOS App ID
  from the AdMob console.
- Effect: `adsEnabled` becomes true on iOS.

## Follow-up checklist

- [ ] Add `EXPO_PUBLIC_REVENUECAT_IOS_KEY` to `eas.json` (preview + production).
- [ ] Build the App Store Connect subscription + consumable catalog matching the
      Android product ids above and attach the `premium` entitlement in RevenueCat.
- [ ] Add `EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID_IOS` to `eas.json` and replace the
      placeholder `iosAppId` in `app.json` with the real iOS AdMob App ID.
- [ ] Toggle **Show Paywall iOS** per-app in Nova once the above is live.
- [ ] Verify on a real iOS build: paywall shows, a sandbox subscription grants
      premium, consumables purchase, and a rewarded ad grants a life.

Until each item is done its feature stays disabled behind the capability flag,
so partial setup never produces a broken iOS paywall.
