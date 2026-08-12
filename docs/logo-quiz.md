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

The list also remembers where the player was. Whenever a level is opened, `app/logo-quiz/level.tsx` records its number via `setLastLevel`, and the level-select screen scrolls to that card on focus so returning from a level (or its victory screen) lands the player on the card they just cleared, not back at the top. `lastLevel` lives in memory only — it drives the auto-scroll within a session and is deliberately not persisted across app launches. Because a locked card is taller than an unlocked one, the exact row may not be measured yet when the scroll fires; the list falls back through `onScrollToIndexFailed`, jumping to an approximate offset and then snapping the target into view. The card settles about a third of the way down the viewport rather than flush at the top.

Unlocking is derived, not stored (`isLevelUnlocked`). Level 1 is always open. Level N+1 unlocks once **every free question of Level N is solved** — `levelFreeSolvedCount` must reach `min(9, free-questions-in-level)`. Premium questions never gate progression, so a free player can clear the entire ladder on the nine free questions of each level. A partial final level unlocks the same way, on its own (fewer than nine) free questions.

### The level grid

Opening a level shows its 15 logos as a three-column grid (`app/logo-quiz/level.tsx`). A solved tile carries a green check. Premium tiles (positions 10–15) render blurred for a non-subscriber under a locked overlay, and tapping one routes to the Shop/paywall; a subscriber sees them unblurred and playable. Tapping a solved tile opens that question directly — the quiz screen derives its revealed "review" look from the question's solved state, so no lives or premium check gates browsing an answered logo. Opening an unsolved playable tile starts the question, or routes to the Shop when the player is out of lives. A level that does not exist — a stale deep link, or a snapshot that predates `order` — bounces the player back rather than showing an empty grid.

The lock badge on a blurred premium tile (`LogoTile` in `components/logo-quiz/logo-tile.tsx`) carries the same running shimmer as the premium banner. It reuses the banner's `ShineOverlay` (from `gold-gradient`), so a shifting blik sweeps across the golden badge, clipped to its rounded shape. This animated sweep — not just a static gold glow — is what makes a gated tile read as "unlock me" rather than a dead end.

### VIP removed

The earlier design split categories into a regular grid and a premium "VIP" grid driven by the backend `is_vip` flag. That model is gone: the VIP screen (`app/logo-quiz/categories-vip.tsx`), its route, and the gold VIP button were all removed, and Logo Quiz no longer reads `is_vip`. Premium status is now purely a function of a question's position within its level.

## Gameplay on Real Logos

The quiz screen (`app/logo-quiz/quiz.tsx`) loads the level's questions via `questionsForLevel` and freezes them at mount. The run walks the level's **accessible** questions: a non-subscriber traverses only the nine free ones (premium logos are gated in the grid and excluded from the run), a subscriber traverses all fifteen. There is no separate "review run" — one frozen list serves both play and browse, and each question's answered state decides which behavior applies (see below). When opened from a tapped tile the run starts on that question; opened without one, it starts on the first unsolved question. Each question renders the real brand artwork from its `image_url` — resolved to a cached local file when one was downloaded, falling back to the remote URL. The answer choices are the backend's `options`, and the correct brand is the option at `correct_option`. Because option text is operator-authored and some brand names are long, each answer button auto-shrinks its label to fit — but the button itself keeps a fixed, standard size so every option is the same height. The shrink is font-only: the label stays on a single line and the font scales down (`adjustsFontSizeToFit` with a minimum scale) inside a fixed-height button rather than wrapping or truncating, so a long answer like "Nashville Predators" stays fully readable without making its button taller than the rest.

A correct pick lights the answer green, awards coins (doubled for premium), marks the question solved, and plays the in-place reveal. Solved state is the unit of progress: `markSolved` records the question id (see below), and level completion and unlocking derive from that set. A wrong pick stays red and costs a life; the question stays unsolved so the player can keep trying, and the run ends in game over once every life is spent. Fifty-fifty and skip hints spend coins during a real run; the skip hint reveals the brand and counts the question as solved without a reward.

The premium gate is enforced twice. The grid gates taps on premium tiles, and the quiz screen re-checks a premium question reached by a direct link, bouncing a non-subscriber to the paywall. This defense-in-depth means a stale deep link can never drop a free player into a premium round.

