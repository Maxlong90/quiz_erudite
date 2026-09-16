# Italy Quiz

Italy Quiz is the sixth app built from this tree: a single-topic quiz about Italy, played as a **tour of one place**. It has no economy at all — no lives, no coins, no premium — so the only thing shaping a session is the tour itself. This document explains why the app dropped subject categories entirely, how a tour is built out of four acts of time, and how a place's ten fixed **circles** and the chain between cities carry progression.

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

Tapping a pin also raises that place's **circle strip** — see [Circles](#circles-ten-fixed-sets-per-place). The strip scrolls rather than fits: ten chips squeezed into the card's content width on a 360dp phone would be about 22dp each, below any usable touch target and far too small for a number plus stars. At 36dp with a 6dp `hitSlop` each chip is a 48dp target, about six and a half are visible, and the half-cut seventh is the scroll affordance.

The card's entry button **is** the status line — "Circle 3", "Circle 1 · again", "Questions still being written", and — on a city the chain has not opened — a two-line "Clear 4 more circles" over the gate city's name — which is what pays for having no extra hint row under the strip. It is always present, so the card's height never moves. Fitting that longest caption into a fixed pill takes three separate concessions — see [Making the locked caption fit](#making-the-locked-caption-fit).

Every place is on the chain, so every pin is reachable by play; a place flagged `locked` would render **hollow rather than hidden**, and one flagged `alwaysOpen` is a side trip that needs no key at all. Nothing carries either flag today. Only Rome has authored questions.

### Making the locked caption fit

That two-line caption is the hardest string in the app to fit, and each of its three constraints was a visible defect first.

The caption used to be one line — "Clear one circle — Rome" — and its tail simply vanished. `GlossyButton` draws the padlock **absolutely positioned**, so the flex layout does not know the icon is there and a centred label runs underneath it. The fix reserves the icon's width as padding on *both* sides, derived from the font size, so the text stays optically centred rather than shoved left.

Splitting the requirement and the city name onto two lines is the second half. It also changes how the label shrinks: `adjustsFontSizeToFit` scales the whole block down to whatever its **worst** line needs, then stops at `minimumFontScale` and ellipsizes. The longest requirement line — French «Réussissez encore 5 cercles» — blew past that floor at the one-line size, so the two-line caption is rendered a few points smaller than the ordinary "Circle 3". The button's height is unchanged, because the shrink was already happening.

The third constraint is the system font setting, and it is the non-obvious one. `adjustsFontSizeToFit` shrinks relative to the **already system-scaled** size, so the real floor is `minimumFontScale × fontSize × systemScale`. A large enough accessibility scale drags that floor back above the pill's width and the label clips again, however low the minimum goes. The two therefore have to be solved as a pair: `GlossyButton` caps enlargement with `maxFontSizeMultiplier` and keeps the product of the two below the widest measured line's need. A test asserts that product directly, so raising either constant re-breaks the build rather than the screen.

Capping enlargement on this button is a deliberate trade. It is a short action label in a fixed-width pill, and a clipped label serves a low-vision reader worse than a bounded one. **Body copy elsewhere in the app is not capped.** Where copy alone was still too long, the copy moved: the French `cityLockedNeed` drops its verb («Encore 5 cercles») because a countdown reads naturally without it, while the other three locales keep theirs.

## Circles: Ten Fixed Sets Per Place

A place is not one endlessly reshuffled tour. It is **ten circles**, and a circle is a **fixed set of twenty questions** — five from each of the four acts. The pure logic lives in `lib/italy-quiz/circles.ts`; `hooks/italy-quiz/use-place-progress.ts` owns only persistence.

The set is drawn once, on first entry, and then frozen. Replaying circle 3 asks the same twenty in the same order; new material is what the *next* circle is for. That promise is kept by exactly one rule: a circle's `ids` are written by `upsertCircle` and only while still empty. Everything else — resume, replay, the strip — reads them.

Freezing the set is what makes a replay legible. Under the old draw a second visit was a different twenty, so a worse score could mean either "I got worse" or "I got a harder shuffle", and the stars measured neither. Now a replay is the same exam.

**Stars are per circle**, on the unchanged scale: 50% earns one, 80% two, a clean run three. They are kept at their BEST, so going back for a third star can only ever add. The circle's **pass mark is deliberately not a new number** — ten of twenty *is* the first star, so "cleared" and "earned something" are one event. A mistakes review earns none: it is a sub-tour, it could only ever lower a score, and counting it would inflate the play count.

The map pin carries the **sum of the stars of every circle** of that place, 0..30.

