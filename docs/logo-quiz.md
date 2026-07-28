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

- **Empty categories stay visible.** A category with zero questions is kept, not hidden, and its tile shows a `X/Y` progress-over-total count that reads `0/0` until the backend is populated. `questionsForCategory` counts questions per category slug from the snapshot, so the moment an admin adds questions in Nova the real total appears — no app change. The tile name and emoji also come from the backend; a category with no `icon_emoji` falls back to a default tag glyph.
- **VIP is a permanent section that is temporarily empty.** No category is flagged VIP today, so the VIP grid renders a localized "Coming soon" empty state. The gold VIP button on the regular grid stays in place regardless — the section is reserved for future content, not removed. When VIP categories do appear, they remain premium-gated.

The premium gate lives only on the VIP screen. Opening a regular category always starts a round (or routes to the Shop when the player is out of lives). Opening a VIP category sends a non-subscriber — or a player with no lives — to the Shop instead; only a premium player with lives enters the round, carrying a `vip` flag so the result screen knows which grid to return to.

## Gameplay on Real Logos

The quiz screen (`app/logo-quiz/quiz.tsx`) loads the chosen category's questions from the snapshot cache via `questionsForCategory`, in backend order, and freezes that list for the whole run. Each question renders the real brand artwork from its `image_url` — resolved to a cached local file when one was downloaded, falling back to the remote URL — rather than an emoji or a colored glyph. The answer choices are the backend's `options`, and the correct brand is the option at `correct_option`.

The round is played level by level. A correct pick lights the answer green, awards coins (doubled for premium), advances progress, and shows the win screen; a wrong pick stays red and costs a life, ending the round in game over once every life is spent. A category the player has already cleared replays as a free practice: no coin rewards, no life loss, free hints, and the two hint buttons become level navigation so the player can page through the logos. Fifty-fifty and skip hints spend coins during a real run.

As each question resolves, the screen calls `recordRoundResult` to remember its outcome — the question id, the correct brand, whether the player got it right (a hint-skip counts as passed), and the localized explanation. This buffer is what feeds the result screen's explanations.

## Explanations on the Result Screen

The result screen (`app/logo-quiz/result.tsx`) shows the round's score and, beneath it, an explanation for every question the player just answered. Each card pairs the correct brand with its localized explanation and a check or cross marking whether the player got it right. Questions whose explanation is blank or null are silently skipped, so a partly-annotated category still renders cleanly.

The explanations travel through the economy provider rather than route params, because a full round's worth of question data is too large to serialize into the URL. `LogoQuizProvider` (`hooks/logo-quiz/use-logo-quiz.tsx`) holds a transient `roundResults` buffer that is deliberately never persisted to storage. Opening a category calls `startRound` to clear it, each resolved question appends to it via `recordRoundResult` (replacing any earlier entry for the same id so a re-answer never duplicates), and the result screen reads it straight from context. Because the buffer lives on the provider that already wraps the whole flow, the result screen gets the data without a network call or a bloated navigation payload.

## See Also

- [Content and Offline](content-and-offline.md) -- Snapshot cache, per-app namespacing, and image caching
- [Data Model](data-model.md) -- Snapshot entities and the `is_vip` flag
- [Architecture](architecture.md) -- Build-time app selection and module layout
- [Gamification](gamification.md) -- Premium gating and the shared monetization model
