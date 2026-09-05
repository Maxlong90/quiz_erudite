# Coat of Arms Quiz

Coat of Arms is the fourth trivia experience built from this tree, alongside the Erudite general-knowledge quiz, [Logo Quiz](logo-quiz.md), and [Flags Quiz](flags-quiz.md). The player identifies a country from its national coat of arms. This document explains why the app exists as its own build variant, the two question shapes behind its two modes, and the design problem that shaped its most distinctive behaviour: national coats of arms often have the country's name printed on the artwork itself, which spoils the question.

## Why a Fourth App

Coat of Arms is a straight sibling of Flags Quiz — same flow (Splash → Home → Play → mode → Quiz → Result), same glossy-blue visual kit, same shared content pipeline. Rather than fork the repository or re-implement the transforms, it reuses Flags Quiz's question types, run-progress hook, image cache, and UI components, and diverges only where the subject matter demands it.

The build-time constant `APP_SLUG` (from `EXPO_PUBLIC_APP_SLUG`) decides which experience a build is. When it is `coat-of-arms`, the home route (`app/index.tsx`) redirects to `/coat-of-arms/splash` and the erudite intro, hub, and modes never render. Everything the app needs lives under the `coat-of-arms` slug in each module directory: screens in `app/coat-of-arms/`, UI in `components/coat-of-arms/`, state in `hooks/coat-of-arms/`, domain logic in `lib/coat-of-arms/`, and strings in `constants/coat-of-arms/`. Because `APP_SLUG` is a build-time constant, the redirect branch is stable across renders and never disturbs hook order.

`app.config.js` gives the variant its own Expo identity — app `name` "Coat of Arms", Expo `slug` `coat-of-arms`, and its own crest launcher icon. The separate Expo slug matters in Expo Go: sharing the base `quiz-erudit` slug would make the sibling variants collide, so opening one would show another's cached bundle. Store identity (iOS bundle id, Android package) still falls back to the Erudite identity until an operator supplies `coat-of-arms` values, and the variant ships iPhone-only (`supportsTablet: false`) because there is no tablet layout. See [Development](development.md#building-a-sibling-app-variant).

## The Spoiler Problem and the Two Image Variants

The defining constraint of this app is that a coat of arms is not a neutral picture. Of the 195 national coats in the catalogue, 64 carry the country's own name in a banner or scroll on the artwork. Shown as-is, those questions answer themselves.

The backend solves this by storing **two variants of the same coat**: a *clean* one with the name painted out, and the *original*, untouched artwork. Gameplay always shows the clean variant, so every question is a genuine test. But the original is not thrown away — it is the reward. After a **correct** answer the original fades in over the clean coat, so the player sees the real crest, name and all. The educational payoff arrives only once the player has earned it.

```
        ┌──────────────────────────────────────────────┐
        │  Backend: question_images, two variants       │
        │   variant=clean     ──→  image_url            │
        │   variant=original  ──→  image_url_original   │
        └───────────────┬──────────────────────────────┘
                        │ snapshot sync (both URLs cached)
                        ↓
        ┌──────────────────────────────────────────────┐
        │  FlagCountryQuestion                          │
        │   imageUri          (clean — always shown)    │
        │   originalImageUri  (original — or null)      │
        └───────────────┬──────────────────────────────┘
                        │
          asked ────────┴──────── answered correctly
            ↓                            ↓
      clean coat only            original dissolves in
                                 on top of the clean coat
```

Three rules govern this, and each exists for a reason:

- **Only a correct answer reveals the original.** A wrong pick is deliberately left un-revealed — the app never shows the right answer after a miss, because the player is expected to meet the question again through *Retry mistakes*. That is a standing product decision for both this app and Flags Quiz, and the original-coat reward does not change it.
- **The original is optional, and its absence is silent.** The backend emits `image_url_original` only where an original exists. It is therefore *absent* — not null — on the other 131 coats and on every other app's snapshot. `buildCountryQuestions` normalizes the missing key to `null`, and the quiz screen simply keeps showing the clean coat. Older app builds that predate the field ignore it entirely, so no forced update was needed.
- **The clean coat never fades out.** The original is layered on top at full opacity while the base stays solid. A true cross-fade would dip the composite to roughly 75% alpha at the midpoint over the white plate — a visible flicker — and, if the original ever failed to load, would fade the picture away to nothing. Holding the base opaque means only the banner text "develops" in.

