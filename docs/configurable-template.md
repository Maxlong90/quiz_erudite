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

The quiz loop closed the largest hole in that list. Before it, a mode tile started `app/quiz`, which finished on `app/results`, which went home with `router.replace('/')` — and on a template build `/` redirects to `/t/splash`, so every finished run bounced the player through the splash screen on the way back. The two ported screens are deliberate copies of the Erudite originals along the line this project already draws: a **screen owns a route**, so each app gets its own (there are six sibling `app/<slug>/quiz.tsx` files besides this one); a **leaf component owns none**, so every app shares one. Nothing under `components/` was duplicated to do it.

The browse path closed the next one. A category tile used to push into `app/category/[slug].tsx` — a shared *Erudite* screen — and from there `app/quiz-mode/[slug].tsx` started the run on `/quiz`, the Erudite quiz loop rather than the template's own. Both are now copied into `app/t/`, so the whole chain (home → category → mode picker → quiz → results) stays inside the subtree. The copies take their tile artwork from `hooks/t/use-tile-gradients.ts` instead of `constants/category-visuals.ts`; the ramps are pinned equal to the Erudite gradients, so the port is zero-pixel and a tile cannot change colour mid-navigation.

**One** destination still leaves the subtree, and it is tracked by name in `__tests__/app/t-routes.test.ts`: a premium-locked tile routes to `app/paywall` — now from *two* screens, the home and the mode picker, so both must be re-pointed in the commit that ports it. That screen reads the palette through the same `useThemeColors` hook, so it *does* pick up the operator's colours, but it still carries hardcoded literals in places, so its theming is partial. That test asserts the pending destination is BOTH tolerated AND still reachable from `app/t`, so the day it is ported the entry goes red asking to be deleted rather than lingering as a permanent exemption. Its `until` field is a condition rather than a subtask letter, because the letter is what rotted last time.

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

## One Colour Funnel: `useTemplateTheme`

Screens under `app/t/` do not call `useThemeColors()`. They call `hooks/t/use-template-theme.ts`, and a test asserts that no file under `app/t/` imports the palette hook directly — so *where the template gets its colours* is a one-file fact rather than a grep.

The hook returns a **superset**: all thirty `EruditePalette` tokens unchanged, plus the few derived roles the ported screens need and the bundled palette has no name for. It never rewrites a token, so an operator preset still lands on screen exactly as the backend authored it. A `TemplateTheme` is structurally an `EruditePalette`, so a screen's existing `makeStyles(c: EruditePalette)` keeps working untouched until that screen actually needs a derived role.

Wrapping rather than widening `constants/theme.ts` keeps the blast radius at `app/t/`: that file and `useThemeColors` serve the live Erudite build and five sibling apps, and a token added there to satisfy one template screen would land in every shipped app. When the wire contract widens, these derived roles become real operator-settable tokens and the hook shrinks — the call sites do not move.

**A derived role earns a name here only if two or more screens use it.** The tier scale below qualifies; a tint used by exactly one screen stays an inline `withAlpha(...)` in that screen's own `makeStyles`. Without that rule the hook becomes the dumping ground the literals scan exists to prevent.

The one **intentional pixel change** is the middle tier. The results and stats screens share a hardcoded traffic-light scale — green, amber, red. The outer two map onto `success` and `danger` cleanly; the amber has no equivalent anywhere in the palette. `gold` is illegible against the light appearance's background, and the results screen paints this colour on a large score number and a ring drawn directly on that background rather than inside a card. `lib/theme/color.ts` deliberately ships no lighten/darken operation, since derive rules live in the backend registry and a second, divergent derivation engine on the client is what that split forbids. Borrowing a hue from the tile spectrum would put artwork in a text role. So the middle band is `accent`: legible on both appearances by construction, and one of the operator-settable tokens, so the scale repaints with the preset — which is the point. The scale degrades from traffic-light to high/brand/low, still three legible steps, and a later `warning` token restores the amber in one line.

That change is now on screen rather than latent: `app/t/results.tsx` paints the score ring, the score number and the percentage from `tierHigh`/`tierMid`/`tierLow`, so a preset edit repaints all three. `__tests__/app/t-results.test.tsx` renders each band under an overridden accent and asserts the middle one moves with it — being literal-free was never the goal, repainting was, and a port that swapped three hexes for three tokens without checking the second thing would pass a grep and fail the feature. The same test pins that only the middle band moves: `success` and `danger` are not operator-settable yet, so the outer two stay bundled until the wire contract widens.

Reference identity carries over from `resolvePalette` and matters for the same reason. The widening is a pure function behind a **module-level `WeakMap` keyed on the palette object**, not a `useMemo` inside the hook: a per-component memo cell would hand two components rendering under one palette two different objects, and their stylesheet memos would stop agreeing. The map makes the identity global. It is weak rather than strong because palettes are per-appearance and per-fetch objects, and a superseded preset has to be collectable.

