# Development

## Prerequisites

- Node.js (LTS)
- Expo CLI (`npx expo`)
- iOS Simulator (macOS) or Android emulator for native testing
- Maestro CLI for E2E tests

## Install Dependencies

```
npm install
```

## Run the App

```
npx expo start              # Start dev server (pick platform interactively)
npx expo start --ios        # iOS simulator
npx expo start --android    # Android emulator
npx expo start --web        # Web browser
```

The app uses Expo's new architecture (`newArchEnabled: true`) and the React Compiler experiment.

## Lint

```
npx expo lint
```

Uses ESLint with the `eslint-config-expo` preset.

## E2E Tests (Maestro)

Maestro test flows live in `.maestro/`. The bundle ID for both platforms is `com.quizzzes.erudite`.

```
maestro test .maestro/home-screen.yaml    # Verify home screen elements
maestro test .maestro/quiz-flow.yaml      # Full quiz play-through
```

The quiz flow test launches the app, starts a quiz, answers questions, and verifies progression through the UI. Test IDs used: `start-quiz-button`, `option-button-0` through `option-button-3`, `next-button`, `progress-text`.

## Project Structure

```
app/           Screens (Expo Router file-based routing)
api/           Backend client and type definitions
components/    Reusable UI components
hooks/         Custom React hooks
constants/     Theme colors and typography
assets/        Icons, splash screens, images
.maestro/      E2E test flows
scripts/       Build and utility scripts
docs/          Documentation
```

## Key Configuration Files

| File | Purpose |
|------|---------|
| app.json | Expo project config (bundle ID, plugins, experiments) |
| package.json | Dependencies and npm scripts |
| tsconfig.json | TypeScript config with `@/` path alias |

## Backend Dependency

The app requires the backend at `quiz-erudit-backend.turbosuslik.online` to be running. There is no mock server or offline mode. If the backend is unreachable, the quiz screen shows an error with a retry option.

## See Also

- [Architecture](architecture.md) -- System structure and component organization
- [INDEX](INDEX.md) -- Documentation entry point
