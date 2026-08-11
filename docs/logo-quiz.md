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

Keeping level, position, and premium as pure functions of one number means the operator curates the whole ladder by assigning numbers in the backend, with no extra per-question flags to keep in sync. Numbers 1–15 are a curated first level of the most recognizable brands; 16 onward are the remaining questions in a stable random order. A default numbering run is idempotent — it keeps existing numbers and only appends newly added questions at the tail. The operator can also fully re-number the ladder from scratch, reshuffling every eligible logo and folding in ones freshly promoted out of the "Can't Generate" categories; the client is agnostic to which run produced the numbers, since it only reads the final `order`. See the backend's `docs/public-api.md` and `LogoOrderAssigner` for how numbers are minted.

### The level-select screen

The level list (`app/logo-quiz/categories.tsx`, which now renders `LogoQuizLevels` — the route keeps the historical `categories` name) draws one card per level in the app's blue (`LQColors`). `LevelCard` shows an `X/total` solved count and a progress bar; premium questions count toward the number once solved. The card shows no percentage, by design. A locked level renders as a dark card with a "Finish 9 logos in the previous level" prompt and cannot be opened — the wording names the nine free questions that actually gate progression (localized in English, Russian, and Spanish). The old gold "VIP Categories" button is gone.

Unlocking is derived, not stored (`isLevelUnlocked`). Level 1 is always open. Level N+1 unlocks once **every free question of Level N is solved** — `levelFreeSolvedCount` must reach `min(9, free-questions-in-level)`. Premium questions never gate progression, so a free player can clear the entire ladder on the nine free questions of each level. A partial final level unlocks the same way, on its own (fewer than nine) free questions.

### The level grid

Opening a level shows its 15 logos as a three-column grid (`app/logo-quiz/level.tsx`). A solved tile carries a green check. Premium tiles (positions 10–15) render blurred for a non-subscriber under a locked overlay, and tapping one routes to the Shop/paywall; a subscriber sees them unblurred and playable. Tapping a solved tile opens that question directly — the quiz screen derives its revealed "review" look from the question's solved state, so no lives or premium check gates browsing an answered logo. Opening an unsolved playable tile starts the question, or routes to the Shop when the player is out of lives. A level that does not exist — a stale deep link, or a snapshot that predates `order` — bounces the player back rather than showing an empty grid.

The lock badge on a blurred premium tile (`LogoTile` in `components/logo-quiz/logo-tile.tsx`) glows the same golden hue as the premium banner (`LQShadow.gold` over the gold gradient color), so a gated tile reads as "unlock me" rather than a dead end instead of a flat grey lock.

### VIP removed

The earlier design split categories into a regular grid and a premium "VIP" grid driven by the backend `is_vip` flag. That model is gone: the VIP screen (`app/logo-quiz/categories-vip.tsx`), its route, and the gold VIP button were all removed, and Logo Quiz no longer reads `is_vip`. Premium status is now purely a function of a question's position within its level.

## Gameplay on Real Logos

The quiz screen (`app/logo-quiz/quiz.tsx`) loads the level's questions via `questionsForLevel` and freezes them at mount. The run walks the level's **accessible** questions: a non-subscriber traverses only the nine free ones (premium logos are gated in the grid and excluded from the run), a subscriber traverses all fifteen. There is no separate "review run" — one frozen list serves both play and browse, and each question's answered state decides which behavior applies (see below). When opened from a tapped tile the run starts on that question; opened without one, it starts on the first unsolved question. Each question renders the real brand artwork from its `image_url` — resolved to a cached local file when one was downloaded, falling back to the remote URL. The answer choices are the backend's `options`, and the correct brand is the option at `correct_option`.

A correct pick lights the answer green, awards coins (doubled for premium), marks the question solved, and plays the in-place reveal. Solved state is the unit of progress: `markSolved` records the question id (see below), and level completion and unlocking derive from that set. A wrong pick stays red and costs a life; the question stays unsolved so the player can keep trying, and the run ends in game over once every life is spent. Fifty-fifty and skip hints spend coins during a real run; the skip hint reveals the brand and counts the question as solved without a reward.

The premium gate is enforced twice. The grid gates taps on premium tiles, and the quiz screen re-checks a premium question reached by a direct link, bouncing a non-subscriber to the paywall. This defense-in-depth means a stale deep link can never drop a free player into a premium round.

The result screen (`app/logo-quiz/result.tsx`) is not an interstitial between questions. It now appears only on **game over** — running out of lives. Clearing a level no longer opens a result screen: the player pages through the level's logos in place and leaves via the back button, so there is no "you completed the level" interstitial. Per-question feedback happens in place on the quiz screen (see below). The result screen still carries a win layout (confetti, "Round complete!") for a fully cleared level, but the current quiz flow never navigates to it, so in practice only the game-over layout is reached.

### Leaving the quiz

The quiz screen's back button returns to the **grid of the current level** — `router.dismissTo('/logo-quiz/level', { level })` — not the level-select list. So closing a question drops the player back onto the 15-logo board they entered from, ready to pick another logo. (The game-over result screen, by contrast, exits to the level-select list.)

### Paging within a level

Navigation is unified around each question's answered state rather than a separate mode flag. The earlier design opened solved logos in a dedicated `mode: 'review'` run that walked only the solved set; that mode is gone. Now a single frozen run holds the level's accessible questions, and the bottom row swaps based on whether the **current** question is solved:

