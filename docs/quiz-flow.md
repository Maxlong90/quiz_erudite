# Quiz Flow

A play session moves the player from the home hub, through an optional category and mode choice, into gameplay, and out to results. The home screen launches every mode; the quiz screen runs them all on one reducer-driven engine, varying its behavior by the parameters it receives. Navigation passes everything through URL query params, keeping screens stateless and deep-linkable.

## Entry Points

The home screen (`app/index.tsx`) has two tabs:

- **Categories** lists the seven subjects. Tapping one opens `category/[slug]`, which lists that subject's subcategories. Tapping a subcategory opens `quiz-mode/[slug]`, where the player picks a question count and a mode, then starts. This path scopes questions to the chosen topic.
- **Modes** lists ten mode tiles. Tapping a mode starts a quiz directly (some open a small config modal first). This path draws from the whole pool or a player-chosen mix.

Either way, the launch ends in `router.push('/quiz')` carrying the parameters the quiz screen needs.

The first tile on the Modes tab opens [Logo Quiz](logo-quiz.md), a separate neon "guess the brand" mini-app. It reuses this screen's `useQuizSession` engine but runs on its own screens and content, so it is documented separately.

```
┌──────────┐ Categories ┌────────────┐  ┌─────────────┐
│          │───────────→│ category/  │ →│ quiz-mode/  │
│   Home   │            │  [slug]    │  │  [slug]     │
│  (tabs)  │            └────────────┘  └──────┬──────┘
│          │  Modes (10 tiles)                 │
│          │───────────────┐                   │
└──────────┘               ↓                   ↓
                    (optional config modal) → ┌──────┐ → ┌─────────┐
                                              │ Quiz │   │ Results │
                                              └──────┘   └─────────┘
```

## Modes

Three modes are free; the other seven show a crown and route to the paywall when the player is not premium (`hooks/use-premium.ts`). The tiles are defined in `app/index.tsx`; the quiz screen collapses them into a smaller set of runtime behaviors (daily, quick, timed, survival, hard) selected by the `mode` param.

| Mode | Tier | What it does |
|------|------|--------------|
| Today's Question | Free | One daily question, fixed per local day |
| Time Limit | Free | A global countdown over a long pool; pick the seconds first |
| Random 10 | Free | Ten questions from the whole pool |
| By Topic | Premium | Pick categories and a count (5--50) |
| Timed | Premium | Pick categories, count, and a per-question timer (5--60s) |
| Challenge | Premium | Reserved; not yet available |
| Survival | Premium | Ten questions, but a wrong answer ends the run |
| Mistakes | Premium | Questions drawn from the player's mistake history |
| Hard | Premium | Type the answer, or build it from letters |
| Flashcards | Premium | Reserved; not yet available |

The config modals live in `components/home/`: `category-picker` and `quiz-config-modal` for topic and count, `time-limit-modal` for the global timer, `hard-mode-modal` for the hard variant. The Mistakes tile disables itself when the player has no logged mistakes.

## Quiz Screen

### Loading Questions

On mount, the quiz screen (`app/quiz.tsx`) assembles the question pool. It prefers the cached snapshot, falling back to the live `questions/random` endpoint, and filters the result against the player's seen set for that mode/category bucket so questions rarely repeat across sessions. If too few unseen questions remain, it resets that bucket and reuses the pool. Today's Question resolves a single fixed ID via `getTodayQuestionId`; Mistakes pulls from the stored mistake IDs; Hard filters to questions whose answer fits the chosen variant. See [Content and Offline](content-and-offline.md).

A spinner covers loading. On failure the screen shows an error with retry and home actions.

### Answering Questions

Each question renders through `QuestionCard` (or `HardQuestionCard` in hard mode): an optional image, the prompt, and four lettered options. The player taps one; the answer locks immediately. The reducer's `ANSWER` action is a no-op once the current question is answered, enforcing one answer per question.

After answering:

- All options reveal — the correct one turns green, a wrong pick turns red.
- Haptic feedback fires on native (success or error).
- The explanation fades in below the options when one exists.
- A wrong answer is recorded to the mistake store and, outside survival, spends one life. Running out of lives opens the out-of-lives modal, which routes to the shop.
- In survival, the first wrong answer ends the run.
- A "Next" button fades in; on the last question it reads "See Results."

The hint bar (`components/quiz/hint-bar.tsx`) offers three hint kinds during play — 50/50, player statistics, and replace-question — though hard mode shows only replace-question, since the other two act on multiple-choice options. The lives bar and timer sit alongside. Premium players see an infinity glyph on the lives bar and hint badges and never spend either. See [Gamification](gamification.md).

### Advancing and Finishing

"Next" dispatches `NEXT`; on the last question the reducer transitions to `finished`. The screen also finishes early on survival death or timer expiry. A `useEffect` watches for the finished status, records the session into career stats and achievements, and navigates to results with score, total, count, and locale. Early exits still accrue answered questions, time, and correct counts, but do not tally as a completed quiz.

## Results Screen

The results screen (`app/results.tsx`) computes the accuracy percentage and picks a feedback tier:

| Accuracy | Tier | Color |
|----------|------|-------|
| 80% and up | Excellent (🏆) | Green (#22c55e) |
| 40%--79% | Good (👍) | Amber (#f59e0b) |
| Below 40% | Keep going (💪) | Red (#ef4444) |

It then gathers achievement metrics and detects any newly crossed achievement levels, queuing an unlock modal for each. "Play Again" replays the same mode with fresh questions; "Home" returns to the hub. Both use `router.replace()` so the player cannot navigate back into a finished quiz. See [Gamification](gamification.md#achievements).

## Session State Machine

`useQuizSession` (`hooks/use-quiz-session.ts`) drives gameplay through a reducer. Loading transitions to either playing or error; playing answers and advances until the last question (or an explicit `FINISH`) moves it to finished; `RESET` returns to the initial loading state.

```
        SET_LOADING
             │
             ↓
     ┌──────────────┐  SET_ERROR   ┌──────────────┐
     │   loading    │─────────────→│    error     │
     └──────┬───────┘              └──────┬───────┘
            │ SET_QUESTIONS               │ retry →
            ↓                             │ SET_LOADING
     ┌──────────────┐←───────────────────┘
     │   playing    │
     │ ANSWER locks │
     │ NEXT advances│
     └──────┬───────┘
            │ NEXT (last) / FINISH
            ↓
     ┌──────────────┐  RESET
     │  finished    │──────→ (loading)
     └──────────────┘
```

The reducer enforces two invariants: one answer per question (`ANSWER` is a no-op after the first), and strictly linear progression (no going back or skipping). The score is derived, not stored — it recomputes from the answers against each question's `correct_option`.

## See Also

- [Gamification](gamification.md) -- Lives, hints, mistakes, and achievement unlocks
- [Content and Offline](content-and-offline.md) -- Question pools and no-repeats
- [Architecture](architecture.md) -- Navigation and providers
- [Data Model](data-model.md) -- Question and category shapes
