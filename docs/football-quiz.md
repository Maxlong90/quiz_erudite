# Football Quiz

Every other app in this tree was built content-first: a backend app record filled with categories and questions, then screens to draw them. Football Quiz inverts that order on purpose. The backend app (id 4, slug `football-quiz`) exists but holds **zero content categories**, so there is nothing to fetch and nothing to play. The build exists anyway, because the question it answers is a design question — does the gold-on-haze visual language work on a real phone? — and that question cannot wait for a content pipeline.

So this is a **prototype**: a complete, navigable clone of [Sport Quiz](sport-quiz.md) restyled around a single gold accent, running on checked-in fixtures instead of a provider. Every screen is real, every transition is real, and none of the state survives the process. It is registered like a shipped build so the family-wide guards cover it, but it has no EAS profile, no store identity of its own, and no persistence.

## Why It Is a Clone

Football Quiz mirrors Sport Quiz's structure screen for screen, and that is the point rather than a shortcut. The brief is "the same game, a different sport, a different look", so the only variable worth testing on a device is the look. Copying the layout, the flow, and the economy numbers verbatim keeps everything else constant: a reviewer looking at the prototype is judging the palette and the artwork, not a second set of interaction decisions.

The reuse is literal in places. `constants/football-quiz/labels.ts` wraps `useSQLabels()` and overrides exactly one string — `modeLegends`, which reads "Football Legends" rather than "Sports Legends" — so the prototype inherits four finished locales without a translation pass. The mode-select screen even draws Sport Quiz's mode icons out of `assets/sport-quiz/modes/`. Only the backdrops in `assets/football-quiz/backgrounds/` are this app's own.

## What Is Real and What Is Fixture

`app/football-quiz/_layout.tsx` states the boundary: unlike Sport Quiz there is **no provider** above these screens. Nothing here reads the content cache, the coin store, or the API.

`lib/football-quiz/mock.ts` stands in for all of it, and its numbers are copied from `lib/sport-quiz/economy.ts` rather than invented — the coin packs, the wheel prizes and their weights, the wedge layout, and the skip cost. A fixture that disagreed with the app being cloned would make the prototype answer the wrong question.

| Surface | State in the prototype |
|---------|------------------------|
| Questions | Five hand-written Russian football questions, looped |
| Levels | Eight levels of ten, three unlocked, progress hardcoded |
| Coins | A fixed balance; nothing is spent, earned, or stored |
| Coin packs | The three Sport Quiz packs, rendered but not purchasable |
| Wheel | Real weighted draw (90 / 8 / 2), real spin animation, no cooldown and no payout |
| Locale | Real — the settings picker switches the whole app immediately |
| Store links | The shared defaults, since there is no snapshot to read them from |

The wheel is worth singling out. Its odds come from the same table the odds sheet displays, so the "i" modal and the draw cannot disagree — the one piece of economy logic that is genuinely exercised rather than mocked.

## The Screens

```
  /football-quiz/splash ──900ms──→ /football-quiz  (home)
                                        │
                    ┌───────────────────┼────────────────────┐
                    ↓                   ↓                    ↓
              /football-quiz/     /football-quiz/      /football-quiz/
                  play               shop                settings
                    │                   │
                    ↓                   ↓
              /football-quiz/     /football-quiz/
                 levels               wheel
                    │
                    ↓
              /football-quiz/quiz
```

The **splash** is the build's true entry point, registered in `APP_TEMPLATES` so the shared Erudite splash — and the language picker, onboarding, and paywall behind it — never renders. It holds for 900 ms and replaces itself with the home screen. There is nothing to preload, so there is nothing to wait for.

The **home** screen is a wordmark over a sharp stadium photograph, one round PLAY button, and a Shop / Settings row. It carries no coin counter: coins are spent in the quiz and bought in the shop, so a balance on the home screen would be decoration. PLAY leads to mode select rather than starting a run, because the two modes stopped fitting on the home screen once the button grew.

**Mode select** offers four rows. Classic and Legends both open the level list; Challenge and Sprint are drawn locked with a "coming soon" sublabel, so the shape of the finished menu is visible without pretending the modes exist. **Levels** lists eight cards with progress bars, a check badge on a finished level, and a lock on an unreachable one.

The **quiz** screen reproduces Sport Quiz's action semantics. Before an answer there is one action — Skip, labelled with the price Sport Quiz charges for it, though the prototype deducts nothing. Back and Next appear only alongside the revealed explanation, and Back is hidden on the first question. The one deliberate divergence is visual: both buttons are solid gold here, so the pair reads as a single control. The header carries share and report affordances; sharing falls back to invite text plus a store link, since the prototype has no rendered share card.

**Shop** and **wheel** are a pair: the shop's first tile leads to the wheel, and the wheel's back button returns to the shop. **Settings** is the standard row set — language, rate, support, privacy, terms — over a version box.

## The Gold-on-Haze Design System

`constants/football-quiz/theme.ts` records the translation from Sport Quiz's palette as a table, because the mapping is the design decision. Sport Quiz runs two neon accents — aqua for rims and progress, hot magenta for screen titles — on navy glass. Football Quiz collapses both onto **one gold**, lifted off the stadium floodlights in the home photograph, over grey glass and warm cream text.

