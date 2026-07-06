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
| EXPO_PUBLIC_APP_SLUG | App slug used in every endpoint path (see `api/client.ts`) | `erudite-quiz` |
| EXPO_PUBLIC_REVENUECAT_ANDROID_KEY | RevenueCat public Android billing key (see `lib/revenuecat.ts`) | `goog_hFgRbNrOlUHcMtKClkwWcYIBLvd` |
| EXPO_PUBLIC_REVENUECAT_IOS_KEY | RevenueCat public iOS billing key — enables iOS billing when set (see `lib/revenuecat.ts`) | *(empty — iOS billing stays off)* |
| EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID | AdMob rewarded ad-unit id for "watch ad → +1 life" on Android (see `lib/ads.ts`) | Google's test rewarded id `ca-app-pub-3940256099942544/5224354917` |
| EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID_IOS | AdMob rewarded ad-unit id for iOS — enables iOS rewarded ads when set (see `lib/ads.ts`) | *(empty — iOS ads stay off)* |

Android keys carry a committed default, so the app builds and runs without an `.env` file. The RevenueCat Android key is a public SDK key and is safe to commit; it has a literal fallback that matches the in-code default. The iOS RevenueCat key and iOS rewarded unit id have **no** committed fallback, so iOS monetization stays safely off until the owner supplies them — see [iOS Monetization Parity](ios-monetization-parity.md).

For EAS cloud builds the RevenueCat key is also wired explicitly in `eas.json` under the `preview` and `production` profiles, so release builds carry it through EAS env rather than relying on the in-code fallback. The `development` profile leaves it unset and falls back to the committed default. The value across the env wiring and the fallback is the same public Android key — they must point at the RevenueCat project the backend provisions, or the `default` offering comes back empty and the paywall has no packages to sell.

Copy `.env.example` to `.env` and adjust as needed. Note that `.env.example` ships an older slug value; the current app's content lives under the `erudite-quiz` slug, which is also the in-code default. Set `EXPO_PUBLIC_APP_SLUG=erudite-quiz` for the live content set.

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
| app.json | Expo project config (bundle ID, plugins, new architecture; the AdMob App ID lives in the `react-native-google-mobile-ads` plugin entry) |
| eas.json | EAS build profiles (per-profile public env: Sentry DSN, RevenueCat Android key, AdMob rewarded unit id) |
| package.json | Dependencies and npm scripts |
| tsconfig.json | TypeScript config with the `@/` path alias |
| .env / .env.example | Backend URL, app slug, and RevenueCat Android key |

## See Also

- [Architecture](architecture.md) -- System structure and component organization
- [Content and Offline](content-and-offline.md) -- Snapshot sync and caching
- [INDEX](INDEX.md) -- Documentation entry point