- On an **answered** logo, the row shows ◀/▶ (`prevLogo`/`nextLogo`) paging buttons and the logo opens already revealed — green answer, Explanation shown, no economy (no coins, no life loss). This is the review look, derived from `isSolved`, not from a route param.
- On an **unanswered** logo, the ◀/▶ buttons disappear and the standard hint row (50/50, skip) returns; the player must actually play the logo.

`goPrev` and `goNext` step one question at a time and are **clamped** to the level's first and last question — they no longer wrap around. Each move runs through `goToIndex`, which re-reads the target's solved state so paging from an answered logo onto an unanswered one flips the screen back into playable mode in place (and vice versa). This lets a player page across the whole level from any answered logo, dropping into live gameplay whenever they reach one they have not solved yet.

### The in-quiz menu: report and share

The quiz HUD's left cluster carries three controls: the back button, the lives pill, and an ellipsis (`⋯`) button. Tapping the ellipsis opens `QuizMenuModal` (`components/logo-quiz/quiz-menu-modal.tsx`), a bottom sheet deliberately styled to match the settings language picker — it reuses the same dark palette and the shared `useSheetDrag` drag-to-dismiss behavior, so the in-quiz menu feels like the rest of the app chrome. The menu offers two actions on the **current** question.

**Report a problem** opens a reason picker inside the same sheet. The six choices map one-to-one onto the backend's report reasons (`incorrect_answer`, `unclear_wording`, `inappropriate`, `broken_media`, `translation_issue`, `other`); the player picks one and can add an optional free-text comment. Submitting calls the shared `submitReport` helper (`api/reports.ts`) — the same content-report pipeline the main app uses — which POSTs to `/reports` with the content type `question`, the question id, the reason, the comment, and the active locale (the app version and platform are attached by the helper). The sheet then shows a "Thank you!" confirmation, or an inline error the player can retry. See the API contract in [Data Model](data-model.md#api-contract).

**Share a logo** invokes the native share sheet via React Native's `Share`. The message is a localized invite to guess the logo with a store link appended — the link comes from `getStoreLinks(snapshot.app)` for the current platform, so it always points at the correct listing (see [Content and Offline](content-and-offline.md#store-links-from-the-app-config)). A cancelled share is a silent no-op.

All the menu, reason, confirmation, and share strings live in `constants/logo-quiz/labels.ts`, localized in English, Russian, and Spanish alongside the rest of the Logo Quiz chrome.

## Answer Reveal and Explanations

A correct answer (or a skip-hint reveal) plays an in-place animation rather than navigating away. The reveal is driven entirely by `react-native-reanimated` layout animations rather than hand-measured coordinates, which is what makes it smooth from any grid position. Flipping the `revealing` flag unmounts the wrong options — their `exiting` `FadeOut` plays as they leave the tree (~1s) — while the correct green answer, kept mounted under a stable key, stays in place and glides up to center under the question via `LinearTransition` (~1.7s) as the container re-centers the lone survivor. There is no grid-to-settled layout swap, so the answer never jumps to a final position. An earlier version measured each option's rectangle with `onLayout` and translated the answer manually, then hard-swapped the grid for a settled block; that jumped whenever the correct answer already sat near the top, so it was replaced with the layout-animation approach.

Below the centered answer, an Explanation panel fades in only after the glide lands (`FadeIn.delay(MOVE_MS)`), so mounting it never shifts the answer. The panel shows the question's localized `explanation` (blank/null explanations are omitted). There is no separate "Next" button in the reveal panel any more — advancing is done with the ◀/▶ paging buttons that occupy the bottom hint row once the question is solved. Option presses are disabled for the duration of the reveal. The options container is keyed by question id, so moving to another question remounts the whole grid as a unit — Reanimated skips child exit animations when the parent unmounts, keeping paging instant rather than replaying a fade.

The ◀/▶ paging buttons advance to the neighboring question in place — resetting the per-question state via `goToIndex` without any navigation — and are clamped at the level's ends, so paging past the last question does nothing (no result screen). Because the explanation is read straight from the frozen question list (`question.explanation`, already localized via the snapshot's `?locale=`), no round buffer or navigation payload is needed.

## Progress and Persistence

Player progress is a set of solved question ids, held in `hooks/logo-quiz/use-logo-quiz.tsx` and persisted to AsyncStorage under `logoquiz.state.v2`. Level completion, the `X/total` card counts, and every unlock are derived from this set — nothing about levels is stored. `markSolved` is idempotent, so replaying a solved question never double-counts it.

The store migrates once from the legacy `logoquiz.state.v1` key on first hydrate. That legacy blob predates the level model and only tracked per-category progress counters, which never recorded *which* questions were solved and so cannot map onto the solved-id set. The migration therefore carries forward only the economy — coins, premium status, lives, the rate-app reward, and the wheel cooldown — and starts the solved set empty. A returning player keeps their balance but re-earns their level progress on the new ladder.

## See Also

- [Content and Offline](content-and-offline.md) -- Snapshot cache, per-app namespacing, and image caching
- [Data Model](data-model.md) -- Snapshot entities and the derived `order` field
- [Architecture](architecture.md) -- Build-time app selection and module layout
- [Gamification](gamification.md) -- Premium gating and the shared monetization model
