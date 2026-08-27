# Flags Quiz

The build tree ships a third trivia experience alongside the general-knowledge quiz and [Logo Quiz](logo-quiz.md): Flags Quiz, internally labelled the "App Template: Geography". The player identifies countries by their flag. This document explains why Flags Quiz exists as a separate app, the two distinct question shapes that back its two game modes, and how it reuses the shared content pipeline while introducing a new out-of-snapshot content source.

## Why a Third App

Flags Quiz is a different game with its own art direction and flow (Home → Play → mode → Quiz → Result). Rather than fork the repository, it lives side by side with the other two apps and is selected at build time, exactly like Logo Quiz. It reuses the shared content cache, localization, store links, and content-report pipeline instead of reinventing them.

The build-time constant `APP_SLUG` (from `EXPO_PUBLIC_APP_SLUG`) decides which experience a build is. When it is `flags-quiz`, the home route (`app/index.tsx`) immediately redirects to `/flags-quiz/splash`, and the erudite intro, hub, and modes never render. Everything Flags Quiz needs lives under the `flags-quiz` slug in each module directory: screens in `app/flags-quiz/`, UI in `components/flags-quiz/`, state in `hooks/flags-quiz/`, domain logic in `lib/flags-quiz/`, and strings and theme in `constants/flags-quiz/`. Because `APP_SLUG` is a build-time constant, the redirect branch is stable across renders and never disturbs hook order.

Flags Quiz gives itself its own Expo project identity in `app.config.js` — the app `name` becomes "Flags Quiz" and the Expo `slug` becomes `flags-quiz`. This matters in Expo Go: sharing the base `quiz-erudit` slug would make the flags and logo variants collide, so opening one would show the other's cached bundle. Its store identity (iOS bundle id and Android package) still falls back to the Erudite identity until an operator supplies `flags-quiz` values. See [Development](development.md#building-a-sibling-app-variant).

## The Two Game Modes

The heart of Flags Quiz is two game modes backed by two *different* question shapes. This split is the app's defining design decision, because the two shapes are served by different backend endpoints and cached in different ways.

```
                 Flags Quiz content provider
                 ┌──────────────────────────┐
   snapshot ────→│ image_questions          │──→ "All countries"
   (in snapshot) │  flag PICTURE + 4 texts  │    (quiz.tsx)
                 ├──────────────────────────┤
   image-answer ─│ image_answer_questions   │──→ "By continent"
   (own endpoint)│  country NAME + 4 flags  │    (continent-quiz.tsx)
                 └──────────────────────────┘
```

### All countries — flag picture, text answers

The "All countries" mode (`app/flags-quiz/quiz.tsx`) shows a flag image and four text options, one correct. These questions are the app's `image_questions`, served inside the shared content snapshot at `GET /apps/flags-quiz/snapshot`. `buildCountryQuestions` (`lib/flags-quiz/content.ts`) is a pure transform from snapshot rows to `FlagCountryQuestion`, resolving each flag image through the snapshot's downloaded image map.

The run walks every country question in snapshot order — it is not shuffled, because the catalogue itself is the intended order.

### By continent — country name, flag-picture answers

The "By continent" mode (`app/flags-quiz/continent-quiz.tsx`) inverts the question: it shows a country name and four flag *pictures* as options. These are the app's `image_answer_questions` — the "image is the answer" shape. They are deliberately kept OUT of the snapshot and served by their own endpoint, `GET /apps/flags-quiz/image-answer-questions?locale=`. Each row already carries its four pre-baked image options and the correct index. `buildPictureQuestions` transforms them into `FlagPictureQuestion` and `groupByContinent` buckets them by continent.

Each continent question is mapped to a frontend `ContinentKey` through `CONTINENT_BY_SLUG`, which pins a backend category slug (for example `flags-africa`) to a section key (`africa`). A question whose category slug is not in that map has no matching section and is dropped, so a stray backend category never produces an empty or mislabelled continent. The continent list (`app/flags-quiz/continents.tsx`) shows a live per-continent question count read from `continentCounts` — no hardcoded totals — and America is split into North and South.

Unlike "All countries", a "By continent" run is shuffled at the start of every play, so repeat rounds within one continent are not identical.

## The Content Provider and Its Two Sources

`FlagsQuizContentProvider` (`hooks/flags-quiz/use-flags-quiz-content.tsx`) wraps the whole feature (declared in `app/flags-quiz/_layout.tsx`) so both content sources are fetched once and shared across every screen. It mirrors the other apps' content providers but fetches two sources instead of one, and — like Logo Quiz — always targets the `flags-quiz` slug regardless of the build's `APP_SLUG` and skips the erudite-only answer-statistics side effects.

On each sync the provider:

1. Pulls the content snapshot (`syncContent`), surfacing the JSON early via `onSnapshot` so "All countries" and the app config are usable before images finish downloading. This drives the first half of the progress bar.
2. Fetches the image-answer payload from `/apps/flags-quiz/image-answer-questions`, downloads its option images into the same namespaced image cache via `cacheImages`, and persists the raw payload to AsyncStorage under `flags.imageAnswer.v1`. This drives the second half.

