# Logo Quiz

The codebase ships two trivia experiences from one Expo build tree. The primary one is the general-knowledge quiz documented across the rest of `docs/`. The second is Logo Quiz — a self-contained brand-guessing game where the player identifies a company from its real logo. This document explains why Logo Quiz exists as a separate app, how it draws its content from the same backend as the main quiz, and how its levels, gameplay, and result screen behave.

## Why a Second App

Logo Quiz is a different game with its own art direction, economy, and flow (Welcome → Shop/Wheel → Levels → Quiz → Result), but it reuses the shared content pipeline, offline cache, and localization instead of reinventing them. Rather than fork the repository, the two apps live side by side and are selected at build time.

The build-time constant `APP_SLUG` (from `EXPO_PUBLIC_APP_SLUG`) decides which experience a build is. When it is `logo-quiz`, the home route (`app/index.tsx`) immediately redirects to `/logo-quiz` and the erudite intro, hub, and modes are never shown. Everything Logo Quiz needs lives under the `logo-quiz` slug in each module directory: screens in `app/logo-quiz/`, UI in `components/logo-quiz/`, state in `hooks/logo-quiz/`, domain logic in `lib/logo-quiz/`, and strings in `constants/logo-quiz/`.

## From Mock Data to Backend Content

Logo Quiz originally shipped its questions as hardcoded mock data on the device. It now pulls the same backend snapshot the main app uses, so brands, explanations, and the level layout are edited in the backend admin (Nova) and localized per language — no app release required. The mock catalog (`constants/logo-quiz/mock-data.ts`) is gone; only the UI strings in `constants/logo-quiz/labels.ts` remain hardcoded, because they are screen chrome, not content.

Content flows through `LogoQuizContentProvider` (`hooks/logo-quiz/use-logo-quiz-content.tsx`), which mirrors the main app's content-cache provider with two deliberate differences. It always targets the `logo-quiz` slug regardless of the build's `APP_SLUG`, and it skips the erudite-only answer-statistics side effects. It hydrates from the cache on mount and re-syncs whenever the active locale changes, so questions and explanations always follow the current language. Because it requests the snapshot with `?locale=`, every string it returns — including each question's explanation — is already translated; the screens never localize content themselves.

```
build APP_SLUG == 'logo-quiz'
            │
            ↓
   app/index.tsx → Redirect /logo-quiz
            │
            ↓
   LogoQuizContentProvider ──sync 'logo-quiz' slug──→ shared content-cache
            │                                              │
            ↓                                              ↓
   buildLevels()                                  namespaced snapshot
   questionsForLevel()  ←── snapshot cache ──────  + images (offline)
```

