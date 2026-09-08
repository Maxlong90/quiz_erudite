# Configurable Template

Every sibling app in this tree costs a code fork. A new quiz means a new palette file, a new screen folder, a new build profile, and a store submission for any colour change. The configurable template exists to break that link: its palette is **operator data**, authored in the backend admin and delivered over the wire, so one binary can become one app per preset. This document explains the vertical slice that proves the idea — what the template renders today, how a colour travels from the admin form to a native gradient, and which decisions were made deliberately so later stages do not undo them.

The template is a seventh build of the same tree, selected by the build-time slug `test-quiz` and shown as "Test App". It does not replace the five sibling apps and does not touch them. See [Architecture](architecture.md#key-design-decisions) for the family as a whole.

## What the Slice Covers

The slice is deliberately narrow. It themes **one screen end to end** rather than half-theming the app, because the point was to validate the whole chain — admin form, wire contract, cache, resolver, native style prop — before investing in the rest.

| Route | Screen | Role |
|-------|--------|------|
| `t/splash` | Splash | Brand hold; also the engine's network window |
| `t/index` | Home | Categories and Modes tabs, ported from the Erudite home |
| `t/tokens` | Token gallery | Live diagnostics; reached by long-pressing the wordmark |

Everything downstream is still a shared Erudite screen. A category tile pushes into `app/category/[slug].tsx`, a mode starts `app/quiz`, and a premium-locked tile routes to `app/paywall`. Those screens read the palette through the same `useThemeColors` hook, so they *do* pick up the operator's colours — but they still carry hardcoded literals in places, so their theming is partial. Closing that gap is later work.

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
│ Cache tier     │ ──────→│  overlays 10 remote │ ───────────────→ screens
│ AsyncStorage   │ tokens │  tokens onto the    │   (dark + light)
│ theme.remote.v1│        │  bundled palette    │
└────────────────┘        └─────────────────────┘
┌────────────────┐                  ↑
│ Network tier   │ ─────────────────┘
│ GET /apps/{s}/ │  200 + ETag
│   theme        │
└────────────────┘
```

The result is an **overlay, never a construction**. The backend serves ten of `EruditePalette`'s roughly thirty tokens; the other twenty (`surface`, `text`, `scrim`, `success`, and the rest) always keep their compiled values. That is what makes a partial or hostile payload survivable — there is always a complete palette underneath.

The bundled tier is **derived** from `EruditeColors` rather than copied. A checked-in second literal map would be the third transcription of the same twenty hex values, and any drift would break the inertness argument at its root: the same binary would render differently depending on whether the engine happened to be switched on.

## The Wire Contract

`lib/theme/contract.ts` is the client half of the contract; `app/Support/ColorTokenRegistry.php` in the backend is the other. The two agree on exactly three things — the token **names**, their declaration **order**, and the **schema version**. Everything the backend does with tokens (derive rules, the Nova form, pruning unchanged values) stays behind the endpoint.

That line is load-bearing. Derivation on the client would be a second, divergent engine, and an operator could not preview its output. When a new rule is wanted — hue rotation, contrast correction — it belongs in the backend registry beside the existing alpha and lightness operations.

The ten remote tokens are `bgGradient`, `bgSolid`, `accent`, `accentSoft`, `accentBg`, `accentBgSoft`, `accentBorderSoft`, and the three `optIdle*` option-button tokens. `bgGradient` is a three-stop gradient; the rest are flat colours. Declaration order is part of the ETag contract, since the backend hashes the encoded bytes, and it is also the order the token gallery renders in.

Three parsing rules carry design intent:

- **Strict hex, and not for tidiness.** These strings go straight into React Native style props, where an unparseable colour throws in native code on Android. A theme engine that can hard-crash the app it themes is not fail-open, so `isColorValue` accepts only `#rgb`, `#rgba`, `#rrggbb`, and `#rrggbbaa`.
- **Exactly three gradient stops.** A four-stop array is a schema change, not a rounding error. Silently truncating it would render a palette the operator never previewed.
- **All or nothing.** `parseRemoteTheme` rejects the whole envelope on any bad token instead of falling back per token. Colours are a set, not a bag: `optIdleBg` and `optIdleText` are a contrast pair, and half-applying an operator's palette over half the bundled one can produce white-on-white text. That is strictly worse than not applying it at all.

The parser also iterates the known token list rather than the payload's own keys, so an unknown eleventh token from a newer backend is dropped before it can reach a style prop. A payload whose `schema_version` is higher than the client understands is reported as `unsupported-schema` without judging its shape — by definition the client cannot know what a future body looks like.

## Light and Dark

Both appearances ship. The operator authors the **light** set; the backend derives **dark** from it and stores only the tokens actually overridden. Resolution on read is therefore "derive from light, then merge the stored dark overrides", which keeps the admin form short while leaving every token individually escapable.

A handful of tokens genuinely diverge between appearances and are authored rather than derived — the three `optIdle*` values and `accentSoft` among them. The rest follow mechanically from the light set.

The client never has to reason about any of this. When an operator has not authored a dark variant the backend **mirrors** light into dark rather than omitting it, so `theme[appearance]` is always indexable and there is no missing-map case. The `supports_dark` flag rides along for the gallery to display.

Which appearance renders is the player's own choice, read from `useThemePref` — the same app-selected preference the Erudite build uses, deliberately independent of the device colour scheme. See [Architecture](architecture.md#theming-and-appearance).

## The Cache Record

`lib/theme/theme-cache.ts` stores the last successfully fetched theme under a `theme.remote.v1` key, namespaced per app slug in the same style as the content cache: the build's own slug keeps the bare key, any secondary slug gets a suffix. The prefix deliberately stays clear of the key that holds the dark/light preference, where a collision would corrupt the player's appearance choice.

The record carries its own format number, separate from the payload's schema version, so invalidating every device's stored blob implies nothing about the wire contract.

Every read is fail-open. A corrupt, foreign, or future record resolves to "no cache", which simply drops the caller back to the bundled tier. A blob that is unreadable to this build is also **deleted** on the spot, so the same garbage is not re-parsed on every launch. The stored payload is re-validated through the same parser the network path uses, because a file edited on disk must not reach a style prop either. Writing is best-effort: the theme is already applied in memory, and a failed write only costs one refetch next launch.

## The Conditional Request

`GET /apps/{slug}/theme` takes no query parameters — colours are locale-independent — and answers with a strong ETag hashed over the emitted bytes. The steady state is therefore an empty-bodied `304`, not a payload.

Three details in `lib/theme/theme-api.ts` exist because of things that actually break:

- **The ETag is replayed verbatim, quotes included.** Stripping or re-adding them yields a validator the backend never matches, which turns every launch into a full download.
- **Axios treats `304` as an error** because it is outside the 2xx range. Without a widened `validateStatus` the entire steady-state path lands in the catch block and the conditional request buys nothing.
- **"Changed" is decided by the validator, not the status code.** React Native's HTTP layer caches on the app's behalf, so the platform may revalidate on its own and hand back a `200` carrying the previously cached body. Comparing the received ETag against the held one catches that.

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
         │ category tile / mode tile
         ↓
   shared Erudite screens: /category/{slug} → /quiz → /results
```

The splash holds for a brand floor and, within a hard cap, waits for the engine to settle both its cache read and its network call. That buys exactly one thing: on a first-ever launch the very first real screen already carries the operator's colours, instead of flashing the bundled palette and flipping a moment later. On every later launch the wait is free, because a `304` resolves well inside the floor.

The cap sits above the fetch timeout on purpose, so a black-hole network exits through the fetch's own timeout and the cap stays a backstop nothing can cancel. Fail-open is absolute here: the "settled" gate flips on **any** settlement, including a timeout or an outright failure.

Two independent timers drive this rather than a promise race, because the gates being waited on live in React state, which a promise chain captured in a mount-once effect could never observe.

## Repaint Cost and Reference Identity

`resolvePalette` returns the **base object itself** when the overlay changes nothing, rather than an equal copy. This is not a micro-optimization. Dozens of call sites across the app follow the `useMemo(() => makeStyles(colors), [colors])` recipe, so a new-but-equal palette object would invalidate every one of those memos and rebuild every stylesheet — a diffuse flicker and performance regression no visual diff would catch.

It is also what makes it safe to switch the engine on for an existing app later: an unedited preset resolves to the identical `EruditeColors` object, and nothing re-renders.

## Tile Artwork: a Bundled Spectrum

Category and mode tiles are the one part of the template's colour that is *not* a palette token. `constants/t/tile-palette.ts` holds a named 15-hue brand spectrum, the 10 two-stop ramps built from it, and the mode and category assignments that pick a ramp. Screens ask for a ramp by key through `hooks/t/use-tile-gradients.ts` and never see a hex. It is the only module in the `app/t` surface allowed to contain colour literals, because it is the seam a later stage replaces — `resolveTileGradients` already takes a spectrum as an argument and is called once, at module load, with the bundled one.

Every value is lifted byte for byte from the shipped Erudite tiles, and a test pins each ramp against the live `CATEGORY_VISUALS` map. That matters because a template category tile pushes into an Erudite screen still reading that map, so a tile that changed colour mid-navigation would read as a rendering bug.

The spectrum exists rather than a flat list of 17 gradients because the 17 tiles are really 10 pairs drawn from 15 hues, with 7 exact duplicates that are design statements rather than coincidences. It is also the cheap shape to remote later: 15 flat colour tokens and no new wire machinery, where a gradient map would need a two-stop gradient type on both sides.

The spectrum is **deliberately not derived from `accent`**. Tile labels use `onAccent`, which is white in both appearances and is not one of the ten operator-settable tokens. The shipped worst-case hue already sits at roughly 1.44:1 against it; deriving every tile from one seed would put all 17 in that band at once for a pale accent, and fixing it would mean widening the wire. Derivation also collapses seven category identities into shades of one hue, in a grid that uses hue as its primary index. A contrast ratchet in the ramp test stops anyone quietly adding a paler hue.

Mode assignments are exhaustive by construction — a mode without a ramp is a compile error rather than a silent fallback to grey. Category assignments are the opposite, because category slugs are backend data and an unknown one is an ordinary runtime case that resolves to the neutral fallback ramp. That lookup map is built on a **null prototype** on purpose: the key is untrusted operator data, and on a plain object a category slugged `constructor` or `toString` would inherit a function instead of missing. The fallback would never fire, an undefined gradient would reach a native `LinearGradient`, and Android would throw rather than render the neutral tile.

One naming note, so it is not "fixed" later: the hue names (`sun`, `ember`, `orchid`) are a conscious exception to the rule that tokens are named by role rather than by colour. A brand spectrum has no role beyond being itself.

## The Token Gallery

`app/t/tokens.tsx` is the instrument for the whole engine. It reports which tier is applied, the held ETag, how long ago the last successful revalidation was, the schema version, `supports_dark`, and which tokens the operator has actually overridden. It offers three actions: refetch unconditionally, clear the cache and refetch, and flip the appearance.

It doubles as the end-to-end proof, because it renders inside the **unmodified** `ScreenBackground` — the app's only consumer of `bgGradient`, which feeds it straight to a native gradient. A themed backdrop there means the remote token flowed through real production code with zero changes to it.

Reaching it by long-pressing the home wordmark, and not gating that on `__DEV__`, is deliberate. The gallery exists to be read on a real device against a real operator preset, which means a preview or release build where `__DEV__` is false. Gating it would delete it exactly where it is needed. It is already build-gated by living under `app/t/`, and it exposes nothing but colours and a refetch button.

A token counts as "overridden" when it differs from the bundled value in **either** appearance, so the marker answers "did the operator touch this token" and stays put when you flip the light/dark toggle.

## Failure Modes

Fail-open is the engine's central property. Every failure leaves the app on the best palette it already had, and nothing in the chain throws or strands the splash.

| What goes wrong | What the player sees |
|-----------------|----------------------|
| Offline, DNS failure, timeout, 5xx | The cached theme, or the bundled palette on a first launch |
| Malformed body or a bad token | The last known-good theme; nothing is half-applied |
| Schema version newer than the build | Bundled or cached colours; neither the payload nor its ETag is stored, so the next app update applies the theme on its first launch |
| Corrupt or foreign cache record | Bundled colours, and the bad key is deleted |
| Storage write fails | Correct colours this session, one extra fetch next launch |
| Slow network on a first launch | The splash releases at its hard cap and the home screen paints bundled |

The one case that is not silent is an unsupported schema version, which the gallery surfaces as a warning.

## Keeping the Two Repositories in Step

The client and the backend hold the same token list in two files, in two repositories, and the app crashes natively on a colour it cannot parse. Several guards keep that honest:

- A **parity test** asserts the bundled token values against literals copied from the backend registry, so drift between the repos fails the suite rather than shipping.
- A **compile-time link** ties the remote token list to `EruditePalette`. Renaming or dropping a token in `constants/theme.ts` stops the build instead of silently resolving to `undefined` at runtime.
- A **source scan** holds the no-colour-literal line across `app/t/**` plus the shared components those screens render. It is a source scan and not a render assertion on purpose: a hex on a branch no test exercises is still a hex.
- An **ESLint rule** flags hex and `rgb()`/`hsl()` literals under `app/t` in the editor. The scan stays the authority, because it catches forms an AST selector cannot see.
- A **slug test** fails the build if a shipped app slug appears in the inertness gate.

The template's home screen is a deliberate **copy** of the Erudite home rather than a shared component. The Erudite home is a live store build's screen with no test coverage, and extracting its tiles and stylesheet would be a large untested refactor of shipped code — bought to de-duplicate a screen that is *supposed* to diverge, since this template's mode list, ramps, and category set all become operator data later. The copy's blast radius on the Erudite build is zero files.

The copy differs from the original in three intentional ways. It is a plain screen rather than the entry gate, because reproducing the intro-gate logic would bounce the player into the *Erudite* splash and onboarding — the exact leak the template registry exists to prevent. Its mode definitions have no gradient field at all, only a mode id. And the wordmark glow is derived from the accent with an alpha helper rather than frozen, so an operator setting a red accent gets a red halo.

That helper, `lib/theme/color.ts`, mirrors the backend's colour maths and copies its most important property: every function is **total**. An input it does not understand — a CSS `rgba()` literal, a blank, a named colour — is handed back unchanged rather than nulled, because the bundled palette really does mix forms and every value ends up in a style prop. Its alpha byte is rounded rather than truncated, which is load-bearing for parity: the palette's ratios land on exact half-byte boundaries often enough that truncation would silently shift real colours away from the backend's.

## See Also

- [Architecture](architecture.md) -- The app family, providers, and the Erudite token layer
- [Data Model](data-model.md#api-contract) -- The theme endpoint and the snapshot's theme block
- [Content and Offline](content-and-offline.md) -- The other per-slug cache in the app
- [Development](development.md#building-a-sibling-app-variant) -- Building this variant from the shared tree
- [Glossary](GLOSSARY.md) -- Template, remote token, ramp, and inertness gate
- [INDEX](INDEX.md) -- Documentation entry point