Both sources re-sync whenever the active locale changes, so country names, options, and flag notes always follow the current language. The provider hydrates from both caches on mount for instant offline play, then always attempts a sync; `syncContent` itself decides whether the snapshot cache is fresh enough to skip the network. A locale flip mid-sync is handled by an in-flight guard (`inflightLocale`): a superseded sync stops writing state, so a fast language switch never lands stale content.

Failure is degraded, not fatal. If a sync throws but a snapshot is already showing, the provider stays `ready` rather than flipping to `error` — the player keeps whatever content was cached. Only a total absence of usable content surfaces the error state, which the gameplay screens render as a light message instead of an empty board.

### Caching content served outside the snapshot

The image-answer options are the first content in the codebase served *outside* the snapshot, so they cannot ride the snapshot's own image download. `cacheImages` (`lib/content-cache.ts`) exists for exactly this: it downloads an arbitrary set of image URLs into an app's namespaced image cache and returns a URL → local-file map, reusing the same directory scheme and unique-filename hashing as the snapshot sync. A URL cached this way resolves exactly like a snapshot image, and on web (no writable filesystem) it returns an empty map so the UI falls back to remote URLs. See [Content and Offline](content-and-offline.md#caching-content-served-outside-the-snapshot).

## The Answer Flow

Both gameplay screens share one answer flow, and neither has an economy — there are no lives, coins, or hints, so the HUD is only a back button plus report and share. A run is a fixed list of questions (`askIdxs`), and the header shows a `position/total` progress counter.

- A **wrong** pick flashes the tapped option red, records the question's index in a `wrong` list, and after a brief reveal (`REVEAL_MS`, 900 ms) skips to the next question. Only the tapped option changes colour — a wrong pick never reveals the correct answer, so the player has to learn it elsewhere.
- A **correct** pick flashes the option green and reveals the flag note (the question's `explanation`) beneath the options. The player taps the note to advance. When a question has no note, the reveal is a bare "tap to continue" affordance.
- After the **last** question the run navigates to the result screen with the score and the list of missed question indices.

Both correct and wrong picks fire a matching haptic. Answering is locked once a pick is registered, so a double-tap cannot register two answers.

### Retry only the misses

The result screen (`app/flags-quiz/result.tsx`) mirrors the Erudite results format — a score tile, a percentage, and a tiered message — in the Flags Quiz visual language. Its distinctive action is **retry mistakes**: it passes the missed question indices back into the same gameplay screen as a `retry` param, and the screen rebuilds the run from ONLY those indices. This lets a player re-attempt exactly the flags they got wrong rather than replaying the whole set. The result screen also offers a full replay and a return home, and it routes replay/retry back to the correct mode (`quiz` or `continent-quiz`) based on which mode produced the result.

## Reused Infrastructure and What Is Still Stubbed

Flags Quiz leans on shared building blocks rather than its own copies:

- **Report a problem** reuses Logo Quiz's `QuizMenuModal` opened straight to its report view, so flag questions flow through the same `/reports` pipeline as the other apps. The gameplay screens report the real backend question id; the continent-list screen has no per-question context, so it reports a placeholder id.
- **Share** builds the store link through `getStoreLinks` for the current platform and shares a localized invite. See [Content and Offline](content-and-offline.md#store-links-from-the-app-config).
- **Settings** (`app/flags-quiz/settings.tsx`) uses the shared `LocaleProvider` for its flag-per-language picker (ru/en/es) and the shared RevenueCat wrapper for Restore Purchases; Cancel Subscription opens the platform's own subscription-management page.

Several surfaces are intentionally forward-looking. The Play screen shows five modes, but Challenge, Draw a flag, and Maps are locked "coming soon" buttons with no handler. Settings carries Restore Purchases and Cancel Subscription even though Flags Quiz has no shop or paywall yet, so premium is not exercised in gameplay. And `constants/flags-quiz/continent-flags.ts` holds a placeholder catalogue of SVG-drawn flags that predates the backend content; the live "By continent" game draws from `image_answer_questions`, so only that file's `ContinentKey` type is still on the live path.

## Visual Language

Every Flags Quiz screen is blue with glossy buttons. The home, play, settings, and result screens sit on `AppBackground` — a full-screen spiral-of-flags artwork — while the gameplay and continent-list screens use a plain blue `GradientBackground` so the flags read clearly against the answer content. The result screen reuses the spiral artwork under a soft blur. Screens gate their content on the flags artwork finishing a warm-up (`useFlagsBgReady`) and hold on a flat blue base (`BG_BASE`) until it is cached, so the background and buttons appear together with no one-second pop-in.

## See Also

- [Content and Offline](content-and-offline.md) -- Snapshot cache, per-app namespacing, and out-of-snapshot image caching
- [Data Model](data-model.md) -- The snapshot shape and the image-answer endpoint
- [Architecture](architecture.md) -- Build-time app selection and module layout
- [Logo Quiz](logo-quiz.md) -- The second app built from the same tree
- [Development](development.md) -- Building a sibling app variant