The shared cache (`lib/content-cache.ts`) is namespaced per app slug, so a build that syncs more than one slug never lets one app's snapshot or images clobber another's. See [Content and Offline](content-and-offline.md#per-app-cache-namespacing).

## Levels and the Premium Split

Logo Quiz replaced its category grid with a linear ladder of numbered levels. The backend assigns every playable logo-quiz question a persistent 1-based number, `logo_order`, exposed in the snapshot as `order`. The client stores nothing about levels or premium status — it derives all of it from that single number in `lib/logo-quiz/content.ts`:

- `level` = `ceil(order / 15)`
- `positionInLevel` = `(order - 1) % 15` → `0..14`
- `premium` = `positionInLevel >= 9` → the six premium slots (positions 10–15)

So every level holds up to 15 questions: nine free (positions 1–9) followed by six premium (10–15). The last level may be partial when the question count is not a multiple of 15.

`buildLevels` reads the snapshot questions, drops any without a valid `order`, sorts the rest by `order`, and buckets them into dense levels of 15. Dropping the un-numbered questions is deliberate: an old snapshot that predates the `order` field degrades to an empty level list instead of crashing. `order` is read defensively because the shared `SnapshotQuestion` type does not declare it — it survives the cache round-trip as a raw field.

### Why numbers, not stored levels

Keeping level, position, and premium as pure functions of one number means the operator curates the whole ladder by assigning numbers in the backend, with no extra per-question flags to keep in sync. Numbers 1–15 are a curated first level of the most recognizable brands; 16 onward are the remaining questions in a stable random order. The numbering is persistent and idempotent — a re-run keeps existing numbers and only appends new questions at the tail. See the backend's `docs/public-api.md` and `LogoOrderAssigner` for how numbers are minted.

### The level-select screen

The level list (`app/logo-quiz/categories.tsx`, which now renders `LogoQuizLevels` — the route keeps the historical `categories` name) draws one card per level in the app's blue (`LQColors`). `LevelCard` shows an `X/total` solved count and a progress bar; premium questions count toward the number once solved. The card shows no percentage, by design. A locked level renders as a dark card with a "Finish the previous level" prompt and cannot be opened. The old gold "VIP Categories" button is gone.

Unlocking is derived, not stored (`isLevelUnlocked`). Level 1 is always open. Level N+1 unlocks once **every free question of Level N is solved** — `levelFreeSolvedCount` must reach `min(9, free-questions-in-level)`. Premium questions never gate progression, so a free player can clear the entire ladder on the nine free questions of each level. A partial final level unlocks the same way, on its own (fewer than nine) free questions.

### The level grid

Opening a level shows its 15 logos as a three-column grid (`app/logo-quiz/level.tsx`). A solved tile carries a green check. Premium tiles (positions 10–15) render blurred for a non-subscriber, and tapping one routes to the Shop/paywall; a subscriber sees them unblurred and playable. Tapping a solved tile opens that question in read-only review mode. Opening an unsolved playable tile starts the question, or routes to the Shop when the player is out of lives. A level that does not exist — a stale deep link, or a snapshot that predates `order` — bounces the player back rather than showing an empty grid.

### VIP removed

The earlier design split categories into a regular grid and a premium "VIP" grid driven by the backend `is_vip` flag. That model is gone: the VIP screen (`app/logo-quiz/categories-vip.tsx`), its route, and the gold VIP button were all removed, and Logo Quiz no longer reads `is_vip`. Premium status is now purely a function of a question's position within its level.

## Gameplay on Real Logos

The quiz screen (`app/logo-quiz/quiz.tsx`) loads the level's questions via `questionsForLevel` and freezes them at mount. What the run actually walks depends on mode and subscription. A normal play run for a non-subscriber traverses only the nine free questions; a subscriber traverses all fifteen. A review run traverses only the level's solved questions. Each question renders the real brand artwork from its `image_url` — resolved to a cached local file when one was downloaded, falling back to the remote URL. The answer choices are the backend's `options`, and the correct brand is the option at `correct_option`.

A correct pick lights the answer green, awards coins (doubled for premium), marks the question solved, and plays the in-place reveal. Solved state is the unit of progress: `markSolved` records the question id (see below), and level completion and unlocking derive from that set. A wrong pick stays red and costs a life; the question stays unsolved so the player can keep trying, and the run ends in game over once every life is spent. Fifty-fifty and skip hints spend coins during a real run; the skip hint reveals the brand and counts the question as solved without a reward.

The premium gate is enforced twice. The grid gates taps on premium tiles, and the quiz screen re-checks a premium question reached by a direct link, bouncing a non-subscriber to the paywall. This defense-in-depth means a stale deep link can never drop a free player into a premium round.

The result screen (`app/logo-quiz/result.tsx`) is not an interstitial between questions. It appears only when the run is completed or on game over — per-question feedback happens in place on the quiz screen (see below).

### Reviewing a solved logo

Tapping a solved tile opens the quiz screen with `mode: 'review'`. Review is a read-only browse of the level's solved questions, and it replaces the older "a cleared category replays as free practice" behavior. The question opens already revealed with its Explanation shown, no economy runs (no coins, no life loss), and the two hint buttons become ◀/▶ paging. `goPrev` and `goNext` wrap around the level's solved set, so the player can page through every logo they have identified in that level.

## Answer Reveal and Explanations

A correct answer (or a skip-hint reveal) plays an in-place animation rather than navigating away. The reveal is driven entirely by `react-native-reanimated` layout animations rather than hand-measured coordinates, which is what makes it smooth from any grid position. Flipping the `revealing` flag unmounts the wrong options — their `exiting` `FadeOut` plays as they leave the tree (~1s) — while the correct green answer, kept mounted under a stable key, stays in place and glides up to center under the question via `LinearTransition` (~1.7s) as the container re-centers the lone survivor. There is no grid-to-settled layout swap, so the answer never jumps to a final position. An earlier version measured each option's rectangle with `onLayout` and translated the answer manually, then hard-swapped the grid for a settled block; that jumped whenever the correct answer already sat near the top, so it was replaced with the layout-animation approach.

Below the centered answer, an Explanation panel and a `Next` button fade in only after the glide lands (`FadeIn.delay(MOVE_MS)`), so mounting them never shifts the answer. The panel shows the question's localized `explanation` (blank/null explanations are omitted) and the button sits above the hint row. Option presses are disabled for the duration of the reveal. The options container is keyed by question id, so moving to another question remounts the whole grid as a unit — Reanimated skips child exit animations when the parent unmounts, keeping `Next` and review paging instant rather than replaying a fade.

`Next` (play only) advances to the following question in place — resetting the per-question state via `goToIndex` without any navigation — or, on the run's last question, opens the result screen with `outcome: 'complete'` and `score = total`. In a review browse there is no `Next`; the ◀/▶ buttons page through the solved set instead. Because the explanation is read straight from the frozen question list (`question.explanation`, already localized via the snapshot's `?locale=`), no round buffer or navigation payload is needed.

## Progress and Persistence

Player progress is a set of solved question ids, held in `hooks/logo-quiz/use-logo-quiz.tsx` and persisted to AsyncStorage under `logoquiz.state.v2`. Level completion, the `X/total` card counts, and every unlock are derived from this set — nothing about levels is stored. `markSolved` is idempotent, so replaying a solved question never double-counts it.

The store migrates once from the legacy `logoquiz.state.v1` key on first hydrate. That legacy blob predates the level model and only tracked per-category progress counters, which never recorded *which* questions were solved and so cannot map onto the solved-id set. The migration therefore carries forward only the economy — coins, premium status, lives, the rate-app reward, and the wheel cooldown — and starts the solved set empty. A returning player keeps their balance but re-earns their level progress on the new ladder.

## See Also

- [Content and Offline](content-and-offline.md) -- Snapshot cache, per-app namespacing, and image caching
- [Data Model](data-model.md) -- Snapshot entities and the derived `order` field
- [Architecture](architecture.md) -- Build-time app selection and module layout
- [Gamification](gamification.md) -- Premium gating and the shared monetization model
