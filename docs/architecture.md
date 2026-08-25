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
│  │  LocaleProvider → PremiumProvider → ContentCache     │ │
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

Expo Router provides file-based routing with a single `Stack` navigator defined in `app/_layout.tsx`. The initial route is `splash`. Every cold start runs the full intro — splash → language → onboarding → home — regardless of any persisted "seen"/"picked" flag; the flow is deliberately *not* gated on AsyncStorage, so a restored Android Auto Backup can never skip splash, language, or onboarding. Onboarding can divert once to a forced paywall before home, but only when store billing is enabled on the platform (`revenueCatEnabled`) and the per-platform backend flag (`show_paywall_ios` / `show_paywall_android`) is set — otherwise it goes straight to home. See [Gamification](gamification.md#the-forced-post-onboarding-paywall). Most screens hide their header and ride a hardcoded dark purple gradient. Back gestures are disabled on flow screens (splash, language, onboarding, paywall, quiz, results) so the player cannot swipe out mid-flow or back into a finished quiz.

| Route | Screen | Role |
|-------|--------|------|
| `splash` | Splash | Animated intro; always hands off to `language` (themed per app) |
| `language` | Language | Locale picker (en, ru, es) |
| `onboarding` | Onboarding | One-time intro carousel |
| `index` | Home | Hub with Categories and Modes tabs plus the bottom bar |
| `category/[slug]` | Category | Lists a subject's subcategories |
| `quiz-mode/[slug]` | Quiz Mode | Per-subcategory question count and mode picker |
| `quiz` | Quiz | Gameplay: question card, hints, lives, timer |
| `results` | Results | Score, accuracy, achievement unlocks |
| `stats` | Stats | Career totals and achievement progress |
| `shop` | Shop | Lives and hint bundles (RevenueCat where store billing is enabled; local-grant only in Expo Go / web) |
| `account` | Account | Sign-up/login UI (not wired to a backend) |
| `settings` | Settings | Language, reset, legal links |
| `paywall` | Paywall | Premium pitch; tapping a locked mode lands here |

The bottom bar (`components/bottom-bar.tsx`) links home, stats, shop, account, and settings, and hides itself on the quiz and results screens.

## State and Context

Three React context providers wrap the whole tree, in this order: `LocaleProvider`, `PremiumProvider`, `ContentCacheProvider`. They are ordered so each can depend on the one above it — content sync keys off the active locale, for example.

- **`LocaleProvider`** (`hooks/use-locale.ts`) tracks the active language, whether the user has explicitly picked one, and the supported set (`en`, `ru`, `es`). It seeds from the device locale and falls back to English.
- **`PremiumProvider`** (`hooks/use-premium.ts`) holds a single `isPremium` flag, hydrated from storage. Wherever store billing is enabled (any native platform with a RevenueCat key — Android today, iOS once its key is supplied) it also syncs (upgrade-only) from the live RevenueCat `premium` entitlement so returning subscribers stay premium without re-purchasing. Billing runs through RevenueCat (`lib/revenuecat.ts`, initialized via a side-effect import in `app/_layout.tsx` mirroring Sentry).
- **`ContentCacheProvider`** (`hooks/use-content-cache.ts`) owns the offline snapshot — categories, subcategories, questions, and locally downloaded images — plus a sync status and 0..1 progress value. See [Content and Offline](content-and-offline.md).

Quiz gameplay state is local to the quiz screen via `useQuizSession` (`hooks/use-quiz-session.ts`), a `useReducer` state machine. See [Quiz Flow](quiz-flow.md).

## Key Design Decisions

**Offline-first content.** Rather than fetch questions per session, the app downloads the full content snapshot for the active language once and caches it for 24 hours, images included. Quizzes then draw from the cached pool, so play works on a flaky or absent connection. The live `questions/random` and `categories` endpoints remain as fallbacks when the snapshot is unavailable.

**Device-local progress.** Stats, lives, hints, mistakes, achievements, and the premium flag all live in AsyncStorage. This keeps the app accountless and private, at the cost of progress not syncing across devices. The account screen exists for a future backend but is not connected.

**Slug-keyed visuals with DB override.** Each category and subcategory renders an icon. The API now serves `icon_emoji` and `icon_url` per category, but the app keeps a hardcoded fallback map (`constants/category-visuals.ts`) so a brand-new or unsynced category still shows a sensible icon and gradient. The DB value wins when present; the map is the safety net. See [Data Model](data-model.md#category-icons).

**Reducer-based quiz session.** The single linear quiz is a `useReducer` machine rather than a state library — its transitions are few and well defined, so a reducer fits without extra dependencies.

**One tree, many apps.** The repository templates several distinct experiences from one build, selected by the build-time `APP_SLUG`. The main general-knowledge quiz is the default; `logo-quiz` builds the Logo Quiz brand-guessing game, and a third slug (`flags-quiz`, an early template still under construction) redirects the same way. For any non-default slug the home route redirects straight into that app's self-contained flow (`app/logo-quiz/`, `app/flags-quiz/`) and the erudite intro, hub, and modes never render. The sibling apps share the content-cache, localization, premium, and API infrastructure but keep their own screens, economy, and art. A store build of a sibling also needs its own store identity, which `app.config.js` supplies per variant (see [Development](development.md#building-the-logo-quiz-variant)). See [Logo Quiz](logo-quiz.md).

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
  bottom-bar.tsx        Cross-screen nav bar
  home/                 Category picker and mode config modals
  quiz/                 Question cards, hint bar, lives bar, timer, report
  achievements/         Achievement rows, badges, unlock modal
  lives/  shop/         Claim, buy, and info modals
hooks/                  Locale, premium, content cache, quiz session,
                        lives, hints, mistakes, achievements, translation
lib/                    Device-local business logic and persistence
  content-cache.ts      Snapshot download + image cache
  lives.ts  hints.ts    Currency stores
  mistakes.ts           Recent-mistake ring buffer
  quiz-stats.ts         Career totals + per-bucket seen sets
  achievements.ts       Achievement catalog and unlock detection
  today-question.ts     Daily-question pick
  iap.ts                Shop bundle catalog + purchase flow (RevenueCat / local fallback)
  revenuecat.ts         RevenueCat wrapper; capability-gated per platform; off in Expo Go / web
constants/
  category-visuals.ts   Slug → emoji/gradient fallback maps
  theme.ts              Colors and typography
i18n/                   String tables for en, ru, es

app/logo-quiz/          Second app: self-contained Logo Quiz flow
components/logo-quiz/   Logo Quiz UI (cards, HUD, wheel, confetti)
hooks/logo-quiz/        Logo Quiz economy + backend-content providers
lib/logo-quiz/          Logo Quiz content mapping, economy rules, store-purchase seam
constants/logo-quiz/    Logo Quiz labels and theme
app.config.js           Dynamic Expo config: per-variant store identity
```

## See Also

- [Quiz Flow](quiz-flow.md) -- End-to-end gameplay and the session state machine
- [Data Model](data-model.md) -- Entities, API contract, and local persistence
- [Gamification](gamification.md) -- Lives, hints, achievements, and modes
- [Content and Offline](content-and-offline.md) -- Snapshot cache and no-repeats
- [Logo Quiz](logo-quiz.md) -- The second app built from the same tree
