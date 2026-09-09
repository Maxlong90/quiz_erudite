# Configurable Template

Every sibling app in this tree costs a code fork. A new quiz means a new palette file, a new screen folder, a new build profile, and a store submission for any colour change. The configurable template exists to break that link: its palette is **operator data**, authored in the backend admin and delivered over the wire, so one binary can become one app per preset. This document explains the vertical slice that proves the idea — what the template renders today, how a colour travels from the admin form to a native gradient, and which decisions were made deliberately so later stages do not undo them.

The template is a seventh build of the same tree, selected by the build-time slug `test-quiz` and shown as "Test App". It does not replace the five sibling apps and does not touch them. See [Architecture](architecture.md#key-design-decisions) for the family as a whole.

## What the Slice Covers

The slice is deliberately narrow. It themes **one screen end to end** rather than half-theming the app, because the point was to validate the whole chain — admin form, wire contract, cache, resolver, native style prop — before investing in the rest.

| Route | Screen | Role |
|-------|--------|------|
| `t/splash` | Splash | Brand hold; also the engine's network window |
| `t/onboarding` | Onboarding | First launch only; the template's only bundled artwork |
| `t/index` | Home | Categories and Modes tabs, ported from the Erudite home |
| `t/tokens` | Token gallery | Live diagnostics; reached by long-pressing the wordmark |
| `t/category/[slug]` | Category | A subject's subcategory grid, reached from a category tile |
| `t/quiz-mode/[slug]` | Mode picker | Per-subcategory mode cards; where a run is configured |
| `t/quiz` | Quiz | The game loop; every mode tile starts here |
| `t/results` | Results | Score, achievement unlocks, and the way back to `t/index` |
| `t/paywall` | Paywall | Reached from a premium-locked tile and the onboarding pitch |
| `t/stats` | Stats | Lifetime totals and achievement rows |
| `t/shop` | Shop | Lives and hint bundles; the coins-and-ads economy |
| `t/account` | Account | Sign-up / log-in form and the third-party sign-in buttons |
| `t/settings` | Settings | Language, appearance, links, and the dev reset |

The quiz loop closed the largest hole in that list. Before it, a mode tile started `app/quiz`, which finished on `app/results`, which went home with `router.replace('/')` — and on a template build `/` redirects to `/t/splash`, so every finished run bounced the player through the splash screen on the way back. The two ported screens are deliberate copies of the Erudite originals along the line this project already draws: a **screen owns a route**, so each app gets its own (there are six sibling `app/<slug>/quiz.tsx` files besides this one); a **leaf component owns none**, so every app shares one. Nothing under `components/` was duplicated to do it.

The browse path closed the next one. A category tile used to push into `app/category/[slug].tsx` — a shared *Erudite* screen — and from there `app/quiz-mode/[slug].tsx` started the run on `/quiz`, the Erudite quiz loop rather than the template's own. Both are now copied into `app/t/`, so the whole chain (home → category → mode picker → quiz → results) stays inside the subtree. The copies take their tile artwork from `hooks/t/use-tile-gradients.ts` instead of `constants/category-visuals.ts`; the ramps are pinned equal to the Erudite gradients, so the port is zero-pixel and a tile cannot change colour mid-navigation.

The bottom bar's five destinations closed the rest. `app/t/` is now **route-closed**: every route any template screen pushes lands inside the subtree, and `__tests__/app/t-routes.test.ts` asserts that with no tolerance list at all — the `NOT_YET_PORTED` mechanism that once tracked pending destinations was deleted when the paywall landed, and the docblock there refuses its reintroduction. (When it existed, its `until` field was a *condition* rather than a subtask letter, because the letter is what rotted.)

Porting `settings` fixed a leak of that same family, one that had been shipping unnoticed: its dev reset ended with `router.replace('/splash')`, dropping a template player onto the **Erudite** splash. It never crashed, because on a template build `/` redirects to `/t/splash` anyway — so the player was silently bounced through another brand's screen, visible only on a device. The copy replaces it with `/t/splash`, which is also the *correct* destination and not merely the in-subtree one: the reset clears `onboarding.seen.v1`, the key `app/t/splash.tsx` branches on to route a first-launch player onward to `t/onboarding`.

That last boundary is now closed too. The five screens that render a bottom bar rendered the **shared** `components/bottom-bar.tsx` for the whole port, and its six slots pointed at the Erudite `/account`, `/paywall`, `/shop`, `/`, `/stats` and `/settings` — invisible to the escape check, which only scanned `app/t/**`. `components/t/bottom-bar.tsx` replaces it, and all five screens switched in one commit: re-pointing them one at a time would have left the bar half-ported across the subtree.

The bar is also the first **leaf component** this project has copied, which refines the rule stated above rather than breaking it. The line is not screen-versus-leaf, it is whether the file *encodes routes*: a leaf with none is shared, a leaf that names its own destinations cannot be. The alternative — adding a `basePath` prop to the shared bar — was rejected because it changes the signature of a component five shipped Erudite screens render, turning an addition into a refactor of live code; and because the bar is exactly the sort of thing that becomes operator data later (an operator shipping no shop wants four slots), which would push a slot-list union into a component the shipped app depends on.

Two things were needed to make the gap un-reopenable, and both are worth knowing before reading those suites. The escape check now scans `components/t/` alongside `app/t/`, so the bar's own routes are guarded rather than merely out of view; and the bar's destination list is *derived* from the component's source instead of hand-written. The hand-written one it replaced named five **Erudite** screen files, which ship in the live app and will exist forever — so it stayed green through the entire nine-screen port while every slot still navigated out of `/t`. Reachability alone could not have caught a partial switch either: the guard asserting the shared bar was still in the import closure stayed green with four of five screens switched, which is why `t-no-color-literals.test.ts` also carries a per-file rule that every `app/t` screen mounting a bar mounts the t-scoped one.

The template also has no economy or content of its own. It draws categories and questions from the ordinary content cache and reuses the lives, hints, premium, and locale providers unchanged.

## Selecting the Build

`test-quiz` is registered in `APP_TEMPLATES` (`constants/app-templates.ts`) exactly like the five siblings, so the shared home route redirects a cold start to `/t/splash` and the root navigator paints the template's scaffold colour instead of the Erudite navy. Adding the entry there wires the redirect, the shared-splash guard, and the scaffold colour at once.

The scaffold colour is pinned to the **bundled** dark `bgSolid`. That is the tier the app paints with before any theme data arrives, so the cold-start hand-off has nothing to flash against.

A second, separate list decides whether the theme engine runs at all:

```
constants/app-templates.ts
┌───────────────────────────────────────────────────────────┐
│ APP_TEMPLATES        "this build is its own app"          │
│   → redirect target, scaffold colour                      │
│                                                           │
│ T_TEMPLATE_SLUGS     "this build's palette is data"       │
│   → theme fetch, theme cache, palette overlay             │
└───────────────────────────────────────────────────────────┘
```

`T_TEMPLATE_SLUGS` is the **inertness gate**. A build not named there cannot fetch a theme, cannot read the theme cache key, and cannot apply an overlay: `isTTemplateBuild()` compares the build-time `APP_SLUG` against a checked-in literal, and `AppThemeProvider` hands every other build a frozen constant whose palettes *are* `EruditeColors` by reference.

The alternative — shipping the engine live everywhere and trusting every production preset to resolve to the bundled palette — was rejected. It would make inertness a property of production *data*, so an operator saving the colour form for a shipped app would instantly re-skin a store build nobody reviewed. Inertness that a non-engineer can revoke by clicking Save is not inertness. Adding a shipped slug to that list is therefore a deliberate, reviewable act, and a test fails the build if one appears by accident.

## Resolving a Palette

The engine resolves colours in three tiers, each one better than the last and each one optional:

| Tier | Source | When it applies |
|------|--------|-----------------|
| `bundled` | `EruditeColors`, compiled into the binary | always the starting point, so the first frame never waits |
| `cache` | the last theme this device fetched, in AsyncStorage | as soon as the storage read returns |
| `network` | a conditional `GET /apps/{slug}/theme` | on a `200`; the steady state is a `304` and nothing changes |

```
┌────────────────┐  EruditeColors
│ Bundled tier   │ ─────────────────┐
│ lib/theme/     │                  │
│   bundled.ts   │                  ↓
└────────────────┘        ┌─────────────────────┐
┌────────────────┐        │  resolvePalettes    │  EruditePalette
│ Cache tier     │ ──────→│  overlays 45 remote │ ───────────────→ screens
│ AsyncStorage   │ tokens │  tokens onto the    │   (dark + light)
│ theme.remote.v1│        │  bundled palette    │
└────────────────┘        └─────────────────────┘
┌────────────────┐                  ↑
│ Network tier   │ ─────────────────┘
│ GET /apps/{s}/ │  200 + ETag
│   theme        │
└────────────────┘
```

The result is an **overlay, never a construction**. Since schema v2 (the Э1 widening) the backend serves **all forty-five** `EruditePalette` tokens, so an unedited preset overlays byte-identical values and resolves to the bundled palette **by reference** — nothing re-renders. The overlay shape still earns its keep: a v1 cache record holds only ten of the forty-five, and overlaying it keeps the other thirty-five at their compiled values for the one session it takes the engine to re-earn a full body. That is also what makes a partial or hostile payload survivable — there is always a complete palette underneath.

The bundled tier is **derived** from `EruditeColors` rather than copied. A checked-in second literal map would be the third transcription of the same palette literals, and any drift would break the inertness argument at its root: the same binary would render differently depending on whether the engine happened to be switched on.

## The Wire Contract

`lib/theme/contract.ts` is the client half of the contract; `app/Support/ColorTokenRegistry.php` in the backend is the other. The two agree on exactly three things — the token **names**, their declaration **order**, and the **schema version**. Everything the backend does with tokens (derive rules, the Nova form, pruning unchanged values) stays behind the endpoint.

That line is load-bearing. Derivation on the client would be a second, divergent engine, and an operator could not preview its output. When a new rule is wanted — hue rotation, contrast correction — it belongs in the backend registry beside the existing alpha and lightness operations.

The forty-five remote tokens are the whole `EruditePalette`: the background family (`bgGradient`, `bgSolid`, the surfaces, `sheet`, `scrim`), the text and border families, the accent family (`accent`, `accentSoft`, the three accent tints, `onAccent`), the status colours (`success`, `danger`, `gold`), the option and explanation tokens, and the four groups the Э1 widening added — **paywall** (`subscribeBtnBg`, `subscribeBtnText`, `subscribeBtnBorder`, `subscribeHighlightBg`), **progress** (`progressTrack`, `progressFill`, `tabBg`, `tabActiveBg`, `tabActiveText`, `tabInactiveText`), **economy** (`coinColor`, `lifeColor`, `hintColor`) and **splash** (`splashBg`, `splashFg`). `bgGradient` is a three-stop gradient; the rest are flat colours. Declaration order is part of the ETag contract, since the backend hashes the encoded bytes, and it is also the order the token gallery renders in. The client transcription lives in `__tests__/fixtures/remote-theme-v2.ts` and is pinned against the backend registry by `__tests__/lib/theme-schema-parity.test.ts`.

Four parsing rules carry design intent:

- **Strict hex, and not for tidiness.** These strings go straight into React Native style props, where an unparseable colour throws in native code on Android. A theme engine that can hard-crash the app it themes is not fail-open, so `isColorValue` accepts only `#rgb`, `#rgba`, `#rrggbb`, and `#rrggbbaa`.
- **Exactly three gradient stops.** A four-stop array is a schema change, not a rounding error. Silently truncating it would render a palette the operator never previewed.
- **All or nothing.** `parseRemoteTheme` rejects the whole envelope on any bad token instead of falling back per token. Colours are a set, not a bag: `optIdleBg` and `optIdleText` are a contrast pair, and half-applying an operator's palette over half the bundled one can produce white-on-white text. That is strictly worse than not applying it at all.

- **Reject a set you cannot half-apply; degrade a scalar you can.** `onboarding_type` (below) deliberately does *not* follow the all-or-nothing rule, and the distinction is the point rather than an inconsistency. That rule is earned by two properties a switch discriminant does not have: colours come in contrast pairs, and every one of those strings is handed to a native style prop that throws on garbage. A lone scalar has no partner to contradict and never reaches a style prop, so rejecting the envelope over one bad value would discard the operator's entire palette to fix nothing.

The parser also iterates the known token list rather than the payload's own keys, so an unknown token from a newer backend is dropped before it can reach a style prop. A payload whose `schema_version` is higher than the client understands is reported as `unsupported-schema` without judging its shape — by definition the client cannot know what a future body looks like.

### Sibling Keys, and When the Version Bumps

Not everything in the body is a colour. The envelope carries `onboarding_type` — which onboarding variant the template renders — as a **sibling** of `theme`, never as a key inside it:

```json
{ "schema_version": 2, "onboarding_type": "universal", "theme": { "name": "…", "supports_dark": true, "light": {…}, "dark": {…} } }
```

Inside `theme` it would break the one invariant that object has — that its keys mirror `ColorTokenRegistry` one for one — and the token walk would drop it anyway. It is read only *after* the theme parses, so a malformed theme still reports `malformed` and carries no resolved variant. `lib/onboarding/onboarding-type.ts` owns the union; the match is exact, with no case folding or trimming, because the client union has to equal the backend's admin enum byte for byte and a quiet coercion would hide a real mismatch behind a screen that happens to render.

**An additive optional key must never bump `schema_version`.** The version bumps only for a change that would make an existing client render something *wrong* — a renamed or removed token, or a changed value domain. The asymmetry is one-directional and severe: a client that meets a version it does not understand takes the `unsupported-schema` branch, persists **nothing**, falls back to bundled colours, and now **warns once per launch** (the provider's `console.warn` on the `unsupported` branch — the silent fallback is exactly why the v1-vs-v2 breakage below lived unnoticed). Since store review means the client cannot be rolled out first to absorb it, bumping for a key that older clients would have safely ignored costs every installed device the operator's palette. Adding a key is safe by construction; announcing it in the version is not.

> **History and live state.** The v1→v2 bump is this rule playing out by the letter: the Э1 widening grew the served set from ten tokens to the full forty-five, which would have made a v1 client render a palette it could only half-apply — a value-domain change, so the backend bumped and the clients rejected the envelope until this build caught up. The breakage shipped unnoticed for a while *because the fallback was silent*; the warn above and the live contract check below exist so the next bump cannot. Today the client and the backend agree on **`schema_version: 2`** (verified live, 2026-09-09), and `npm run check:theme-contract` re-verifies that agreement — plus token order, defaults, and parseability — against the real endpoint on demand.
>
> `onboarding_type` rides the envelope only for the configurable template: `test-quiz` carries `"universal"`, all seven shipped slugs omit the key, which is exactly the fail-open path — an absent key resolves to the default and nothing renders differently. `"universal"` is **confirmed on the wire**; the string naming the base variant is **not**, because the backend omits the key rather than naming it. `asset_pack` also rides along and is ignored by the client.

## Light and Dark

Both appearances ship. The operator authors the **light** set; the backend derives **dark** from it and stores only the tokens actually overridden. Resolution on read is therefore "derive from light, then merge the stored dark overrides", which keeps the admin form short while leaving every token individually escapable.

A handful of tokens genuinely diverge between appearances and are authored rather than derived — the three `optIdle*` values and `accentSoft` among them. The rest follow mechanically from the light set.

The client never has to reason about any of this. When an operator has not authored a dark variant the backend **mirrors** light into dark rather than omitting it, so `theme[appearance]` is always indexable and there is no missing-map case. The `supports_dark` flag rides along for the gallery to display.

Which appearance renders is the player's own choice, read from `useThemePref` — the same app-selected preference the Erudite build uses, deliberately independent of the device colour scheme. See [Architecture](architecture.md#theming-and-appearance).

## The Cache Record

`lib/theme/theme-cache.ts` stores the last successfully fetched theme under a `theme.remote.v1` key, namespaced per app slug in the same style as the content cache: the build's own slug keeps the bare key, any secondary slug gets a suffix. The prefix deliberately stays clear of the key that holds the dark/light preference, where a collision would corrupt the player's appearance choice.

The record carries its own format number, separate from the payload's schema version, so invalidating every device's stored blob implies nothing about the wire contract.

**That number is expensive to bump, so an added field does not bump it.** `onboarding_type` is stored as an *optional* field: a record written before the client understood it is **incomplete, not wrong**, and it keeps its palette. Bumping the format instead would make every stored record unreadable and delete it — and on an offline device that means the operator's colours vanish for the entire session, the exact failure the three-tier design exists to prevent.

The schema widening followed the same reasoning: a **v1 cache record** (schema version 1, ten-token theme) passes the version gate but fails the re-parse that `isUsable` runs through the same parser as the network, so it is dropped like any unreadable blob and the device falls back to the bundled tier for one session until the next fetch re-earns a full body. No format bump; `__tests__/lib/theme-cache.test.ts` pins the migration.

The insurance a bump would have bought is bought in the provider instead, for one launch rather than forever: **a record that carries no opinion about the field drops its ETag once**, so the backend must answer with a body. This is self-limiting by construction — an unconditional request cannot come back `304`, the 200 writes a resolved value, and the next launch is a normal conditional request again. The whole upgrade costs one body, once. It also rescues the case in the next section, where a backend's ETag would otherwise never change.

A corrupt value for that field is normalised away on read rather than rejecting the record, for the same reason the parser degrades it on the wire: usability of the record is about the *palette*, and one bad scalar must not delete an operator's colours.

Every read is fail-open. A corrupt, foreign, or future record resolves to "no cache", which simply drops the caller back to the bundled tier. A blob that is unreadable to this build is also **deleted** on the spot, so the same garbage is not re-parsed on every launch. The stored payload is re-validated through the same parser the network path uses, because a file edited on disk must not reach a style prop either. Writing is best-effort: the theme is already applied in memory, and a failed write only costs one refetch next launch.

## The Conditional Request

`GET /apps/{slug}/theme` takes no query parameters — colours are locale-independent — and answers with a strong ETag hashed over the emitted bytes. The steady state is therefore an empty-bodied `304`, not a payload.

Four details exist because of things that actually break — three in `lib/theme/theme-api.ts`, one on the backend:

- **The ETag is replayed verbatim, quotes included.** Stripping or re-adding them yields a validator the backend never matches, which turns every launch into a full download.
- **Axios treats `304` as an error** because it is outside the 2xx range. Without a widened `validateStatus` the entire steady-state path lands in the catch block and the conditional request buys nothing.
- **"Changed" is decided by the validator, not the status code.** React Native's HTTP layer caches on the app's behalf, so the platform may revalidate on its own and hand back a `200` carrying the previously cached body. Comparing the received ETag against the held one catches that.
- **The backend must hash the WHOLE emitted body, `onboarding_type` included.** This one is a backend obligation the client cannot enforce, and it is the single most likely way the feature fails silently in production: if the ETag covers only the colour tokens, flipping the variant in the admin returns a `304`, the change never reaches a device, and there is **no client-side symptom** to debug — the app is behaving correctly on the validator it was given. The drop-the-validator-once rule in the previous section rescues only the first *upgrade*; every subsequent flip would be lost.

The fetch timeout is 2500 ms, far below the API client's shared 15 s. A theme is optional; a splash budget is not.

Passing `null` instead of the held ETag forces an unconditional fetch. That is how the gallery's "Refetch now" makes a fresh admin edit visible in seconds, and it is why a forced refresh is never coalesced with an in-flight conditional one.

## The Splash Network Window

```
cold start
    │
    ↓  bundled palette painted immediately
┌──────────────────┐
│  /t/splash       │   floor 1500 ms  ·  hard cap 3500 ms
└────────┬─────────┘   waits on: cache read + conditional GET
         │
         ↓  whichever comes first
┌──────────────────┐  long-press wordmark   ┌───────────────┐
│  /t  (home)      │ ─────────────────────→ │  /t/tokens    │
└────────┬─────────┘                        └───────────────┘
         │ category tile                    mode tile (skips the browse path)
         ↓                                                    │
   /t/category/{slug} → /t/quiz-mode/{slug} → /t/quiz ←────────┘
                                                 │
                                                 ↓
                                            /t/results ──→ /t

   bottom bar (components/t/bottom-bar.tsx), on the five screens that mount it:
     crown → /t/paywall (push)   ·   person → /t/account   ·   /t/shop
     home → /t          ·   /t/stats          ·   /t/settings
```

Every arrow above stays inside `/t`. The crown is the one slot that *pushes* — the paywall is dismissible back onto whatever opened it — while every other slot replaces, which is what stops the bar growing the stack on each tap. The leftmost slot is two routes rather than one: a gold crown for a free player, a person once subscribed, so the bar keeps five slots either way.

The splash holds for a brand floor and, within a hard cap, waits for the engine to settle both its cache read and its network call. That buys exactly one thing: on a first-ever launch the very first real screen already carries the operator's colours, instead of flashing the bundled palette and flipping a moment later. On every later launch the wait is free, because a `304` resolves well inside the floor.

The cap sits above the fetch timeout on purpose, so a black-hole network exits through the fetch's own timeout and the cap stays a backstop nothing can cancel. Fail-open is absolute here: the "settled" gate flips on **any** settlement, including a timeout or an outright failure.

Two independent timers drive this rather than a promise race, because the gates being waited on live in React state, which a promise chain captured in a mount-once effect could never observe.

## Repaint Cost and Reference Identity

`resolvePalette` returns the **base object itself** when the overlay changes nothing, rather than an equal copy. This is not a micro-optimization. Dozens of call sites across the app follow the `useMemo(() => makeStyles(colors), [colors])` recipe, so a new-but-equal palette object would invalidate every one of those memos and rebuild every stylesheet — a diffuse flicker and performance regression no visual diff would catch.

It is also what makes it safe to switch the engine on for an existing app later: an unedited preset resolves to the identical `EruditeColors` object, and nothing re-renders.

## One Colour Funnel: `useTemplateTheme`

Screens under `app/t/` do not call `useThemeColors()`. They call `hooks/t/use-template-theme.ts`, and a test asserts that no file under `app/t/` imports the palette hook directly — so *where the template gets its colours* is a one-file fact rather than a grep.

The hook returns a **superset**: all forty-five `EruditePalette` tokens unchanged, plus the few derived roles the ported screens need and the bundled palette has no name for. It never rewrites a token, so an operator preset still lands on screen exactly as the backend authored it. A `TemplateTheme` is structurally an `EruditePalette`, so a screen's existing `makeStyles(c: EruditePalette)` keeps working untouched until that screen actually needs a derived role.

Wrapping rather than widening `constants/theme.ts` keeps the blast radius at `app/t/`: that file and `useThemeColors` serve the live Erudite build and five sibling apps, and a token added there to satisfy one template screen would land in every shipped app. When the wire contract widens, these derived roles become real operator-settable tokens and the hook shrinks — the call sites do not move.

**A derived role earns a name here only if two or more screens use it.** The tier scale below qualifies; a tint used by exactly one screen stays an inline `withAlpha(...)` in that screen's own `makeStyles`. Without that rule the hook becomes the dumping ground the literals scan exists to prevent.

The one **intentional pixel change** is the middle tier. The results and stats screens share a hardcoded traffic-light scale — green, amber, red. The outer two map onto `success` and `danger` cleanly; the amber has no equivalent anywhere in the palette. `gold` is illegible against the light appearance's background, and the results screen paints this colour on a large score number and a ring drawn directly on that background rather than inside a card. `lib/theme/color.ts` deliberately ships no lighten/darken operation, since derive rules live in the backend registry and a second, divergent derivation engine on the client is what that split forbids. Borrowing a hue from the tile spectrum would put artwork in a text role. So the middle band is `accent`: legible on both appearances by construction, and one of the operator-settable tokens, so the scale repaints with the preset — which is the point. The scale degrades from traffic-light to high/brand/low, still three legible steps, and a later `warning` token restores the amber in one line.

That change is now on screen rather than latent: `app/t/results.tsx` paints the score ring, the score number and the percentage from `tierHigh`/`tierMid`/`tierLow`, so a preset edit repaints all three. `__tests__/app/t-results.test.tsx` renders each band under an overridden accent and asserts the middle one moves with it — being literal-free was never the goal, repainting was, and a port that swapped three hexes for three tokens without checking the second thing would pass a grep and fail the feature. Since the Э1 widening put `success` and `danger` on the wire, the same test now pins that the outer two bands move with them too — the pre-widening version pinned them as staying bundled, and the widening turned that pin into the full-scale repaint assertion.

Reference identity carries over from `resolvePalette` and matters for the same reason. The widening is a pure function behind a **module-level `WeakMap` keyed on the palette object**, not a `useMemo` inside the hook: a per-component memo cell would hand two components rendering under one palette two different objects, and their stylesheet memos would stop agreeing. The map makes the identity global. It is weak rather than strong because palettes are per-appearance and per-fetch objects, and a superseded preset has to be collectable.

## Tile Artwork: a Bundled Spectrum

Category and mode tiles are the one part of the template's colour that is *not* a palette token. `constants/t/tile-palette.ts` holds a named 15-hue brand spectrum, the 10 two-stop ramps built from it, and the mode and category assignments that pick a ramp. Screens ask for a ramp by key through `hooks/t/use-tile-gradients.ts` and never see a hex. It is the only module in the `app/t` surface allowed to contain colour literals, because it is the seam a later stage replaces — `resolveTileGradients` already takes a spectrum as an argument and is called once, at module load, with the bundled one.

Every value is lifted byte for byte from the shipped Erudite tiles, and a test pins each ramp against the live `CATEGORY_VISUALS` map. That matters because a template category tile pushes into an Erudite screen still reading that map, so a tile that changed colour mid-navigation would read as a rendering bug.

The spectrum exists rather than a flat list of 17 gradients because the 17 tiles are really 10 pairs drawn from 15 hues, with 7 exact duplicates that are design statements rather than coincidences. It is also the cheap shape to remote later: 15 flat colour tokens and no new wire machinery, where a gradient map would need a two-stop gradient type on both sides.

The spectrum is **deliberately not derived from `accent`**. Tile labels use `onAccent`, which is white in both appearances. It has been operator-settable since the Э1 widening put the whole palette on the wire, so an operator can move the label colour knowingly — the ratchet below still guards the shipped worst case (roughly 1.44:1 against white). Deriving every tile from one seed would put all 17 in that band at once for a pale accent, and derivation also collapses seven category identities into shades of one hue, in a grid that uses hue as its primary index. A contrast ratchet in the ramp test stops anyone quietly adding a paler hue.

Mode assignments are exhaustive by construction — a mode without a ramp is a compile error rather than a silent fallback to grey. Category assignments are the opposite, because category slugs are backend data and an unknown one is an ordinary runtime case that resolves to the neutral fallback ramp. That lookup map is built on a **null prototype** on purpose: the key is untrusted operator data, and on a plain object a category slugged `constructor` or `toString` would inherit a function instead of missing. The fallback would never fire, an undefined gradient would reach a native `LinearGradient`, and Android would throw rather than render the neutral tile.

One naming note, so it is not "fixed" later: the hue names (`sun`, `ember`, `orchid`) are a conscious exception to the rule that tokens are named by role rather than by colour. A brand spectrum has no role beyond being itself.

## Third-Party Brand Colour: the Seam That Stays

`constants/t/oauth-brand.ts` is the second — and by intent the last — module in the `app/t` surface allowed to hold colour literals. It carries six values: the fill, label ink, and glyph ink of the Apple and Google sign-in buttons on `t/account`.

It exists because those six are **not ours to choose**. Apple's Human Interface Guidelines permit Sign in with Apple in black or white only, with the label ink fixed against it; Google's identity guidelines fix the `G` at `#4285F4` on a white button. An operator preset that recoloured either would produce a build that violates a vendor guideline and can be rejected at store review. So a configurable version of these values is not a feature being declined — it is a defect being declined.

That makes this the exact inverse of every other colour in the template. Everything reachable through `useTemplateTheme()` is operator data *by construction*, so anything routed through the funnel is, by definition, something an operator may move. These must never move. They therefore sit outside the funnel entirely, and the screen's stylesheet references `OAUTH_BRAND` directly rather than through its palette parameter — the indirection would be a lie about where the value comes from.

**The difference from the tile spectrum is the part worth remembering.** `constants/t/tile-palette.ts` is *temporary*: it holds literals precisely so a later stage can lift them onto the wire as flat colour tokens. This file is *permanent*, and remoting it would **be** the bug rather than the fix. A future reader who finds these hexes and reaches for the wire contract should stop at that sentence.

Nor can they be `withAlpha` derivations of anything in the palette, the way the same screen's premium badge is. That badge's `#ffd23a22` / `#ffd23a66` wash and border became `withAlpha(c.gold, 0.133)` and `withAlpha(c.gold, 0.4)` — byte-exact, since `gold` is `#ffd23a` in both appearances and `withAlpha` rounds rather than truncates. The OAuth colours are not tints of *our* brand colour; they are somebody else's brand colour.

Both exemptions are named in two places that are asserted to stay in step: the `EXEMPT` map in `__tests__/app/t-no-color-literals.test.ts`, and the `ignores` list in `eslint.config.js`. The mirror test iterates the map rather than naming a file, so half a pair cannot land — and it matches inside the `ignores` array specifically, because both seam paths also appear in the lint *message* shown to developers, which a whole-file containment check would happily accept as an exemption that was never granted.

Each exemption is also asserted to still be *earned*: an exempt file that goes clean fails the suite and asks to be deleted, so a dead exemption cannot linger. On the account screen the six values are read back off the rendered buttons under an operator preset and under both appearances, which is what proves they are inert rather than merely untested. The light-appearance reading is the sharpest of the three: wiring the Apple label to `c.text` passes in dark, where `text` is also `#fff`, and fails only in light.

## Artwork: Asset Packs Staged at Build Time

Colours arrive at runtime. Pictures cannot, and the reason is not a design preference: React Native has no dynamic `require`. Metro must see a string literal at the call site to bundle a file at all, so there is no version of "fetch the operator's onboarding art" that ends in a `require()`. Ten hex strings fit in a conditional GET; a megabyte of authored illustration does not, and even if it did, nothing could bundle it.

So the *delivery stage* moves instead of the mechanism. Several **asset packs** live in the repository under `asset-packs/<pack>.assets/`, and the build service copies the selected one into a fixed staging directory **before Metro runs**. The paths the screens require never change; only the bytes behind them do. Swapping a pack needs no code change, no runtime lookup, and no new machinery on either side of the wire. `scripts/apply-asset-pack.mjs` performs that copy locally (`npm run asset-pack neon`) and is the reference the backend's `ProcessBuildTask` transliterates.

The seam is `constants/t/asset-slots.ts`: five literal requires and nothing else. It is the images' answer to what `constants/t/tile-palette.ts` is for tile colour — one reviewable place, so a scan of a single file sees every bundled picture the template can draw. Centralising costs nothing, because Metro's constraint is on the *argument* to `require`, not on where the call sits.

Colour and artwork run on the same picker but on different clocks, and the diagram is the shortest way to see where each one crosses into the app:

```
  Operator picks, in Nova
   ┌──────────────┐          ┌──────────────┐
   │ theme preset │          │  asset pack  │
   └──────┬───────┘          └──────┬───────┘
          │                         │ ProcessBuildTask
          │                         │ (clear, then copy)
          │                         ↓
          │                  ┌──────────────┐
          │                  │  assets/t/   │ ← npm run asset-pack <name>
          │                  └──────┬───────┘   does this locally
          │                         ↓
          │                  ┌──────────────┐   literal require()
          │                  │    Metro     │ ← constants/t/asset-slots.ts
          │                  └──────┬───────┘
          │                         ↓
          │  GET /apps/{slug}/theme ┌──────────────┐
          └────────────────────────→│ installed app│
             every launch, ETagged  └──────────────┘
                                      pictures frozen at build,
                                      colours refreshed at runtime
```

### Why the staging directory is `assets/t/`, not `assets/`

The Exams project, which this mechanism is copied from, stages packs straight into `assets/` and overwrites `assets/onboarding/`. Following that literally here would be destructive. `assets/onboarding/*.png` is a live directory in this repository: `app/onboarding.tsx` statically requires twenty-two files from it, and that is the **shipped Erudite build**. A pack copied over it would clobber a production app's artwork for the sake of a template.

`assets/t/` matches the existing `assets/<app>/` convention (`assets/sport-quiz/`, `assets/italy-quiz/`) and is owned entirely by the template. Because the destination is app-specific and no longer the reference project's default, the backend has to be *told* where to copy — which is why the manifest carries a `target` field rather than leaving `assets/t` duplicated as a constant in PHP.

That field is also a path-traversal and clobber vector, since it is data supplied by whoever authors a pack. A pack declaring `"target": "assets/onboarding"` would delete the Erudite artwork on the build server's clone — and the copy is a `rm -rf` followed by a write, so there is nothing to roll back.

Guard it with an **allowlist**, on both sides. The tempting shape is a pattern like `^assets/[a-z0-9-]+$`, and it is worth seeing why that fails: it rejects `../../etc` and `assets/t/../onboarding` and looks like it has covered the problem, but it happily accepts `assets/onboarding` — the one destination the check exists to prevent. Traversal was never the real risk here; a perfectly well-formed path pointing at a live directory is. The set of legal destinations is one entry long, so comparing against that set is both stricter and simpler than any pattern. `scripts/apply-asset-pack.mjs` refuses with a non-zero exit, and `__tests__/app/t-asset-packs.test.ts` fails the pack that declares it.

### The manifest is a build-time contract

Each pack ships a `manifest.json`, and it exists for the backend, not for the app:

```json
{
  "schema": 1,
  "pack": "base",
  "title": "Базовый",
  "onboarding_types": ["classic", "universal"],
  "target": "assets/t",
  "slots": {
    "splash/logo.png": { "w": 256, "h": 256, "title": "Сплэш, логотип" }
  }
}
```

It is how the operator's pack picker learns which packs exist (`pack`, `title`), which are compatible with a given onboarding shape (`onboarding_types`), and how to lay out and label each image in the form (`slots`). Without it the backend would be inferring intent from filenames, which survives two packs and breaks on the third.

Nothing in the app resolves a slot through it. `constants/t/asset-slots.ts` owns resolution; a manifest-driven lookup would have to be dynamic, which is the one thing that does not exist. The staging copy does bring `manifest.json` along into `assets/t/`, so a built APK carries an on-disk record of which pack produced it, and the token gallery reads exactly that for its `asset_pack` row — a debug label, and the single bounded exception to "the manifest is never consulted at runtime".

Three properties are worth not rediscovering:

- **One `asset-packs/` directory, not the reference project's two-family split.** Exams encodes onboarding compatibility in the filesystem (`asset-packs/` versus `asset-packs-universal/`). That forces the backend to know a naming convention, and promoting a pack to universal becomes a git rename that breaks every reference to it. `onboarding_types` carries the same fact inside the file the backend already parses.
- **`onboarding_types` lists every shape a pack is drawn for, and both shipped packs list both.** It read `["universal"]` until Э8-B-2, which was the field describing the one shape that did *not* yet exist while omitting the one that did — a hand-written list drifting from the shipped switch. The test's allowlist is now derived from `T_ONBOARDING_RENDERED_TYPES`, so widening the union widens it automatically, and the per-pack check stays a **subset** rather than an equality: the field's whole purpose is that the backend *filters* packs by it, so a future shape-specific pack must remain expressible. Since the same five slots serve both shapes today, adding a variant costs the manifests one string and no artwork. The derivation is from the **rendered subset** and not the whole union, because `none` names the absence of a screen: no pack can be drawn for it, so `["none"]` must stay an illegal manifest value. That mirrors the backend's `OnboardingTypeEnum::constrainsPacks()`, which answers `None => false` — filtering `none` against packs that declare `classic`/`universal` would empty the operator's pack picker outright.
- **Every slot is a nested path**, including `splash/logo.png`, which the reference had as a bare `splash.png`. Uniform nesting leaves the safe-relative-path validation with no special case.
- **One slot has a different aspect ratio.** `paywall/hero.png` is 1024×768 where the rest are 256×256. If all five were square, the manifest-versus-bytes assertion could never catch a transposed width and height or a slot copied from the wrong file.

Declared dimensions are a record of what the artwork *is*, not a target it should be resized to. A pack that declares 1024×1024 for art composited from 256×256 glyphs is shipping a silent 4× upscale; declare what the file actually contains.

### What the artwork has to survive

A pack is drawn against an unknown background. `ScreenBackground` paints the operator's remote three-stop `bgGradient`, and the player can flip the appearance, so a full-bleed coloured rectangle reads as a broken card on every preset the pack was not authored against. A pure-transparent glyph has the opposite failure: art drawn for a dark preset can vanish outright on a light one.

Both committed packs therefore use a transparent canvas with a **bounded opaque plate** behind the subject, and they take opposite treatments — `base` is a light circle with a dark ring, `neon` a dark hexagon with a bright ring. Each stays legible on either appearance, and the pair differs by silhouette and subject rather than by tint, so a swap is obvious at a glance rather than a matter of comparing shades.

Tinting monochrome glyphs with `accent` was considered and rejected: it would be theme-proof by construction, but it rules out multicolour artwork entirely and would leave two packs differing only in outline.

### Clear-then-copy, and what the tests hold

The staging copy wipes the target rather than merging into it. A pack that renamed or dropped a slot would otherwise leave the previous pack's file in place, the `require()` would keep resolving to it, and a shipped APK would carry one image from the wrong pack with nothing anywhere reporting a problem.

`__tests__/app/t-asset-packs.test.ts` is structural rather than render-based, and it has to be: jest-expo rewrites every image module to `module.exports = 1`, so no rendering test in this repository can tell which PNG a `require()` resolved to. The identity is gone before the test runs. The filesystem proof stands in for it — manifests agree with the bytes on disk, every pack declares an identical slot set, and the requires in the source agree with the manifests in both directions. That last one is the valuable half: a slot nobody renders and a require no pack supplies are the only two ways this feature rots silently, and both ship green and surface months later as a blank image on a device.

One test asserts that `assets/t/` is byte-identical to `base`. It is expected to go **red** while another pack is staged for an experiment, and that redness is the point: it stops a local swap from being committed and quietly changing what every future build starts from.

Adding a sixth slot is a three-place edit — `constants/t/asset-slots.ts`, the `slots` object in *every* manifest, and real artwork in every pack. The tests catch two of the three omissions; forgetting the seam just means the slot is never drawn.

### Weight, and what does not get bundled

`asset-packs/**` is unreachable from any module, so Metro never walks into it and none of it reaches an APK — only the staged copy under `assets/t/` does. `app.json` declares no `assetBundlePatterns`, and **it should stay that way**: adding a pattern to "include the packs" would ship every pack in every binary.

Two packs are roughly 450 KB. That is fine, and it does not stay fine. At twenty packs this is multi-megabyte git history in a repository the build service clones on every build, and the answer at that point is a pack registry with artwork fetched at build time rather than committed — not a larger repository.

## Where the Slots Are Drawn

`app/t/onboarding.tsx` exists as much for the artwork as for the flow. Before it, nothing under `app/t` rendered a single bundled picture — every image on the home screen is a remote `icon_url` — so the pack mechanism would have had slots with no reader: a contract that compiles, ships, and means nothing. It draws four of the five slots; the splash draws the fifth.

It follows the shape of `app/onboarding.tsx` without importing from it, for the reason already recorded for `app/t/index.tsx`. The Erudite screen carries concerns that are not the template's — a language-picker back button, a content-snapshot wait, a per-platform forced-paywall gate — and extracting a shared component would mean editing a file five live apps render in order to add a sixth caller.

Two behaviours are load-bearing rather than incidental:

- **The closing slide only pitches where a store can charge.** With billing unavailable it degrades to a plain "get started" — the same capability-driven gating the Erudite flow uses, which is what keeps a store reviewer from meeting a purchase they cannot complete. It reuses the shared `/paywall` rather than growing a second one; the home screen already pushes there from a premium-locked mode tile.
- **`markSeen()` resolves before any navigation away, the paywall included.** `app/paywall.tsx` exits with `router.replace('/')`, and on a template build `/` redirects to `/t/splash`. A player who opened the paywall from the last slide and closed it therefore returns through the splash — and if the flag were not written first, the splash would read "unseen" and push them into onboarding again, a loop with no exit that does not involve buying something.

On the splash, `hasSeen` picks the destination and is deliberately **not** a fourth gate alongside the floor, cap, and theme conditions. Making it one would stall the screen on a slow or broken storage read and cost it the fail-open property it is built around. The check is explicitly `=== false`, because `null` means the read has not resolved or threw — and the safe direction is home, since replaying onboarding for a returning player is worse than skipping it for a new one.

**`onboarding_type: none` refines that same destination**, and is likewise not a gate: the splash asks `showsOnboarding()` beside the seen-flag and leaves at the identical moment either way. There is no empty onboarding screen and no stack to page through — the stack is simply never entered, which is exactly why `none` has no entry in `T_ONBOARDING_VARIANTS`. Three properties travel with it:

- **It reads the value live, not frozen.** The splash uses `useLiveOnboardingType()` rather than `useOnboardingType()`, and the distinction is the whole feature. The splash is mounted *before* the engine settles — holding that window open is its job — so its first render always sees the pre-network `T_ONBOARDING_DEFAULT`. A frozen read there would pin `classic` on every launch and make `none` unreachable forever, with no symptom anywhere: the token gallery would display the `none` that arrived on the wire while the gate kept routing into the intro. Freezing stays correct for the *host*, which mounts after settlement and must not have the screen swapped mid-flow. A regression case in `t-splash.test.tsx` goes red on exactly that substitution and on nothing else.
- **Nothing is persisted when the intro is skipped.** `markSeen()` remains the sole business of `app/t/onboarding.tsx`. Writing the flag from the splash would record a lie — this player has *not* seen the intro — and, worse, would make a later operator flip from `none` back to `classic` permanently invisible on every device that had already launched once. Recomputing the decision each launch is what lets that flip reach installed devices on their next start.
- **It fails open like the palette.** If the hard cap fires before the engine settles, the gate reads the default and a `none` build shows the intro for exactly one launch, with the cache warm by the next. Holding the splash open to be *certain* about the intro is the worse trade.

The template introduces **no new strings**: the three intro slides reuse the existing `onboarding.page1..3` keys, already complete in all four locales. The premium slide borrows `paywall.subtitle` and `paywall.feature.unlimited` rather than `paywall.title`, which reads "Quizzzes Premium" in every locale — a brand name that has no business appearing in a build an operator ships under their own.

### Host and Variant

Because `onboarding_type` selects a *screen*, the screen is split in two. `app/t/onboarding.tsx` is the **host**: it draws nothing and owns everything with a consequence — the slide list, the current page, `markSeen()`, the billing gate, both route literals, and the button's label. `components/t/onboarding/` holds the **variants**, which own pixels and decide nothing. `contract.ts` is the agreement between them, `index.ts` maps each **rendering** `onboarding_type` to a component, and `classic.tsx` is the pager that has always shipped.

`index.ts` is keyed by `TOnboardingRenderedType` — the union minus `none` — rather than by the full union, so `none` is not merely unregistered but unregisterable. That keeps the map a *total* `Record` (the belt that makes widening the union without shipping a screen a compile error) while stating "this type draws nothing" in the type system instead of a comment. Adding `none: SomeEmptyScreen` here would not add support for it; it would silently *disable* the feature, because the host renders whatever it is handed and would overrule the intro gate's skip with a blank screen the player still has to dismiss.

The division is not filing, and the two halves are enforced from opposite directions. Keeping navigation in the host is what keeps the paywall-entry-point assertion in `t-routes.test.ts` pointed at a file that really holds `'/t/paywall'`, and keeps the `markSeen()`-before-navigate proof in `t-onboarding.test.tsx` binding on every variant that will ever exist rather than on the one written first. But a source guard is needed too: that route assertion only checks the literal is *present*, so a variant that navigated on its own would leave it in the host as dead text and nothing would go red. `t-onboarding-variants.test.tsx` therefore forbids any file under `components/t/onboarding/` from importing `expo-router`, `@/hooks/use-onboarding` or `@/lib/revenuecat` at all.

**A variant is never a route.** The obvious-looking alternative — a file per shape, `app/t/onboarding-universal.tsx` beside `app/t/onboarding.tsx` — fails on how expo-router works: each file is a real, deep-linkable route with no host above it, so the second one is an entrance that bypasses `markSeen()`, the billing gate, and every invariant the flow test protects. `t-routes.test.ts` pins onboarding to exactly one route for that reason, and the remedy for a stray file is to move it under `components/`, never to register it.

Two smaller rules travel with the split. Variants receive `t` as a prop from the host's `useTemplateCopy()` seam rather than calling it themselves, so the operator-overridable-copy work stays a one-file edit. And a variant is **controlled**: it is told which page to show and reports gestures upward, which is subtler than it sounds. `classic.tsx` keeps a `settledPage` ref to track the page the *list* is on as distinct from the page the *host* believes, because the naive `useEffect(scrollTo, [page])` fires on mount and — worse — answers a gesture-driven change with a programmatic animated scroll fighting the player's own finger. Neither misbehaviour is visible from Jest, which never dispatches a scroll event.

### The Second Variant

`universal.tsx` is the second shape, and it is not a restyle. `classic` mounts all four pages side by side in a `pagingEnabled` ScrollView and moves the viewport; `universal` mounts exactly the page it was given and lets React swap the subtree on a `key={page}`. Everything else follows from that one decision — there is no scroll offset to reconcile, so there is no `settledPage` bookkeeping, no ref, no effect and no state of any kind in the file. Visually: a round accent-tinted plate around the artwork instead of a bare centred picture, left-set copy under a numeric `01 / 04` eyebrow instead of centred copy, a segmented progress bar instead of dots, a radius-16 slab button instead of a radius-28 glowing pill, and skip as a centred footer link instead of a corner button.

It needed **no new asset slots and no new strings**. Both variants draw the same five slots and the same six keys — an operator flipping `onboarding_type` gets a different *shape*, not different content. That is what makes the switch cheap: a new shape is one file plus one registry line, never a round of artwork in every pack and a translation pass in four locales.

Two constraints shaped it, and both are worth not rediscovering:

- **The animation may not gate a mount.** `key={page}` is what performs the swap — React reconciles the new subtree in the same commit, and `entering={FadeIn}` merely decorates a mount that already happened. So the page is on screen synchronously whether Reanimated runs, is mocked, or is disabled by a reduce-motion setting. There is deliberately no `exiting`: it would keep the outgoing page mounted and put two `t-onboarding-art-<slot>` nodes on screen at once **on device only**, since the repo's Reanimated test double ignores `exiting` entirely and every assertion would stay green.
- **The filmstrip is the way back that a pager gets for free.** `classic` earns backward navigation from the swipe gesture; a one-page-at-a-time variant has to offer it explicitly or the only route back through the intro is to finish it. So the three step thumbnails are tappable — and bounded to the steps, never the closing pitch, so a tap can never reach the premium page, which stays behind the primary button and the capability gate that computes its label. They carry a `t-onboarding-thumb-<slot>` prefix rather than `t-onboarding-art-<slot>`, because they draw the same slots a second time and RNTL throws on a duplicate testID.

The `universal` key pointed at `classic` between Э8-A and Э8-B-2, because the union shipped ahead of the screen. While that alias held, `useOnboardingType()` was observably **inert**: both keys rendered the same tree, so no render assertion could tell them apart and a forgotten repoint would have gone unnoticed. It was held by a deliberately intolerant tripwire — a test written to *fail* on the repoint rather than to accept either state — which the repointing commit deleted. What carries it now is the per-variant marker assertion, which names `t-onboarding-variant-${type}` for each registry **key**; since each variant hardcodes exactly one marker, distinct markers imply distinct components and a re-alias fails immediately.

### Seeing It On A Device

The switch is **reachable from the backend** since the client accepts the schema-v2 envelope and reads `onboarding_type` off it — an operator flip of the preset's `onboarding_type` reaches a device on the next launch. The manual pin in the token gallery remains as a testing tool: it is the only way to exercise a variant the backend did *not* choose (or the `none` skip) on hardware.

`hooks/t/use-onboarding-type.ts` therefore carries a `__DEV__`-only override: a module variable, `setForcedOnboardingType()` to write it and `forcedOnboardingType()` to read it, consulted ahead of the engine inside the same hook. Nothing is persisted — it survives `router.replace()`, which is what makes the walk below work, and dies with the process. The gate is on the **read**, not the setter: that is the only consulting site, so gating there is total, and `__DEV__` is read at call time rather than captured in a module constant so the inertness is testable.

The operator walk, and every step of it is load-bearing:

1. `/t` → long-press the wordmark → the token gallery.
2. Press **force onboarding** until it reads the variant you want. It cycles `auto → classic → universal → none → auto`, derived from the union, so a further type needs no edit here — `none` joined the cycle for free when the union grew, which is the property that comment had claimed before it was ever exercised.
3. Back, then `/t/settings` → **dev reset**.

Step 3 is not optional and the gallery deliberately does not shortcut it. The splash routes to `/t/onboarding` only when `hasSeen === false`, so a jump straight to the splash without wiping `onboarding.seen.v1` lands on `/t` seeing nothing — which reads as a broken override. The destructive wipe is already owned and tested at `/t/settings`; duplicating it in the gallery would mean two screens that can erase progress.

> **Step 3 is not reliable on a warm device, verified on `emulator-5556` 2026-09-09.** The reset wipes the flag and `router.replace('/t/splash')`, but the splash navigates as soon as `capped || (floorDone && hydrated && networkSettled)` and picks its destination from `hasSeen === false`. On a device whose theme is already cached, those gates are open before `useOnboarding()`'s storage read resolves, so `hasSeen` is still `null` and the documented fail-open sends you to `/t`. Two consecutive resets both landed on the home screen. This is pre-existing behaviour in `app/t/splash.tsx` and `app/t/settings.tsx`, not something the override introduced, and it is *correct* for a real player — the comment at `app/t/splash.tsx:60-73` argues at length that a returning player must never be dropped back into onboarding because storage hiccuped.
>
> The reliable route for a developer is a deep link straight to the screen, which routes in place and therefore keeps the module-level pin (a full reload would clear it):
>
> ```bash
> adb -s emulator-5556 shell am start -a android.intent.action.VIEW -d "quizerudit://t/onboarding"
> ```
>
> Making step 3 dependable would mean turning `hasSeen` into a fourth splash gate, which is exactly the trade that file refuses. Left alone deliberately.
>
> **That deep link does not verify `onboarding_type: none`.** It lands *inside* `/t/onboarding`, bypassing the splash — and the splash is where the skip lives, so the link exercises variant *selection* and never the *gate*. Worse, the two outcomes are indistinguishable from the destination alone: a working skip and a broken feature both leave you on `/t`, which is also where the lost `hasSeen` race leaves you. To observe the skip, deep-link to the **splash** instead, after a dev reset has already written the flag (the storage read then has a warm cache and the full floor to win in):
>
> ```bash
> adb -s emulator-5556 shell am start -a android.intent.action.VIEW -d "quizerudit://t/splash"
> ```
>
> A `none` run only means something next to a **control run pinned to `classic`** that did show the intro, proving the race is winnable at all; the control also demonstrates that the skip wrote no seen-flag, since the intro could not otherwise come back. Note that a cold restart — which would win the race outright — kills the module-level pin, so "cold start" and "dev pin" cannot be combined. On-device verification of this path is therefore probabilistic, and a green Jest run should never be presented as a production check.

The pin sits **inside** the hook's freeze, so flipping it never swaps the screen under a flow already running. The fresh mount comes from that dev reset. One consequence: `useOnboardingType()`'s two `??` fallbacks are now exercised from different places — a bad string like `martian` passes *through* the hook untouched and is caught by the host's registry lookup, while an absent value is caught by the hook itself.

## The Token Gallery

`app/t/tokens.tsx` is the instrument for the whole engine. It reports which tier is applied, the held ETag, how long ago the last successful revalidation was, the schema version, `supports_dark`, which asset pack the binary was built from, which `onboarding_type` arrived, and which tokens the operator has actually overridden. It offers three actions: refetch unconditionally, clear the cache and refetch, and flip the appearance — plus, on a debug build only, the forced-variant control described above.

It doubles as the end-to-end proof, because it renders inside the **unmodified** `ScreenBackground` — the app's only consumer of `bgGradient`, which feeds it straight to a native gradient. A themed backdrop there means the remote token flowed through real production code with zero changes to it.

Reaching it by long-pressing the home wordmark, and not gating that on `__DEV__`, is deliberate. The gallery exists to be read on a real device against a real operator preset, which means a preview or release build where `__DEV__` is false. Gating it would delete it exactly where it is needed. It is already build-gated by living under `app/t/`, and it exposes nothing but colours and a refetch button.

A token counts as "overridden" when it differs from the bundled value in **either** appearance, so the marker answers "did the operator touch this token" and stays put when you flip the light/dark toggle.

Two rules govern what the forced-variant control may disturb, and they follow from the paragraph above. The `onboarding_type` **row** is always present, because it reports operator data like every other line in that card — and it reports the value **on the wire**, never the one being drawn: with a pin active the app renders `universal` while the backend said `classic`, so showing the resolved value would be wrong in both directions at once. A badge declares the local mask instead (`classic  [forced: universal]`). The **control**, which writes developer-only state, is `__DEV__`-gated and lives in its own action row rather than as a fourth child of the existing one — that row is a flex of `flex: 1` children, so sharing it would lay out as four quarters in a debug build and three thirds in the release build this screen is written for.

The row sits directly above the unsupported-schema warning on purpose: when those two disagree, the explanation is the very next line. With the client on schema v2 the row reads the wire value (`universal` for `test-quiz`) — the pre-Э1 mismatch that made it read `classic` against the wire's `universal` is closed.

## Verifying on a Device

The engine's central promises are all about what a real device does at a real moment: the first frame carries no flash, an operator's edit reaches an installed app with no rebuild, and a restart without a network keeps the colours. The test suite cannot prove any of them, because it has no device. The backend cannot prove them either — it only proves that the endpoint answers and that a preset edit moves the ETag. The app has to run on a screen.

That is harder for this build than for a sibling, and the difficulty is what its `app.config.js` branch exists to remove:

- **Metro serves one slug.** A debug binary pulls its JS from the dev server at launch. The shared dev host runs one Metro for another build, so a debug APK of the template would show that build's bundle, and there is no scheme on the installed app to deep-link into a second server. Taking the operator's session down to make room is not an option.
- **So the artifact is a release APK with the bundle embedded.** No dev server is involved, `EXPO_PUBLIC_APP_SLUG=test-quiz` is compiled in, and the app fetches its theme from the production backend exactly as an installed app would. [Development](development.md#building-a-variant-as-a-release-apk) has the build steps.
- **And it must install beside the existing build, not over it.** Android replaces an app whose package matches, data and all. This is the one config branch whose `package` and `bundleIdentifier` are literals rather than fallbacks to the Erudite identity, so an unset env var cannot turn a verification build into a silent overwrite of the app it was meant to sit next to. Its own `scheme` (`testquiz`) keeps `quizerudit://` links unambiguous while both are installed.

These observations are worth making once the app is on the device, roughly one per design property:

| What you look for | What it proves |
|-------------------|----------------|
| Opens on the bundled dark navy, no white flash, no foreign colour | The bundled tier really does paint the first frame, and the scaffold colour matches it |
| An admin edit to the app's preset appears after a restart, with no rebuild | The conditional fetch sees the new ETag and the overlay applies |
| Colours survive a restart with the device offline | The cache tier carries the last good theme |
| The neighbouring build is untouched and unchanged | The inertness gate holds, and the packages really are separate |
| The splash and onboarding artwork stays legible after flipping the appearance, and the gallery's `asset_pack` row names the pack that was staged | The pack's plate treatment survives both themes, and the build really did bundle the staged bytes |
| A mode tile runs to the results screen and **Home** returns to the template home — never the Erudite wordmark, and with no splash animation on the way | The quiz loop is closed inside `/t`. This is the one observation no test can make: a missed `router.replace('/')` does not crash or dead-end, it silently redirects through `/t/splash`, which only reads as wrong when you watch it |
| The results score ring, number and percentage carry the preset's accent on a mid-band score | The derived tier scale is reaching a native style prop, not just a token name |
| Every bottom-bar slot — crown, shop, home, stats, settings — lands on a template screen, never the Erudite wordmark, and the crown's paywall dismisses back to where it was opened | The nav is closed inside `/t`. Same class of observation as the quiz-loop row above and for the same reason: the shared bar's `router.replace('/')` redirected through `/t/splash` rather than failing, so only watching it reads as wrong |

Verification writes into production data, so it carries an obligation: the preset override used to prove tier three must be reverted afterwards, and the endpoint's ETag returning to its previous value is the check that it was. Every shipped app's preset stores `NULL` tokens, and leaving a stray override behind would be indistinguishable from an operator's real edit.

The colour half is no longer open. A release APK was produced on this host and installed as `com.turbosuslik.testquiz` beside `com.quizzzes.erudite`, both packages survive on the emulator, and launching it opens the template's own home under a remote green palette that appears nowhere in the bundled navy — the overlay is reaching a real screen, from a real backend, with no dev server involved. Read the install with `adb shell pm list packages`; a build cut off by the silence watchdog leaves no APK at all, so the presence of `android/app/build/outputs/apk/release/app-release.apk` is itself the signal that the Gradle run finished.

The artwork half is still open, and the reason is a date rather than a doubt. That APK predates the asset-pack work, so its bundle carries no reference to `assets/t/` — grepping `assets/index.android.bundle` inside the APK for that prefix is the cheap way to tell whether a given binary is old enough to be irrelevant to a question about artwork. What has been shown is one step short of the device: `npm run asset-pack neon` changes all five files behind the unchanged `require()` paths, the byte-identity test goes red naming `base`, and restoring returns every checksum. Nothing here rests on having watched the neon artwork render.

**The ported quiz loop is unobserved for the same reason.** It has not been walked on a device: the installed `com.turbosuslik.testquiz` is a release APK whose bundle predates these screens, and the dev-server route is closed by the constraint at the top of this section — the shared host's Metro runs one slug, and it is not `test-quiz`. Confirm which one before assuming otherwise: `readlink /proc/<pid>/cwd` and the process's `EXPO_PUBLIC_APP_SLUG` say what a given dev server is actually serving, and an absent variable means the default Erudite slug. Seeing the loop therefore needs a fresh release APK (`suslik-bg "cd android && ./gradlew assembleRelease"` — the build goes silent long enough to be killed in the foreground, and a killed run leaves no APK at all). Until then the loop rests on the suites: the two ported screens render, navigate only to `/t` routes, and repaint from a preset, and the source scan in `__tests__/app/t-routes.test.ts` covers the branches a render cannot reach.

**The bottom bar is unobserved on a device too**, and its own row in the table above is the observation still owed. What the suites do carry: each of the six slots is pinned to its route *and its verb* (`__tests__/components/t-bottom-bar.test.tsx` presses every slot and asserts `push` versus `replace`, plus the inert active slot, the premium fork including its `null` loading state, and the tints under both appearances), and the source scan proves no file under `app/t/` or `components/t/` names a route outside the subtree. What only a device can show is the thing the shared bar got wrong for the whole port: a slot that navigates *somewhere real but foreign* reads as correct in every assertion and as obviously wrong the moment you watch it.

## Failure Modes

Fail-open is the engine's central property. Every failure leaves the app on the best palette it already had, and nothing in the chain throws or strands the splash.

| What goes wrong | What the player sees |
|-----------------|----------------------|
| Offline, DNS failure, timeout, 5xx | The cached theme, or the bundled palette on a first launch |
| Malformed body or a bad token | The last known-good theme; nothing is half-applied |
| Schema version newer than the build | Bundled or cached colours; neither the payload nor its ETag is stored, so the next app update applies the theme on its first launch — and the provider warns once per launch, so a stale build is visible in logcat |
| Corrupt or foreign cache record | Bundled colours, and the bad key is deleted |
| Storage write fails | Correct colours this session, one extra fetch next launch |
| Unknown or garbage `onboarding_type` | The default onboarding variant; the palette still applies normally |
| `onboarding_type: none` | No intro at all — the splash goes straight home. **The first-run premium pitch goes with it**, since that pitch is the closing onboarding slide; the paywall itself stays reachable from the home screen, a locked mode tile, and the bottom bar. Not a fault: it is what the operator selected |
| Deep link to `/t/onboarding` on a `none` build | The default variant renders. The gate sends nobody there, and the host degrades in place rather than redirecting — a redirect would be inert on this very path, since the host's frozen hook reads the pre-network default anyway |
| Backend ETag that ignores `onboarding_type` | A variant flip never arrives, with no visible symptom — see the conditional request above |
| Slow network on a first launch | The splash releases at its hard cap and the home screen paints bundled |

One case is deliberately not silent: an unsupported schema version. The provider logs a `[theme] Backend serves schema v…` warning once per launch (visible in logcat), and the gallery surfaces the same fact as an in-app warning. That loudness is a fix, not a luxury — the v1-vs-v2 breakage lived unnoticed precisely because the fallback was silent.

## Keeping the Two Repositories in Step

The client and the backend hold the same token list in two files, in two repositories, and the app crashes natively on a colour it cannot parse. Several guards keep that honest:

- A **parity test** asserts the bundled token values against literals copied from the backend registry, so drift between the repos fails the suite rather than shipping. The transcription lives in `__tests__/fixtures/remote-theme-v2.ts`; `__tests__/lib/theme-schema-parity.test.ts` additionally pins the schema version and the token list — names, order, and count — against it.
- A **live contract check** (`npm run check:theme-contract`, opt-in and outside the offline default suite) re-verifies all of the above against the real endpoint: the served schema version, the parseability of both slugs' live envelopes, the presence of every remote token in both appearances, and the erudite slug's defaults byte-for-byte. This is the check that would have caught the v1-vs-v2 breakage before it shipped.
- A **compile-time link** ties the remote token list to `EruditePalette`. Renaming or dropping a token in `constants/theme.ts` stops the build instead of silently resolving to `undefined` at runtime.
- A **source scan** holds the no-colour-literal line across the template's own directories — `app/t/`, `components/t/`, `constants/t/`, `hooks/t/` — plus everything those files *transitively import*. It is a source scan and not a render assertion on purpose: a hex on a branch no test exercises is still a hex. The scope is **derived by walking the imports** rather than declared in a list, because the list it replaced had already rotted: a modal the template home opens rendered a picker nobody had added to the list, so that file was silently unguarded for as long as it existed. A walk cannot fail that way. Each failure prints the import chain that pulled the file into scope, because adding an import to a template screen now widens the rule on its own, and "why is this test looking at my file" has to be answerable from the failure alone.
- An **ESLint rule** flags hex and `rgb()`/`hsl()` literals across those same four directories in the editor. The scan stays the authority: it catches forms an AST selector cannot see, and only the scan follows imports.
- A **slug test** fails the build if a shipped app slug appears in the inertness gate.
- The **onboarding variant union** in `lib/onboarding/onboarding-type.ts` must equal the backend's admin enum **in order** — `['classic', 'universal', 'none']` — and its *rendered subset* must equal the values an asset-pack manifest may declare in `onboarding_types`. Nothing can check this across repositories, which is exactly why the client parser matches exactly rather than normalising case: a drifted value surfaces as the default variant instead of silently resolving to a screen nobody chose. The union is the single source of truth on this side — the parser, the cache, the theme envelope, and the tests all derive from it, so correcting a string is a one-constant change.

  Order is pinned from **both** halves, because the backend's assertion is order-sensitive and nothing runs the two suites together: `__tests__/lib/onboarding-type.test.ts` spells the list out here, and `tests/Unit/OnboardingTypeEnumTest::test_the_enum_holds_the_three_documented_cases` spells the same list out there. Each names the other in a comment. Two literal lists a human can read side by side is the entire mechanism — a set comparison on either side would let the orders drift and surface the break in the *other* repository as a mystery failure.

The template's home screen is a deliberate **copy** of the Erudite home rather than a shared component. The Erudite home is a live store build's screen with no test coverage, and extracting its tiles and stylesheet would be a large untested refactor of shipped code — bought to de-duplicate a screen that is *supposed* to diverge, since this template's mode list, ramps, and category set all become operator data later. The copy's blast radius on the Erudite build is zero files.

The copy differs from the original in three intentional ways. It is a plain screen rather than the entry gate, because reproducing the intro-gate logic would bounce the player into the *Erudite* splash and onboarding — the exact leak the template registry exists to prevent. Its mode definitions have no gradient field at all, only a mode id. And the wordmark glow is derived from the accent with an alpha helper rather than frozen, so an operator setting a red accent gets a red halo.

That helper, `lib/theme/color.ts`, mirrors the backend's colour maths and copies its most important property: every function is **total**. An input it does not understand — a CSS `rgba()` literal, a blank, a named colour — is handed back unchanged rather than nulled, and every value ends up in a style prop. (The palette itself has been all-hex since Э1: `scrim` was normalised from its `rgba()` literal to the 8-digit form the wire serves.) Its alpha byte is rounded rather than truncated, which is load-bearing for parity: the palette's ratios land on exact half-byte boundaries often enough that truncation would silently shift real colours away from the backend's.

## See Also

- [Architecture](architecture.md) -- The app family, providers, and the Erudite token layer
- [Data Model](data-model.md#api-contract) -- The theme endpoint and the snapshot's theme block
- [Content and Offline](content-and-offline.md) -- The other per-slug cache in the app
- [Development](development.md#building-a-sibling-app-variant) -- Building this variant from the shared tree
- [Glossary](GLOSSARY.md) -- Template, remote token, ramp, and inertness gate
- [INDEX](INDEX.md) -- Documentation entry point
