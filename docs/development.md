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

All three keys carry a committed default, so the app builds and runs without an `.env` file. The RevenueCat key is a public SDK key and is safe to commit; it has a literal fallback that matches the in-code default.

Copy `.env.example` to `.env` and adjust as needed. Note that `.env.example` ships an older slug value; the current app's content lives under the `erudite-quiz` slug, which is also the in-code default. Set `EXPO_PUBLIC_APP_SLUG=erudite-quiz` for the live content set.

## Run the App

```
npm start                   # Expo dev server (pick platform interactively)
npm run ios                 # Build and run on iOS
npm run android             # Build and run on Android
npm run web                 # Web browser
```

`npm start` maps to `expo start`. The app uses Expo's new architecture (`newArchEnabled: true`). On web, the on-device image cache is skipped — the browser caches snapshot images itself.

Real in-app purchases run through RevenueCat / Google Play, whose native module (`react-native-purchases`) autolinks via prebuild and is absent in Expo Go and on web. In those dev environments — and on iOS, which has no key yet — RevenueCat stays disabled and the shop and paywall fall back to local grants, so the dev flow never breaks. Exercising the real purchase and subscription flows requires an Android device build (`npm run android` against a prebuild). See [Gamification](gamification.md#premium-and-the-shop).

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
| app.json | Expo project config (bundle ID, plugins, new architecture) |
| package.json | Dependencies and npm scripts |
| tsconfig.json | TypeScript config with the `@/` path alias |
| .env / .env.example | Backend URL, app slug, and RevenueCat Android key |

## See Also

- [Architecture](architecture.md) -- System structure and component organization
- [Content and Offline](content-and-offline.md) -- Snapshot sync and caching
- [INDEX](INDEX.md) -- Documentation entry point