The single exception is the currency. Coins are drawn **red**, not gold, and the reason is legibility of meaning rather than of pixels: gold is the interface accent here, so a gold coin would read as more chrome instead of a resource the player owns.

Three backdrops come from the same stadium photograph, which is what keeps the app from looking like two products. `home` is the sharp original. `haze` is blurred, desaturated, and darkened for every inner screen. `deep` is a much heavier blur, used only on the quiz screen so a question and four answers stay readable over it. Each screen renders the backdrop **outside** its safe area as an absolute-fill layer, so the artwork paints under the status bar rather than leaving a strip of scaffold colour.

The scaffold colour itself is pinned twice — `BG_BASE` in `components/football-quiz/app-background.tsx` and `scaffoldBg` in `APP_TEMPLATES` — because the root navigator paints one and the screen paints the other, and a mismatch shows as a flash during the cold-start hand-off.

### The PLAY Button and the Turf Line

The home button's placement is measured against the artwork, not chosen by eye. The backdrop's turf starts at 61% of the frame height, and the button must not climb above that line onto the stands. So it is anchored a fixed gap above the service row instead of being positioned from the top: as the diameter changes the button grows *upward into* the turf band and never past it. At the approved ⌀190 its top lands roughly 51 dp below the turf line, which leaves room on screens of other proportions.

## Text That Measures Itself

`components/football-quiz/auto-fit-text.tsx` is the one component in this build that solves a problem rather than restating Sport Quiz. Labels here are long, translated into four languages, and sit in fixed boxes. Three cheaper approaches were tried and failed:

- `adjustsFontSizeToFit` with `numberOfLines={2}` breaks *inside* words — Russian "Классический режим" wrapped as "Классическ / ий".
- Font metrics derived from Roboto Black are wrong on iOS, where weight 900 resolves to a wider San Francisco Black.
- Precomputing a width by subtracting padding forgets border thickness and letter-spacing, and the label clips.

Every one of those failures shares a cause: something about the font, the platform, or the box was assumed instead of measured. So both sides are measured on the device. The box reports its width through `onLayout`, the string reports its natural width through `onTextLayout` at a large reference size, and the ratio gives the font size, clamped to a range. Nothing is assumed about the font, the screen, or the surrounding styles.

`FittedGroup` extends that to a set. Each child reports the size it *could* take and the group publishes the smallest, so four answer buttons read at one weight instead of shrinking independently. Before the first measurement a label renders at its maximum rather than its minimum, so text never flashes tiny on mount.

One constraint travels with the mechanism, and it is easy to violate. A button **sized by its label** — a price chip — must not fit its label, because its box is as wide as the text and the measurement would chase itself. Fitting is only for a button whose width comes from the layout.

A related piece of data survives from an earlier home-screen layout: `useFQModeLines()` still carries hand-picked two-line splits of each mode name per locale. It has no caller since the mode cards moved off the home screen, but the reason it exists is worth keeping — when a name has to break across two lines, the break point is data, because letting the layout choose it is what produced the broken Russian word above.

## Where It Sits in the Family

Football Quiz is registered in `constants/app-templates.ts`, so the shared home route redirects a cold start into `/football-quiz/splash` and the root navigator paints its scaffold colour. That registration is what `__tests__/app/app-templates.test.tsx` enforces: an app under `app/` with its own splash but no registry entry fails the suite, so a new build cannot silently inherit the Erudite first-run flow.

It also appears in `__tests__/hooks/use-app-theme-inert.test.tsx`, which asserts that every shipped build gets a frozen, inert palette from `AppThemeProvider`. It was registered in `APP_TEMPLATES` but missing from that list for a while — the one build whose inertness nothing checked. See [Configurable Template](configurable-template.md#selecting-the-build) for what that gate guarantees.

Its `app.config.js` branch gives it its own Expo project identity (`name` and `slug`), so it never shows another variant's cached bundle in Expo Go. Store identity is different: `bundleIdentifier` and `package` fall back to the Erudite values until an operator supplies real ones, which is the correct default for a build nobody is publishing. It is iPhone-only, like every sibling, because there is no tablet layout. There is no `eas.json` profile — see [Development](development.md#building-a-sibling-app-variant).

## What Wiring It Up Will Take

The prototype is deliberately incomplete in named places, and each gap has a shape:

- **Content.** The backend app needs categories and questions. Then a provider goes above these screens, in the pattern `hooks/sport-quiz/` already establishes, and `lib/football-quiz/mock.ts` is deleted rather than adapted.
- **Economy.** Coins, the skip cost, the wheel cooldown, and level progression need the real Sport Quiz stores. The numbers do not change — they are already the same numbers.
- **Purchases.** The coin packs render but their buttons do nothing; RevenueCat products and an EAS profile carrying the keys come together.
- **Help.** The "?" buttons on mode select and levels are drawn for visual balance and do nothing yet.
- **Copy.** Labels still come from Sport Quiz. They move into `constants/football-quiz/` when the wording actually diverges.

## See Also

- [Sport Quiz](sport-quiz.md) -- The app this one clones: economy, wheel, levels, and screen structure
- [Architecture](architecture.md#key-design-decisions) -- Build-time app selection and the template registry
- [Development](development.md#building-a-sibling-app-variant) -- Building a variant from the shared tree
- [Glossary](GLOSSARY.md) -- Sibling app, build variant, app slug
- [INDEX](INDEX.md) -- Documentation entry point