```
ITALY_CHAIN:  rome ──clear 5 circles──→ florence ──clear 5 circles──→ venice ──→
              sicily ──→ naples ──→ milan ──→ all-italy

  Place (rome)
    ├── acts: antiquity → middle-ages → renaissance → today
    ├── questions (bundled, 32 today — 8 per act)
    └── circles 1..10        ← at most one per 5 unused questions per act
          ├── Circle 1  ids[20] (frozen)  stars 0..3  bestPct  plays
          ├── Circle 2  "soon" — no ids, cannot be drawn yet
          └── …
                 ↑ five ids drawn from each act, never reused by another circle
```

### Two ways a circle can be shut

The strip on the place card draws all ten slots, and the load-bearing distinction is between its two closed states:

| state | looks like | means |
|---|---|---|
| `done` | filled, numbered, stars under it | cleared; still playable, for a better star |
| `current` | outlined, numbered | the one live circle |
| `locked` | a padlock | the circle before it has not been cleared — a door with a key you can earn |
| `soon` | no border, no icon, a hole in the row | not enough authored content to draw twenty more |

`soon` must never be mistaken for the padlock, because nothing the player does will open it. It is drawn borderless rather than dashed on purpose: `borderStyle: 'dashed'` combined with a `borderRadius` renders as solid on iOS in several RN versions, which would silently collapse the two states into one on exactly one platform.

Only the **first** blocked slot gets `soon`; everything behind it is `locked`. "You have not cleared the one before" is knowable, while "will content ever exist for circle 7" is not.

### What the draw enforces

`drawCircle` picks at random from what no earlier circle has claimed. One ordering rule shapes each act's five picks, and one refusal rule shapes the circle as a whole; each is covered by a test:

- **Unseen questions come before seen ones.** `seen` is only a tie-breaker inside an act's pool, never an exclusion — it is migration residue (see [Storage](#storage)) and must never make a circle undrawable. Both groups are shuffled independently, so a replay of the same fixed set still varies the order.
- **A circle is refused, not stunted.** `drawCircle` returns `null` when ANY act is short, not when the total is. Twenty spare questions all sitting in antiquity is not a circle, and the UI shows `soon` instead of a lopsided tour. `canDrawCircle` is literally that same predicate, so the strip's idea of playable and the draw's idea of possible cannot drift apart.