The result screen (`app/logo-quiz/result.tsx`) is not an interstitial between questions. It appears at the two end states of a run: **game over** (running out of lives) and **victory** (clearing the level's whole accessible set). Per-question feedback still happens in place on the quiz screen (see below) — the result screen is reached only when the run itself ends, never between individual logos.

Victory fires when the player solves the **last accessible logo** of the level. What "last accessible" means depends on the plan: a non-subscriber clears the level on all nine free logos (9/9), a subscriber on all fifteen (15/15), because the run only walks the accessible set (see [Gameplay on Real Logos](#gameplay-on-real-logos)). The `completesLevel` guard decides this on every solve — it checks whether every question in the frozen run is either already solved or the one being solved right now. It counts the current id explicitly because solved state is not yet committed at that moment. Both a correct pick and a skip-hint reveal can trigger it. When it fires, the quiz navigates to the victory layout **immediately** — there is no reveal-and-wait delay. An earlier version let the in-place reveal and explanation play for a fixed pause (`VICTORY_DELAY_MS`) before switching screens; that timer is gone, so clearing the last logo lands on Victory at once. So a free player who never touches a premium logo still gets a "Round complete!" victory at 9/9 rather than silently running out of unsolved logos.

The result screen still carries both layouts — a win layout (confetti, "Round complete!") and the game-over layout — and the current flow reaches each through its own end state.

### Leaving the quiz

The quiz screen's back button returns to the **grid of the current level** — `router.dismissTo('/logo-quiz/level', { level })` — not the level-select list. So closing a question drops the player back onto the 15-logo board they entered from, ready to pick another logo. (The result screen — both the game-over and victory layouts — exits to the level-select list instead.)

When the player lands back on the level-select list this way, it auto-scrolls to the level they just played rather than resetting to the top (see [The level-select screen](#the-level-select-screen)).

### Paging within a level

Navigation is unified around each question's answered state rather than a separate mode flag. The earlier design opened solved logos in a dedicated `mode: 'review'` run that walked only the solved set; that mode is gone. Now a single frozen run holds the level's accessible questions, and the bottom row swaps based on whether the **current** question is solved:

- On an **answered** logo, the row shows ◀/▶ (`prevLogo`/`nextLogo`) paging buttons and the logo opens already revealed — green answer, Explanation shown, no economy (no coins, no life loss). This is the review look, derived from `isSolved`, not from a route param.
- On an **unanswered** logo, the ◀/▶ buttons disappear and the standard hint row (50/50, skip) returns; the player must actually play the logo.

`goPrev` and `goNext` step one question at a time and **cycle** within the level's accessible set — they wrap around a closed ring. Next from the last accessible logo returns to the first; Previous from the first returns to the last. The ring is exactly the accessible set, so a non-subscriber loops through the nine free logos (9→1, 1→9) while a subscriber loops through all fifteen (15→1, 1→15) — a free player never pages into a premium logo, since those are excluded from the run in the first place. Each move runs through `goToIndex`, which re-reads the target's solved state so paging from an answered logo onto an unanswered one flips the screen back into playable mode in place (and vice versa). This lets a player circle the whole level from any answered logo, dropping into live gameplay whenever they reach one they have not solved yet.

### The in-quiz menu: report and share

The quiz HUD is aligned with the rest of Logo Quiz: the back button sits alone on the left, and the right cluster carries the ellipsis (`⋯`) button, the lives pill, and the coin pill in that order — the same lives-and-coins placement as the level-select and grid headers, with the `⋯` menu tucked just left of the lives. (This corrects an earlier layout where the back, lives, and `⋯` were all bunched on the left.) Tapping the ellipsis opens `QuizMenuModal` (`components/logo-quiz/quiz-menu-modal.tsx`), a bottom sheet styled to match the Logo Quiz screens. The `⋯` menu sheet uses the app's blue (`LQColors.primary` — the same blue as the Home Play/Shop/Settings buttons) with a white title, and the two action rows sit on it as grey "quiet buttons" (`LQColors.surfaceAlt`) with dark text. The report sheet keeps the lighter `BG_BASE` surface so its dark text stays readable, with every control — the reason list, the comment field, and the Cancel/Send buttons — on the same calm grey (`LQColors.surfaceAlt`) for one unified look; the selected reason is marked by an accent border and a filled radio dot rather than a different fill. It keeps the shared `useSheetDrag` drag-to-dismiss behavior. The menu offers two actions on the **current** question.

**Report a problem** opens a reason picker inside the same sheet. The six choices map one-to-one onto the backend's report reasons (`incorrect_answer`, `unclear_wording`, `inappropriate`, `broken_media`, `translation_issue`, `other`); the player picks one and can add an optional free-text comment. Submitting calls the shared `submitReport` helper (`api/reports.ts`) — the same content-report pipeline the main app uses — which POSTs to `/reports` with the content type `question`, the question id, the reason, the comment, and the active locale (the app version and platform are attached by the helper). The sheet then shows a "Thank you!" confirmation, or an inline error the player can retry. See the API contract in [Data Model](data-model.md#api-contract).

**Share a logo** attaches a picture of the question — the brand logo above a neutral 2×2 grid of the answer options, with **no** option highlighted, so a friend gets a real "guess this logo" challenge. The picture is a dedicated off-screen composition (`components/logo-quiz/share-card.tsx`) rendered outside the viewport and captured to a temporary PNG with `react-native-view-shot`'s `captureRef`. It is shared alongside the same localized invite + store link as before (the link comes from `getStoreLinks(snapshot.app)` for the current platform — see [Content and Offline](content-and-offline.md#store-links-from-the-app-config)). On iOS the RN `Share` sheet carries the file and the text together; elsewhere the image is shared through `expo-sharing` (`Sharing.shareAsync`), which can't ride text alongside the file, so the image takes priority and the invite is surfaced as the chooser title. Both native modules are loaded lazily and guarded: they are bundled in Expo Go, but a native binary built before the dependency was added lacks them — the capture then fails softly and the share falls back to the text-only invite instead of crashing. Order still matters: `handleShare` presents the share sheet **before** closing the menu (closing first unmounts the RN `Modal` mid-presentation and drops the sheet). A cancelled or platform-rejected share is a silent no-op.

All the menu, reason, confirmation, and share strings live in `constants/logo-quiz/labels.ts`, localized in English, Russian, and Spanish alongside the rest of the Logo Quiz chrome.

## Answer Reveal and Explanations

A correct answer (or a skip-hint reveal) plays an in-place animation rather than navigating away. The reveal is driven entirely by `react-native-reanimated` layout animations rather than hand-measured coordinates, which is what makes it smooth from any grid position. Flipping the `revealing` flag unmounts the wrong options — their `exiting` `FadeOut` plays as they leave the tree (~1s) — while the correct green answer, kept mounted under a stable key, stays in place and glides up to center under the question via `LinearTransition` (~1.7s) as the container re-centers the lone survivor. There is no grid-to-settled layout swap, so the answer never jumps to a final position. An earlier version measured each option's rectangle with `onLayout` and translated the answer manually, then hard-swapped the grid for a settled block; that jumped whenever the correct answer already sat near the top, so it was replaced with the layout-animation approach.

The glide itself is gated on the same `revealAnimated` flag that governs the panel timing (below). On a fresh solve the answer carries its `LinearTransition`, so it slides up to center. In review — opening an already-solved logo, or paging onto one — `revealAnimated` is false and the answer's `layout` transition is dropped entirely, so it renders straight at its final centered position with no glide. Browsing a solved logo therefore shows the settled answer at once, never a re-run of the move-to-center animation.

Below the centered answer, an Explanation panel and the ◀/▶ paging buttons appear together. Their timing is governed by the same `revealAnimated` flag that gates the answer glide — it distinguishes a **fresh solve** from **review** (opening an already-solved logo). On a fresh solve both fade in only after the answer glide lands (`FadeIn.delay(MOVE_MS)`), so mounting the panel never shifts the answer and the Explanation and the ◀/▶ nav become visible at the exact same moment. In review — paging onto a logo that is already solved, or deep-linking into one — `revealAnimated` is false, so the answer sits at its final position and both panel and nav show instantly with no delayed fade; a solved logo is never laggy to browse. `goToIndex` clears the flag on every move, so review always renders instantly, and a correct pick or skip-hint sets it just before starting the reveal.

The Explanation panel shows the question's localized `explanation` (blank/null explanations are omitted). There is no separate "Next" button in the reveal panel any more — advancing is done with the ◀/▶ paging buttons that occupy the bottom hint row once the question is solved. Both the two nav buttons are wrapped in a single `navRow` container so they fade in as one unit, synced with the panel. Option presses are disabled for the duration of the reveal. The options container is keyed by question id, so moving to another question remounts the whole grid as a unit — Reanimated skips child exit animations when the parent unmounts, keeping paging instant rather than replaying a fade.

Both the Explanation panel and the ◀/▶ buttons render as calm grey "quiet" cards — the app's standard `LQColors.surfaceAlt` (#D9E1F5) with dark text — matching the hint buttons. The panel dropped its earlier bordered lighter-surface, muted-text look so its reading text stays high-contrast on the grey.

The ◀/▶ paging buttons advance to the neighboring question in place — resetting the per-question state via `goToIndex` without any navigation — and wrap around the accessible set, so paging past the last answered logo lands back on the first rather than doing nothing. Because the explanation is read straight from the frozen question list (`question.explanation`, already localized via the snapshot's `?locale=`), no round buffer or navigation payload is needed.

## Progress and Persistence

Player progress is a set of solved question ids, held in `hooks/logo-quiz/use-logo-quiz.tsx` and persisted to AsyncStorage under `logoquiz.state.v2`. Level completion, the `X/total` card counts, and every unlock are derived from this set — nothing about levels is stored. `markSolved` is idempotent, so replaying a solved question never double-counts it.

The store migrates once from the legacy `logoquiz.state.v1` key on first hydrate. That legacy blob predates the level model and only tracked per-category progress counters, which never recorded *which* questions were solved and so cannot map onto the solved-id set. The migration therefore carries forward only the economy — coins, premium status, lives, the rate-app reward, and the wheel cooldown — and starts the solved set empty. A returning player keeps their balance but re-earns their level progress on the new ladder.

## See Also

- [Content and Offline](content-and-offline.md) -- Snapshot cache, per-app namespacing, and image caching
- [Data Model](data-model.md) -- Snapshot entities and the derived `order` field
- [Architecture](architecture.md) -- Build-time app selection and module layout
- [Gamification](gamification.md) -- Premium gating and the shared monetization model
