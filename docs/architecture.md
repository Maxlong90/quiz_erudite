# Architecture

The app exists to deliver a fast, replayable general-knowledge trivia experience on mobile. It spans seven subjects (geography, history, science and nature, arts and literature, sports, entertainment, general knowledge), each split into subcategories. The design prioritizes instant load and offline play: all content is pulled once per language as a snapshot, cached on-device, and served from local storage thereafter. Progress, currency, and gamification state live entirely on the device — there is no user account or server-side profile.

## System Overview

```
┌──────────────────────────────────────────────────────────┐
│                     Mobile App (Expo)                      │
│                                                            │
│  Splash → Language → Onboarding → Home                     │
│                                    │                       │
│        ┌───────────────┬──────────┼───────────┐           │
│        ↓               ↓          ↓           ↓           │
│   Categories      Mode tiles    Stats /    Shop /          │
│   → Subcategory   (10 modes)    Settings   Account         │
│        │               │                                   │
│        └──────→  Quiz  ←┘  →  Results                       │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  Context providers (top of tree)                     │ │
│  │  LocaleProvider → ThemePrefProvider →                │ │
│  │  PremiumProvider → ContentCache                      │ │
│  └──────────────────────────────────────────────────────┘ │
│  ┌──────────────────────┐  ┌──────────────────────────┐   │
│  │  Local persistence   │  │  API client (Axios)      │   │
│  │  (AsyncStorage +     │  │                          │   │
│  │   file-system cache) │  │                          │   │
│  └──────────────────────┘  └────────────┬─────────────┘   │
└─────────────────────────────────────────┼─────────────────┘
                                          │ HTTPS
                                          ↓
              ┌────────────────────────────────────────────┐
              │   quiz-erudit-backend.turbosuslik.online    │
              │   GET /apps/{slug}/snapshot                 │
              │   GET /apps/{slug}/categories               │
              │   GET /apps/{slug}/questions/random         │
              │   POST /reports                             │
              └────────────────────────────────────────────┘
```

## Navigation

Expo Router provides file-based routing with a single `Stack` navigator defined in `app/_layout.tsx`. Despite the `initialRouteName="splash"` prop, Expo Router opens the app at `/` on a cold launch, so Home is the real entry point and has to bounce the launch into the intro flow itself. `lib/intro-gate.ts` holds a single process-lifetime flag that `consumeColdStart` returns true for exactly once — on the first Home mount after a cold start — which redirects to `/splash`.

