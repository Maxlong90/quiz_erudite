# Sport Quiz

Sport Quiz is the fifth app built from this tree. It is a sports trivia game with two modes — a Classic question ladder and a Sports Legends "guess the athlete" puzzle — bound together by a single coin currency. This document explains why the coin economy exists at all, how the two modes differ in cost and reward, and which constraints shaped the level model, the navigation, and the answer buttons.

## Why a Fifth App

Like the other siblings, Sport Quiz is selected at build time by `APP_SLUG` (`sport-quiz`). The home route (`app/index.tsx`) redirects straight to `/sport-quiz/splash`, and the erudite intro, hub, and modes never render. Its screens live in `app/sport-quiz/`, UI in `components/sport-quiz/`, state in `hooks/sport-quiz/`, domain logic in `lib/sport-quiz/`, and strings and palette in `constants/sport-quiz/`. `app.config.js` gives the build its own Expo `name` and `slug` so it does not collide with the other variants in Expo Go; store identity falls back to the Erudite identity until an operator supplies Sport Quiz values, and the variant ships iPhone-only.

What sets it apart from its siblings is its monetization model. Erudite and [Logo Quiz](logo-quiz.md) run a lives-plus-premium economy; [Flags Quiz](flags-quiz.md) and [Coat of Arms](coat-of-arms-quiz.md) have no economy at all. Sport Quiz has **coins only** — no lives, no premium tier, no paywalled content. Every question in the catalogue is reachable by anyone; the only thing that gates play is whether you can afford to be wrong.

Visually it also breaks from the family's glossy blue: Sport Quiz is neon-aqua on navy, with translucent glass surfaces on photographic backdrops.

## The Coin Economy

Coins exist to give a free, un-gated question catalogue a sense of stakes. Because nothing is locked, the tension has to come from the cost of a mistake rather than from a paywall. `lib/sport-quiz/economy.ts` is the single source of truth for every number — the state provider, the quiz screens, and the in-app info sheets all import the same constants, so the rules shown to the player can never drift from the rules enforced.

A new player starts with 500 coins. From there:

| Action | Classic | Sports Legends |
|--------|---------|----------------|
| Correct answer (first solve only) | +5 | +15 |
| Wrong answer (per distinct wrong pick) | −15 | −15 |
| Skip hint — reveals the answer, marks the question passed, no reward | −35 | −35 |
| Uncover one puzzle plate | — | −5 |

Legends pays three times what Classic pays for a correct answer because a Legends question usually costs coins to make solvable at all: the athlete's photo starts hidden behind plates the player buys one at a time. The reward has to outrun the reveal cost, or the mode would be a net loss and nobody would play it.

