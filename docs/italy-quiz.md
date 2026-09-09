# Italy Quiz

Italy Quiz is the sixth app built from this tree: a single-topic quiz about Italy, played as a **tour of one place**. It has no economy at all — no lives, no coins, no premium — so the only thing shaping a session is the tour itself. This document explains why the app dropped subject categories entirely, how a tour is built out of four acts of time, what makes a place worth entering twice, and why four of its twenty questions ask for a range instead of a fact.

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

The replacement has a **single level**, and it is drawn as the **map of Italy**. `app/italy-quiz/places.tsx` asks one question — where are we going — and answers it with six pins placed at the cities' real coordinates: Rome, Naples & Vesuvius, Venice, Florence & Tuscany, Milan & the North, Sicily. Tapping a pin raises a card; the card starts the tour. Selecting and starting are two steps on purpose, because a pin is a small target and a stray tap should not throw a player into twenty questions.

The map earns its place by being the progress screen and the picker at once: stars accumulate on the pins, so the country visibly fills in as it is played. Its outline is a checked-in SVG path (`constants/italy-quiz/map-geometry.ts`) rather than a fetched or bundled picture — it must draw instantly and offline, and the shape of Italy is not going to change. The disciplines that used to be categories are now mixed *inside* a tour, so the last act of Rome asks about Vatican statehood, the Trevi fountain's takings, carbonara and the Rome derby in a row. A player who knows no Renaissance painting still knows the football clubs.

Places without authored questions render **hollow rather than hidden**, so the shape of the finished app is visible from the first build. Only Rome has content today.

## Why a Place Is Worth Entering Twice

A tour that plays the same twenty questions in the same order is finished the moment it ends. Two mechanisms in `hooks/italy-quiz/use-place-progress.ts` make a place worth returning to, and they solve different halves of the problem.

**Stars** give a reason to replay at all: 50% of a tour earns one, 80% earns two, and only a clean run earns three. They are kept at their BEST, so a lazy second attempt can never cost what was already won — the player is free to experiment. A mistakes review earns none: it is a sub-tour, it could only ever lower a score, and counting it would inflate the play count.

**The seen set** makes that replay worth playing. Each place remembers which questions it has already asked, and the draw prefers ones it has not. Rome carries 32 questions and a tour takes 20, so a second visit is materially different rather than the same set reshuffled. Nothing resets when the pool is exhausted — the draw simply falls back to shuffling everything, which is correct: at that point the player has seen the place and repetition is the point.

Both live under one storage key (`italy.progress.v1`) so a single read hydrates the whole map.

### What the draw protects

`orderTour` picks at random, so three things that used to be guaranteed by the authored order now have to be enforced, and each is covered by a test:

- **Callback pairs come whole.** Half a pair is worse than none — the ribbon would point at a question the player never saw — so both halves are pulled in before any random pick. A pair authored in the wrong direction (the second half in an earlier act) is dropped rather than shown broken.
- **The warm-up is pinned, not sorted.** An early version merely moved it to the front of whatever was drawn, which meant it was often not drawn at all and the tour opened on a hard question. It is now taken before the shuffle.
- **Unseen before seen**, per act, as described above.

## A Tour Is Four Acts of Time

A tour is twenty questions, drawn five at a time from each of four acts played in order:

```
🏛 Antiquity → ⚔️ Middle Ages → 🎨 Renaissance → 📸 Today
```

The acts are chronological on purpose: the player does not *choose* "Ancient Rome", they *travel* through it. This is also what fuses two things that used to be separate subcategories — the geography of the Roman empire and modern geography — into one continuous walk rather than two unrelated lists.

The Renaissance gets its own act rather than sitting inside a broader "centuries" bucket because it is the single thing Italy is best known for; folded into a wider act it disappeared.

