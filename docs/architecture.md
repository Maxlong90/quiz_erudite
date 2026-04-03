# Architecture

The app exists to deliver a focused, single-topic quiz experience on mobile. It prioritizes fast load times and tactile feedback over feature breadth. All question content lives on the backend; the frontend handles presentation and session state only.

## System Overview

```
┌─────────────────────────────────────────────┐
│              Mobile App (Expo)               │
│                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐ │
│  │  Home    │→│  Quiz    │→│  Results     │ │
│  │  Screen  │ │  Screen  │ │  Screen      │ │
│  └──────────┘ └────┬─────┘ └──────────────┘ │
│                    │                         │
│  ┌─────────────────┴──────────────────────┐  │
│  │        useQuizSession (reducer)        │  │
│  └─────────────────┬──────────────────────┘  │
│                    │                         │
│  ┌─────────────────┴──────────────────────┐  │
│  │          API Client (Axios)            │  │
│  └─────────────────┬──────────────────────┘  │
└────────────────────┼─────────────────────────┘
                     │ HTTPS
                     ↓
┌────────────────────────────────────────────┐
│   quiz-erudit-backend.turbosuslik.online   │
│   GET /api/v1/apps/{slug}/questions/random │
└────────────────────────────────────────────┘
```

## Navigation

Expo Router provides file-based routing with a `Stack` navigator. Three screens form a linear flow. Back gestures are disabled on the quiz and results screens to prevent accidental navigation during gameplay.

The root layout in `app/_layout.tsx` wraps everything in a `ThemeProvider` that switches between light and dark themes based on the device setting.

| Route | Screen | Header | Back Gesture |
|-------|--------|--------|--------------|
| `/` | Home | Hidden | Allowed |
| `/quiz` | Quiz | Hidden | Disabled |
| `/results` | Results | Hidden | Disabled |

## Key Design Decisions

**Stateless frontend.** The app stores no persistent quiz data. Each session fetches fresh questions from the backend. This keeps the app simple and ensures content stays current without client-side cache invalidation.

**Single content category.** The app slug `coat-of-arms` is hardcoded in the quiz screen. The `ContentCategory` type exists in `api/types.ts` for future extensibility but is not used in the current UI.

**Reducer-based state.** Quiz session state uses `useReducer` rather than external state management. The quiz is a single linear flow with well-defined transitions, making a reducer the right fit without adding library overhead.

**Haptic feedback on native.** The app triggers haptic vibrations (success or error) when the user answers a question. This is gated behind a platform check so it only runs on iOS and Android, not web.

## Component Organization

```
app/                   Screens (file-based routing)
api/                   Backend communication
  client.ts            Axios instance configuration
  questions.ts         Question fetching
  types.ts             Shared TypeScript interfaces
components/
  quiz/                Quiz-specific components
    question-card.tsx   Question display with image and options
    option-button.tsx   Answer option with reveal animations
    progress-bar.tsx    Animated progress indicator
  audio-player.tsx     Audio playback (available for future use)
  themed-text.tsx      Theme-aware text
  themed-view.tsx      Theme-aware view
hooks/
  use-quiz-session.ts  Quiz state machine (reducer)
  use-locale.ts        Language selection and detection
  use-color-scheme.ts  Dark/light mode
constants/
  theme.ts             Colors, quiz colors, font families
```

## See Also

- [Quiz Flow](quiz-flow.md) -- Detailed gameplay walkthrough
- [Data Model](data-model.md) -- API types and backend contract