Because the two variants have different URLs (the original's carries `?variant=original&v=`), each gets its own `imageMap` entry and its own file in the local cache, so both play offline. See [Content and Offline](content-and-offline.md#two-image-variants-per-question).

## The Two Game Modes

Like Flags Quiz, the app runs two modes backed by two *different* question shapes served from two different places.

```
                Coat of Arms content provider
                ┌──────────────────────────────┐
  snapshot ────→│ image_questions              │──→ "All countries"
  (in snapshot) │  coat PICTURE + 4 texts      │    (quiz.tsx)
                ├──────────────────────────────┤
  image-answer ─│ image_answer_questions       │──→ "By continents"
  (own endpoint)│  country NAME + 4 coats      │    (continent-quiz.tsx)
                └──────────────────────────────┘
```

### All countries — coat picture, text answers

`app/coat-of-arms/quiz.tsx` shows one coat and four country names. These are ordinary snapshot `image_questions` from `GET /apps/coat-of-arms/snapshot`, transformed by Flags Quiz's own `buildCountryQuestions` — the shape is identical, so the transform is shared rather than duplicated. Only the artwork differs: a coat is portrait or square where a flag is wide, so the picture sits in a square 190-point frame on a white plate and is *contained*, never cropped, so a transparent crest still reads clearly.

Russian is the one locale that overrides the backend prompt. The single-line wrap of "Какой стране принадлежит этот герб?" looked wrong on a phone, so `constants/coat-of-arms/labels.ts` supplies a two-line `quizPrompt`; every other locale keeps the backend question, whose wrap is already fine.

### By continents — country name, coat-picture answers

`app/coat-of-arms/continent-quiz.tsx` inverts the question: a country name and four coat *pictures*. These are `image_answer_questions`, kept out of the snapshot and served by `GET /apps/coat-of-arms/image-answer-questions?locale=`. `buildCoatPictureQuestions` (`lib/coat-of-arms/content.ts`) mirrors the Flags Quiz transform and differs only in its category-slug map: `COAT_CONTINENT_BY_SLUG` pins `coat-of-arms-africa` to `africa` and so on for the six continents. A question whose category slug is not in that map is dropped, so a stray backend category can never produce an empty or mislabelled continent section.

The reverse mode has **no** original-coat reward. Its option images are the four answer choices, not a single subject picture, so there is nothing to swap in place; adding it would mean revealing four originals at once, which reads as noise rather than a payoff.

### What the Play screen offers

The Play screen (`app/coat-of-arms/play.tsx`) lists five categories. "All countries" and "By continents" are live; Challenge, Cities, and Bonus level are locked "coming soon" tiles with no handler. Their crest icons are preloaded from the feature layout before any screen mounts, so opening Play does not flash empty tiles while icons decode.

## The Answer Flow and Reveal Choreography

Both gameplay screens share one flow, and neither has an economy — no lives, coins, or hints. The HUD is a back button plus help, report, and share.

A **wrong** pick turns only the tapped option red and, after `REVEAL_MS` (900 ms), skips to the next question. The correct answer is not shown.

A **correct** pick starts a three-beat reveal, and the timings are chosen so the beats do not compete:

1. The prompt hides and the three wrong options unmount. The correct option — the same mounted component, re-keyed — glides up and centres over `MOVE_MS` (900 ms).
2. As the glide lands, the history note and the "Next" button fade in over `UI_FADE_MS` (300 ms).
3. On that same beat the original coat begins dissolving in over `COAT_REVEAL_MS` (600 ms) — deliberately *slower* than the note, so it is still developing after the rest of the UI has settled and pulls the eye back up to the picture.

The wrong options are cleared without an exit animation on purpose: an exit fade would linger over the *next* question's options after a wrong pick advances the run. Answering locks on the first pick, so a double-tap cannot register two answers, and both outcomes fire a matching haptic. There is no auto-advance after a correct answer — the player controls when the reveal ends by tapping "Next".

## Content, Caching, and Offline Play

`CoatContentProvider` (`hooks/coat-of-arms/use-coat-content.tsx`) wraps the whole feature so both content sources are fetched once and shared across screens. It always targets the `coat-of-arms` slug regardless of the build's `APP_SLUG`, and skips the erudite-only answer-statistics side effects. Each sync pulls the snapshot (surfacing the JSON early so gameplay is usable before images finish), then fetches the image-answer payload, downloads its option images through `cacheImages`, and persists the raw payload under `coat.imageAnswer.v1`.

Two behaviours are worth knowing. First, the provider **forces** a snapshot refresh rather than honouring the 24-hour freshness window, because the catalogue grew from a partial set to the full 195 coats and a stale cache would have pinned early adopters to the small one. Second, once questions are built the provider prefetches every gameplay image — clean coats, original coats, and continent options — into expo-image's memory-and-disk cache. The originals are included deliberately: the reveal starts the instant a correct answer lands, so the bytes must already be *decoded*; a warm disk file alone still costs a decode frame. On web, where there is no local file cache, this prefetch is what makes the reveal work at all, pulling the remote original into the browser cache ahead of time.

Failure is degraded, not fatal. A sync that throws while a snapshot is already showing leaves the provider `ready`, so the player keeps whatever content was cached; only a total absence of usable content surfaces an error, which gameplay renders as a light message rather than an empty board.

## Progress, Review, and the Help Nudge

A run's `{ order, pos, wrong }` lives in `useRunProgress` — the same hook Flags Quiz uses — mirrored to AsyncStorage under `coat.progress.all.v1` for "All countries" and `coat.progress.continent.<continent>.v1` per continent. On entry a saved run resumes if still valid, otherwise a fresh shuffled run starts; finishing clears the key so the next entry reshuffles. Variety therefore comes from a *finished* run starting over, while an *interrupted* one is preserved exactly.

The result screen's distinctive action is **Retry mistakes**: it passes the missed question indices back into the same gameplay screen, which rebuilds the run from only those indices. A retry run is never persisted, so replaying misses cannot overwrite the main run's position.

That review loop is the whole reason the app auto-opens a help sheet. With 195 questions a player can easily assume a missed coat is simply lost, so `CoatHelpModal` opens once on the first question the player reaches — in any mode — to explain that mistakes are remembered and replayable. The flag lives under `coat.help.seen.v1`, so the nudge fires once for the lifetime of the install; the "?" button reopens it on demand thereafter.

Report and share are borrowed wholesale. Reporting opens Logo Quiz's `QuizMenuModal` straight to its report view with the real backend question id, so coat questions flow through the same `/reports` pipeline as every other app. Share captures an off-screen `CoatShareCard` — the current question rendered neutral, with no option highlighted — to a PNG and shares it with a localized invite built from `getStoreLinks`.

## What It Shares with Flags Quiz

The reuse is deliberate and broad: the `FlagCountryQuestion` and `FlagPictureQuestion` types, `buildCountryQuestions`, `groupByContinent`, `continentCounts`, `useRunProgress`, the glossy button kit, the continent artwork and keys, the share-capture helper, and most UI strings via `useFQLabels`.

What Coat of Arms adds on top is narrow and subject-driven: the `originalImageUri` reward path, its own spiral-of-crests background, its own category icons, the square contained picture frame, and a small label set (`CoaLabels`) covering the categories, the Russian prompt override, the help sheet, and result messages — the shared Flags Quiz result strings say "flags", which would be wrong here.

## See Also

- [Flags Quiz](flags-quiz.md) -- The sibling this app is derived from, and its shared question shapes
- [Content and Offline](content-and-offline.md) -- Snapshot cache, image variants, and out-of-snapshot caching
- [Data Model](data-model.md) -- The snapshot question shape and the image-answer endpoint
- [Architecture](architecture.md) -- Build-time app selection and module layout
- [Development](development.md) -- Building a sibling app variant
- [INDEX](INDEX.md) -- Documentation entry point
