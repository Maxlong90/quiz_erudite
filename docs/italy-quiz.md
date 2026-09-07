# Italy Quiz

Italy Quiz is the sixth app built from this tree: a single-topic history-and-geography quiz about Italy, played as a fifty-question run inside one subcategory. It has no economy at all — no lives, no coins, no premium — so the only thing shaping a session is the run itself. This document explains why its taxonomy lives in the app instead of the snapshot, how a run is drawn and resumed, and why a wrong answer deliberately tells the player nothing.

## Why a Sixth App

Like the other siblings, Italy Quiz is selected at build time by `APP_SLUG`, here `italy-history-and-geography-quiz`. The home route redirects straight to `/italy-quiz/splash`, and the Erudite intro, hub, and modes never render. Its screens live in `app/italy-quiz/`, UI in `components/italy-quiz/`, run state in `hooks/italy-quiz/`, and taxonomy, strings, and palette in `constants/italy-quiz/`. There is no `lib/italy-quiz/` — see [Content Comes Through the Main Provider](#content-comes-through-the-main-provider) for why the app needs no content layer of its own.

It was a scaffold for several releases: splash, home, settings, and a two-level category browser whose rows were dead ends. It is now playable end to end — question screen, result screen, and a mistakes review — but it is still the least finished variant in two respects worth knowing before you plan work on it. It has **no EAS project**, so its config branch strips `runtimeVersion`, `updates`, and `extra.eas` and the app cannot receive an over-the-air update until those are restored (see [Development](development.md#running-italy-quiz-in-expo-go)). And it has **no store listing**, which is why its Share and Rate actions pass a null app descriptor to `getStoreLinks` and land on the Erudite fallback identity rather than an Italy listing. Both are ops gaps, not code gaps: filling them in is configuration.

Visually the app is deep navy with glossy tiles over a single piece of cartoon-3D landmarks artwork, and it carries its own launcher icon — a vintage-map Italy mark — overriding both the top-level icon and the Android adaptive foreground so it never shows the base build's artwork.

## A Hardcoded Taxonomy over Backend Questions

Every other app in this tree reads its categories from the content snapshot. Italy Quiz does not. Its seven categories and 27 subcategories are written out in `constants/italy-quiz/categories.ts`, localized in place across the four supported languages. Each category also names a bundled badge icon, which the current screens do not draw — the category buttons were reduced to plain glossy tiles — so the field is kept as authored artwork rather than removed.

The taxonomy was authored as a product brief before any content existed, so the app shipped its browser first and let the backend catch up. What joins the two halves is the subcategory `slug`: it is the same string the backend puts on each question's `category_slug`. When the quiz screen opens with a `sub` route parameter, it filters the whole snapshot question pool by that one field, and the resulting list is the subcategory's pool.

That join is the app's central design trade-off, and it decides how the app fails:

- A subcategory whose slug matches nothing in the snapshot is not an error. It renders the localized "No questions here yet" note and the player backs out. A taxonomy that runs ahead of the content is therefore safe by construction — which is exactly the state the app shipped in.
- A backend rename silently empties a subcategory. Nothing in the app can detect the difference between "the operator has not authored this yet" and "the slug drifted", so renaming an Italy category on the backend is a breaking change that needs a matching app release.
- The taxonomy itself cannot be edited without shipping a build. Adding a subcategory is a code change plus a store submission, where the same change in any sibling app would be a Nova edit that reaches devices on the next sync.

The category titles are also allowed to carry an explicit line break — the two longest Russian labels wrap manually — because the screens render titles at a fixed two lines and an unmanaged wrap put a single word on the second row.

### Content comes through the main provider

Italy Quiz has no content provider of its own. Logo Quiz, Flags Quiz, Coat of Arms, and Sport Quiz each run one because they fetch a slug that is *not* the build's own — an Erudite build can open a Logo Quiz screen. Italy Quiz is only ever reached from an Italy build, where `APP_SLUG` is already the Italy slug, so the app-wide `ContentCacheProvider` in the root layout is already syncing exactly the right snapshot. The quiz screen simply reads `useContentCache`.

Everything in [Content and Offline](content-and-offline.md) therefore applies unchanged: the snapshot is fetched once per locale, cached for 24 hours, and its question images are downloaded to the device, with `resolveLocalImage` swapping a remote URL for the local file when one exists. A question carries a picture only when the backend generated one for it, so the card renders as a photo question or a plain text question with no separate question type.

## A Run of Fifty, Composed to a Photo Ratio

Opening a subcategory starts a **run**: fifty questions drawn from that subcategory's pool, in a shuffled order fixed at the moment of the draw. Fifty is a cap, not a requirement — a small pool yields a shorter run.

Two subcategories, "Regions & capitals" and "Ancient Rome", are meant to play as mostly text with a sprinkle of photos. `RUN_PHOTO_MIX` pins them to 20% photo questions; every other subcategory draws freely from a pool that already mixes the two shapes.

The ratio is applied when the run is **drawn**, not by trimming the pool, and that distinction is the whole point. Filtering the pool down to a fixed ratio would permanently hide the excess questions, so a player replaying a subcategory would cycle through the same reduced set. Composing at draw time keeps every generated question eligible, so successive runs still differ. `drawRun` shuffles the photo and text buckets separately, takes what the ratio asks for from each, and — when one bucket runs short — tops the run back up to fifty from the other. A thin photo bucket shortens nobody's run.

## Resuming a Run

`useRunProgress` owns a run's order, position, and mistakes, and persists them under a per-subcategory key (`italy.run.{slug}`). Leaving the app mid-run and coming back resumes on the same question with the same score.

Two decisions make that resume trustworthy.

**The order is stored as question ids, not indices.** A pool that grows or is reordered by a later content sync would silently repoint every stored index at a different question. Ids survive that. On hydrate the saved run is validated — every id must still exist in the pool and the position must sit inside the order — and a run that fails the check is discarded for a fresh one rather than replayed against questions that moved.

**Hydration is keyed on an epoch, never on the pool.** The hook deliberately does not re-hydrate when the pool array changes identity, because a background content re-sync would otherwise reshuffle a run under a player who is halfway through it. Only an explicit epoch bump — Play again, or Review mistakes — starts a new run.

The score is derived rather than stored (`pos - wrong.length`): every answered question is either right or wrong, so a stored score would be a second source of truth that could disagree with the mistakes list. A mistakes-only retry run is handed its ids directly and is **never persisted**, so a player who abandons a review returns to a clean slate instead of resuming a sub-run.

```
subcategory tapped
        │
        ↓
  saved run for this slug? ──yes──→ validate ids ──ok──→ resume at pos
        │ no                              │ stale
        ↓                                 ↓
   drawRun (shuffle, apply photo mix) ←───┘
        │
        ↓
   answer loop ──last question──→ result ──"Review mistakes"──→ retry run
        │                            │                          (not saved)
        └── persisted every change ──┘ cleared on finish
```

## Answering: A Miss Reveals Nothing

Only the option the player taps changes colour — green when right, red when wrong. A wrong pick never highlights where the correct answer was, and the run moves on by itself after a brief pause. This mirrors [Flags Quiz](flags-quiz.md#the-answer-flow) and exists to protect the mistakes review: a question whose answer was just shown is worthless to replay.

A correct pick behaves the opposite way. It does not auto-advance. The question's explanation appears below the options and a Next button pins to the footer, so the player controls the pace of the thing that is actually worth reading. The explanation is shown **only** after a correct answer, for the same reason the wrong answer stays hidden.

Answering is locked once a pick registers, so a double-tap cannot record two answers, and each outcome fires its matching success or error haptic.

## The Result Screen and the Mistakes Review

Finishing a run replaces the question with a result view in the same screen — score out of the run length, and a verdict banded at 80% and 50%. Reaching the result clears the saved run, so the next entry into that subcategory starts fresh rather than resuming a finished one.

Three actions follow. **Review mistakes** appears only when there are misses and starts a transient run of exactly those questions. **Play again** draws a brand-new run from the full pool. **Categories** returns to the browser.

The result screen snapshots the mistake list before starting a review, because starting the review resets the live list — without the copy, the player would be sent into a review of an empty set.

## Teaching the Rule Once

The mistakes flow is not discoverable from the question screen: a player who answers wrong sees the question vanish with no explanation and no correct answer, which reads as a punishment unless they know it is coming back. So a help sheet auto-opens **once per install**, on the first quiz a player ever opens, and explains that misses are remembered and replayable. The seen flag is persisted (`italy.help.seen.v1`); afterwards the sheet is on-demand from the "?" button in the quiz header, next to Report and Share.

## Artwork Gating

The landmarks artwork is a single heavy bundled image, and the glossy buttons drawn over it render instantly. Left alone the screen showed its buttons first and the background popped in a beat later. Every screen using that background therefore holds on a plain dusk-toned fill — matched to the artwork's sky so the reveal is seamless — until `useItalyBgReady` reports the asset decoded and cached, then draws background and content in the same frame. The gate fails open: an asset that cannot be warmed still lets the screen through.

## See Also

- [Architecture](architecture.md) -- Build-time app selection and module layout
- [Content and Offline](content-and-offline.md) -- The snapshot cache Italy Quiz reads through
- [Flags Quiz](flags-quiz.md) -- The sibling whose run, help sheet, and answer flow Italy Quiz mirrors
- [Development](development.md) -- Building and running the Italy variant
- [GLOSSARY](GLOSSARY.md) -- What "run" means in each app
- [INDEX](INDEX.md) -- Documentation entry point