Earlier versions of the draw also had to protect two hand-authored mechanics — a "warm-up" question pinned first and "callback" pairs that had to be drawn whole — that the backend never supplied. Both mechanics were removed, so the draw no longer special-cases either; questions are just the one shape described under [One Question Shape](#one-question-shape).

### Cities open in a chain

`ITALY_CHAIN` in `constants/italy-quiz/places.ts` is the whole progression, in one line: `rome → florence → venice → sicily → naples → milan → all-italy`, ordered by how much content each place is likely to get rather than by geography. Clearing **`CIRCLES_TO_UNLOCK_NEXT` (5)** circles of a city puts the next city on the map — the number is a named constant in `lib/italy-quiz/circles.ts` because it is expected to be tuned. It is an ordered array rather than a `requires` field on each place because reordering is then a single edit and a cycle is not expressible.

The gate counts *passes* rather than asking whether circle 5 specifically is cleared. Circles are strictly sequential, so the two say the same thing — but a count lets the constant move without touching the label, and `circlesLeftToUnlock` gives the locked pin's caption the same arithmetic the gate enforces, so the button can never promise a number nothing checks.

That gives three kinds of pin, readable without words: **open** (solid, carrying its star count), **chain-locked** (solid rim plus a padlock, and still *selectable* — a dead pin cannot explain why it is dead, and the card one tap away has room for the sentence that does), and **not on the schedule** (hollow, empty, untappable — a `locked` place waiting for content that no amount of play will open). Nothing is in that third state today: Naples, Milan, Sicily and All of Italy joined the chain and now open by play like the rest. A place flagged `alwaysOpen` draws as an ordinary open pin.

No city has five circles of content yet, so **nothing opens by play at present** — that is expected, and the reason the locked caption counts down («Clear 4 more circles») instead of restating the target. Questions are being written under a separate task.

### What is "soon" with today's content

Rome holds 32 questions — **exactly eight per act**. A circle needs five *per act*, so circle 1 takes five from each and leaves three. **Rome supplies exactly one circle**, not the one and a half the raw total suggests: the five-per-act rule binds before the twenty-per-circle total does. Circle 2 needs ten per act, so Rome is short by eight questions (two per act). `availableCircles(rome, ROME_QUESTIONS) === 1` is the tripwire that says so, and it moves on its own when questions are added.

So on today's content: Rome's circles 2–10 are `soon`; Florence is chain-locked behind five cleared Rome circles, which today's single circle cannot supply, and every city behind Florence sits behind that. `soon` is therefore the *dominant* state on day one, not an edge case — which is why it gets real copy rather than the generic empty line.

### Storage

Progress lives under `italy.progress.v2`:

```ts
interface CircleRecord { index: number; ids: number[]; stars: number; bestPct: number; plays: number }
interface PlaceRecordV2 { circles: CircleRecord[]; seen?: number[] }
```

The **v1 record migrates into circle 1**, carrying `stars`/`bestPct`/`plays` verbatim. Its `seen` list becomes the circle's fixed set when it is exactly one tour's worth — in v1 that is precisely what it was — and otherwise the circle still counts as passed and is re-fixed on next entry. The old `italy.progress.v1` key is **read and then left alone**, so an app rollback still finds the player's stars.

The surviving `seen` is a **soft preference for the draw, never a filter**. A migrated player who had already been served every question would otherwise be unable to have their circle fixed at all, and would meet `soon` sitting on top of stars they had already earned.

Every write goes through one serialised promise chain, each mutation re-reading storage inside its own link. Fixing a set is a read-modify-write, so the old fire-and-forget `setItem` would lose whichever of two overlapping writes landed first — a player finishing a circle while its ids were being fixed would silently lose a star. The same serialisation makes a double-tap on the strip harmless: the second `ensureCircle` sees the first one's commit and hands back the same twenty.

## A Tour Is Four Acts of Time

A tour is twenty questions, drawn five at a time from each of four acts played in order:

```
🏛 Antiquity → ⚔️ Middle Ages → 🎨 Renaissance → 📸 Today
```

The acts are chronological on purpose: the player does not *choose* "Ancient Rome", they *travel* through it. This is also what fuses two things that used to be separate subcategories — the geography of the Roman empire and modern geography — into one continuous walk rather than two unrelated lists.

The Renaissance gets its own act rather than sitting inside a broader "centuries" bucket because it is the single thing Italy is best known for; folded into a wider act it disappeared.

`drawCircle` in `lib/italy-quiz/circles.ts` builds the order act by act, shuffling inside each act — see [What the draw enforces](#what-the-draw-enforces) for the ordering and refusal rules that survive the shuffle. The acts themselves always play in sequence because the chronology *is* the point: the player travels through time rather than shuffling it.

### Interludes carry the jump

Between two acts the screen hands over to `ActInterlude`. Without it, question 5 is about Domitian's stadium and question 6 is suddenly about the Pope, and the jump reads as a random change of subject — the exact failure the mixed-discipline tour was supposed to fix. The card names how much time just passed, sets up the next act, and gives a natural place to put the phone down halfway through twenty questions.

It **waits for a tap** rather than auto-advancing, so the player controls the pace. The button **names the act being entered** — "To the Middle Ages", "To the Renaissance", "To the present day" — rather than carrying one recurring word. The card's entire job is to explain where the tour is jumping, and the button is the one control the player actually reads; a generic label throws that away. The copy is per-act, authored beside the interlude in `places.ts`.

Interludes are **suppressed during a mistakes review**, where the questions jump between acts by definition and an interlude would fire on almost every question.

## One Question Shape

There is exactly one question shape: four options, one right, with an optional bundled image — a photo question and a text question are the same thing with and without `image`. Both answer through the same grid of four buttons. The app carries no bespoke input widget, so every question in every act is answered the same way.

Some of Rome's questions ask for a **range** rather than a single fact — "800–600 BC", "about 120 years", "about 1.5 million €". These are ordinary four-option questions whose options happen to be spans; they are authored as plain text options and scored like any other. They exist because a tour of twenty exact facts is otherwise pure pass/fail on what the player happens to have read. The exact founding year of Rome is knowledge; "older than Athens, younger than Egypt" is reasoning, and everyone can do the second. The explanation still gives the exact number, so nothing is lost by not asking for it.

An earlier prototype turned these range questions into a **notched slider** and paired some questions across acts as a "then → now" callback ribbon — both hand-authored mechanics the backend was never going to feed. They were removed to leave the two shapes above, so a range question is now just four ordered text options in the standard grid. Do not reintroduce a per-question input mode or a cross-question ribbon without a backend that actually supplies the metadata.

### A miss reveals nothing

Only the option the player taps changes colour, a wrong pick never highlights where the correct answer was, and the tour moves on by itself after a brief pause. This mirrors [Flags Quiz](flags-quiz.md#the-answer-flow) and exists to protect the mistakes review: a question whose answer was just shown is worthless to replay. A correct pick behaves the opposite way — it does not auto-advance, the explanation appears, and a Next button lets the player control the pace of the thing actually worth reading.

## Resuming a Circle

`useTourProgress` no longer draws anything. It owns a circle's position and mistakes and persists them under a **per-circle** key (`italy.tour.{placeId}.c{n}`) — per place would let an abandoned circle 3 resume inside circle 1. Leaving the app mid-circle and coming back resumes on the same question with the same score, and skips the intro card.

A save resumes only when its stored ids are the **same set in the same order** as the circle being entered. Under the old model the check could only ask "are these ids known to this place", because the order was redrawn on every entry; now that it is fixed upstream the strict comparison is both possible and necessary, and it is what stops a blob left by another draw from resurrecting a half-finished tour under a different twenty.

The score is derived rather than stored — answered questions minus missed ones: every answered question is either right or wrong, so a stored score would be a second source of truth that could disagree with the mistakes list. The count of answered questions is the subtle half. Mid-circle it is the position, but a finished circle has to count the whole set, because `pos` stops **on** the last question rather than moving past it; counting `pos` at the end displayed 19 of 20 for a clean run while banking 20. That gap was cosmetic until the result screen started stating the 10-of-20 gate — now the number shown and the number judged have to be the same, or the screen contradicts itself. A mistakes-only retry tour is handed its ids directly and is **never persisted**, so a player who abandons a review returns to a clean slate.

```
circle tapped on the strip
      │
      ↓
ensureCircle → fixed ids ─── soon / locked ──→ "questions still being written"
      │
      ↓
saved position for THIS circle? ──yes──→ resume at pos (intro skipped)
      │ no
      ↓
 intro card → act 1 ──act ends──→ interlude ──tap──→ act 2 → …
      │                                                        │
      └──── persisted every change ────────── result ←─────────┘
                                                │
                                    "Review mistakes" → retry tour (not saved)
```

The result screen names the circle, states whether the 10-of-20 gate was met, and announces what opened — the new **city** in preference to the new circle, since the circle is visible on the strip anyway. Everything in that block is suppressed on a mistakes review, which changes nothing. There is no "Play again": under fixed sets it would replay the identical twenty, and the choice of *which* circle to farm belongs on the map, where the strip shows what each one is worth.

## Teaching the Rule Once

Circles are not guessable from the strip: the fixed set, the pass mark, the chain, and the difference between the padlock and the faded slot all have to be said once. So a help sheet auto-opens **once per install**, from the **map** — the screen every player reaches before a tour, and the one where the explanation arrives before it is needed. Exactly one screen may own this; two would race on mount and could open the sheet twice.

The sheet is a lede plus four titled sections (circles, stars, unlocking, mistakes) in a `ScrollView`, because the copy it now has to carry is about twenty lines and an undifferentiated wall of that length is unreadable even where it fits. Its scroll indicator is deliberately left on — it is off everywhere else in the app — since it is the only signal that there is more below the fold, and fades at the top and bottom edges appear exactly while copy continues past them.

The card's height is a **number of points** (70% of the live window, bounded to 300–560), never a percentage `maxHeight`. It used to be `maxHeight: '84%'` around a `flexShrink: 1` ScrollView and it did not scroll at all. Yoga clamps a node's available *inner* dimension to min/max only when that dimension is already defined (`calculateAvailableInnerDimension` guards the whole clamp behind `isDefined`), and on Android a Modal's host node starts at `Size{0,0}` and learns the screen size through an asynchronous state round-trip — so the first pass under every Modal has no usable owner height, there is no free space to distribute, and `flexShrink` is inert while the card's own box still gets clamped. The result was a short box wrapped around full-height children: the ScrollView's frame ended up as tall as its content, so there was nothing to scroll, no indicator, and "Got it" was laid out past the card edge and off the screen. A numeric `maxHeight` would hit the same guard; only a definite `height` gives the children a main size, and with it the body can simply `flex: 1`.

The seen flag is persisted under `italy.help.seen.v3`; each bump is so installs that were told a rule which is no longer true (v1 → v2 when circles arrived, v2 → v3 when the city gate went from one circle to five and the chain grew to cover every place) get the new rules once. Afterwards the sheet is on-demand from the "?" button, which now sits on both the map header and the quiz HUD.

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
