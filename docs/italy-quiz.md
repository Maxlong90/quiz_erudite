# Italy Quiz

Italy Quiz is the sixth app built from this tree: a single-topic quiz about Italy, played as a **tour of one place**. It has no economy at all — no lives, no coins, no premium — so the only thing shaping a session is the tour itself. This document explains why the app dropped subject categories entirely, how a tour is built out of four acts of time, and why one of its two question shapes deliberately breaks the app's own "never reveal the answer" rule.

## Why a Sixth App

Like the other siblings, Italy Quiz is selected at build time by `APP_SLUG`, here `italy-history-and-geography-quiz`. The home route redirects straight to `/italy-quiz/splash`, and the Erudite intro, hub, and modes never render. Its screens live in `app/italy-quiz/`, UI in `components/italy-quiz/`, tour state in `hooks/italy-quiz/`, and taxonomy, content, strings, and palette in `constants/italy-quiz/`.

It is still the least finished variant in two respects worth knowing before you plan work on it. It has **no EAS project**, so its config branch strips `runtimeVersion`, `updates`, and `extra.eas` and the app cannot receive an over-the-air update until those are restored (see [Development](development.md#running-italy-quiz-in-expo-go)). And it has **no store listing**, which is why its Share and Rate actions pass a null app descriptor to `getStoreLinks` and land on the Erudite fallback identity rather than an Italy listing. Both are ops gaps, not code gaps.

Visually the app is deep navy with glossy tiles over a single piece of cartoon-3D landmarks artwork, and it carries its own launcher icon — a vintage-map Italy mark — overriding both the top-level icon and the Android adaptive foreground.

## The App Owns Its Content

Every other app in this tree reads its categories and questions from the content snapshot. **Italy Quiz reads neither.** Its taxonomy is `constants/italy-quiz/places.ts` and its questions are hand-authored files under `constants/italy-quiz/questions/`, reached through the single seam in `constants/italy-quiz/tour-content.ts`.

That is a deliberate, temporary state. The app is being reshaped as a frontend prototype while the backend is left untouched, so the game mechanic can be judged on a real screen before any content pipeline is built for it. Everything the app needs is bundled: it runs with no network, no snapshot, and no `ContentCacheProvider`.

When real content arrives, `getTourQuestions` is the only function that changes — it starts reading the snapshot and mapping `act` from the backend category. No screen above it moves. The trade-off is the obvious one: until then, adding a question is a code change plus a release, and the backend's Italy categories are not connected to anything the app draws.

## One Axis: Place

The app used to have seven subject categories — Geography, History, Art & architecture, Cuisine, Culture & people, Sport, Bonus — split into 27 subcategories, browsed through a category screen and then a subcategory screen. That taxonomy is gone, and the subcategory screen with it.

It was dropped because slicing by discipline also slices by who the player is. A subcategory called "Writers" is a wall of one subject: a player either studied it and sweeps the run, or did not and misses it fifty times in a row. Nothing in a subcategory gave anyone a foothold.

The replacement has a **single level**. `app/italy-quiz/places.tsx` asks one question — where are we going — and lists places: Rome, Naples & Vesuvius, Venice, Florence & Tuscany, Milan & the North, Sicily. Tapping one starts its tour immediately. The disciplines that used to be categories are now mixed *inside* a tour, so the last act of Rome asks about Vatican statehood, the Trevi fountain's takings, carbonara and the Rome derby in a row. A player who knows no Renaissance painting still knows the football clubs.

Places without authored questions render **locked rather than hidden**, so the shape of the finished app is visible from the first build. Only Rome has content today.

## A Tour Is Four Acts of Time

A tour is twenty questions, drawn five at a time from each of four acts played in order:

```
🏛 Antiquity → ⚔️ Middle Ages → 🎨 Renaissance → 📸 Today
```

The acts are chronological on purpose: the player does not *choose* "Ancient Rome", they *travel* through it. This is also what fuses two things that used to be separate subcategories — the geography of the Roman empire and modern geography — into one continuous walk rather than two unrelated lists.

The Renaissance gets its own act rather than sitting inside a broader "centuries" bucket because it is the single thing Italy is best known for; folded into a wider act it disappeared.

`orderTour` in `hooks/italy-quiz/use-tour-progress.ts` builds the order act by act, and inside an act it keeps the **authored order rather than shuffling**. Two reasons while the content is hand-written: the first question of a tour is a warm-up that has to land first — a tour opening with a miss reads as "this is not for me" — and a fixed order keeps callback pairs reading as written. Once a place holds more questions than a tour draws, a within-act shuffle belongs exactly there. The acts themselves must always stay in sequence; see below for why.

### Interludes carry the jump

Between two acts the screen hands over to `ActInterlude`. Without it, question 5 is about Domitian's stadium and question 6 is suddenly about the Pope, and the jump reads as a random change of subject — the exact failure the mixed-discipline tour was supposed to fix. The card names how much time just passed, sets up the next act, and gives a natural place to put the phone down halfway through twenty questions.

It **waits for a tap** rather than auto-advancing, so the player controls the pace. The button says `AVANTI!` on every interlude — a recurring beat of the tour — with the destination underneath so nobody is guessing where they are being taken.

Interludes are **suppressed during a mistakes review**, where the questions jump between acts by definition and an interlude would fire on almost every question.

## Two Question Shapes

A `choice` question is four options, one right, with an optional bundled image — a photo question and a text question are the same kind with and without `image`.

A `scale` question is answered by dragging a slider between `min` and `max`, and counts as correct within `tolerance` of the truth. It exists because a tour of twenty facts is otherwise a pass/fail on what the player happens to have read. Nobody knows the founding year of Rome to the year, but everyone can place it on a line, so a scale question is a place where a player who knows nothing precise still has something to do.

The slider is built on the core `PanResponder`, not a slider package. Italy Quiz is previewed in Expo Go, which only carries the native modules baked into it, so a new native dependency would mean a full rebuild before anyone could look at the screen.

### A miss reveals nothing — except on a scale

For a `choice` question, only the option the player taps changes colour, a wrong pick never highlights where the correct answer was, and the tour moves on by itself after a brief pause. This mirrors [Flags Quiz](flags-quiz.md#the-answer-flow) and exists to protect the mistakes review: a question whose answer was just shown is worthless to replay. A correct pick behaves the opposite way — it does not auto-advance, the explanation appears, and a Next button lets the player control the pace of the thing actually worth reading.

A `scale` question **always reveals the true value**, right or wrong, and marks it on the track next to where the player left the thumb. A distance with no destination teaches nothing: "you were 300 years off" is only information once the year is on screen. The cost is real and accepted — a missed scale question is partly spoiled for the review — and it is the reason `formatScaleGap` exists alongside `formatScaleValue`.

## Callbacks: Then → Now

A question may carry `callback`, the id of an **earlier question in the same tour**. The quiz screen then draws a ribbon above the question with that earlier question's text and thumbnail.

It is how the app connects antiquity to the present without filing them as two subcategories. In the Rome tour, question 5 asks what Domitian's thirty-thousand-seat stadium hosted; question 16, three acts and nineteen centuries later, shows Piazza Navona and asks what that stadium turned into — the square is long and narrow because it is the stadium's running field. The second Rome pair does the same with the Pantheon (question 2) whose bronze was stripped for Bernini's baldachin (question 15).

Callbacks are why **acts may never be reordered**. A pair is authored across acts so the first half always plays before the second; shuffling acts, or drawing questions across act boundaries, would show a player a ribbon referring to a question they have not seen.

## Resuming a Tour

`useTourProgress` owns a tour's position and mistakes and persists them under a per-place key (`italy.tour.{placeId}`). Leaving the app mid-tour and coming back resumes on the same question with the same score, and skips the intro card.

Because `orderTour` is deterministic, the order itself is not stored — only `pos`, `wrong`, and the question count the tour was saved at. A changed count retires the save rather than replaying a tour against content that moved.

The score is derived rather than stored (`pos - wrong.length`): every answered question is either right or wrong, so a stored score would be a second source of truth that could disagree with the mistakes list. A mistakes-only retry tour is handed its ids directly and is **never persisted**, so a player who abandons a review returns to a clean slate.

```
place tapped
      │
      ↓
saved tour for this place? ──yes──→ resume at pos (intro skipped)
      │ no
      ↓
 intro card → act 1 ──act ends──→ interlude ──AVANTI──→ act 2 → …
      │                                                        │
      └──── persisted every change ────────── result ←─────────┘
                                                │
                                    "Review mistakes" → retry tour (not saved)
```

## Teaching the Rule Once

The mistakes flow is not discoverable from the question screen: a player who answers wrong sees the question vanish with no explanation and no correct answer, which reads as a punishment unless they know it is coming back. So a help sheet auto-opens **once per install**, on the first tour a player ever opens. The seen flag is persisted (`italy.help.seen.v1`); afterwards the sheet is on-demand from the "?" button in the quiz header, next to Report and Share.

## Artwork Gating

The landmarks artwork is a single heavy bundled image, and the glossy buttons drawn over it render instantly. Left alone the screen showed its buttons first and the background popped in a beat later. Every screen using that background therefore holds on a plain dusk-toned fill — matched to the artwork's sky so the reveal is seamless — until `useItalyBgReady` reports the asset decoded and cached. The gate fails open: an asset that cannot be warmed still lets the screen through.

Question images are bundled under `assets/italy-quiz/questions/`, with their source and licence recorded in `CREDITS.md` beside them. They came from Wikimedia Commons for the prototype; anything shipped to a store needs its licence checked against that file.

## See Also

- [Architecture](architecture.md) -- Build-time app selection and module layout
- [Flags Quiz](flags-quiz.md) -- The sibling whose help sheet and choice-answer flow Italy Quiz mirrors
- [Development](development.md) -- Building and running the Italy variant
- [GLOSSARY](GLOSSARY.md) -- What "tour" and "act" mean here
- [INDEX](INDEX.md) -- Documentation entry point
