# Development

## Prerequisites

- Node.js (LTS)
- Expo CLI (`npx expo`)
- iOS Simulator (macOS) or Android emulator for native testing
- Maestro CLI for E2E flows (optional)

## Install Dependencies

```
npm install
```

## Configure the Backend

The app reads these public env vars at build time:

| Variable | Purpose | Default if unset |
|----------|---------|------------------|
| EXPO_PUBLIC_API_URL | Backend base URL (see `api/client.ts`) | `https://quiz-erudit-backend.turbosuslik.online/api/v1` |
| EXPO_PUBLIC_APP_SLUG | App slug used in every endpoint path; also selects which app the build is — `logo-quiz` builds the Logo Quiz, anything else builds the main quiz (see `api/client.ts`, `app/index.tsx`) | `erudite-quiz` |
| EXPO_PUBLIC_REVENUECAT_ANDROID_KEY | RevenueCat public Android billing key (see `lib/revenuecat.ts`) | `goog_hFgRbNrOlUHcMtKClkwWcYIBLvd` |
| EXPO_PUBLIC_REVENUECAT_IOS_KEY | RevenueCat public iOS billing key — enables iOS billing when set (see `lib/revenuecat.ts`) | *(empty — iOS billing stays off)* |
| EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID | AdMob rewarded ad-unit id for "watch ad → +1 life" on Android (see `lib/ads.ts`) | Google's test rewarded id `ca-app-pub-3940256099942544/5224354917` |
| EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID_IOS | AdMob rewarded ad-unit id for iOS — enables iOS rewarded ads when set (see `lib/ads.ts`) | *(empty — iOS ads stay off)* |
| EXPO_PUBLIC_IOS_BUNDLE_ID | iOS bundle identifier for the Logo Quiz variant — gives that build App 2's own store identity so its store products resolve (see `app.config.js`) | *(falls back to the Erudite bundle id)* |
| EXPO_PUBLIC_ANDROID_PACKAGE | Android package for the Logo Quiz variant — the Android counterpart of the bundle id (see `app.config.js`) | *(falls back to the Erudite package)* |

Android keys carry a committed default, so the app builds and runs without an `.env` file. The RevenueCat Android key is a public SDK key and is safe to commit; it has a literal fallback that matches the in-code default. The iOS RevenueCat key and iOS rewarded unit id have **no** committed fallback, so iOS monetization stays safely off until the owner supplies them — see [iOS Monetization Parity](ios-monetization-parity.md).

For EAS cloud builds the RevenueCat keys are also wired explicitly in `eas.json` under the `preview` and `production` profiles, so release builds carry them through EAS env rather than relying on the in-code fallback. Both the Android key and the iOS key (`appl_…`) are now set on those two Erudite profiles, so an Erudite App Store build ships with iOS billing on. The `development` profile leaves them unset and falls back to the committed Android default. Each key must point at the RevenueCat project the backend provisions, or the `default` offering comes back empty and the paywall has no packages to sell.

Copy `.env.example` to `.env` and adjust as needed. Note that `.env.example` ships an older slug value; the current app's content lives under the `erudite-quiz` slug, which is also the in-code default. Set `EXPO_PUBLIC_APP_SLUG=erudite-quiz` for the live content set, or `EXPO_PUBLIC_APP_SLUG=logo-quiz` to build the Logo Quiz app from the same tree — see [Logo Quiz](logo-quiz.md).

## Run the App

```
npm start                   # Expo dev server (pick platform interactively)
npm run ios                 # Build and run on iOS
npm run android             # Build and run on Android
npm run web                 # Web browser
```

`npm start` maps to `expo start`. The app uses Expo's new architecture (`newArchEnabled: true`). On web, the on-device image cache is skipped — the browser caches snapshot images itself.