The split that follows is deliberate: the branded QUIZZES splash plays on **every** cold start so it always covers the native splash hand-off, but the rest of the intro plays exactly **once**. The splash screen itself checks the persisted `onboarding.seen.v1` flag and continues into language → onboarding only on a genuine first launch; every later launch goes straight to Home. Onboarding can divert once to a forced paywall before home, but only when store billing is enabled on the platform (`revenueCatEnabled`) and the per-platform backend flag (`show_paywall_ios` / `show_paywall_android`) is set — otherwise it goes straight to home. See [Gamification](gamification.md#the-forced-post-onboarding-paywall). Most screens hide their header and ride a full-screen themed gradient — dark purple by default, or a light lavender tint when the light appearance is selected (see [Theming and Appearance](#theming-and-appearance)). Back gestures are disabled on flow screens (splash, language, onboarding, paywall, quiz, results) so the player cannot swipe out mid-flow or back into a finished quiz.

| Route | Screen | Role |
|-------|--------|------|
| `splash` | Splash | Animated intro; always hands off to `language` (themed per app) |
| `language` | Language | Locale picker (en, ru, es, fr) |
| `onboarding` | Onboarding | One-time intro carousel |
| `index` | Home | Hub with Categories and Modes tabs plus the bottom bar |
| `category/[slug]` | Category | Lists a subject's subcategories |
| `quiz-mode/[slug]` | Quiz Mode | Per-subcategory question count and mode picker |
| `quiz` | Quiz | Gameplay: question card, hints, lives, timer |
| `results` | Results | Score, accuracy, achievement unlocks |
| `stats` | Stats | Career totals and achievement progress |
| `shop` | Shop | Lives and hint bundles (RevenueCat where store billing is enabled; local-grant only in Expo Go / web) |
| `account` | Account | Sign-up/login UI (not wired to a backend) |
| `settings` | Settings | Language, appearance, reset, legal links |
| `paywall` | Paywall | Premium pitch; tapping a locked mode lands here |

The bottom bar (`components/bottom-bar.tsx`) links home, stats, shop, account, and settings, and hides itself on the quiz and results screens.

## State and Context

Five React context providers wrap the whole tree, in this order: `LocaleProvider`, `ThemePrefProvider`, `AppThemeProvider`, `PremiumProvider`, `ContentCacheProvider`. They are ordered so each can depend on the one above it — content sync keys off the active locale, for example.

- **`LocaleProvider`** (`hooks/use-locale.ts`) tracks the active language, whether the user has explicitly picked one, and the supported set (`en`, `ru`, `es`, `fr`). It seeds from the device locale and falls back to English.
- **`ThemePrefProvider`** (`hooks/use-theme-pref.ts`) holds the app-selected appearance (`dark` or `light`), hydrated from storage and flipped by the Settings appearance switcher. Because the choice lives in React state above every screen, changing it repaints the whole app instantly. See [Theming and Appearance](#theming-and-appearance).
- **`AppThemeProvider`** (`hooks/app-theme-provider.ts`) supplies the remote colour palette on a configurable-template build and a frozen inert value on every other build. It was **inserted** rather than slotted in, so no existing provider moved: reordering the others would change mount order and effect timing for every other build in the tree, which is exactly the class of change that makes an "inert" claim unverifiable. It sits above `ThemedRoot`, which consumes the palette. See [Configurable Template](configurable-template.md).
- **`PremiumProvider`** (`hooks/use-premium.ts`) holds a single `isPremium` flag, hydrated from storage. Wherever store billing is enabled (any native platform with a RevenueCat key — Android today, iOS once its key is supplied) it also syncs (upgrade-only) from the live RevenueCat `premium` entitlement so returning subscribers stay premium without re-purchasing. Billing runs through RevenueCat (`lib/revenuecat.ts`, initialized via a side-effect import in `app/_layout.tsx` mirroring Sentry).
- **`ContentCacheProvider`** (`hooks/use-content-cache.ts`) owns the offline snapshot — categories, subcategories, questions, and locally downloaded images — plus a sync status and 0..1 progress value. See [Content and Offline](content-and-offline.md).

Quiz gameplay state is local to the quiz screen via `useQuizSession` (`hooks/use-quiz-session.ts`), a `useReducer` state machine. See [Quiz Flow](quiz-flow.md).

## Theming and Appearance

The Erudite app ships two full appearances — a default dark purple and an added light lavender — that the player toggles from the **Appearance** row in Settings. The choice repaints every screen instantly, with no restart, and persists across launches. This exists so the app is comfortable in bright and dim environments without asking the player to follow the OS setting; the preference is deliberately independent of the device colour scheme.

### Why a token layer

Before this system, roughly 650 hardcoded hex values were scattered across screens: each screen carried its own inline `LinearGradient` backdrop and white text. That made a second theme impossible to add without touching every file, and impossible to keep consistent. The fix is a single semantic palette that every screen reads through a hook, so a colour decision lives in one place and both themes stay in lockstep.

`constants/theme.ts` defines `EruditePalette` — a set of semantic tokens named by role, not by colour (`text`, `textMuted`, `surface`, `sheet`, `scrim`, `border`, `accent`, `success`, `danger`, `gold`, and quiz-option tokens such as `optCorrectBg` and `explanationBg`). `EruditeColors` provides one concrete `dark` and one `light` value for every token. The dark values are a byte-for-byte lift of the old hardcoded colours, so the dark theme is unchanged from before the migration — the light theme is purely additive, and dark remains the default.

Two tokens carry deliberate design intent worth knowing. The brand accent `#7c5cff` is identical in both themes — it anchors the identity regardless of appearance. The `accentSoft` token, however, is *darkened* in light mode (`#6a45f5` instead of `#a78bff`): the pale dark-mode accent is invisible on a white surface, so light mode uses a stronger tone for progress bars and labels. The `onAccent` token stays white in both themes because it sits on coloured gradients (category and mode tiles) that keep their brand colours regardless of appearance. It has been operator-settable since the Э1 widening put the whole palette on the wire, so its whiteness is a default an operator edits knowingly rather than a fixed constraint the tile artwork is designed around (see [Tile artwork](configurable-template.md#tile-artwork-a-bundled-spectrum)).

### How screens consume the palette

```
┌────────────────────┐   theme: 'dark'|'light'   ┌──────────────────┐
│  ThemePrefProvider │ ────────────────────────→ │  useThemeColors  │
│  (React state,     │                           │  (picks palette) │
│   AsyncStorage)    │                           └────────┬─────────┘
└────────────────────┘                                    │ EruditePalette
        ↑ setTheme                                         ↓
┌────────────────────┐                            ┌──────────────────┐
│  AppearanceModal   │                            │  Every screen /  │
│  (Settings row)    │                            │  component       │
└────────────────────┘                            └──────────────────┘
```

`useThemeColors` (`hooks/use-theme-colors.ts`) reads the active preference from `useThemePref` and returns the matching `EruditePalette`. Screens follow one recipe: call `useThemeColors()`, then build a memoised stylesheet with `const styles = useMemo(() => makeStyles(colors), [colors])`, where `makeStyles` is a factory that receives the palette and substitutes each token for what used to be a hex literal. When the preference flips, `colors` changes identity, the memo recomputes, and the screen restyles. Every sub-component that references styles gets its own `useThemeColors()` call — the palette is not threaded through props.

`ScreenBackground` (`components/screen-background.tsx`) replaces the old per-screen inline gradients. It renders the appearance-specific `bgGradient` plus a matching `StatusBar` style (light glyphs on dark, dark glyphs on light), so a screen drops it in place of the former `LinearGradient` + `StatusBar` pair and inherits themed chrome for free.

### The reactive root

The navigator itself must repaint too. `app/_layout.tsx` splits into an outer `RootLayout` (which mounts the providers) and an inner `ThemedRoot` (which runs *under* `ThemePrefProvider`, so it can consume the theme). `ThemedRoot` drives three things off the palette that used to be module-level constants: the react-navigation theme (`background`/`card` set to `bgSolid` so sliding screens do not flash a white card), the Stack `contentStyle` background, and the Android system root-view colour via `SystemUI.setBackgroundColorAsync` (so the translucent system navigation bar stays on-theme). A `ready` gate holds a neutral `bgSolid` fill on cold start until the persisted preference loads, avoiding a one-frame dark flash for light-mode users.

### Remote theme (bundled → cache → network)

One build is the exception to everything above: the **configurable template** (`app/t/`, build slug `test-quiz`), whose palette is *data* rather than code. It resolves colours in three tiers — the bundled `EruditeColors`, then the last theme this device cached, then a conditional `GET /apps/{slug}/theme` — and each tier *overlays* the served tokens onto the one below. Since schema v2 (the Э1 widening) the backend serves all forty-five `EruditePalette` tokens, so an unedited preset overlays byte-identical values and resolves to the bundled palette by reference — nothing re-renders. The engine lives in `lib/theme/` behind `AppThemeProvider` (`hooks/app-theme-provider.ts`); `hooks/use-app-theme.ts` holds only the context and is deliberately I/O-free, because `useThemeColors` sits on it and is pulled into essentially every screen.

Two properties are load-bearing. **Fail-open:** a malformed payload, an unknown schema version, a timeout or an offline device each leave the app on the best palette it already had, and nothing in the chain throws or leaves the splash stranded. **Inert everywhere else:** the engine is gated on the build-time allow-list `T_TEMPLATE_SLUGS` in `constants/app-templates.ts`, so every shipped build gets a frozen constant whose palettes *are* `EruditeColors` by reference — no request, no storage read, and no re-render. That gate is deliberately a checked-in list rather than runtime data parity, because parity would let an operator re-skin a store-published app by saving a form in Nova.

Artwork for that build travels on a different schedule from its colours, and the split is not a preference. React Native has no dynamic `require`, so Metro must see a string literal to bundle an image at all — a fetched illustration could never reach a `require()`. The delivery *stage* moves instead: several packs live under `asset-packs/`, and the build service copies the chosen one into `assets/t/` before Metro runs, so the paths in `constants/t/asset-slots.ts` never change while the bytes behind them do. Colours are runtime data; pictures are build-time data.

The wire contract, the cache record, the splash network window, the bundled tile spectrum, the asset packs, and the token gallery are all documented in [Configurable Template](configurable-template.md).

### Scope: Erudite and the configurable template

Every sibling app keeps its own bespoke palette under `constants/{slug}/theme.ts` — [Logo Quiz](logo-quiz.md)'s pastel periwinkle, the glossy blue that [Flags Quiz](flags-quiz.md) and [Coat of Arms](coat-of-arms-quiz.md) share, [Sport Quiz](sport-quiz.md)'s neon-on-navy, and Italy Quiz's deep navy — and none of them are touched by this system. (None of them even call `useThemeColors`, which is why the only shipped build a theme-engine regression could reach is Erudite itself.) The tokens described here back the Erudite build and, through the remote overlay above, the configurable template. The token layer is additive: the legacy `Colors`/`QuizColors` maps in `constants/theme.ts` (which back an Expo-starter OS-scheme path) remain in place, and the OS-driven `ThemedText`/`ThemedView` primitives are intentionally *not* reused here — they read the device colour scheme, which is the wrong signal for an app-selected appearance.

## Key Design Decisions

**Offline-first content.** Rather than fetch questions per session, the app downloads the full content snapshot for the active language once and caches it for 24 hours, images included. Quizzes then draw from the cached pool, so play works on a flaky or absent connection. The live `questions/random` and `categories` endpoints remain as fallbacks when the snapshot is unavailable.

**Device-local progress.** Stats, lives, hints, mistakes, achievements, and the premium flag all live in AsyncStorage. This keeps the app accountless and private, at the cost of progress not syncing across devices. The account screen exists for a future backend but is not connected.

**Slug-keyed visuals with DB override.** Each category and subcategory renders an icon. The API now serves `icon_emoji` and `icon_url` per category, but the app keeps a hardcoded fallback map (`constants/category-visuals.ts`) so a brand-new or unsynced category still shows a sensible icon and gradient. The DB value wins when present; the map is the safety net. See [Data Model](data-model.md#category-icons).

**Reducer-based quiz session.** The single linear quiz is a `useReducer` machine rather than a state library — its transitions are few and well defined, so a reducer fits without extra dependencies.

**One tree, many apps.** The repository templates eight distinct experiences from one build, selected by the build-time `APP_SLUG`. For any non-default slug the home route (`app/index.tsx`) redirects straight into that app's self-contained flow and the erudite intro, hub, and modes never render. The redirect targets live in one registry (`APP_TEMPLATES` in `constants/app-templates.ts`), so a new app is added there rather than by editing the home route. Because `APP_SLUG` is a build-time constant, every redirect branch is stable across renders and never disturbs hook order.

| `APP_SLUG` | App | Entry route | Economy |
|------------|-----|-------------|---------|
| `erudite-quiz` (default) | Erudite general-knowledge quiz | `/splash` (via the intro gate) | Lives, hints, premium |
| `logo-quiz` | [Logo Quiz](logo-quiz.md) — brand guessing | `/logo-quiz/splash` | Coins, lives, premium |
| `flags-quiz` | [Flags Quiz](flags-quiz.md) — flags | `/flags-quiz/splash` | None |
| `coat-of-arms` | [Coat of Arms](coat-of-arms-quiz.md) — heraldry | `/coat-of-arms/splash` | None |
| `sport-quiz` | [Sport Quiz](sport-quiz.md) — sports | `/sport-quiz/splash` | Coins only |
| `italy-history-and-geography-quiz` | [Italy Quiz](italy-quiz.md) — Italian history and geography | `/italy-quiz/splash` | None |
| `football-quiz` | [Football Quiz](football-quiz.md) — football, a fixture-driven prototype | `/football-quiz/splash` | Coins only (mocked) |
| `test-quiz` | [Configurable Template](configurable-template.md) — an operator-themed quiz | `/t/splash` | Lives, hints, premium (inherited) |

The sibling apps share the content-cache, localization, premium, and API infrastructure but keep their own screens, economy, and art. Reuse also runs *between* siblings: Coat of Arms is built almost entirely on Flags Quiz's question types, transforms, and UI kit, Sport Quiz adapts Logo Quiz's level and wheel model, and Football Quiz clones Sport Quiz outright — screens, labels, and economy numbers — so that only its palette is a new variable. A store build of a sibling also needs its own store identity, which `app.config.js` supplies per variant (see [Development](development.md#building-a-sibling-app-variant)).

### Italy Quiz: the variant with no content layer

The `italy-history-and-geography-quiz` slug builds a sixth variant that is playable end to end — splash, home, place picker, tour, and result — and is documented in full in [Italy Quiz](italy-quiz.md). Two of its structural choices are family-level facts rather than app details.

Its taxonomy is **hardcoded, not fetched**, and so is its content. Places and their four acts live in `constants/italy-quiz/places.ts`; the questions themselves are hand-authored files under `constants/italy-quiz/questions/`, reached through the single seam in `constants/italy-quiz/tour-content.ts`. That is deliberate and temporary: the app is being reshaped as a frontend prototype while the backend is left untouched, so the game mechanic can be judged on a real screen before a content pipeline is built for it. `getTourQuestions` is the only function that has to change when real content arrives.

It is therefore the **only variant that reads no content snapshot at all**. Every other sibling runs a content provider because it fetches a slug that is not the build's own; Italy Quiz fetches nothing and runs entirely offline from bundled data. That is why there is no `lib/italy-quiz/` and `hooks/italy-quiz/` holds only tour state.

One quirk of the variant is worth knowing before touching `app.config.js`. Its branch strips `runtimeVersion`, `updates`, and `extra.eas` from the base config, because a manifest that looks like an updates-enabled EAS app makes Expo Go demand an Expo-account sign-in that an offline dev server cannot satisfy. Italy Quiz has no EAS build yet, so dropping those fields yields a plain, Expo-Go-friendly dev manifest. They must be restored once the variant gets its own EAS project, or it will never receive an over-the-air update.

### Football Quiz: a build registered before its content exists

The `football-quiz` slug is the family's second answer to "the backend has nothing yet", and it differs from Italy Quiz's. Italy Quiz bundles hand-authored content and is genuinely playable offline. Football Quiz bundles **fixtures** in `lib/football-quiz/mock.ts` and is not playable at all — its five questions loop, its coins never move, and no provider sits above its screens. It exists so a visual language can be judged on a device while the backend app (id 4) still holds zero categories. [Football Quiz](football-quiz.md) documents it in full.

The family-level fact is that a prototype is registered in `APP_TEMPLATES` like any other build, rather than being kept off to one side. Registration is what pulls it under the shared guards: `__tests__/app/app-templates.test.tsx` fails any app with its own splash that is missing from the registry, and `__tests__/hooks/use-app-theme-inert.test.tsx` asserts the theme engine stays inert for it. Football Quiz was in the first list and absent from the second for a while, which made it the one build whose inertness nothing checked — the cost of treating a prototype as a special case.

**Premium as a soft gate.** Three modes are always free; the rest show a crown and route to the paywall when tapped without premium. Gating stays a client-side flag; wherever store billing is enabled it is backed by the live RevenueCat `premium` entitlement (synced upgrade-only on launch), while Expo Go / web keep the local flag as the source of truth. iOS uses the local flag today but joins the entitlement-backed path automatically once its RevenueCat key is supplied — see [iOS Monetization Parity](ios-monetization-parity.md).

## Component Organization

```
app/                    Screens (file-based routing)
  _layout.tsx           Stack navigator + context providers
  category/[slug].tsx   Subcategory list for a subject
  quiz-mode/[slug].tsx  Count + mode picker for a subcategory
api/                    Backend communication
  client.ts             Axios instance, base URL, app slug
  questions.ts          Random-question fetch
  categories.ts         Category / subcategory fetch
  reports.ts            Content report submission
  types.ts              Shared API interfaces
components/
  screen-background.tsx Themed full-screen gradient + status bar
  bottom-bar.tsx        Cross-screen nav bar
  home/                 Category picker and mode config modals
  quiz/                 Question cards, hint bar, lives bar, timer, report
  settings/             Appearance switcher and other settings modals
  achievements/         Achievement rows, badges, unlock modal
  lives/  shop/         Claim, buy, and info modals
hooks/                  Locale, premium, content cache, quiz session,
                        lives, hints, mistakes, achievements, translation
  use-theme-pref.ts     App-selected appearance (dark/light), persisted
  use-theme-colors.ts   Resolves the active EruditePalette
  use-app-theme.ts      Remote-theme context (I/O-free) + the inert value
  app-theme-provider.ts The bundled → cache → network theme engine
lib/                    Device-local business logic and persistence
  content-cache.ts      Snapshot download + image cache
  theme/                Remote colour theme: contract, cache, API, resolver,
                        bundled tier, and total hex arithmetic (color.ts)
  lives.ts  hints.ts    Currency stores
  mistakes.ts           Recent-mistake ring buffer
  quiz-stats.ts         Career totals + per-bucket seen sets
  achievements.ts       Achievement catalog and unlock detection
  today-question.ts     Daily-question pick
  iap.ts                Shop bundles + purchase flow (RevenueCat / local)
  store-purchase.ts     Shared fail-closed consumable purchase seam (all apps)
  revenuecat.ts         RevenueCat wrapper, capability-gated per platform
constants/
  category-visuals.ts   Slug → emoji/gradient fallback maps
  theme.ts              EruditePalette tokens (dark/light), legacy colors, fonts
i18n/                   String tables for en, ru, es, fr

Every sibling app repeats the same five-directory shape under its own slug —
screens, UI, state, domain logic, strings:

app/{slug}/             Self-contained screen flow for that app
components/{slug}/      Its UI kit
hooks/{slug}/           Its content and economy providers
lib/{slug}/             Its content transforms and rules
constants/{slug}/       Its labels and theme

  logo-quiz/            Cards, HUD, wheel, confetti; coins + lives + premium
  flags-quiz/           Glossy buttons and flag artwork; dual-source content
  coat-of-arms/         Reuses the flags-quiz types and UI kit; crest artwork
  sport-quiz/           Neon-on-navy kit, coins, puzzle plates, win screen
  italy-quiz/           Landmarks artwork, glossy navy tiles; hooks/ holds run
                        state only — no lib/, no content provider (see above)
  football-quiz/        Gold-on-haze kit over three stadium backdrops; lib/
                        holds fixtures, not rules — no hooks/, no provider

The configurable template uses the same shape under the short name `t`, but its
colours come from the wire rather than from constants/t/theme.ts:

app/t/                  Splash, onboarding, home, the browse path (category +
                        quiz-mode), the quiz loop (quiz + results), the paywall,
                        the bottom bar's destinations (stats, shop, account,
                        settings), and the live token gallery
hooks/t/                The colour funnel every t screen reads through, plus
                        tile-gradient lookups (no content or economy provider)
constants/t/            The bundled tile spectrum, its ramps, the image slots,
                        and the inert third-party sign-in brand colours
asset-packs/            Swappable artwork packs; one is staged into assets/t/
                        before Metro runs (template only — see below)

app.config.js           Dynamic Expo config: per-variant identity and store ids
```

## See Also

- [Quiz Flow](quiz-flow.md) -- End-to-end gameplay and the session state machine
- [Data Model](data-model.md) -- Entities, API contract, and local persistence
- [Gamification](gamification.md) -- Lives, hints, achievements, and modes
- [Content and Offline](content-and-offline.md) -- Snapshot cache and no-repeats
- [Logo Quiz](logo-quiz.md) -- The second app built from the same tree
- [Flags Quiz](flags-quiz.md) -- A geography flag game with two question shapes
- [Coat of Arms](coat-of-arms-quiz.md) -- A heraldry game derived from Flags Quiz
- [Sport Quiz](sport-quiz.md) -- A sports game with a coins-only economy
- [Italy Quiz](italy-quiz.md) -- A single-topic quiz with a hardcoded taxonomy
- [Configurable Template](configurable-template.md) -- The build whose palette is backend data
- [Development](development.md) -- Building a sibling app variant
