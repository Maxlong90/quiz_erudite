# Logo Quiz

Logo Quiz is a self-contained "guess the brand" experience that ships in the same shared codebase as the trivia app but boots as a separate product. It is one of the portfolio's **App Templates**: the backend selects it per app, and only Logo Quiz apps ever show it (see [Entry Point](#entry-point-the-app-template-gate)). Players browse brand categories, answer four-option "which brand owns this logo?" questions, and — when premium — generate their own brand quiz from a free-text topic. The feature ships its own neon dark visual language, its own content layer, and its own paywall, so it reads as a separate product surface even though it lives inside the same Expo Router app.

## Why It Is Isolated

The main app rides a purple-gradient trivia flow with device-local lives, hints, and career stats. Logo Quiz deliberately shares none of that chrome. It has its own dark neon theme, its own screens under `app/logo-quiz/`, and its own mock content source. This isolation is a design decision: the feature can evolve (real logo content, a coin economy, AI generation) without regressing the main quiz, and a developer changing one game rarely needs to touch the other.

Two things it does reuse, on purpose:

- **The quiz engine.** Gameplay runs on the same `useQuizSession` reducer as the main quiz, so scoring and progress logic stays in one tested place. See [Quiz Flow](quiz-flow.md#session-state-machine).
- **The premium entitlement.** Locks and the AI gate key off the same `usePremium` flag and the same RevenueCat purchase flow as the rest of the app. There is no separate Logo Quiz subscription. See [Gamification](gamification.md#premium-and-the-shop).

## Entry Point: The App Template Gate

Logo Quiz is not a tile inside the trivia app. It is a whole **root experience** that the shared codebase boots into only when the backend tags the app as a Logo Quiz app. The selector is the **App Template code** (`logo_quiz`) that arrives in the content snapshot as `snapshot.app.template`. See [Architecture](architecture.md#the-app-template-seam) for the portfolio-wide seam and [Data Model](data-model.md#app-template) for the field.

The decision happens once, at the root route `app/index.tsx` (`HomeRoute`). After the cold-start intro redirect, it reads the template code, resolves it through `resolveExperience` (`lib/app-template.ts`), and branches:

- `logo_quiz` → redirect to `/logo-quiz` (the Logo Quiz categories home becomes the app's whole home).
- `erudite`, any other code, or a missing/unloaded template → render the trivia `HomeScreen`.

This is the reason a leak was closed. An earlier version put Logo Quiz behind a 🏷️ tile hardcoded into the trivia home's **Modes** tab, so the feature showed up in *every* app built from the shared codebase — including Erudite Quiz (App #1), where it does not belong. Removing that tile and gating on the template code means Logo Quiz reaches players only when the backend intends it to, and the trivia apps are clean again. The `logo-quiz/*` routes still exist for every build, but nothing navigates to them unless the template resolves to `logo_quiz`.

Once inside, the four screens form a small stack:

```
┌──────────────┐  template = logo_quiz  ┌──────────────┐
│  HomeRoute   │───────────────────────→│  Categories  │
│ (app/index)  │   (Redirect /logo-quiz)│  (index)     │
└──────────────┘                        └──────┬───────┘
                          category (locked) or │ AI CTA (not premium)
                                               ↓
                    ┌──────────┐          ┌──────────┐
                    │   Quiz   │          │  Paywall │
                    │  (game)  │          └────┬─────┘
                    └──────────┘  AI CTA       │ (premium)
                                  (premium) →  ↓
                                          ┌──────────┐
                                          │    AI    │
                                          │  (topic) │
                                          └──────────┘
```

Each Logo Quiz route is registered in `app/_layout.tsx` with a hardcoded `#08080F` content background so screen transitions never flash the main app's purple. The paywall route disables the back gesture and uses a fade animation so it reads as a modal interruption rather than a pushed page.

## The Four Screens

### Categories (`app/logo-quiz/index.tsx`)

The home of the mini-app. It loads the category list through `getLogoCategories`, shows a coin balance in the header, and renders a two-column grid of `CategoryCard`s. Each card glows in its category's neon accent and shows a logo count. Premium categories render a lock badge.

Tapping a card runs `openCategory`: a locked category routes to the Logo Quiz paywall, an unlocked one pushes the game screen with the category `slug`. A large gradient "build your own AI brand quiz" button sits at the bottom; `openAiCta` sends premium players to the AI screen and everyone else to the paywall.

### Quiz Game (`app/logo-quiz/quiz.tsx`)

Gameplay for one category. On mount it loads that category's questions through `getLogoQuestions`, maps them to the engine's generic `Question` shape with `toQuizQuestions`, and feeds them into `useQuizSession`. The screen keeps the original `LogoQuestion[]` alongside the session because the mapped questions drop the per-question logo image and placeholder glyph the card needs to render — the two lists stay index-aligned because the logo quiz never swaps or reorders questions.

The screen has three phases. `loading` shows a spinner, `empty` shows a "no questions" message with a way back (also the fallback when the category slug is missing or unknown), and `ready` renders the game. A gradient progress bar tracks position, a neon-framed `LogoCard` shows the logo (falling back to the glyph when no image URL exists), and four `LogoOptionButton`s present the choices with A/B/C/D letter badges. Answering reveals correctness and shows a "next" button; the final question transitions the session to `finished`, which swaps the body for a results panel showing score and accuracy. "Play again" re-dispatches the same questions to restart in place.

Score is displayed in points, not raw correct count: `computePoints` multiplies correct answers by `POINTS_PER_QUESTION` (40) so the header reads like the mockup's "320" rather than "8".

### Paywall (`app/logo-quiz/paywall.tsx`)

The premium pitch, styled to match Logo Quiz but wired to the real purchase flow. It fetches live RevenueCat packages, shows three benefit rows, and puts the monthly price on the CTA. The `$4.99/mo` string is only a display fallback — the live store price wins whenever an offering loads.

Purchasing is intentionally strict to avoid repeating bug #568 (premium granted for free). `handleSubscribe` grants premium locally **only** in genuine dev environments (Expo Go or web) where store billing is absent. On a real device it requires a completed RevenueCat purchase whose entitlement is actually live; a cancelled purchase is a silent no-op and a failed one surfaces an error. A "restore purchases" affordance appears only when store billing is enabled. This mirrors the main paywall's fail-closed policy described in [Gamification](gamification.md#the-fail-closed-grant-policy).

### AI Topic Input (`app/logo-quiz/ai.tsx`)

A premium-only screen where the player types a topic, picks a question count (10/15/20), and generates a custom brand quiz. It gates on entry: while the premium flag is still hydrating (`null`) it shows a loader, and a confirmed non-premium player is redirected to the paywall. This ordering — treating "unknown" as "not yet allowed" — means a hydration race can never briefly expose the gated screen.

The actual AI generation is not built yet. `handleGenerate` is a deliberate seam: it simulates a request and shows a "coming soon" alert, with a `TODO(AI)` marking exactly where the backend call and navigation into the generated quiz will go. Topic chips prefill the input, and a character counter caps the topic length.

## Content Layer

`lib/logo-quiz-content.ts` is the seam between the screens and a future real logo catalog. Backend #721 will supply actual brand images per category; until it lands, this module serves typed **mock** data behind async getters (`getLogoCategories`, `getLogoQuestions`) that mimic a network/cache source, including a small artificial latency so loading states are exercised. Screens are written against the real async shape, so swapping the mock for a real source should not touch any UI. A `TODO(#721)` marks the arrays to replace, with a note to keep the getters and the `LogoCategory` / `LogoQuestion` shapes stable.

The mock uses **fictional** brands (Velocitá, Northwind, Aperture Systems, …) to keep the app free of trademark concerns while gameplay and scoring are exercised end to end. Every mock question has a `null` image URL, so the game currently renders emoji glyph placeholders rather than real logos.

### Domain model

| Entity | Represents | Notable fields |
|--------|-----------|----------------|
| `LogoCategory` | A themed group of brand logos shown as a grid card | `accent` (one of five neon hues driving the glow), `logoCount` (advertised size), `premium` (drives the lock badge and paywall routing), `glyph` (placeholder brand emoji) |
| `LogoQuestion` | One "guess the brand" question | `brand` (the correct answer text), `options` (four choices including `brand`), `correctOption` (index into `options`), `logoUri` (real image, `null` in the mock), `glyph` (fallback emoji) |

`toQuizQuestions` adapts a `LogoQuestion[]` into the engine's generic `Question[]`: it maps `correctOption` to `correct_option` and `logoUri` to `image_url`, and sets a fixed non-empty `question` marker (the visible prompt is a localized string the screen renders, not this field). This adapter is why the shared reducer can score the logo quiz unchanged.

`getMockCoinBalance` returns a stubbed coin balance for the header. There is no coin economy yet; a `TODO` marks where a real currency store will connect.

Category display names are localized: `categoryNameKey` builds the i18n key `logoQuiz.category.<slug>`, and the mock `name` is only a fallback.

## Access-Gating Rules

The gating helpers in `lib/logo-quiz.ts` are pure functions, kept free of React and I/O so they can be unit-tested and so the "loading" edge case is handled once, consistently:

- `isCategoryLocked` returns true for a premium category unless the player is **confirmed** premium. A loading (`null`) flag counts as not-premium, so nothing unlocks before hydration finishes.
- `canAccessAiTopicInput` returns true **only** when the flag is exactly `true`. Both loading and non-premium deny access, so a hydration race never leaks the AI screen.

Both rules treat the ambiguous `null` state as "deny", which is the safe default for a paywalled surface.

## Theme

`constants/logo-quiz-theme.ts` centralizes the neon palette, corner radii, and the signature gradients (a cyan→purple→magenta CTA gradient and a cyan→purple progress gradient). Screens and components import from here rather than hardcoding hex values, so the visual language stays in one place. A closed `LogoQuizAccent` union (`cyan | magenta | purple | green | gold`) keeps mock data and card components agreed on the small set of category glow hues; `accentColor` resolves an accent name to its hex value.

## Reused vs. New Components

The game screen uses Logo Quiz–specific components under `components/logo-quiz/` (`CategoryCard`, `LogoCard`, `LogoOptionButton`, `LogoProgressBar`, `GradientButton`) rather than adapting the main quiz's `progress-bar` and `option-button`. Building parallel neon components keeps the shared trivia components untouched and backward-compatible, at the cost of some visual duplication — a trade made deliberately to avoid threading a "variant" prop through widely-used components.

## See Also

- [Quiz Flow](quiz-flow.md) -- The shared reducer-driven engine that scores the logo quiz
- [Gamification](gamification.md) -- Premium entitlement and the fail-closed grant policy the paywall reuses
- [Architecture](architecture.md) -- Navigation, providers, and where Logo Quiz fits
- [Data Model](data-model.md) -- The generic `Question` shape the content layer adapts to