Real in-app purchases run through RevenueCat, whose native module (`react-native-purchases`) autolinks via prebuild and is absent in Expo Go and on web. RevenueCat is enabled per-platform by capability, not by a hardcoded `Platform.OS`: it turns on for any native platform that has a public store key configured. Android ships with a committed fallback key so it is always on; iOS has no committed key, so it stays disabled until `EXPO_PUBLIC_REVENUECAT_IOS_KEY` is supplied, then lights up automatically. In genuine dev environments (Expo Go / web) the shop and paywall fall back to local grants so the dev flow never breaks; on a real store device with billing disabled (iOS today) they instead **fail closed** — no free grant. Exercising the real purchase and subscription flows requires an Android device build (`npm run android` against a prebuild). See [Gamification](gamification.md#premium-and-the-shop) and [iOS Monetization Parity](ios-monetization-parity.md).

### AdMob rewarded ads

The "watch ad → +1 life" reward uses AdMob via `react-native-google-mobile-ads` (wrapped in `lib/ads.ts`). Two pieces of configuration:

- **App ID (native, needs a build):** set in `app.json` under the `react-native-google-mobile-ads` config-plugin entry in `expo.plugins`, as `androidAppId` (`ca-app-pub-3182366039408506~9059612261`, the real Android app) and `iosAppId` (a Google sample placeholder until the real iOS AdMob App ID is supplied — iOS ads stay disabled at runtime). The plugin injects the App ID into `AndroidManifest.xml` at prebuild, so changing it requires re-running `npx expo prebuild` / a new build.
- **Rewarded unit id (runtime env):** `EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID` (Android) and `EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID_IOS` (iOS). The Android in-code default is Google's official **test** rewarded id, so dev / Expo Go / any build without the env var never touch the real unit and can't earn a policy strike. The real Android unit id (`ca-app-pub-3182366039408506/4318421474`) is wired only in `eas.json` under the `preview` and `production` `env` blocks; the `development` profile leaves it unset and falls back to the test id. iOS has **no** committed fallback unit id, so its rewarded ads stay off until `EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID_IOS` is provided.

Like RevenueCat, rewarded ads are gated by capability, not a hardcoded `Platform.OS`: `adsEnabled` is true on any native platform that has a rewarded unit id configured. Android always has one (its test fallback); iOS stays off until its unit id and real AdMob App ID are supplied, then lights up automatically. In Expo Go / web, or wherever no unit id exists, `adsEnabled` is `false`, the watch-ad buttons hide, and no life is ever granted where an ad can't run. Testing the real rewarded flow requires an Android device build (`npm run android` against a prebuild); AdMob may show the app as "verification required" until the SDK serves its first requests, which is expected and does not block integration. See [Gamification](gamification.md#the-rewarded-ad-watch-ad--1-life) and [iOS Monetization Parity](ios-monetization-parity.md).

## Building the Logo Quiz variant

The Logo Quiz app is built from this same tree by flipping `EXPO_PUBLIC_APP_SLUG` to `logo-quiz` (see [Logo Quiz](logo-quiz.md)). A store build also needs App 2's own store identity so its RevenueCat products resolve, which `app.config.js` supplies.

`app.config.js` is a dynamic Expo config layered over the static `app.json`. For every build except the Logo Quiz variant it returns `app.json` byte-for-byte, so existing Erudite builds are unaffected. When `EXPO_PUBLIC_APP_SLUG` is `logo-quiz` it overrides the app `name`, the iOS `bundleIdentifier`, and the Android `package` from `EXPO_PUBLIC_IOS_BUNDLE_ID` / `EXPO_PUBLIC_ANDROID_PACKAGE`. The Expo project `slug` is left unchanged — it identifies the EAS project, not the store listing.

The `logo-quiz-preview` and `logo-quiz-production` profiles in `eas.json` set `EXPO_PUBLIC_APP_SLUG=logo-quiz` plus App 2's bundle id, package, and RevenueCat keys. Those values ship as `REPLACE_WITH_APP2_…` placeholders; until an operator fills them, the identity vars fall back to the Erudite identity, so App 2's store products do not resolve and the shop fails closed on a device (local-granting only in Expo Go). Filling the placeholders is a separate ops step, not a code change.

Real Logo Quiz purchases run through the same RevenueCat wrapper (`lib/revenuecat.ts`) as the main app, using the shared `premium` entitlement and `default` offering. So the same capability gating applies: enabled on a native platform with a configured key, fail-closed on a real device with the store off, local-grant only in Expo Go / web.

## Over-the-Air Updates (EAS Update)

The app ships with `expo-updates` wired to [EAS Update](https://docs.expo.dev/eas-update/introduction/), so **pure-JS changes** — text, layout, i18n strings, and any logic that lives in the JS bundle — can be delivered to already-installed apps without a new store build or store review.

### Config

`app.json` carries the update endpoint and runtime policy:

```jsonc
"runtimeVersion": { "policy": "appVersion" },
"updates": {
  "url": "https://u.expo.dev/0a83f1d3-35b1-4026-9e39-022bccc5442d",
  "fallbackToCacheTimeout": 0
}
```

- `updates.url` points at the existing EAS project (the same `extra.eas.projectId`, Erudite Quiz). It is **not** a new Expo project.
- `fallbackToCacheTimeout: 0` means the app never blocks startup waiting for an update — it launches the cached bundle and downloads any newer one in the background, applying it on the next launch (best UX).
- The `expo-updates` config plugin is applied automatically at prebuild once the package is installed and `updates.url` is set — there is no explicit entry in `expo.plugins`. Because `ios/` and `android/` are gitignored (managed/prebuild workflow), EAS regenerates the native updates config (Android manifest `expo.modules.updates.*` with `ENABLED=true`, iOS `Expo.plist`) from `app.json` on every build; do not hand-edit the native files.

Each build profile in `eas.json` declares a `channel` (`development` → `development`, `preview` → `preview`, `production` → `production`) so `eas update --channel <name>` maps to the matching builds predictably.

### runtimeVersion policy: `appVersion`

An OTA update is only served to binaries whose **runtime version** matches the one it was published for. We use the `appVersion` policy, which ties the runtime to `expo.version` (`1.0.3` today).

- **Why `appVersion`:** it's the simplest safe default. Because the runtime is the store version, an OTA can never reach a binary from a *different* app version, and bumping the store version cleanly segments OTA audiences. The tradeoff is the wider a runtimeVersion's scope, the greater the risk of delivering a bundle incompatible with the native layer — `appVersion` keeps that scope as narrow as one store release. Cost: after every store release that bumps `version`, publish a fresh OTA targeting that new version.
- **Not `fingerprint`:** it auto-invalidates the runtime on any native change (more precise) but adds a fingerprint runtime and can shift the runtime string on unrelated native tweaks; not worth the extra machinery here given the app's existing native config (google-mobile-ads, Sentry, new architecture).
- **Not a fixed manual string:** it decouples OTA compatibility from any real signal and makes it easy to ship a bundle incompatible with the native layer.

### Publishing an OTA

```
eas update --channel production --message "Fix typo on results screen"
eas update --channel preview    --message "QA build for testers"
```

The published bundle reaches installed apps that were built from the matching channel **and** share the same runtime version (i.e. the same `version`).

### When OTA does NOT apply — a new store build is required

OTA only carries the JS bundle and bundled assets. Anything that touches the **native layer** needs a fresh store build (and, for the stores, review):

- adding/updating/removing a native module (any new `expo install <native-pkg>`);
- changing native config in `app.json` — permissions, config plugins, `newArchEnabled`, icons/splash, bundle id/package, or an `expo.version` bump;
- an Expo SDK / React Native upgrade.

Rule of thumb: if the change would alter what `expo prebuild` generates, it is **not** OTA-eligible.

### First build after enabling updates (one-time)

`expo-updates` was added to a binary that never shipped it. **The App Store build currently live (Erudite Quiz, Apple ID 6787385686) was built without the updates runtime and can never receive OTA.** Exactly one new store build must be produced *after* this change to embed the updates runtime; only builds made from then on can accept OTA. Bundle this rebuild with the store-links change (task #876) so a single `production` rebuild + resubmit ships both.

### Multi-app note

This tree builds several apps (see [Logo Quiz](logo-quiz.md) and the `EXPO_PUBLIC_APP_SLUG` switch). The build backend injects each app's `extra.eas.projectId` at build time, but the committed `updates.url` above is Erudite Quiz's. Before enabling OTA for a sibling app built from this same tree, the backend's build-time config injection must also set `updates.url` from that app's own `expo_project_id` — otherwise a sibling build would point OTA at Erudite Quiz's EAS project.

## Lint

```
npm run lint
```

Uses ESLint with the `eslint-config-expo` preset.

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
i18n/          String tables for en, ru, es
assets/        Icons, splash, images
.maestro/      E2E flows
scripts/       Build and utility scripts
docs/          Documentation
```

## Backend Dependency

The app talks to the backend at `quiz-erudit-backend.turbosuslik.online`. Because content is downloaded once per language as a snapshot and cached for 24 hours, gameplay continues offline after a successful first sync. The initial sync still requires the backend; if it is unreachable on first launch the content cache reports an error and screens that depend on it show empty or error states. See [Content and Offline](content-and-offline.md).

## Key Configuration Files

| File | Purpose |
|------|---------|
| app.json | Expo project config (bundle ID, plugins, new architecture; the AdMob App ID lives in the `react-native-google-mobile-ads` plugin entry; EAS Update `updates.url` + `runtimeVersion` for OTA) |
| eas.json | EAS build profiles (per-profile public env: Sentry DSN, RevenueCat Android key, AdMob rewarded unit id; per-profile EAS Update `channel`) |
| package.json | Dependencies and npm scripts |
| tsconfig.json | TypeScript config with the `@/` path alias |
| .env / .env.example | Backend URL, app slug, and RevenueCat Android key |

## See Also

- [Architecture](architecture.md) -- System structure and component organization
- [Content and Offline](content-and-offline.md) -- Snapshot sync and caching
- [Logo Quiz](logo-quiz.md) -- Building the second app via `APP_SLUG`
- [INDEX](INDEX.md) -- Documentation entry point
