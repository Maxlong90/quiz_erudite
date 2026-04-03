# Data Model

The app consumes question data from a backend API. It does not store questions locally or maintain any persistent state between sessions. All domain entities originate from the backend; the frontend defines TypeScript interfaces to match the API response shape.

## Domain Entities

### Question

A question represents a single multiple-choice quiz item about a coat of arms. Each question has exactly four options, one of which is correct. Questions may include an image (typically the coat of arms being asked about) and an explanation revealed after answering.

| Field | Business Meaning |
|-------|-----------------|
| question | The question text displayed to the user |
| options | Four answer choices (always exactly four) |
| correct_option | Zero-based index (0--3) of the correct option |
| explanation | Context shown after answering (nullable) |
| image_url | URL to the coat of arms image (nullable) |

### Content Category

Represents a topic or subject area for quiz content. Defined in `api/types.ts` with `id`, `name`, and `slug` fields. Currently unused in the frontend -- the app hardcodes the `coat-of-arms` slug. This type exists for future multi-category support.

### App Config

Represents application-level configuration from the backend, including the app's name, slug, and supported locales. Defined but not fetched by the current frontend.

## Entity Relationships

```
┌──────────────┐       ┌──────────────────┐
│  AppConfig   │       │ ContentCategory  │
│              │       │                  │
│  slug ───────┼──→    │  slug            │
│  locales     │  used │  name            │
│              │  as   └──────────────────┘
└──────┬───────┘  query
       │          param    (not used yet)
       │
       ↓
┌──────────────────────────────────────┐
│             Question                 │
│                                      │
│  question, options, correct_option   │
│  explanation, image_url              │
└──────────────────────────────────────┘
```

## API Contract

The app communicates with a single endpoint:

**GET** `/api/v1/apps/{appSlug}/questions/random`

Query parameters:
- `count` -- Number of questions to return (10, 20, or 50)
- `locale` -- Language code (en, ru, or es)

The `fetchRandomQuestions` function in `api/questions.ts` handles response normalization. The backend may return either a bare array of questions or a wrapped response `{ data: [...] }`. The client handles both formats transparently.

The API client in `api/client.ts` uses Axios with a 15-second timeout and no authentication. The base URL points to `quiz-erudit-backend.turbosuslik.online/api/v1`.

## Data Lifecycle

Questions have no client-side lifecycle. They are:
1. Fetched from the API at the start of each quiz session
2. Held in memory by the `useQuizSession` reducer during gameplay
3. Discarded when the user navigates away from the quiz

No caching, offline storage, or local persistence exists. Each "Play Again" action triggers a fresh API call, which means the user gets a different random set of questions each time.

## See Also

- [Quiz Flow](quiz-flow.md) -- How questions are used during gameplay
- [Architecture](architecture.md) -- System structure and API integration
