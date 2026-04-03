# Quiz Flow

The quiz flow takes the user from configuration through gameplay to results in a linear three-screen sequence. Each screen hands off parameters to the next via URL query params, keeping navigation stateless and deep-linkable.

## End-to-End Flow

```
┌────────────┐  params: count,  ┌────────────┐  params: score,  ┌────────────┐
│            │  locale          │            │  total, count,   │            │
│   Home     │────────────────→│   Quiz     │  locale          │  Results   │
│            │  router.push()   │            │────────────────→│            │
│            │                  │            │  router.replace()│            │
└────────────┘                  └────────────┘                  └──────┬─────┘
      ↑                                                               │
      │  router.replace('/')                                          │
      ├───────────────────────────────────────────────────────────────┘
      │                              router.replace('/quiz')          │
      │  "Home" button               "Play Again" button              │
      └───────────────────────────────────────────────────────────────┘
```

## Home Screen

The home screen lets the user configure two settings before starting:

**Question count.** Three fixed options: 10, 20, or 50. Defaults to 10. Rendered as selectable pill buttons.

**Language.** English, Russian, or Spanish. The default comes from the device locale via `useLocale`. If the device language is not in the supported set, it falls back to English. The locale detection uses `expo-localization` to read the device's primary language code.

When the user taps "Start Quiz," the home screen calls `router.push('/quiz')` with `count` and `locale` as URL params.

## Quiz Screen

### Loading Questions

On mount, the quiz screen calls `fetchRandomQuestions` with the hardcoded app slug `coat-of-arms`, the selected locale, and the question count. The `useQuizSession` hook manages all state transitions through a reducer.

The loading state shows a spinner. If the API call fails, an error screen appears with a "Try Again" button that retries the same request and a "Go Home" link.

### Answering Questions

Each question displays through `QuestionCard`, which renders:
- An optional coat of arms image (loaded via `expo-image`)
- The question text
- Four answer options (labeled A through D)

The user taps one option. The answer is locked immediately -- tapping again has no effect. The reducer's `ANSWER` action enforces this: it checks whether the current question already has an answer and returns unchanged state if so.

After answering:
- All options reveal their status. The correct option turns green; a wrong selection turns red.
- Haptic feedback fires on native platforms (success vibration for correct, error for incorrect).
- The question's explanation fades in below the options (if one exists).
- A "Next" button fades in after a 500ms delay using `react-native-reanimated`.

### Animation Details

`OptionButton` uses three animated values: `scale` (bounce on correct), `translateX` (shake on wrong), and `bgOpacity` (color transition). `QuestionCard` slides in from the right when a new question appears. These animations create a clear visual distinction between states without requiring the user to read color alone.

### Advancing and Finishing

The "Next" button dispatches a `NEXT` action. If the current question is the last one, the reducer transitions status to `finished`. The quiz screen watches for this status change in a `useEffect` and navigates to results via `router.replace('/results')` with score, total, count, and locale as params.

The last question's "Next" button reads "See Results" instead of "Next."

## Results Screen

The results screen calculates the percentage score and selects a feedback tier:

| Percentage | Message | Color |
|------------|---------|-------|
| Above 70% | "Excellent! You're a heraldry expert!" | Green (#22c55e) |
| 40% -- 70% | "Good job! Keep learning!" | Amber (#f59e0b) |
| Below 40% | "Keep practicing, you'll get there!" | Red (#ef4444) |

A score circle shows the raw score (e.g., "7 / 10") with a colored border matching the tier. All elements animate in with staggered `FadeInDown` animations.

Two actions are available:
- **Play Again** navigates to `/quiz` with the same count and locale, starting a fresh session.
- **Home** navigates to `/`, letting the user reconfigure.

Both use `router.replace()` to prevent back-navigation into a completed quiz.

## State Machine

The `useQuizSession` hook manages quiz state through a reducer with six actions:

```
         SET_LOADING
              │
              ↓
┌──────────────────────┐
│       loading        │
└──────────┬───────────┘
           │ SET_QUESTIONS         SET_ERROR
           ↓                          ↓
┌──────────────────────┐  ┌──────────────────────┐
│       playing        │  │        error         │
│                      │  └──────────────────────┘
│  ANSWER → locks pick │         ↑  retry calls
│  NEXT   → advance    │─────────┘  SET_LOADING
│           or finish  │
└──────────┬───────────┘
           │ NEXT (last question)
           ↓
┌──────────────────────┐
│       finished       │
└──────────────────────┘
           │ RESET
           ↓
       (back to loading)
```

The reducer enforces two key invariants:
1. **Single answer per question.** The `ANSWER` action is a no-op if the current question already has an answer.
2. **Linear progression.** Questions advance one at a time with no ability to go back or skip.

## See Also

- [Architecture](architecture.md) -- System structure and navigation
- [Data Model](data-model.md) -- Question and response formats