## Tile Artwork: a Bundled Spectrum

Category and mode tiles are the one part of the template's colour that is *not* a palette token. `constants/t/tile-palette.ts` holds a named 15-hue brand spectrum, the 10 two-stop ramps built from it, and the mode and category assignments that pick a ramp. Screens ask for a ramp by key through `hooks/t/use-tile-gradients.ts` and never see a hex. It is the only module in the `app/t` surface allowed to contain colour literals, because it is the seam a later stage replaces — `resolveTileGradients` already takes a spectrum as an argument and is called once, at module load, with the bundled one.

Every value is lifted byte for byte from the shipped Erudite tiles, and a test pins each ramp against the live `CATEGORY_VISUALS` map. That matters because a template category tile pushes into an Erudite screen still reading that map, so a tile that changed colour mid-navigation would read as a rendering bug.

The spectrum exists rather than a flat list of 17 gradients because the 17 tiles are really 10 pairs drawn from 15 hues, with 7 exact duplicates that are design statements rather than coincidences. It is also the cheap shape to remote later: 15 flat colour tokens and no new wire machinery, where a gradient map would need a two-stop gradient type on both sides.

The spectrum is **deliberately not derived from `accent`**. Tile labels use `onAccent`, which is white in both appearances and is not one of the ten operator-settable tokens. The shipped worst-case hue already sits at roughly 1.44:1 against it; deriving every tile from one seed would put all 17 in that band at once for a pale accent, and fixing it would mean widening the wire. Derivation also collapses seven category identities into shades of one hue, in a grid that uses hue as its primary index. A contrast ratchet in the ramp test stops anyone quietly adding a paler hue.

Mode assignments are exhaustive by construction — a mode without a ramp is a compile error rather than a silent fallback to grey. Category assignments are the opposite, because category slugs are backend data and an unknown one is an ordinary runtime case that resolves to the neutral fallback ramp. That lookup map is built on a **null prototype** on purpose: the key is untrusted operator data, and on a plain object a category slugged `constructor` or `toString` would inherit a function instead of missing. The fallback would never fire, an undefined gradient would reach a native `LinearGradient`, and Android would throw rather than render the neutral tile.

One naming note, so it is not "fixed" later: the hue names (`sun`, `ember`, `orchid`) are a conscious exception to the rule that tokens are named by role rather than by colour. A brand spectrum has no role beyond being itself.

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
  "onboarding_types": ["universal"],
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

The template introduces **no new strings**: the three intro slides reuse the existing `onboarding.page1..3` keys, already complete in all four locales. The premium slide borrows `paywall.subtitle` and `paywall.feature.unlimited` rather than `paywall.title`, which reads "Quizzzes Premium" in every locale — a brand name that has no business appearing in a build an operator ships under their own.

## The Token Gallery

`app/t/tokens.tsx` is the instrument for the whole engine. It reports which tier is applied, the held ETag, how long ago the last successful revalidation was, the schema version, `supports_dark`, and which tokens the operator has actually overridden. It offers three actions: refetch unconditionally, clear the cache and refetch, and flip the appearance.

It doubles as the end-to-end proof, because it renders inside the **unmodified** `ScreenBackground` — the app's only consumer of `bgGradient`, which feeds it straight to a native gradient. A themed backdrop there means the remote token flowed through real production code with zero changes to it.

Reaching it by long-pressing the home wordmark, and not gating that on `__DEV__`, is deliberate. The gallery exists to be read on a real device against a real operator preset, which means a preview or release build where `__DEV__` is false. Gating it would delete it exactly where it is needed. It is already build-gated by living under `app/t/`, and it exposes nothing but colours and a refetch button.

A token counts as "overridden" when it differs from the bundled value in **either** appearance, so the marker answers "did the operator touch this token" and stays put when you flip the light/dark toggle.

## Verifying on a Device

The engine's central promises are all about what a real device does at a real moment: the first frame carries no flash, an operator's edit reaches an installed app with no rebuild, and a restart without a network keeps the colours. The test suite cannot prove any of them, because it has no device. The backend cannot prove them either — it only proves that the endpoint answers and that a preset edit moves the ETag. The app has to run on a screen.

That is harder for this build than for a sibling, and the difficulty is what its `app.config.js` branch exists to remove:

- **Metro serves one slug.** A debug binary pulls its JS from the dev server at launch. The shared dev host runs one Metro for another build, so a debug APK of the template would show that build's bundle, and there is no scheme on the installed app to deep-link into a second server. Taking the operator's session down to make room is not an option.
- **So the artifact is a release APK with the bundle embedded.** No dev server is involved, `EXPO_PUBLIC_APP_SLUG=test-quiz` is compiled in, and the app fetches its theme from the production backend exactly as an installed app would. [Development](development.md#building-a-variant-as-a-release-apk) has the build steps.
- **And it must install beside the existing build, not over it.** Android replaces an app whose package matches, data and all. This is the one config branch whose `package` and `bundleIdentifier` are literals rather than fallbacks to the Erudite identity, so an unset env var cannot turn a verification build into a silent overwrite of the app it was meant to sit next to. Its own `scheme` (`testquiz`) keeps `quizerudit://` links unambiguous while both are installed.

Five observations are worth making once the app is on the device, one per design property:

| What you look for | What it proves |
|-------------------|----------------|
| Opens on the bundled dark navy, no white flash, no foreign colour | The bundled tier really does paint the first frame, and the scaffold colour matches it |
| An admin edit to the app's preset appears after a restart, with no rebuild | The conditional fetch sees the new ETag and the overlay applies |
| Colours survive a restart with the device offline | The cache tier carries the last good theme |
| The neighbouring build is untouched and unchanged | The inertness gate holds, and the packages really are separate |
| The splash and onboarding artwork stays legible after flipping the appearance, and the gallery's `asset_pack` row names the pack that was staged | The pack's plate treatment survives both themes, and the build really did bundle the staged bytes |
| A mode tile runs to the results screen and **Home** returns to the template home — never the Erudite wordmark, and with no splash animation on the way | The quiz loop is closed inside `/t`. This is the one observation no test can make: a missed `router.replace('/')` does not crash or dead-end, it silently redirects through `/t/splash`, which only reads as wrong when you watch it |
| The results score ring, number and percentage carry the preset's accent on a mid-band score | The derived tier scale is reaching a native style prop, not just a token name |

Verification writes into production data, so it carries an obligation: the preset override used to prove tier three must be reverted afterwards, and the endpoint's ETag returning to its previous value is the check that it was. Every shipped app's preset stores `NULL` tokens, and leaving a stray override behind would be indistinguishable from an operator's real edit.

The colour half is no longer open. A release APK was produced on this host and installed as `com.turbosuslik.testquiz` beside `com.quizzzes.erudite`, both packages survive on the emulator, and launching it opens the template's own home under a remote green palette that appears nowhere in the bundled navy — the overlay is reaching a real screen, from a real backend, with no dev server involved. Read the install with `adb shell pm list packages`; a build cut off by the silence watchdog leaves no APK at all, so the presence of `android/app/build/outputs/apk/release/app-release.apk` is itself the signal that the Gradle run finished.

The artwork half is still open, and the reason is a date rather than a doubt. That APK predates the asset-pack work, so its bundle carries no reference to `assets/t/` — grepping `assets/index.android.bundle` inside the APK for that prefix is the cheap way to tell whether a given binary is old enough to be irrelevant to a question about artwork. What has been shown is one step short of the device: `npm run asset-pack neon` changes all five files behind the unchanged `require()` paths, the byte-identity test goes red naming `base`, and restoring returns every checksum. Nothing here rests on having watched the neon artwork render.

**The ported quiz loop is unobserved for the same reason.** It has not been walked on a device: the installed `com.turbosuslik.testquiz` is a release APK whose bundle predates these screens, and the dev-server route is closed by the constraint at the top of this section — the shared host's Metro runs one slug, and it is not `test-quiz`. Confirm which one before assuming otherwise: `readlink /proc/<pid>/cwd` and the process's `EXPO_PUBLIC_APP_SLUG` say what a given dev server is actually serving, and an absent variable means the default Erudite slug. Seeing the loop therefore needs a fresh release APK (`suslik-bg "cd android && ./gradlew assembleRelease"` — the build goes silent long enough to be killed in the foreground, and a killed run leaves no APK at all). Until then the loop rests on the suites: the two ported screens render, navigate only to `/t` routes, and repaint from a preset, and the source scan in `__tests__/app/t-routes.test.ts` covers the branches a render cannot reach.

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
- A **source scan** holds the no-colour-literal line across the template's own directories — `app/t/`, `components/t/`, `constants/t/`, `hooks/t/` — plus everything those files *transitively import*. It is a source scan and not a render assertion on purpose: a hex on a branch no test exercises is still a hex. The scope is **derived by walking the imports** rather than declared in a list, because the list it replaced had already rotted: a modal the template home opens rendered a picker nobody had added to the list, so that file was silently unguarded for as long as it existed. A walk cannot fail that way. Each failure prints the import chain that pulled the file into scope, because adding an import to a template screen now widens the rule on its own, and "why is this test looking at my file" has to be answerable from the failure alone.
- An **ESLint rule** flags hex and `rgb()`/`hsl()` literals across those same four directories in the editor. The scan stays the authority: it catches forms an AST selector cannot see, and only the scan follows imports.
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
