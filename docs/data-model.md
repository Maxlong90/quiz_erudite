# Data Model

The app consumes content from a backend API and stores all player progress on the device. Content entities (categories, subcategories, questions) originate from the backend and are mirrored into an on-device snapshot. Progress entities (lives, hints, mistakes, stats, achievements) exist only locally and never leave the device. The frontend defines TypeScript interfaces to match each shape.

## Domain Entities

### Question

A question is a single multiple-choice item. Each has exactly four options, one of which is correct, and may carry an image and an after-answer explanation. Defined as `Question` in `api/types.ts` and, in snapshot form, as `SnapshotQuestion` in `lib/content-cache.ts` (which adds the owning subcategory slug).

| Field | Business Meaning |
|-------|-----------------|
| id | Stable identifier; drives no-repeat tracking and mistake logging |
| question | The prompt shown to the player |
| options | Four answer choices |
| correct_option | Zero-based index (0--3) of the correct option |
| explanation | Context revealed after answering (nullable) |
| image_url | Illustration for the question (nullable) |
| category_slug | Owning subcategory slug (snapshot questions only, nullable) |
| optionOrder | Display index → canonical backend option index (client-only, absent = identity) |

`optionOrder` is not a backend field. The quiz screen shuffles each question's options per session (`shuffleOptions`) and records the permutation here, so answer reporting and the real-stats hint can translate between the shuffled display order and the backend's canonical order. See [Gamification](gamification.md#hints).

### Category and Subcategory

A category is a top-level subject (geography, history, and so on); a subcategory is a child topic within it. Both are the same backend entity differentiated by a parent link. The live API returns them as `Category` (`api/categories.ts`); the snapshot nests them as `SnapshotCategory` with an embedded `subcategories` array of `SnapshotSubcategory`.

| Field | Business Meaning |
|-------|-----------------|
| slug | Stable key used for navigation, icon lookup, and seen-set buckets |
| name | Localized display name |
| sort_order | Display order within its level |
| icon_emoji | DB-provided emoji icon (nullable; falls back to the local map) |
| icon_url | DB-provided icon image (nullable; falls back to the emoji) |
| subcategories_count, total_questions_count | Tile counters (live API, top level) |
| should_have_images, should_have_audio | Content-shape hints from the backend |

### Content Snapshot

The snapshot is the offline mirror of everything the app needs for one language: the app descriptor, every category with its subcategories, and the full question pool. Defined as `ContentSnapshot` in `lib/content-cache.ts`. After download the client augments it with two client-only fields — `imageMap` (remote URL → local file URI) and `syncedAt` (the millisecond timestamp used for the 24-hour freshness check). See [Content and Offline](content-and-offline.md).

The `app` descriptor inside the snapshot also carries per-app configuration flags — the paywall toggles, the quit-button delay, and the App Template `template` code described below.

### App Template

An App Template is the frontend experience an app boots into. The mobile codebase is shared across the whole portfolio and picks a concrete app at build time (`EXPO_PUBLIC_APP_SLUG`); apps of the same template share the same root experience and differ only in content, assets, and color preset. The backend tags each app with a stable machine `code` for its template and returns it in two response shapes. The app-metadata endpoint carries it as `AppConfig.template` (`api/types.ts`, from `GET /apps/{slug}`), and the offline bundle carries it as the snapshot's `app.template` (`lib/content-cache.ts`, from `GET /apps/{slug}/snapshot`). In practice the running app reads the snapshot copy — that is the value the root route gates on — but both shapes carry the field so either can drive the decision.

| Field | Business Meaning |
|-------|-----------------|
| template | Stable template code (e.g. `erudite`, `logo_quiz`) selecting the root experience; nullable/absent |

The field is optional and additive — older responses omit it, and the client treats a missing or unrecognized value as the safe `erudite` trivia default. The frontend never branches on an app's `name` or `slug`, only on this code. See [The App Template Seam](architecture.md#the-app-template-seam) for how `resolveExperience` maps the code to a root experience.

### Local Progress Stores

These entities live in AsyncStorage and model the player's gamification state. None are sent to the backend.

| Entity | Store key | Represents |
|--------|-----------|------------|
| Lives | `quiz.lives.v1` | Currency spent on wrong answers; daily claim date and timestamp |
| Hints | `quiz.hints.v1` | Counts of three hint kinds |
| Mistakes | `quiz.mistakes.v1` | Up to 200 recently-missed question IDs (most recent first) |
| Quiz stats | `quiz.stats.v1` | Career totals: quizzes, seconds, questions, correct, perfect runs |
| Seen sets | `quiz.seen.v1.{bucket}` | Question IDs already served, bucketed by mode/category |
| Achievements | `quiz.achievements.seenLevels.v1` | Highest achievement level already celebrated |
| Today's pick | `quiz.today.v1` | The daily question's date, locale, and ID |
| Locale | `app.locale.v1` | Last chosen language |
| Premium | `app.premium.v1` | Premium flag (`'0'` / `'1'`) |

The lives, hints, mistakes, stats, and achievement stores carry their own business rules; see [Gamification](gamification.md). The seen sets drive cross-session no-repeats; see [Content and Offline](content-and-offline.md).

### Answer-Statistics Stores

Two more on-device keys back the statistics hint's real-data path (`lib/answer-stats.ts`). Unlike the progress stores above, these hold anonymous telemetry rather than player state, and one of them does leave the device — as aggregate-only counts with no accounts, PII, or device identifiers.

| Entity | Store key | Represents |
|--------|-----------|------------|
| Answer queue | `answers.queue.v1` | Outbound anonymous answer picks awaiting batch upload; capped at 500, oldest dropped |
| Question stats cache | `question.stats.v1` | Cached backend distributions (locale, threshold, per-question counts) read at hint time |

These two keys are **not** `quiz.*`-prefixed, so the settings reset (which wipes `quiz.*` keys) does not clear them; `clearAnswerStats` exists to remove both together but is reserved for an explicit data reset. See [Gamification](gamification.md#hints) and [Content and Offline](content-and-offline.md#answer-statistics-sync).

## Entity Relationships

```
┌───────────────┐   parent_id   ┌──────────────────┐
│   Category    │──────────────→│   Subcategory    │
│  (top-level)  │   (children)  │                  │
│  slug, name   │               │  slug, name      │
│  icon_emoji   │               │  icon_emoji      │
│  icon_url     │               │  icon_url        │
└───────┬───────┘               └────────┬─────────┘
        │                                │
        │        category_slug           │
        └──────────────┬─────────────────┘
                       ↓
        ┌──────────────────────────────────┐
        │            Question               │
        │  id, question, options,           │
        │  correct_option, explanation,     │
        │  image_url                        │
        └───────────────┬───────────────────┘
                        │ id referenced by
            ┌───────────┼────────────┐
            ↓           ↓            ↓
     ┌──────────┐ ┌──────────┐ ┌──────────┐
     │ Seen set │ │ Mistakes │ │  Today   │
     │ (no-rep) │ │ (review) │ │  (pick)  │
     └──────────┘ └──────────┘ └──────────┘
```

## Category Icons

Every category and subcategory tile renders an icon, resolved through a cascade that lets the backend override a built-in default without ever leaving a tile blank. The hardcoded maps live in `constants/category-visuals.ts`: `CATEGORY_VISUALS` keys each top-level slug to an emoji plus a brand gradient, `SUBCATEGORY_EMOJI` keys each subcategory slug to an emoji, and `FALLBACK_VISUAL` covers anything unknown.

For a top-level category (home screen, `app/index.tsx`):

1. If the API gave an `icon_url`, render that image.
2. Otherwise render `icon_emoji` from the API, or the slug's emoji from `CATEGORY_VISUALS`, or the fallback emoji.

For a subcategory (`app/category/[slug].tsx` and `app/quiz-mode/[slug].tsx`):

1. If the API gave an `icon_url`, render that image.
2. Otherwise render `icon_emoji`, then `SUBCATEGORY_EMOJI[slug]`, then the parent category's emoji.

The backend stores the same emoji values in its `content_categories.icon_emoji` column, backfilled from these maps, so the admin can view and edit each icon and later upload custom artwork via `icon_url`. The maps remain in the app as the guaranteed fallback for categories the backend has not populated. Because lookup is by slug, the backend can rename a display name freely; only a slug change would require touching these maps.

## API Contract

The base URL is `quiz-erudit-backend.turbosuslik.online/api/v1` (overridable via `EXPO_PUBLIC_API_URL`). The app slug is `erudite-quiz` (overridable via `EXPO_PUBLIC_APP_SLUG`). The Axios client (`api/client.ts`) uses a 15-second timeout and no authentication.

| Endpoint | Purpose |
|----------|---------|
| `GET /apps/{slug}/snapshot?locale=` | Full offline bundle for one language |
| `GET /apps/{slug}/categories?parent=` | Top-level categories, or one category's children |
| `GET /apps/{slug}/questions/random?count=&locale=&category=` | Random questions, optionally scoped to a category |
| `POST /apps/{slug}/answers` | Report an anonymous batch of answer picks for the statistics hint |
| `GET /apps/{slug}/question-stats?since=` | Aggregated per-question answer distributions (threshold-gated) |
| `POST /reports` | Submit a content report for a question |

Each read endpoint tolerates either a bare array or a `{ data: [...] }` wrapper; `fetchCategories` and `fetchRandomQuestions` normalize both. Reports (`api/reports.ts`) carry a content type, content ID, a reason from a fixed set (incorrect answer, unclear wording, inappropriate, broken media, translation issue, other), an optional comment, and the locale.

The answer-statistics endpoints (`lib/answer-stats.ts`) power the real-data path of the statistics hint and are anonymous, aggregate-only — no accounts, PII, or device identifiers. `POST /apps/{slug}/answers` takes `{ "answers": [{ question_id, option_index }] }` (an optional `is_correct` is ignored), returns `202 { "accepted": N }`, caps a batch at 200 rows (so the client flushes in batches of ≤ 200), is rate-limited to 60 requests/minute per IP, and silently drops malformed / out-of-range (`option_index` must be an integer in `[0, 15]`) / foreign rows without failing the batch. `GET /apps/{slug}/question-stats` returns `{ "threshold": N, "stats": { "<question_id>": { "total", "counts": [...] } } }` where `stats` is an object keyed by stringified question id (`{}` when nothing has reached threshold) and `counts[]` is index-aligned to the question's options and zero-filled; the server only includes a question once its total sample count reaches `threshold`, so any present question is real data. The optional `?since=<unix-seconds>` filters to questions whose counters changed at/after that time, for incremental refresh.

## Data Lifecycle

Content has a 24-hour cached lifecycle: the snapshot is fetched on first need, reused while fresh, and re-fetched when stale or when the language changes. Questions drawn into a session are filtered against the seen sets so the player rarely repeats a question across sessions, and the seen set resets only when a bucket is exhausted. See [Content and Offline](content-and-offline.md).

Progress stores accumulate monotonically as the player plays — stats and seen sets grow, lives and hints rise and fall, mistakes ring-buffer at 200 entries. The settings screen's reset clears every `quiz.*` key, the premium flag, the onboarding flag, and the content cache, returning the app to a near first-launch state. The anonymous answer-statistics keys survive that reset because they are not `quiz.*`-prefixed; they are harmless aggregate telemetry, not player progress.

## See Also

- [Content and Offline](content-and-offline.md) -- Snapshot cache, images, and no-repeats
- [Gamification](gamification.md) -- Lives, hints, mistakes, stats, achievements
- [Quiz Flow](quiz-flow.md) -- How entities are used during gameplay
- [Architecture](architecture.md) -- System structure and providers
