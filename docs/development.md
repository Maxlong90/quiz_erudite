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
| EXPO_PUBLIC_APP_SLUG | App slug used in every endpoint path; also selects which app the build is — see [Building a sibling app variant](#building-a-sibling-app-variant) for the recognized values (see `api/client.ts`, `app/index.tsx`) | `erudite-quiz` |
| EXPO_PUBLIC_REVENUECAT_ANDROID_KEY | RevenueCat public Android billing key (see `lib/revenuecat.ts`) | `goog_hFgRbNrOlUHcMtKClkwWcYIBLvd` |
| EXPO_PUBLIC_REVENUECAT_IOS_KEY | RevenueCat public iOS billing key — enables iOS billing when set (see `lib/revenuecat.ts`) | *(empty — iOS billing stays off)* |
| EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID | AdMob rewarded ad-unit id for "watch ad → +1 life" on Android (see `lib/ads.ts`) | Google's test rewarded id `ca-app-pub-3940256099942544/5224354917` |
| EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID_IOS | AdMob rewarded ad-unit id for iOS — enables iOS rewarded ads when set (see `lib/ads.ts`) | *(empty — iOS ads stay off)* |
| EXPO_PUBLIC_IOS_BUNDLE_ID | iOS bundle identifier for a sibling variant — gives that build its own store identity so its store products resolve (see `app.config.js`) | *(falls back to the Erudite bundle id)* |
| EXPO_PUBLIC_ANDROID_PACKAGE | Android package for a sibling variant — the Android counterpart of the bundle id (see `app.config.js`) | *(falls back to the Erudite package)* |
| EXPO_DEV_OWNER | Pins the Expo Go dev manifest to one tester's Expo account, so a self-hosted dev tunnel opens on their device; also strips the EAS/updates link (see `app.config.js`) | *(unset — manifest carries no owner)* |

Android keys carry a committed default, so the app builds and runs without an `.env` file. The RevenueCat Android key is a public SDK key and is safe to commit; it has a literal fallback that matches the in-code default. The iOS RevenueCat key and iOS rewarded unit id have **no** committed fallback, so iOS monetization stays safely off until the owner supplies them — see [iOS Monetization Parity](ios-monetization-parity.md).

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

Real in-app purchases run through RevenueCat, whose native module (`react-native-purchases`) autolinks via prebuild and is absent in Expo Go and on web. RevenueCat is enabled per-platform by capability, not by a hardcoded `Platform.OS`: it turns on for any native platform that has a public store key configured. Android ships with a committed fallback key so it is always on; iOS has no committed key, so it stays disabled until `EXPO_PUBLIC_REVENUECAT_IOS_KEY` is supplied, then lights up automatically. In genuine dev environments (Expo Go / web) the shop and paywall fall back to local grants so the dev flow never breaks; on a real store device with billing disabled (iOS today) they instead **fail closed** — no free grant. Exercising the real purchase and subscription flows requires an Android device build (`npm run android` against a prebuild). See [Gamification](gamification.md#premium-and-the-shop) and [iOS Monetization Parity](ios-monetization-parity.md).

### AdMob rewarded ads

The "watch ad → +1 life" reward uses AdMob via `react-native-google-mobile-ads` (wrapped in `lib/ads.ts`). Two pieces of configuration:

- **App ID (native, needs a build):** set in `app.json` under the `react-native-google-mobile-ads` config-plugin entry in `expo.plugins`, as `androidAppId` (`ca-app-pub-3182366039408506~9059612261`, the real Android app) and `iosAppId` (a Google sample placeholder until the real iOS AdMob App ID is supplied — iOS ads stay disabled at runtime). The plugin injects the App ID into `AndroidManifest.xml` at prebuild, so changing it requires re-running `npx expo prebuild` / a new build.
- **Rewarded unit id (runtime env):** `EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID` (Android) and `EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID_IOS` (iOS). The Android in-code default is Google's official **test** rewarded id, so dev / Expo Go / any build without the env var never touch the real unit and can't earn a policy strike. The real Android unit id (`ca-app-pub-3182366039408506/4318421474`) is wired only in `eas.json` under the `preview` and `production` `env` blocks; the `development` profile leaves it unset and falls back to the test id. iOS has **no** committed fallback unit id, so its rewarded ads stay off until `EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID_IOS` is provided.

Like RevenueCat, rewarded ads are gated by capability, not a hardcoded `Platform.OS`: `adsEnabled` is true on any native platform that has a rewarded unit id configured. Android always has one (its test fallback); iOS stays off until its unit id and real AdMob App ID are supplied, then lights up automatically. In Expo Go / web, or wherever no unit id exists, `adsEnabled` is `false`, the watch-ad buttons hide, and no life is ever granted where an ad can't run. Testing the real rewarded flow requires an Android device build (`npm run android` against a prebuild); AdMob may show the app as "verification required" until the SDK serves its first requests, which is expected and does not block integration. See [Gamification](gamification.md#the-rewarded-ad-watch-ad--1-life) and [iOS Monetization Parity](ios-monetization-parity.md).

## Building a sibling app variant

Every sibling app is built from this same tree by flipping `EXPO_PUBLIC_APP_SLUG`. Five values select a sibling; anything else builds the main Erudite quiz:

| `EXPO_PUBLIC_APP_SLUG` | Builds | Expo `slug` override | Docs |
|------------------------|--------|----------------------|------|
| `logo-quiz` | Logo Quiz | *(none — keeps the base)* | [Logo Quiz](logo-quiz.md) |
| `flags-quiz` | Flags Quiz | `flags-quiz` | [Flags Quiz](flags-quiz.md) |
| `coat-of-arms` | Coat of Arms | `coat-of-arms` | [Coat of Arms](coat-of-arms-quiz.md) |
| `sport-quiz` | Sport Quiz | `sport-quiz` | [Sport Quiz](sport-quiz.md) |
| `italy-history-and-geography-quiz` | Italy Quiz (scaffold) | `italy-quiz` | [Architecture](architecture.md#italy-quiz-an-unfinished-variant) |

`app.config.js` is a dynamic Expo config layered over the static `app.json`. For a build that is not a sibling variant it returns `app.json` byte-for-byte, so existing Erudite builds are unaffected. Every sibling branch overrides the app `name` and takes its iOS `bundleIdentifier` and Android `package` from `EXPO_PUBLIC_IOS_BUNDLE_ID` / `EXPO_PUBLIC_ANDROID_PACKAGE`, and every one ships iPhone-only (`ios.supportsTablet: false`) because none has a tablet layout yet — which also matters for App Store review, since Apple otherwise reviews on iPad.

Every branch except `logo-quiz` also overrides the Expo project `slug`. Sharing the base `quiz-erudit` slug makes variants collide in Expo Go, so opening one shows another's cached bundle. The logo variant deliberately keeps the base slug: it identifies the established EAS project, not the store listing. The Flags Quiz and Coat of Arms branches additionally override the launcher icon (`icon` plus the Android adaptive foreground) so the variant never shows another app's mark.

The `logo-quiz-preview` and `logo-quiz-production` profiles in `eas.json` set `EXPO_PUBLIC_APP_SLUG=logo-quiz` plus that app's bundle id, package, and RevenueCat keys. Those values ship as `REPLACE_WITH_APP2_…` placeholders; until an operator fills them, the identity vars fall back to the Erudite identity, so the sibling's store products do not resolve and the shop fails closed on a device (local-granting only in Expo Go). Filling the placeholders is a separate ops step, not a code change. The other siblings have no dedicated `eas.json` profile yet, so their bundle id and package likewise fall back to the Erudite identity. That is harmless for Flags Quiz and Coat of Arms, which ship no shop or paywall; for [Sport Quiz](sport-quiz.md#coin-packs-are-not-yet-real-purchases) it is the reason its coin packs still grant locally instead of billing.

### Running Italy Quiz in Expo Go

The Italy Quiz branch behaves differently from the others: it strips `runtimeVersion`, `updates`, and `extra.eas` from the config. A manifest carrying those fields reads as an updates-enabled EAS app, and Expo Go then demands an Expo-account sign-in that an offline dev server cannot satisfy. It also pins `owner` from `EXPO_DEV_OWNER`, because iOS Expo Go opens a self-hosted (non-`exp.direct`) dev tunnel only when the manifest owner matches the account the device is signed into *and* the CLI is signed into that same account. The same stripping happens for any variant when `EXPO_OFFLINE` or `EXPO_DEV_OWNER` is set, so a dev tunnel is always Expo-Go-friendly while EAS and store builds get their config back byte-for-byte.

Real sibling purchases run through the same RevenueCat wrapper (`lib/revenuecat.ts`) as the main app, using the shared `premium` entitlement and `default` offering. So the same capability gating applies: enabled on a native platform with a configured key, fail-closed on a real device with the store off, local-grant only in Expo Go / web.

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

Uses ESLint with the `eslint-config-expo` preset.

## Unit Tests (Jest)

```
npm test
```

Runs the Jest suite (`jest-expo` preset). The 35 test files live in `__tests__/` and cover the device-local business logic in `lib/` and `hooks/` — content-cache namespacing and the two-variant image collection, the hint and lives economies, answer stats, store links, RevenueCat gating, the Logo Quiz and Flags Quiz content transforms, and similar pure logic. `__tests__/app/` also holds screen-level integration tests that render a screen with its dependencies mocked: one pins the API-fallback no-repeat guarantees (dedupe by ID, seen filter), another pins the Coat of Arms reveal (the original image appears only after a correct answer, and never when the question has none). There is no device, emulator, or backend dependency, so the whole suite finishes in **under 10 seconds** and is safe to run on every change. It is not a long-running operation.

**Known failure — the suite does not currently pass.** On Node 20 every one of the 35 suites aborts while loading with `TypeError: Super expression must either be null or a function`, thrown from `expo/src/winter/fetch/FetchResponse.ts` as the `winter` runtime installs its `fetch` global. The polyfill subclasses a `Response` that is not a constructor under the Jest environment, so the failure happens at module load and is unrelated to any individual test's assertions. It is a toolchain mismatch between the installed `expo` and `jest-expo` versions, not a regression in app code; resolving it needs a dependency fix (aligning or upgrading those two, or shimming the `fetch` globals in the Jest setup), after which the assertions above become meaningful again. Until then `npm test` cannot be used as a gate, and changes have to be verified on the emulator instead.

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
| app.json | Expo project config (bundle ID, plugins, new architecture; the AdMob App ID lives in the `react-native-google-mobile-ads` plugin entry; the fixed EAS Update `runtimeVersion` for OTA — `updates.url` + EAS `projectId` are injected per-app by the build backend) |
| eas.json | EAS build profiles (per-profile public env: Sentry DSN, RevenueCat Android key, AdMob rewarded unit id; per-profile EAS Update `channel`) |
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
- [INDEX](INDEX.md) -- Documentation entry point
