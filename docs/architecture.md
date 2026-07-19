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
| `splash` | Splash | Animated intro; routes onward by first-launch flags |
| `language` | Language | Locale picker (en, ru, es) |
| `onboarding` | Onboarding | One-time intro carousel |
| `index` | Home | Cold-start intro gate and App Template gate; renders the trivia hub (Categories/Modes tabs) or redirects to the template's root experience |
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

**One shared codebase, many apps — the App Template seam.** This repository is built once and shipped as the whole portfolio of quiz apps; the concrete app is chosen at build time by `EXPO_PUBLIC_APP_SLUG`. The apps differ in content, assets, and color preset — all backend-driven — but they also sometimes differ in the *root experience* itself (trivia versus Logo Quiz). To decide that without hardcoding, the backend tags each app with a stable **template code** (`erudite`, `logo_quiz`, …) delivered in the snapshot as `snapshot.app.template`. The root route resolves that code to an experience through `lib/app-template.ts` and boots the matching home. Branching keys off the template *code* only — never an app's name or slug, which are display-facing and unstable. An unknown, empty, or not-yet-loaded code falls back to the safe `erudite` trivia default, so older snapshots (which predate the field) and unmapped templates keep working. See [The App Template Seam](#the-app-template-seam).

**Logo Quiz as a template-gated experience.** The "guess the brand" feature lives under `app/logo-quiz/` with its own neon dark theme, screens, and mock content layer, kept separate so it can evolve without regressing the main trivia flow. It reuses only the shared quiz reducer and the premium entitlement. It is not a trivia mode tile — it is a whole root experience the App Template seam switches on only for `logo_quiz` apps, so it never leaks into trivia apps like Erudite Quiz. See [Logo Quiz](logo-quiz.md).

**Premium as a soft gate.** Three modes are always free; the rest show a crown and route to the paywall when tapped without premium. Gating stays a client-side flag; wherever store billing is enabled it is backed by the live RevenueCat `premium` entitlement (synced upgrade-only on launch), while Expo Go / web keep the local flag as the source of truth. iOS uses the local flag today but joins the entitlement-backed path automatically once its RevenueCat key is supplied — see [iOS Monetization Parity](ios-monetization-parity.md).

## The App Template Seam

An **App Template** is the frontend code and experience an app boots into. The backend groups the portfolio's apps by template and assigns each a stable machine `code`; that code rides in every app's snapshot descriptor as `template`. The mobile side owns a single branch point for it.

```
   backend App ──template code──→ snapshot.app.template
                                        │
                                        ↓
                         resolveExperience (lib/app-template.ts)
                                        │
             ┌──────────────────────────┴──────────────────────────┐
             ↓                                                      ↓
      'logo_quiz'                                    'erudite' / unknown / null
             │                                                      │
             ↓                                                      ↓
   Redirect → /logo-quiz                                    trivia HomeScreen
   (Logo Quiz home)                                         (app/index.tsx)
```

`resolveExperience` maps a known code to an `AppExperience` and falls through to `DEFAULT_EXPERIENCE` (`erudite`) for anything else. Only mapped codes get their own experience; unmapped portfolio templates (`coat_of_arms`, `sports`, `world`) deliberately have no entry yet and resolve to trivia until one is built. `HomeRoute` in `app/index.tsx` reads the code from the content cache and, after the cold-start intro redirect, renders the resolved experience. Because the resolver is a pure function, its selection logic is unit-tested directly (`__tests__/lib/app-template.test.ts`) and the gate itself is covered as an integration test (`__tests__/app/home-route.test.tsx`).

The contract is deliberately additive and fail-safe: the `template` field is optional, a missing value means trivia, and no frontend logic ever branches on an app's name or slug. This is what lets a single build serve both trivia apps and Logo Quiz without either leaking into the other.

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
  app-template.ts       Template code → root experience resolver
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
```

## See Also

- [Quiz Flow](quiz-flow.md) -- End-to-end gameplay and the session state machine
- [Data Model](data-model.md) -- Entities, API contract, and local persistence
- [Gamification](gamification.md) -- Lives, hints, achievements, and modes
- [Content and Offline](content-and-offline.md) -- Snapshot cache and no-repeats
