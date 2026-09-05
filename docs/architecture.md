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

Four React context providers wrap the whole tree, in this order: `LocaleProvider`, `ThemePrefProvider`, `PremiumProvider`, `ContentCacheProvider`. They are ordered so each can depend on the one above it — content sync keys off the active locale, for example.

- **`LocaleProvider`** (`hooks/use-locale.ts`) tracks the active language, whether the user has explicitly picked one, and the supported set (`en`, `ru`, `es`, `fr`). It seeds from the device locale and falls back to English.
- **`ThemePrefProvider`** (`hooks/use-theme-pref.ts`) holds the app-selected appearance (`dark` or `light`), hydrated from storage and flipped by the Settings appearance switcher. Because the choice lives in React state above every screen, changing it repaints the whole app instantly. See [Theming and Appearance](#theming-and-appearance).
- **`PremiumProvider`** (`hooks/use-premium.ts`) holds a single `isPremium` flag, hydrated from storage. Wherever store billing is enabled (any native platform with a RevenueCat key — Android today, iOS once its key is supplied) it also syncs (upgrade-only) from the live RevenueCat `premium` entitlement so returning subscribers stay premium without re-purchasing. Billing runs through RevenueCat (`lib/revenuecat.ts`, initialized via a side-effect import in `app/_layout.tsx` mirroring Sentry).
- **`ContentCacheProvider`** (`hooks/use-content-cache.ts`) owns the offline snapshot — categories, subcategories, questions, and locally downloaded images — plus a sync status and 0..1 progress value. See [Content and Offline](content-and-offline.md).

Quiz gameplay state is local to the quiz screen via `useQuizSession` (`hooks/use-quiz-session.ts`), a `useReducer` state machine. See [Quiz Flow](quiz-flow.md).

## Theming and Appearance

The Erudite app ships two full appearances — a default dark purple and an added light lavender — that the player toggles from the **Appearance** row in Settings. The choice repaints every screen instantly, with no restart, and persists across launches. This exists so the app is comfortable in bright and dim environments without asking the player to follow the OS setting; the preference is deliberately independent of the device colour scheme.

### Why a token layer

Before this system, roughly 650 hardcoded hex values were scattered across screens: each screen carried its own inline `LinearGradient` backdrop and white text. That made a second theme impossible to add without touching every file, and impossible to keep consistent. The fix is a single semantic palette that every screen reads through a hook, so a colour decision lives in one place and both themes stay in lockstep.

`constants/theme.ts` defines `EruditePalette` — a set of semantic tokens named by role, not by colour (`text`, `textMuted`, `surface`, `sheet`, `scrim`, `border`, `accent`, `success`, `danger`, `gold`, and quiz-option tokens such as `optCorrectBg` and `explanationBg`). `EruditeColors` provides one concrete `dark` and one `light` value for every token. The dark values are a byte-for-byte lift of the old hardcoded colours, so the dark theme is unchanged from before the migration — the light theme is purely additive, and dark remains the default.

Two tokens carry deliberate design intent worth knowing. The brand accent `#7c5cff` is identical in both themes — it anchors the identity regardless of appearance. The `accentSoft` token, however, is *darkened* in light mode (`#6a45f5` instead of `#a78bff`): the pale dark-mode accent is invisible on a white surface, so light mode uses a stronger tone for progress bars and labels. The `onAccent` token stays white in both themes because it sits on coloured gradients (category and mode tiles) that keep their brand colours regardless of appearance.

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

### Scope: Erudite only

Every sibling app keeps its own bespoke palette under `constants/{slug}/theme.ts` — [Logo Quiz](logo-quiz.md)'s pastel periwinkle, the glossy blue that [Flags Quiz](flags-quiz.md) and [Coat of Arms](coat-of-arms-quiz.md) share, [Sport Quiz](sport-quiz.md)'s neon-on-navy, and Italy Quiz's deep navy — and none of them are touched by this system. The token layer is additive: the legacy `Colors`/`QuizColors` maps in `constants/theme.ts` (which back an Expo-starter OS-scheme path) remain in place, and the OS-driven `ThemedText`/`ThemedView` primitives are intentionally *not* reused here — they read the device colour scheme, which is the wrong signal for an app-selected appearance.

## Key Design Decisions

**Offline-first content.** Rather than fetch questions per session, the app downloads the full content snapshot for the active language once and caches it for 24 hours, images included. Quizzes then draw from the cached pool, so play works on a flaky or absent connection. The live `questions/random` and `categories` endpoints remain as fallbacks when the snapshot is unavailable.

**Device-local progress.** Stats, lives, hints, mistakes, achievements, and the premium flag all live in AsyncStorage. This keeps the app accountless and private, at the cost of progress not syncing across devices. The account screen exists for a future backend but is not connected.

**Slug-keyed visuals with DB override.** Each category and subcategory renders an icon. The API now serves `icon_emoji` and `icon_url` per category, but the app keeps a hardcoded fallback map (`constants/category-visuals.ts`) so a brand-new or unsynced category still shows a sensible icon and gradient. The DB value wins when present; the map is the safety net. See [Data Model](data-model.md#category-icons).

**Reducer-based quiz session.** The single linear quiz is a `useReducer` machine rather than a state library — its transitions are few and well defined, so a reducer fits without extra dependencies.

**One tree, many apps.** The repository templates six distinct experiences from one build, selected by the build-time `APP_SLUG`. For any non-default slug the home route (`app/index.tsx`) redirects straight into that app's self-contained flow and the erudite intro, hub, and modes never render. Because `APP_SLUG` is a build-time constant, every redirect branch is stable across renders and never disturbs hook order.

| `APP_SLUG` | App | Entry route | Economy |
|------------|-----|-------------|---------|
| `erudite-quiz` (default) | Erudite general-knowledge quiz | `/splash` (via the intro gate) | Lives, hints, premium |
| `logo-quiz` | [Logo Quiz](logo-quiz.md) — brand guessing | `/logo-quiz/splash` | Coins, lives, premium |
| `flags-quiz` | [Flags Quiz](flags-quiz.md) — flags | `/flags-quiz/splash` | None |
| `coat-of-arms` | [Coat of Arms](coat-of-arms-quiz.md) — heraldry | `/coat-of-arms/splash` | None |
| `sport-quiz` | [Sport Quiz](sport-quiz.md) — sports | `/sport-quiz/splash` | Coins only |
| `italy-history-and-geography-quiz` | Italy Quiz — see [Italy Quiz: an unfinished variant](#italy-quiz-an-unfinished-variant) | `/italy-quiz/splash` | None yet |

The sibling apps share the content-cache, localization, premium, and API infrastructure but keep their own screens, economy, and art. Reuse also runs *between* siblings: Coat of Arms is built almost entirely on Flags Quiz's question types, transforms, and UI kit, and Sport Quiz adapts Logo Quiz's level and wheel model. A store build of a sibling also needs its own store identity, which `app.config.js` supplies per variant (see [Development](development.md#building-a-sibling-app-variant)).

### Italy Quiz: an unfinished variant

The `italy-history-and-geography-quiz` slug builds a sixth variant that is currently a **scaffold, not a playable game**. It has a splash, a home screen over cartoon-landmarks artwork, a settings screen, and a two-level category browser whose seven categories and 28 subcategories are hardcoded in `constants/italy-quiz/categories.ts` rather than fetched. Tapping a subcategory is a dead end: there is no quiz screen, no result screen, and no backend content sync. Treat the frontend category list as placeholder taxonomy — the app is not yet wired to its backend slug.

One quirk of the variant is worth knowing before touching `app.config.js`. Its branch strips `runtimeVersion`, `updates`, and `extra.eas` from the base config, because a manifest that looks like an updates-enabled EAS app makes Expo Go demand an Expo-account sign-in that an offline dev server cannot satisfy. Italy Quiz has no EAS build yet, so dropping those fields yields a plain, Expo-Go-friendly dev manifest. They must be restored once the variant gets its own EAS project, or it will never receive an over-the-air update.

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
lib/                    Device-local business logic and persistence
  content-cache.ts      Snapshot download + image cache
  lives.ts  hints.ts    Currency stores
  mistakes.ts           Recent-mistake ring buffer
  quiz-stats.ts         Career totals + per-bucket seen sets
  achievements.ts       Achievement catalog and unlock detection
  today-question.ts     Daily-question pick
  iap.ts                Shop bundles + purchase flow (RevenueCat / local)
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
  italy-quiz/           Scaffold only: no lib/ or hooks/ (see above)

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
- [Development](development.md) -- Building a sibling app variant
