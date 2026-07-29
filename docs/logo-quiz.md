# Logo Quiz

The codebase ships two trivia experiences from one Expo build tree. The primary one is the general-knowledge quiz documented across the rest of `docs/`. The second is Logo Quiz — a self-contained brand-guessing game where the player identifies a company from its real logo. This document explains why Logo Quiz exists as a separate app, how it now draws its content from the same backend as the main quiz, and how its categories, gameplay, and result screen behave.

## Why a Second App

Logo Quiz is a different game with its own art direction, economy, and flow (Welcome → Shop/Wheel → Quiz → Result), but it reuses the shared content pipeline, offline cache, and localization instead of reinventing them. Rather than fork the repository, the two apps live side by side and are selected at build time.

The build-time constant `APP_SLUG` (from `EXPO_PUBLIC_APP_SLUG`) decides which experience a build is. When it is `logo-quiz`, the home route (`app/index.tsx`) immediately redirects to `/logo-quiz` and the erudite intro, hub, and modes are never shown. Everything Logo Quiz needs lives under the `logo-quiz` slug in each module directory: screens in `app/logo-quiz/`, UI in `components/logo-quiz/`, state in `hooks/logo-quiz/`, domain logic in `lib/logo-quiz/`, and strings in `constants/logo-quiz/`.

## From Mock Data to Backend Content

Logo Quiz originally shipped its categories and questions as hardcoded mock data on the device. It now pulls the same backend snapshot the main app uses, so brands, categories, and explanations are edited in the backend admin (Nova) and localized per language — no app release required. The mock catalog (`constants/logo-quiz/mock-data.ts`) is gone; only the UI strings in `constants/logo-quiz/labels.ts` remain hardcoded, because they are screen chrome, not content.

Content flows through `LogoQuizContentProvider` (`hooks/logo-quiz/use-logo-quiz-content.tsx`), which mirrors the main app's content-cache provider with two deliberate differences. It always targets the `logo-quiz` slug regardless of the build's `APP_SLUG`, and it skips the erudite-only answer-statistics side effects. It hydrates from the cache on mount and re-syncs whenever the active locale changes, so category names, questions, and explanations always follow the current language. Because it requests the snapshot with `?locale=`, every string it returns — including each question's explanation — is already translated; the screens never localize content themselves.

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
   buildCategories()                              namespaced snapshot
   questionsForCategory()  ←── snapshot cache ────  + images (offline)
```

The shared cache (`lib/content-cache.ts`) is namespaced per app slug, so a build that syncs more than one slug never lets one app's snapshot or images clobber another's. See [Content and Offline](content-and-offline.md#per-app-cache-namespacing).

## Categories and the VIP Split

`lib/logo-quiz/content.ts` turns the raw snapshot into the flat, already-localized view models the screens render. `buildCategories` reads every snapshot category and splits it by the backend's `is_vip` flag: regular categories (`is_vip=false`) feed the main grid (`app/logo-quiz/categories.tsx`), VIP categories (`is_vip=true`) feed the separate VIP grid (`app/logo-quiz/categories-vip.tsx`). This flag is the single source of truth for the split — the app no longer decides which categories are premium.

Two business rules shape the grid:

- **Empty categories stay visible.** A category with zero questions is kept, not hidden, and its tile shows a `X/Y` progress-over-total count that reads `0/0` until the backend is populated. `questionsForCategory` counts questions per category slug from the snapshot, so the moment an admin adds questions in Nova the real total appears — no app change. The tile name, icon, and emoji all come from the backend. `buildCategories` resolves each category's `icon_url` through `resolveLocalImage`, so a category with an uploaded icon renders that artwork (from the cached local file when it was downloaded, otherwise the remote URL); a category with no `icon_url` falls back to its `icon_emoji`, and a category with neither falls back to a default tag glyph. `CategoryCard` picks the image when `iconUri` is set and the emoji otherwise, so the fallback is invisible to the player.
- **VIP is a permanent section that is temporarily empty.** No category is flagged VIP today, so the VIP grid renders a localized "Coming soon" empty state. The gold VIP button on the regular grid stays in place regardless — the section is reserved for future content, not removed. When VIP categories do appear, they remain premium-gated.

The premium gate lives only on the VIP screen. Opening a regular category always starts a round (or routes to the Shop when the player is out of lives). Opening a VIP category sends a non-subscriber — or a player with no lives — to the Shop instead; only a premium player with lives enters the round, carrying a `vip` flag so the result screen knows which grid to return to.

## Gameplay on Real Logos

The quiz screen (`app/logo-quiz/quiz.tsx`) loads the chosen category's questions from the snapshot cache via `questionsForCategory`, in backend order, and freezes that list for the whole run. Each question renders the real brand artwork from its `image_url` — resolved to a cached local file when one was downloaded, falling back to the remote URL — rather than an emoji or a colored glyph. The answer choices are the backend's `options`, and the correct brand is the option at `correct_option`.

The round is played level by level. A correct pick lights the answer green, awards coins (doubled for premium), and advances progress; a wrong pick stays red and costs a life, ending the round in game over once every life is spent. A category the player has already cleared replays as a free practice: no coin rewards, no life loss, free hints, and the two hint buttons become level navigation so the player can page through the logos. Fifty-fifty and skip hints spend coins during a real run.

The win screen (`app/logo-quiz/result.tsx`) is no longer an interstitial between questions. It appears only when the whole category is cleared or on game over — the per-question feedback now happens in place on the quiz screen (see below).

## Answer Reveal and Explanations

A correct answer (or a skip-hint reveal) plays an in-place animation rather than navigating away. The reveal is driven entirely by `react-native-reanimated` layout animations rather than hand-measured coordinates, which is what makes it smooth from any grid position. Flipping the `revealing` flag unmounts the wrong options — their `exiting` `FadeOut` plays as they leave the tree (~1s) — while the correct green answer, kept mounted under a stable key, stays in place and glides up to center under the question via `LinearTransition` (~1.7s) as the container re-centers the lone survivor. There is no grid-to-settled layout swap, so the answer never jumps to a final position. An earlier version measured each option's rectangle with `onLayout` and translated the answer manually, then hard-swapped the grid for a settled block; that jumped whenever the correct answer already sat near the top, so it was replaced with the layout-animation approach.

Below the centered answer, an Explanation panel and a `Next` button fade in only after the glide lands (`FadeIn.delay(MOVE_MS)`), so mounting them never shifts the answer. The panel shows the question's localized `explanation` (blank/null explanations are omitted) and the button sits above the hint row. Option presses are disabled for the duration of the reveal. The options container is keyed by question id, so a level change remounts the whole grid as a unit — Reanimated skips child exit animations when the parent unmounts, keeping `Next` and practice paging instant rather than replaying a fade.

`Next` advances to the following question in place — resetting the per-question state via `goToLevel` without any navigation — or, on the category's last question, opens the Victory screen with `outcome: 'complete'` and `score = total`. In a practice replay it simply wraps back to the first level instead of showing Victory. Because the explanation is read straight from the frozen question list (`question.explanation`, already localized via the snapshot's `?locale=`), no round buffer or navigation payload is needed.

## See Also

- [Content and Offline](content-and-offline.md) -- Snapshot cache, per-app namespacing, and image caching
- [Data Model](data-model.md) -- Snapshot entities and the `is_vip` flag
- [Architecture](architecture.md) -- Build-time app selection and module layout
- [Gamification](gamification.md) -- Premium gating and the shared monetization model
