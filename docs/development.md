# Development

## Prerequisites

- Node.js (LTS)
- Expo CLI (`npx expo`)
- iOS Simulator (macOS) or Android emulator for native testing
- Maestro CLI for E2E flows (optional)
- A current **EAS CLI**, only if you build through EAS — see the warning below

### The EAS CLI must be current

An old `eas-cli` cannot read this project at all. The dev host currently carries
`eas-cli@3.15.1`, which predates the Expo SDK this tree targets, and every EAS
command — `eas build`, even the read-only `eas config` — dies immediately with
`Unexpected token 'typeof'` while evaluating the config plugins.

Two things make this worth stating rather than debugging twice:

- The failure is **not profile-specific**. It reproduces on the untouched
  Erudite `production` profile as readily as on a `sport-quiz-*` one, so it
  never indicates a bad profile, a bad key, or a bad bundle id.
- The failure is **fast**, taking seconds rather than the usual queue wait. A
  build that dies in seconds is this; a build that goes quiet for half an hour
  is the normal remote queue (see
  [Long-Running Operations](long-running-operations.md#eas-cloud-builds)).

Upgrade before building: `npm install -g eas-cli`. Note also that this host is
Linux with no Xcode toolchain and no simulators, so an iOS build must run on EAS
cloud and be tested on real hardware — there is no local iOS path.

## Install Dependencies

```
npm install
```

## Configure the Backend

The app reads these public env vars at build time:

| Variable | Purpose | Default if unset |
|----------|---------|------------------|
| EXPO_PUBLIC_API_URL | Backend base URL (see `api/client.ts`) | `https://quiz-erudit-backend.turbosuslik.online/api/v1` |
| EXPO_PUBLIC_APP_SLUG | App slug used in every endpoint path; also selects which app the build is — see [Building a sibling app variant](#building-a-sibling-app-variant) for the recognized values (see `api/client.ts`, `app/index.tsx`) | `erudite-quiz` |
| EXPO_PUBLIC_REVENUECAT_ANDROID_KEY | RevenueCat public Android billing key (see `lib/revenuecat.ts`) | the committed key of the app being built — `goog_hFgRbNrOlUHcMtKClkwWcYIBLvd` for `erudite-quiz`, *nothing* for a sibling with no committed key (Android billing stays off) |
| EXPO_PUBLIC_REVENUECAT_IOS_KEY | RevenueCat public iOS billing key — enables iOS billing when set (see `lib/revenuecat.ts`) | *(empty — iOS billing stays off)* |
| EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID | AdMob rewarded ad-unit id for "watch ad → +1 life" on Android (see `lib/ads.ts`) | Google's test rewarded id `ca-app-pub-3940256099942544/5224354917` |
| EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID_IOS | AdMob rewarded ad-unit id for iOS — enables iOS rewarded ads when set (see `lib/ads.ts`) | *(empty — iOS ads stay off)* |
| EXPO_PUBLIC_IOS_BUNDLE_ID | iOS bundle identifier for a sibling variant — gives that build its own store identity so its store products resolve (see `app.config.js`) | *(falls back to the Erudite bundle id)* |
| EXPO_PUBLIC_ANDROID_PACKAGE | Android package for a sibling variant — the Android counterpart of the bundle id (see `app.config.js`) | *(falls back to the Erudite package)* |
| EXPO_DEV_OWNER | Pins the Expo Go dev manifest to one tester's Expo account, so a self-hosted dev tunnel opens on their device; also strips the EAS/updates link (see `app.config.js`) | *(unset — manifest carries no owner)* |

Android keys carry a committed default, so the app builds and runs without an `.env` file. The RevenueCat Android key is a public SDK key and is safe to commit, but a key belongs to exactly **one** RevenueCat project, so the committed keys live in a per-slug table in `lib/revenuecat.ts` rather than as a single global fallback: the `erudite-quiz` build inherits Erudite's key, and a sibling inherits nothing until its own EAS profile supplies one. That is why Sport Quiz's Android builds have no billing at all instead of quietly talking to Erudite's project. A configured key is also shape-checked (`goog_` / `appl_`), so an unfilled `REPLACE_WITH_…` placeholder from `eas.json` counts as no key and the app fails closed rather than configuring the SDK with garbage. The iOS RevenueCat key and iOS rewarded unit id have **no** committed fallback for any app, so iOS monetization stays safely off until the owner supplies them — see [iOS Monetization Parity](ios-monetization-parity.md).

For EAS cloud builds the RevenueCat keys are also wired explicitly in `eas.json` under the `preview` and `production` profiles, so release builds carry them through EAS env rather than relying on the in-code fallback. Both the Android key and the iOS key (`appl_…`) are now set on those two Erudite profiles, so an Erudite App Store build ships with iOS billing on. The `development` profile leaves them unset and falls back to the committed Android default. Each key must point at the RevenueCat project the backend provisions, or the `default` offering comes back empty and the paywall has no packages to sell.

Copy `.env.example` to `.env` and adjust as needed. Note that `.env.example` ships an older slug value; the current app's content lives under the `erudite-quiz` slug, which is also the in-code default. Set `EXPO_PUBLIC_APP_SLUG=erudite-quiz` for the live content set, or a sibling slug to build that app from the same tree — see [Building a sibling app variant](#building-a-sibling-app-variant).

## Run the App

```
npm start                   # Expo dev server (pick platform interactively)
npm run ios                 # Build and run on iOS
npm run android             # Build and run on Android
npm run web                 # Web browser
```

`npm start` maps to `expo start`. The app uses Expo's new architecture (`newArchEnabled: true`). On web, the on-device image cache is skipped — the browser caches snapshot images itself.

One script in `package.json` is a leftover of the Expo starter and must never be run here: `npm run reset-project` moves `app/`, `components/`, `hooks/`, `constants/`, and `scripts/` into `app-example/` and writes a blank app in their place. It exists to blank a fresh template, and against this tree it would displace every screen of all eight builds in one prompt.

Real in-app purchases run through RevenueCat, whose native module (`react-native-purchases`) autolinks via prebuild and is absent in Expo Go and on web. RevenueCat is enabled per-platform by capability, not by a hardcoded `Platform.OS`: it turns on for any native platform that has a public store key configured — and the key must look like one (`goog_` / `appl_`), so an unfilled `REPLACE_WITH_…` placeholder counts as absent. Android has a committed key **per app slug**, not one global fallback, so the erudite build is always on while a sibling stays off until its own EAS profile supplies its key; iOS has no committed key for any app, so it stays disabled until `EXPO_PUBLIC_REVENUECAT_IOS_KEY` is supplied, then lights up automatically. In genuine dev environments (Expo Go / web) the shop and paywall fall back to local grants so the dev flow never breaks; on a real store device that has no key for the app being built they instead **fail closed** — no free grant. Which platform that is now depends on the app: Erudite's flows are cheapest to exercise on an Android device build (`npm run android` against a prebuild), whereas Sport Quiz transacts on **iOS only** — its Android billing is deliberately fail-closed, so its coin packs can only be exercised through TestFlight (see [Verifying an iOS purchase](ios-monetization-parity.md#verifying-an-ios-purchase-testflight-sandbox)). See also [Gamification](gamification.md#premium-and-the-shop) and [iOS Monetization Parity](ios-monetization-parity.md).

### AdMob rewarded ads

The "watch ad → +1 life" reward uses AdMob via `react-native-google-mobile-ads` (wrapped in `lib/ads.ts`). Two pieces of configuration:

- **App ID (native, needs a build):** set in `app.json` under the `react-native-google-mobile-ads` config-plugin entry in `expo.plugins`, as `androidAppId` (`ca-app-pub-3182366039408506~9059612261`, the real Android app) and `iosAppId` (a Google sample placeholder until the real iOS AdMob App ID is supplied — iOS ads stay disabled at runtime). The plugin injects the App ID into `AndroidManifest.xml` at prebuild, so changing it requires re-running `npx expo prebuild` / a new build.
- **Rewarded unit id (runtime env):** `EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID` (Android) and `EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID_IOS` (iOS). The Android in-code default is Google's official **test** rewarded id, so dev / Expo Go / any build without the env var never touch the real unit and can't earn a policy strike. The real Android unit id (`ca-app-pub-3182366039408506/4318421474`) is wired only in `eas.json` under the `preview` and `production` `env` blocks; the `development` profile leaves it unset and falls back to the test id. iOS has **no** committed fallback unit id, so its rewarded ads stay off until `EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID_IOS` is provided.

Like RevenueCat, rewarded ads are gated by capability, not a hardcoded `Platform.OS`: `adsEnabled` is true on any native platform that has a rewarded unit id configured. Android always has one (its test fallback); iOS stays off until its unit id and real AdMob App ID are supplied, then lights up automatically. In Expo Go / web, or wherever no unit id exists, `adsEnabled` is `false`, the watch-ad buttons hide, and no life is ever granted where an ad can't run. Testing the real rewarded flow requires an Android device build (`npm run android` against a prebuild); AdMob may show the app as "verification required" until the SDK serves its first requests, which is expected and does not block integration. See [Gamification](gamification.md#the-rewarded-ad-watch-ad--1-life) and [iOS Monetization Parity](ios-monetization-parity.md).

## Building a sibling app variant

Every sibling app is built from this same tree by flipping `EXPO_PUBLIC_APP_SLUG`. Seven values select a non-Erudite build; anything else builds the main Erudite quiz:

| `EXPO_PUBLIC_APP_SLUG` | Builds | Expo `slug` override | Docs |
|------------------------|--------|----------------------|------|
| `logo-quiz` | Logo Quiz | *(none — keeps the base)* | [Logo Quiz](logo-quiz.md) |
| `flags-quiz` | Flags Quiz | `flags-quiz` | [Flags Quiz](flags-quiz.md) |
| `coat-of-arms` | Coat of Arms | `coat-of-arms` | [Coat of Arms](coat-of-arms-quiz.md) |
| `sport-quiz` | Sport Quiz | `sport-quiz` | [Sport Quiz](sport-quiz.md) |
| `italy-history-and-geography-quiz` | Italy Quiz | `italy-quiz` | [Italy Quiz](italy-quiz.md) |
| `football-quiz` | Football Quiz | `football-quiz` | [Football Quiz](football-quiz.md) |
| `test-quiz` | [Configurable Template](configurable-template.md) ("Test App") | `test-quiz` | [Configurable Template](configurable-template.md) |

`app.config.js` is a dynamic Expo config layered over the static `app.json`. For a build that is not a sibling variant it returns `app.json` byte-for-byte, so existing Erudite builds are unaffected.

[Football Quiz](football-quiz.md) has a branch but no EAS profile either, and for a plainer reason: it is a prototype with no content behind it, so there is nothing to publish. Its `package` and `bundleIdentifier` therefore fall back to the Erudite identity like every other sibling, and only its Expo project `name` and `slug` are its own — enough to stop it showing another variant's cached bundle in Expo Go.

The configurable template has an `app.config.js` branch but still no EAS profile, and it cannot be published as-is — a store build would need its own Expo project first. Its branch exists for a narrower reason than the siblings': the template is verified by installing it on a device **next to** another build, so it needs an identity that cannot collide with one. It is therefore the one branch whose `package` / `bundleIdentifier` do **not** fall back to the erudite identity — `com.turbosuslik.testquiz` is the literal default and the env vars merely override it, because an unset variable would otherwise build the installed app's own package and replace it on the device. It also claims its own `scheme` (`testquiz`), since two installed builds answering to `quizerudit://` make every deep link ambiguous. The slug string is a **contract with the backend**, fixed by the migration that seeds the matching app record, so renaming it on either side breaks the other.

Every sibling branch overrides the app `name` and takes its iOS `bundleIdentifier` and Android `package` from `EXPO_PUBLIC_IOS_BUNDLE_ID` / `EXPO_PUBLIC_ANDROID_PACKAGE`, and every one ships iPhone-only (`ios.supportsTablet: false`) because none has a tablet layout yet — which also matters for App Store review, since Apple otherwise reviews on iPad.

Every branch except `logo-quiz` also overrides the Expo project `slug`. Sharing the base `quiz-erudit` slug makes variants collide in Expo Go, so opening one shows another's cached bundle. The logo variant deliberately keeps the base slug: it identifies the established EAS project, not the store listing. The Flags Quiz, Coat of Arms, Italy Quiz, and configurable-template branches additionally override the launcher icon (`icon` plus the Android adaptive foreground) so the variant never shows another app's mark. On Android the foreground alone is not enough: the system insets it and the adaptive background colour rings the artwork, so a variant whose icon is not purple must also set `adaptiveIcon.backgroundColor` — Italy Quiz pins the aged-paper tone of its vintage-map mark instead of inheriting the base build's purple, and the template pins the bundled dark `bgSolid` (`#1a1a47`), the same colour its scaffold paints. Football Quiz sets the background (`#2B2B26`, its own base tone) without yet supplying a foreground, so it still wears the Erudite mark on its own colour — a prototype's launcher icon only has to be distinguishable, not final. The template's icon is deliberately the generic `assets/images/icon.png`: it is never published, so the mark only has to be told apart from the neighbouring build's in the launcher.

The `logo-quiz-preview` / `logo-quiz-production` and `sport-quiz-preview` / `sport-quiz-production` profiles in `eas.json` set `EXPO_PUBLIC_APP_SLUG` plus that app's bundle id, package, and RevenueCat keys. Where a value is still a `REPLACE_WITH_…` placeholder the identity vars fall back to the Erudite identity and the placeholder keys are rejected by the key shape check, so that sibling's store products do not resolve and its shop fails closed on a device (local-granting only in Expo Go).

**Sport Quiz** is fully wired: both profiles carry its `appl_…` RevenueCat public SDK key, its iOS bundle id `com.quizzzes.sport` — the App Store Connect app the `sportquiz_coins_*` consumables were provisioned against — and its Android package. The bundle id is load-bearing and must not be "tidied": StoreKit resolves products by the binary's bundle id, so any other value returns an empty catalog with no error. With the key present, `lib/revenuecat.ts` enables iOS billing automatically, so an iOS build sells coins for real once the products go live with App Review. `__tests__/lib/eas-profiles.test.ts` pins these invariants: a malformed key, a key filled into only one of the two mirrored profiles, or a changed bundle id all fail the suite.

That test can only check a key's *shape*, though — it cannot tell a correct key from a well-formed wrong one, and a wrong RevenueCat key fails **silently** (an empty catalog, no error, first visible in TestFlight). So the Sport Quiz key was additionally validated against RevenueCat's live API, which anyone can repeat without backend access:

```
curl -H "Authorization: Bearer <appl_ key>" -H "X-Platform: ios" \
  https://api.revenuecat.com/v1/subscribers/<any-id>/offerings
```

A valid key returns `200`; a wrong one returns `401 {"code":7225,"message":"Invalid API Key."}`. (The sibling endpoint without `/offerings` answers `201` instead, because fetching an unknown subscriber *creates* an anonymous one — prefer `/offerings`, which only reads.) Because a key can only ever see its **own** RevenueCat project, the offerings it returns also identify that project: the Erudite key resolves the `default` offering (`erudite_annual` / `erudite_monthly` / `erudite_weekly`), while the Sport Quiz key resolves **zero** offerings — matching that app's provisioning exactly, since it sells consumables only and deliberately has no entitlement or offering. Same shape of check for any future sibling.

**If either RevenueCat key ever has to be re-entered**, the value lives in exactly two places, both outside this repo: the RevenueCat dashboard (project `c58fe308` → app `app5174f09d20` → the Apple **public SDK key**, an `appl_…` string — *not* the `sk_…` secret key, which must never be committed), and the backend column `apps.revenuecat_apple_public_api_key` for app id 27, which the backend syncs from RevenueCat automatically. Put the identical value in **both** `sport-quiz-preview` and `sport-quiz-production`, then run:

```
npm run check:store-config
```

Green means the key is well-formed, identical across the two profiles, and the bundle id is untouched. Nothing else needs to change: Sport Quiz has no premium tier, no entitlement and no paywall route — verified by grep, the app never imports `usePremium` and never navigates to `/paywall` — so supplying the key lights up consumable purchasing **only**. The backend's `show_paywall_ios: true` flag for this app is inert on the client, because its sole reader (`app/onboarding.tsx`) belongs to the Erudite flow, which a sibling build redirects away from before mount.

The Sport Quiz profiles deliberately carry **no** `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` (that app has no Google Play catalog, so Android must stay fail-closed) and no AdMob unit id (it shows no ads). `EXPO_PUBLIC_ANDROID_PACKAGE` is set to `com.quizzzes.sport`, so an Android build now produces a valid, non-colliding package — but that only fixes the app's *identity*, not its billing: with no Play catalog and no committed Android key for this slug, `revenueCatEnabled` stays false on Android and coin purchases keep failing closed. Enabling them needs a Play listing plus that app's `goog_` key, which is a separate ops task.

That combination is deliberate, and worth stating because it replaced an earlier safeguard. While the package was an unfilled `REPLACE_WITH_…` placeholder it had no dot, and an Android `applicationId` must have at least two dot-separated segments, so Gradle rejected it and an Android build simply **could not be produced** — crude, but it made shipping an unsellable build impossible. (Expo itself validates nothing here: the value is written verbatim into `android/app/build.gradle` as both `namespace` and `applicationId`, so the failure surfaces only once Gradle runs.) A real package removes that barrier: an Android build now succeeds, and would install and play fine while every coin pack fails closed with "Purchase Failed", because the store is off. So do not publish Sport Quiz to Google Play until the Play catalog and its `goog_` key exist. What now enforces the pairing is `__tests__/lib/eas-profiles.test.ts`, which asserts both that the profiles carry no Android RevenueCat key and that every identifier is either a deliberate placeholder or well-formed reverse-DNS — a typo like a dropped dot no longer fails loudly at Gradle, so it is caught there instead. If a Play listing is ever added, those "carries NO Android RevenueCat key" assertions and the identical-store-identity key list must be updated in the same commit.

Flags Quiz and Coat of Arms still have no dedicated profile, so their bundle id and package fall back to the Erudite identity; that is harmless, since they ship no shop or paywall.

### Running Italy Quiz in Expo Go

The Italy Quiz branch behaves differently from the others: it strips `runtimeVersion`, `updates`, and `extra.eas` from the config. A manifest carrying those fields reads as an updates-enabled EAS app, and Expo Go then demands an Expo-account sign-in that an offline dev server cannot satisfy. It also pins `owner` from `EXPO_DEV_OWNER`, because iOS Expo Go opens a self-hosted (non-`exp.direct`) dev tunnel only when the manifest owner matches the account the device is signed into *and* the CLI is signed into that same account. The same stripping happens for any variant when `EXPO_OFFLINE` or `EXPO_DEV_OWNER` is set, so a dev tunnel is always Expo-Go-friendly while EAS and store builds get their config back byte-for-byte.

Real sibling purchases run through the same RevenueCat wrapper (`lib/revenuecat.ts`) as the main app, using the shared `premium` entitlement and `default` offering. So the same capability gating applies: enabled on a native platform with a configured key, fail-closed on a real device with the store off, local-grant only in Expo Go / web.

### Building a variant as a release APK

A debug build has no JS inside it. It fetches the bundle from a Metro dev server at launch, and that server answers for exactly one slug — whichever the operator started it with. On the shared dev host Metro is already up on port 8083 serving another build, so a debug APK of a second variant either shows the wrong app's bundle or requires taking that session down. A **release** APK avoids the question: the bundle is compiled in, `EXPO_PUBLIC_APP_SLUG` is baked into the binary, and the app talks to the live backend with no dev server anywhere. It is also the only build that reproduces what a real user's first launch does.

Build one like this:

1. Set the slug for the whole pipeline, since both prebuild and the bundling step read it: `export EXPO_PUBLIC_APP_SLUG=test-quiz`.
2. Regenerate the native project: `npx expo prebuild --platform android --clean`. This rewrites `android/` from `app.config.js`, so the variant's `package` lands in `android/app/build.gradle` as both `namespace` and `applicationId`.
3. Build from `android/`: `./gradlew assembleRelease`. Never in the foreground — see [Long-Running Operations](long-running-operations.md#android-native-build).
4. Install it beside whatever is already there: `adb -s emulator-5556 install -r android/app/build/outputs/apk/release/app-release.apk`.

`npx expo run:android --variant release` collapses steps 2 to 4 into one command and is equivalent; the split form is worth knowing because it lets you inspect the generated identity before spending a build.

#### The splash entry in `app.json` must always name an image

Step 2 is where a splash config with no `image` bites, and it bites in a way that reads as a Gradle problem rather than a config one. `expo-splash-screen` writes `windowSplashScreenAnimatedIcon = @drawable/splashscreen_logo` into `values/styles.xml` **unconditionally**, but generates that drawable only when the plugin entry carries an `image` (or per-density keys, or an explicit `drawable`) — and it deletes any existing splash drawable first. Take the image away and prebuild emits a reference to a resource it never creates, so step 3 fails in aapt2 with `resource drawable/splashscreen_logo not found`. There is no icon-less mode: removing `image` does not remove the icon, it removes the file the icon still points at.

This never breaks a real build, which is why it went unnoticed from 2026-08-29 to 2026-09-09. The build backend injects a per-app `image` into that same entry on every build (`ProcessBuildTask::injectAssets`), and now refuses the build outright if the result would dangle (`App\Services\Build\SplashConfigGuard`). Only a **bare** prebuild on this repo — exactly what step 2 is — sees the broken state.

The committed `image` and `imageWidth` are the neutral base that bare prebuild falls back on. `imageWidth` is **not** injected, so it is the one value here that changes what all eight builds look like: it is the logo's width in dp on Android and in points on iOS, and dropping it silently applies the plugin's default of 100 rather than turning anything off. It must also stay at or below 288 — the icon is composited onto a `288 * density` canvas and centred, so a larger value gives a negative offset and clips the logo on every edge. The entry therefore spells out 100 rather than restoring the 320 it carried before 2026-08-29, which was over that bound: repairing the config changed no shipped build's launch screen, it only stopped the size from being inherited by accident. Moving it is a product decision affecting all eight apps at once, not a config tidy-up. `__tests__/app/splash-native-config.test.ts` pins all of this, including re-reading the 288 out of the plugin source so the bound cannot rot across an SDK bump.

For the configurable template there is a step 0: choose the artwork. `npm run asset-pack <name>` (e.g. `base`, `neon`) copies `asset-packs/<name>.assets/` into `assets/t/`, which is where the template's static `require()` calls point. It must run **before** prebuild and bundling, because Metro reads whatever is on disk at that moment — on a real build the backend does this copy against its own clone. `base` is what is committed; staging anything else turns `__tests__/app/t-asset-packs.test.ts` red on purpose, so re-run it with `base` before committing. See [Configurable Template](configurable-template.md#artwork-asset-packs-staged-at-build-time).

#### What `eas build` uploads, and why `.easignore` is a copy of `.gitignore`

The route above never leaves this machine. `eas build` does: it tars the working copy and uploads it, and the root `.easignore` is what decides the contents. The one thing to know before touching that file is that **`.easignore` replaces `.gitignore` rather than adding to it**. From the moment it exists eas-cli reads no `.gitignore` anywhere in the tree; only `.git` and `node_modules` stay hardcoded ([EAS docs](https://docs.expo.dev/build-reference/easignore/)). So the obvious edit — a `.easignore` holding just the rule you wanted to add — silently starts uploading everything `.gitignore` was hiding: `.env`, `android/` (2.9 GB of local prebuild output), `dist/`, `.expo/`, and the `*.jks` / `*.p8` / `*.p12` / `*.mobileprovision` patterns that exist to keep signing material off other people's machines. The build backend clones fresh, so *it* would not carry `android/`; a developer running `eas build` from a working checkout would ship `.env` to the worker and get a green build for it.

The committed file is therefore `.gitignore` verbatim followed by one appended rule, `asset-packs/` — the pack sources are pure build input that nothing requires, so they were only ever uploaded as dead weight. Regenerate it, never hand-edit the copied part:

```bash
cp .gitignore .easignore   # then re-append the EAS-only block at the end
```

Treat the two as a pair from here on. **Drift is the failure mode, not a missing rule**, and the two directions are not symmetric: a pattern added to `.gitignore` and not to `.easignore` is a new secret uploaded to EAS, silently, whereas a rule EAS needed and git hid would be a loud build failure. Drift is also not merely someone forgetting — `.gitignore` carries a machine-appended `# >>> suslik-managed skills (auto)` block, so a tool will extend one file and never the other.

The second rule is that **nothing under `assets/` may ever be excluded**. The backend writes into that tree after cloning and before `eas build` — `assets/images/{icon,splash-icon}.png` (`ProcessBuildTask::injectAssets`, the same injection the splash section above describes) and `assets/t/` (`AssetPackStager`). Both look generated, and excluding either breaks a build in a way that names neither `.easignore` nor the pipeline: `assets/images/` costs ~20 minutes before the worker fails with `resource drawable/splashscreen_logo not found`, and `assets/t/` fails in Metro instead, because the rule is path-based and drops the artwork *committed* here alongside the staged pack, leaving the literal `require('@/assets/t/…')` calls with nothing to resolve.

Two guards cover this, and they cover different builds — the same division of labour as `SplashConfigGuard` and its mirror above. `App\Services\Build\EasArchiveGuard` fails a **pipeline** build in seconds, naming the file, the rule and its line number. A developer's local `eas build` gets no such tripwire, so `npm run check:eas-upload` (`__tests__/lib/easignore.test.ts`) is the mirror on this side: it runs the committed rules through `ignore` — the same matcher eas-cli uses — and asserts every file the build needs survives, every pack source does not, and `.easignore` is still `.gitignore` plus exactly one rule.

Note that `eas update` is unaffected by any of this. An OTA payload is Metro's output, not a working-copy tar, so `.easignore` cannot make one smaller.

### Swapping a pack against a running dev build

Fast Refresh does **not** reliably show the new artwork, and the reason is worth knowing before you spend an hour on it. Swapping a pack changes bytes behind an unchanged path, so every layer that caches by *path* rather than by content keeps serving the old image: Metro is fine (it re-reads the file, and its dev asset endpoint serves current bytes for any `hash` query), but Fresco's **in-memory** bitmap cache in the running app is not. Clearing the on-disk caches while the process is alive does nothing — the bitmap is already in RAM.

The order that works is force-stop first, then clear, then relaunch:

```bash
npm run asset-pack neon
adb -s emulator-5556 shell am force-stop <package>
for d in image_cache image_manager_disk_cache http-cache; do
  adb -s emulator-5556 shell run-as <package> rm -rf "cache/$d"
done
```

None of this applies to a real build: the backend copies into a fresh clone before Metro has ever run, and `expo export` emits assets under content-hashed filenames, so two packs cannot collide in any cache. This is purely an artifact of swapping underneath a live dev server.

Three constraints shape this path:

- **`android/` is generated, gitignored, and carries the last prebuild's slug.** It is not evidence of what you are about to build. Read `applicationId` in `android/app/build.gradle` before trusting an install; `com.quizzzes.erudite` there means the tree is currently prebuilt as Erudite, whatever env var you meant to set.
- **A package collision is destructive, not merely confusing.** Android identifies an installed app by its package, so a build carrying an installed app's package *replaces* it and takes its data. Two builds with different packages sit side by side. That is the whole reason the configurable template's `app.config.js` branch refuses to fall back to the Erudite identity — see [Configurable Template](configurable-template.md#verifying-on-a-device).
- **Release here is signed with the checked-in `debug.keystore`.** `android/app/build.gradle` points the release `signingConfig` at it, so a release APK installs on a device with no store credentials at all. That makes it a fine verification artifact and a useless store one: a real submission still needs its own keystore and the app's own Expo project.

## Over-the-Air Updates (EAS Update)

The app ships with `expo-updates` wired to [EAS Update](https://docs.expo.dev/eas-update/introduction/), so **pure-JS changes** — text, layout, i18n strings, and any logic that lives in the JS bundle — can be delivered to already-installed apps without a new store build or store review.

### Config

The committed `app.json` carries only the OTA **runtime version** — a fixed string:

```jsonc
"runtimeVersion": "1.0.0"
```

The other two pieces of OTA config — the update endpoint (`updates.url`) and the EAS project id (`extra.eas.projectId`) — are deliberately **not** committed. The build backend (`php artisan build:process`, `ProcessBuildTask::injectConfig`) stamps them into `app.json` per app at build time, deriving the endpoint as `https://u.expo.dev/<expo_project_id>` from the App record it is building.

- **Why they are injected, not committed.** This one tree builds several apps (Erudite, Logo Quiz, Flags Quiz), and each is its own EAS/Expo project with its own `updates.url`. A hardcoded Erudite endpoint in the repo would publish and pull *every* sibling's OTA against the wrong project. The base config stays app-neutral, and the backend supplies the correct project per build.
- **Startup behavior.** With no `fallbackToCacheTimeout` committed, the app uses Expo's default: it never blocks startup on an update. It launches the cached bundle, downloads any newer one in the background, and applies it on the next launch.
- **Native config is generated, not hand-written.** The `expo-updates` config plugin is applied automatically at prebuild once the package is installed and `updates.url` is present — there is no explicit entry in `expo.plugins`. Because `ios/` and `android/` are gitignored (managed/prebuild workflow), EAS regenerates the native updates config (Android manifest `expo.modules.updates.*` with `ENABLED=true`, iOS `Expo.plist`) on every build. Do not hand-edit the native files.

Each build profile in `eas.json` declares a `channel` (`development` → `development`, `preview` → `preview`, `production` → `production`) so `eas update --channel <name>` — equivalently `eas update --branch <name>` — maps to the matching builds predictably.

### runtimeVersion: a fixed constant

An OTA update is only served to binaries whose **runtime version** matches the one it was published for. This tree pins runtimeVersion to a **fixed string** (`1.0.0`) rather than the `appVersion` policy or a fingerprint.

- **Why a fixed constant:** the runtime must stay stable across native rebuilds even as the marketing `version` bumps (`1.0.3 → 1.0.4 …`), so one published bundle reaches every build regardless of its store version. The `appVersion` policy would tie the runtime to `expo.version` and fragment the OTA audience on every version bump, forcing a fresh publish per version — the opposite of what a rolling preview / TestFlight channel needs.
- **The drift invariant:** the value committed here MUST equal the constant the build backend stamps into every build (`OTA_RUNTIME_VERSION = "1.0.0"` in `ProcessBuildTask`). The publishing side (`eas update --branch <channel>`) resolves the runtime from the committed `app.json`. If the committed value and the backend-stamped value ever drift, published updates match no installed build and OTA silently stops delivering. Bump the runtime ONLY when a native change breaks OTA JS compatibility — and change both places together.

### Publishing an OTA

```
eas update --channel production --message "Fix typo on results screen"
eas update --channel preview    --message "QA build for testers"
```

The published bundle reaches installed apps that were built from the matching channel **and** carry the fixed runtime version (`1.0.0`) — which, because it is a constant rather than the `appVersion` policy, is every build regardless of its store `version`.

### When OTA does NOT apply — a new store build is required

OTA only carries the JS bundle and bundled assets. Anything that touches the **native layer** needs a fresh store build (and, for the stores, review):

- adding/updating/removing a native module (any new `expo install <native-pkg>`);
- changing native config in `app.json` — permissions, config plugins, `newArchEnabled`, icons/splash, bundle id/package, or an `expo.version` bump;
- an Expo SDK / React Native upgrade.

Rule of thumb: if the change would alter what `expo prebuild` generates, it is **not** OTA-eligible.

### Only builds made with the updates runtime can receive OTA

A binary can accept OTA only if it was built *after* `expo-updates` (with the injected `updates.url` and runtimeVersion) was in place. Any older store binary produced before OTA was wired — including the first Erudite App Store build — can never receive an over-the-air update, no matter what is published to its channel. To bring such a binary onto the OTA track, produce one fresh native build through the backend pipeline; every build made from then on picks up published updates on its channel.

### Multi-app note

Because `updates.url` and `extra.eas.projectId` are injected per app from each App record's `expo_project_id` (see [Config](#config) above), every sibling built from this tree automatically publishes and pulls OTA against its own EAS project. No app-specific endpoint is committed, so nothing in the repo changes when a new sibling comes online; the backend needs only that app's `expo_project_id`. The one exception is Italy Quiz, whose config branch strips the updates fields outright — it has no EAS project yet and cannot receive OTA until they are restored.

## Lint

```
npm run lint
```

Uses ESLint with the `eslint-config-expo` preset, plus one project rule: colour literals (`#rrggbb`, `rgb()`, `hsl()`) are banned across the configurable template's surface — `app/t/`, `components/t/`, `constants/t/` and `hooks/t/` — where every colour must come from a theme token or a named tile ramp. The rule is an editor-time convenience; the authority is the source scan in `__tests__/app/t-no-color-literals.test.ts`, which catches forms an AST selector cannot see and which extends the ban to everything those files import. See [Configurable Template](configurable-template.md#keeping-the-two-repositories-in-step).

## Unit Tests (Jest)

```
npm test
```

Runs the Jest suite (`jest-expo` preset). The test files live in `__tests__/` and cover the device-local business logic in `lib/` and `hooks/` — content-cache namespacing and the two-variant image collection, the hint and lives economies, answer stats, store links, RevenueCat gating (including the per-slug committed-key scoping), the fail-closed purchase policy for every app's shop, the Logo Quiz and Flags Quiz content transforms, and similar pure logic. `__tests__/app/` also holds screen-level integration tests that render a screen with its dependencies mocked: one pins the API-fallback no-repeat guarantees (dedupe by ID, seen filter), another pins the Coat of Arms reveal (the original image appears only after a correct answer, and never when the question has none), and another pins the Sport Quiz shop's money invariant (coins are credited only on a resolved purchase — never on a cancellation or a store failure). The remote theme engine is covered end to end — wire parsing, cache records, the conditional fetch, the palette overlay, the template's derived-token funnel, its inertness on every other build, and the no-colour-literal scan over the template surface and its imports. Artwork the *build* consumes is covered *structurally* rather than by rendering, because jest-expo rewrites every image module to a number and no rendering test in this repo can tell which PNG a `require()` resolved to: `__tests__/app/t-asset-packs.test.ts` checks every asset-pack slot against the size its manifest declares, and `__tests__/app/splash-native-config.test.ts` checks the native splash entry in `app.json` (see [The splash entry in `app.json` must always name an image](#the-splash-entry-in-appjson-must-always-name-an-image)). Both open the bytes through the shared `__tests__/helpers/png.ts`, which proves a file really is a PNG before reading its dimensions out of the IHDR chunk — a truncated write or a JPEG renamed to `.png` then fails here as a named assertion instead of inside `@expo/image-utils` during prebuild. The helper sits under `__tests__/helpers/` so Jest's `testMatch` glob does not collect it as a suite with no tests — as do `png.ts`'s neighbours `repo-tree.ts` (the shared filesystem walk) and `asset-packs.ts` (the manifest readers those suites derive their expectations from rather than transcribing them). The same structural reasoning covers what the build *uploads*: `__tests__/lib/easignore.test.ts` runs the committed `.easignore` through `ignore`, the matcher eas-cli itself uses, and asserts that the pack sources are dropped while every file the backend injects under `assets/` survives (see [What `eas build` uploads](#what-eas-build-uploads-and-why-easignore-is-a-copy-of-gitignore)). There is no device, emulator, or backend dependency, so the ninety-two files (1515 tests) finish in **well under a minute** — 11 seconds measured on the dev host — and are safe to run on every change. It is not a long-running operation.

One scoped entry point is worth knowing separately:

```
npm run check:store-config
```

It runs only `__tests__/lib/eas-profiles.test.ts`, which reads `eas.json` and asserts the store identity of every sibling profile. Run it before and after touching those profiles. It fails on a malformed RevenueCat key, on a key pasted into only one of a pair of mirrored profiles, on an identifier that is not well-formed reverse-DNS, and on a sibling that carries an Android key it should not have. Those assertions encode today's release state, so a genuine change — adding a Google Play catalog for [Sport Quiz](sport-quiz.md#coin-packs), say — has to update the test in the same commit. What the check cannot do is tell a correct key from a well-formed wrong one; that costs an App Review cycle to discover, which is why [Building a sibling app variant](#building-a-sibling-app-variant) also describes the live RevenueCat API probe.

The one network-dependent check is likewise opt-in, so the offline invariant above holds:

```
npm run check:theme-contract
```

It runs `__tests__/lib/theme-contract-live.livetest.ts` — deliberately named `*.livetest.ts` so the default `testMatch` never picks it up — against the real backend, and fails if the schema version the backend serves is not the one this client declares, if the live envelope of `erudite-quiz` or `test-quiz` does not parse through this build's own parser, if any remote token is missing from either appearance of either app, or if the erudite slug's defaults stop matching the transcription in `__tests__/fixtures/remote-theme-v2.ts`. That transcription and `ColorTokenRegistry.php` change together in the same PR; this check is what re-verifies the pair against the live endpoint without touching the offline suite. It warns (without failing) on unknown tokens or an unknown `onboarding_type`, both of which the client handles by design. Run it after any change to `lib/theme/contract.ts`, `constants/theme.ts`, or the backend's `ColorTokenRegistry.php` — this is the check that would have caught the v1-vs-v2 schema breakage before it shipped.

One test-only wrinkle affects any test that exercises persisted state: helpers like `readSeen`/`writeSeen` lazy-load AsyncStorage through a dynamic `import()`, which Node's CommonJS test runtime cannot execute (it would throw and the helper's best-effort catch would silently no-op). The `test` env in `babel.config.js` rewrites those imports to `require()` via `babel-plugin-dynamic-import-node`, so the seen-set persistence is actually observable in tests. Metro handles `import()` natively for dev, production, and OTA bundles, so the shipped app never uses this rewrite.

## E2E Flows (Maestro)

Maestro flows live in `.maestro/` and target bundle ID `com.quizzzes.erudite`:

```
maestro test .maestro/home-screen.yaml
maestro test .maestro/quiz-flow.yaml
```

These flows were written against the original single-category heraldry home screen — they assert text like "Coat of Arms Quiz" and a "Start Quiz" button that no longer exist on the current Categories/Modes home screen. They need rewriting against the current UI before they pass; treat them as legacy until then.

## Project Structure

```
app/           Screens (Expo Router file-based routing)
api/           Backend client and API types
components/    UI components (home, quiz, achievements, lives, shop)
hooks/         Context providers and stateful hooks
lib/           Device-local business logic and persistence
constants/     Category visuals and theme
i18n/          String tables for en, ru, es, fr
assets/        Icons, splash, images (assets/t/ is staged from an asset pack)
asset-packs/   Swappable image packs for the configurable template
.maestro/      E2E flows
scripts/       Build and utility scripts
docs/          Documentation
```

## Backend Dependency

The app talks to the backend at `quiz-erudit-backend.turbosuslik.online`. Because content is downloaded once per language as a snapshot and cached for 24 hours, gameplay continues offline after a successful first sync. The initial sync still requires the backend; if it is unreachable on first launch the content cache reports an error and screens that depend on it show empty or error states. See [Content and Offline](content-and-offline.md).

## Key Configuration Files

| File | Purpose |
|------|---------|
| app.json | Expo project config (bundle ID, plugins, new architecture; the AdMob App ID lives in the `react-native-google-mobile-ads` plugin entry; the fixed EAS Update `runtimeVersion` for OTA — `updates.url` + EAS `projectId` are injected per-app by the build backend) |
| eas.json | EAS build profiles (per-profile public env: Sentry DSN, RevenueCat Android key, AdMob rewarded unit id; per-profile EAS Update `channel`) |
| .easignore | What `eas build` uploads. A verbatim copy of `.gitignore` plus `asset-packs/`; it **replaces** every `.gitignore` for eas-cli rather than adding to them, so regenerate it with `cp` and never let the two drift ([why](#what-eas-build-uploads-and-why-easignore-is-a-copy-of-gitignore)) |
| package.json | Dependencies and npm scripts |
| tsconfig.json | TypeScript config with the `@/` path alias |
| .env / .env.example | Backend URL, app slug, and RevenueCat Android key |

## See Also

- [Architecture](architecture.md) -- System structure and component organization
- [Content and Offline](content-and-offline.md) -- Snapshot sync and caching
- [Long-Running Operations](long-running-operations.md) -- Commands that go silent long enough to look hung
- [Logo Quiz](logo-quiz.md) -- Building the second app via `APP_SLUG`
- [Flags Quiz](flags-quiz.md) -- Building a sibling app via `APP_SLUG`
- [Coat of Arms](coat-of-arms-quiz.md) -- The heraldry sibling
- [Sport Quiz](sport-quiz.md) -- The sports sibling
- [Italy Quiz](italy-quiz.md) -- The Italy sibling, and the one variant with no EAS project
- [Configurable Template](configurable-template.md) -- The variant themed from the backend, and how it is checked on a device
- [INDEX](INDEX.md) -- Documentation entry point