Rewards are granted on **first solve only**. Replaying a solved question — which the app deliberately allows, see [Reviewing a finished level](#reviewing-a-finished-level) — never re-earns coins, so a solved level cannot be farmed.

### The 15-coin floor

The one hard gate in the app is `MIN_COINS_TO_ANSWER`, set to 15 — exactly the cost of one wrong answer. Below it, the quiz screens refuse the pick and route to the shop instead. The rule exists so a player can never continue with a balance too small to pay for being wrong; without it the economy would quietly stop mattering as soon as a player bottomed out.

The floor applies to *answering*, not to playing. Uncovering Legends plates stays allowed below 15 coins, because a plate costs only 5 and blocking it would strand a player mid-puzzle with a balance they could still legitimately spend.

### The wheel of fortune

The wheel is the free faucet that keeps a broke player in the game. One free spin every 24 hours, tracked by a rolling cooldown from the last spin (`sportquiz.wheelLastSpinAt.v1`), reachable from the shop or the home screen — which shows a pulsing badge when a spin is ready.

Prizes are **weighted, not per-wedge uniform**. The wheel draws a prize first (100 coins at 90%, 500 at 8%, 1000 at 2%), then picks one of the wedges carrying that prize to land on. The eight wedges interleave the prizes so identical ones are never all adjacent, which makes the wheel read as fair while the real odds live in the weights. The spin animates for five seconds over six full turns plus the delta needed to bring the chosen wedge under the fixed pointer, so the landing is decided before the animation starts and cannot desync from it.

The cooldown defends against clock tampering in both directions. An anchor timestamp in the future — the signature of a clock moved backwards — is clamped to now, so the wait can never exceed a real 24 hours; and a never-spun player (anchor of zero) is immediately eligible rather than being made to wait out a phantom cooldown.

### Coin packs are not yet real purchases

The shop lists three packs (100 / 500 / 1000 coins) with their App Store and Google Play product ids already fixed as `sportquiz_coins_*`, matching the backend's per-app catalog. The product ids are stable and must not change. The purchase itself is **not wired**: a tap currently grants the coins locally. Real RevenueCat billing waits on Sport Quiz's own store keys and catalog, at which point the pack definitions already carry everything the integration needs. Until then, treat every shop grant on a device as a development affordance, not revenue.

## Levels and Ordering

Both modes present their catalogue as a ladder of numbered levels rather than a single endless run, so progress is visible and a session has natural stopping points. Nothing about levels is stored — level membership, the `X/total` card counts, and completion are all *derived* from one persisted set of solved question ids (`sportquiz.solvedIds.v1`).

That derivation only works if a question's level never changes. Both modes therefore order questions by a **deterministic hash of the question id**, not by `Math.random`, so the same question lands in the same level on every launch and per-question progress stays meaningful. Each mode carries its own shuffle salt, which an operator can bump to reshuffle the whole pool while keeping it deterministic.

**Classic** builds levels of 20 from every non-Legends question. Its ordering is the more opinionated of the two: non-image questions are sorted into difficulty tiers (easy → medium → hard) from a hand-audited id list in `lib/sport-quiz/difficulty.ts`, image questions are shuffled separately, and the two pools strictly **alternate** — one image, one text, repeating. The result is that early levels are both the easiest and visually varied, while the hardest questions land at the very end of the ladder.

**Sports Legends** builds levels of 15 — a full grid, matching Logo Quiz's shape — from a shuffled order. Legends is shuffled rather than difficulty-ordered because there is no meaningful difficulty audit for "recognise this face", and the backend's authored id-ascending order would otherwise group athletes by whenever the operator happened to add them.

The two pools are disjoint by contract: a question belongs to Legends when its `category_slug` is `sport-legends` or a sub-slug of it, and Classic's level builder excludes exactly that predicate. Both sides import the same `isLegendQuestion` check, so the two definitions cannot drift apart.

## Sports Legends and the Puzzle Plates

A Legends question is an ordinary image question — an athlete's photo plus four names — with one addition: the photo starts covered by a 4×5 grid of plates. Each tap uncovers one plate for 5 coins, so the player chooses how much of the picture to buy before committing to a guess. The coin is charged *before* the state update, so a tap made with a short balance is cancelled rather than half-applied.

Uncovered plates are persisted per question (`sportquiz.revealedPlates.v1`) and rehydrated when the question is re-opened. This is what makes leaving mid-puzzle safe: a player who backs out and returns finds exactly the plates they paid for still open, and is never charged twice for the same plate. Guessing correctly or skipping clears the remaining plates at once and stops accepting taps.

## Navigating a Level

Within a level the buttons change with the player's state, and each state exists to stop a specific misuse:

- **Before answering** the only option is Skip, which costs 35 coins and marks the question passed with no reward. Skip is disabled outright below its cost, so it can never push a balance negative.
- **After answering** a Next button appears, and — once there is somewhere to go back to — a Back button beside it. Back is deliberately hidden on an unanswered question: allowing it would let a player page through a level reading questions without ever paying to answer one.
- **On the last question of a fresh level**, Next hands off to the win screen.

### Reviewing a finished level

Re-opening a level that was already fully solved puts it in review mode, and the navigation becomes **cyclic**: Next past the last question wraps to the first, Back past the first wraps to the last, and the win screen does not re-fire. The screen decides this once at mount by checking whether every question in the run is already solved, so the mode cannot flip mid-level. Review is free of consequence — no rewards, no penalties — which is why the app can afford to make it unrestricted.

## The Win Screen

Finishing a fresh level routes to `app/sport-quiz/level-complete.tsx`, shared by both modes; a route parameter only decides which level list the exit button returns to.

The screen is deliberately bare. There is no coin pill and no back arrow — nothing competing with the win. A trophy spanning the full screen width sits on a bundled gold-sunburst backdrop, over a rays layer that rotates continuously at one turn per minute, with a halo under the trophy's base. Thirty-two footballs burst radially outward for four seconds under light gravity, so the effect reads as a star-burst rather than a downward dump.

The backdrop and trophy are **bundled with the app**, not fetched. A celebration that flashed an empty background while it downloaded artwork would undercut the moment entirely, so this is the one screen whose images do not ride the content pipeline.

## Answer Labels That Never Split a Word

Answer buttons are a fixed 64 points tall and never resize; only the label's font does. Getting that right needed a custom component (`components/sport-quiz/fit-answer-text.tsx`) because the platform's own `adjustsFontSizeToFit` cannot be trusted here: on Android it shrinks text to fit the *height* while still breaking a word that is wider than the button, and it leaves the result visually off-centre. A long Russian answer such as "Дисквалификация" came out hyphenated mid-word.

The replacement walks an explicit ladder of font scales — 90%, 85%, 80%, and on down to 40% in 5% steps — and takes the first size where **both** conditions hold: the longest single word fits on one line, and the greedily wrapped text fits the available height. The first condition is what makes a mid-word break structurally impossible. The 5% step keeps each drop small, so a label only shrinks as far as it must instead of falling off a cliff to the next legible size. Character widths are estimated on the generous side, because over-estimating steps down a size early (safe — the text still fits) while under-estimating would allow the break the component exists to prevent.

## Sharing a Question

The Share button in either quiz screen's header sends a **picture** of the question alongside the localized invite built from `getStoreLinks`. It reuses the capture helper the other siblings already share (`lib/flags-quiz/share-image.ts`), which probes `react-native-view-shot` through the TurboModule registry and degrades to a text-only invite when the native module is absent — an older standalone binary still shares, just without the picture.

What gets captured is not the live board but an off-screen `SportShareCard` (`components/sport-quiz/share-card.tsx`) kept mounted beside it at a fixed 340-point width. Rendering a separate composition is what makes the picture presentable outside the app: it carries the app's navy and a neon rim but none of the screen chrome — no back arrow, report flag, coin pill, counter, or Skip button — and its opaque background keeps chat apps from compositing a transparent PNG onto black.

The card is also what enforces the anti-spoiler rule, structurally rather than by styling:

- **Classic** always shows all four options in their idle tone. The live board unmounts the wrong options once the answer is revealed, but the card is handed `question.options` regardless, so the picture a player shares after answering is byte-identical to the one they would have shared before.
- **Legends** shows the athlete's photo *in its current state* — still under every plate the player has not paid to uncover. Only guessing or skipping opens it. The names stay neutral either way, so the answer never travels with the picture. The card draws its own static twin of the plate grid instead of reusing `PuzzleOverlay`, whose plates animate out; a capture fired mid-reveal would otherwise freeze a half-faded grid into the shared image.

## Content and Explaining the Rules

Sport Quiz draws from the shared content snapshot at `GET /apps/sport-quiz/snapshot?locale=`, cached offline under its own namespace exactly like the other siblings. Its provider hydrates from cache on mount for instant play, then syncs; a locale change re-syncs so prompts, options, and explanations follow the active language. A failed sync leaves the cached snapshot in place rather than emptying the board.

Because the economy carries most of the app's rules, they are explained in-product. A "?" button on the mode picker, both level lists, and both quiz screens opens `ModeInfoModal`, which describes the wheel and lays out each mode's coin costs and rewards. Its numbers are read from the economy constants rather than written into the copy, so a tuning change updates the explanation automatically and the player can never be shown a stale rule.

## See Also

- [Architecture](architecture.md) -- Build-time app selection and module layout
- [Content and Offline](content-and-offline.md) -- Snapshot cache and per-app namespacing
- [Logo Quiz](logo-quiz.md) -- The sibling whose level and wheel model Sport Quiz adapts
- [Gamification](gamification.md) -- The lives-and-premium economy Sport Quiz deliberately does not use
- [Development](development.md) -- Building a sibling app variant
- [INDEX](INDEX.md) -- Documentation entry point