`orderTour` in `hooks/italy-quiz/use-tour-progress.ts` builds the order act by act, shuffling inside each act — see [What the draw protects](#what-the-draw-protects) for the three guarantees that survive the shuffle. The acts themselves must always stay in sequence, because a callback pair is authored across them.

### Interludes carry the jump

Between two acts the screen hands over to `ActInterlude`. Without it, question 5 is about Domitian's stadium and question 6 is suddenly about the Pope, and the jump reads as a random change of subject — the exact failure the mixed-discipline tour was supposed to fix. The card names how much time just passed, sets up the next act, and gives a natural place to put the phone down halfway through twenty questions.

It **waits for a tap** rather than auto-advancing, so the player controls the pace. The button **names the act being entered** — "To the Middle Ages", "To the Renaissance", "To the present day" — rather than carrying one recurring word. The card's entire job is to explain where the tour is jumping, and the button is the one control the player actually reads; a generic label throws that away. The copy is per-act, authored beside the interlude in `places.ts`.

Interludes are **suppressed during a mistakes review**, where the questions jump between acts by definition and an interlude would fire on almost every question.

## One Question Shape, Two Ways to Answer It

There is one question shape: four options, one right, with an optional bundled image — a photo question and a text question are the same thing with and without `image`.

Four of Rome's twenty carry an `estimate` flag. Their options are **ranges** rather than facts — "800–600 BC", "about 120 years", "about 1.5 million €" — and they exist because a tour of twenty facts is otherwise a pure pass/fail on what the player happens to have read. The exact founding year of Rome is knowledge; "older than Athens, younger than Egypt" is reasoning, and everyone can do the second. The explanation still gives the exact number, so nothing is lost by not asking for it.

### The notched slider

`estimate` changes only the INPUT, never the scoring. Because ranges are inherently ordered, the four options are laid along a line and answered with `NotchedSlider`: the thumb snaps to one of four notches, the reading above names whichever option it is resting on, and confirming reports that option's index down the ordinary answer path. `options` must therefore be authored smallest-to-largest, and a small hint pair under the track ("earlier ◀ ▶ later" or "less ◀ ▶ more", picked by the question's `axis`) says which way the line runs.

The snapping is the whole point. A first version of this was a continuous slider that asked the player to hit one year out of eleven centuries — a target nobody can hit. With four stops each target is a quarter of the track wide, so a sloppy drag still lands where it was aimed, and there is exactly one right notch and three wrong ones like any other question.

That first version was also outright broken in a way worth recording, because the failure is easy to repeat. It measured where its track sat on screen **once, in a ref callback at mount**, before layout had settled; the measurement came back near zero and every touch afterwards mapped about thirty pixels off — a constant error of nearly a century, for the life of the screen. `NotchedSlider` measures nothing global: the grant event's own `locationX` is already relative to the component, and each move is that anchor plus the page-space delta. It is exact by construction and cannot drift when the surrounding `ScrollView` moves. For the same reason it refuses `onPanResponderTerminationRequest` — once a drag starts, the scroll view may not take the gesture away mid-stroke.

The thumb stays dim and the confirm button inactive until the player first touches the track, so the starting notch is never mistaken for a pre-selected answer.

### A miss reveals nothing

Only the option the player taps changes colour, a wrong pick never highlights where the correct answer was, and the tour moves on by itself after a brief pause. This mirrors [Flags Quiz](flags-quiz.md#the-answer-flow) and exists to protect the mistakes review: a question whose answer was just shown is worthless to replay. A correct pick behaves the opposite way — it does not auto-advance, the explanation appears, and a Next button lets the player control the pace of the thing actually worth reading.

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
 intro card → act 1 ──act ends──→ interlude ──tap──→ act 2 → …
      │                                                        │
      └──── persisted every change ────────── result ←─────────┘
                                                │
                                    "Review mistakes" → retry tour (not saved)
```

## Teaching the Rule Once

The mistakes flow is not discoverable from the question screen: a player who answers wrong sees the question vanish with no explanation and no correct answer, which reads as a punishment unless they know it is coming back. So a help sheet auto-opens **once per install**, on the first tour a player ever opens. The seen flag is persisted (`italy.help.seen.v1`); afterwards the sheet is on-demand from the "?" button in the quiz header, next to Report and Share.

## Artwork Gating

The landmarks artwork is a single heavy bundled image, and the glossy buttons drawn over it render instantly. Left alone the screen showed its buttons first and the background popped in a beat later. Every screen using that background therefore holds on a plain dusk-toned fill — matched to the artwork's sky so the reveal is seamless — until `useItalyBgReady` reports the asset decoded and cached. The gate fails open: an asset that cannot be warmed still lets the screen through.

The settings screen deliberately has **no "refresh questions" action**. It had one, inherited from the siblings, which called `resync()` on the content snapshot — an snapshot this app stopped reading. It downloaded data nothing opened and reported success, which is worse than not being there.

Question images are bundled under `assets/italy-quiz/questions/`, with their source and licence recorded in `CREDITS.md` beside them. They came from Wikimedia Commons for the prototype; anything shipped to a store needs its licence checked against that file.

## See Also

- [Architecture](architecture.md) -- Build-time app selection and module layout
- [Flags Quiz](flags-quiz.md) -- The sibling whose help sheet and choice-answer flow Italy Quiz mirrors
- [Development](development.md) -- Building and running the Italy variant
- [GLOSSARY](GLOSSARY.md) -- What "tour" and "act" mean here
- [INDEX](INDEX.md) -- Documentation entry point
