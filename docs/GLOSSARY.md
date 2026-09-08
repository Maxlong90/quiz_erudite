# Glossary

This tree builds seven apps that share infrastructure but not vocabulary. Several words mean different things depending on which app you are reading about — "level" and "run" most of all. This glossary fixes the meaning of each term and points at the document that explains it properly.

## Build and App Family

**App slug** — The build-time identifier in `EXPO_PUBLIC_APP_SLUG`, exposed in code as `APP_SLUG`. It does double duty: it is the path segment in every backend endpoint (`/apps/{slug}/…`) *and* the switch that decides which of the seven apps the build is. See [Architecture](architecture.md#key-design-decisions).

**Sibling app** — Any of the five non-Erudite experiences built from this tree: Logo Quiz, Flags Quiz, Coat of Arms, Sport Quiz, Italy Quiz. Each has its own screens, artwork, and economy, and redirects away from the Erudite hub at launch. The [configurable template](configurable-template.md) is a seventh build but not a sibling — its artwork is not checked in against its screens but staged from an interchangeable [asset pack](#artwork) at build time.

**Erudite** — The default app and the one most of these docs describe by default: the seven-subject general-knowledge quiz with lives, hints, and premium modes.

**Configurable template** — The build under the `test-quiz` slug and the `app/t/` route folder, whose colours arrive from the backend instead of a checked-in palette. One binary becomes one app per operator preset. It carries its own name ("Test App"), Android package, and URL scheme, so it installs beside another build of this tree rather than over it. See [Configurable Template](configurable-template.md).

**Variant** — Overloaded, and worth disambiguating. A *build variant* is one of the seven apps. An *image variant* is `clean` or `original` — the two versions of a single question picture. Context always disambiguates, but never use the bare word in new prose.

**Remote token** — One of the ten semantic colours the backend serves to a configurable-template build (`bgGradient`, `accent`, the three `optIdle*`, and the rest). The other twenty palette tokens stay compiled into the binary, which is why a theme is always an overlay and never a whole palette. See [Configurable Template](configurable-template.md#the-wire-contract).

**Inertness gate** — The checked-in list of slugs (`T_TEMPLATE_SLUGS`) that decides whether the theme engine runs at all. A build absent from it performs no theme fetch, no cache read, and no overlay, so no admin edit can re-skin a shipped app. See [Configurable Template](configurable-template.md#selecting-the-build).

**Ramp / spectrum** — Tile artwork terms in the configurable template. The *spectrum* is the 15 named brand hues; a *ramp* is a named two-stop gradient built from two of them, and it is what a category or mode tile asks for. Neither is a palette token. See [Configurable Template](configurable-template.md#tile-artwork-a-bundled-spectrum).

## Artwork

**Asset pack** — One complete set of the configurable template's bundled pictures, checked in under `asset-packs/<pack>.assets/`. The operator picks a pack, and the build service copies it into the staging directory before Metro runs; the app never sees more than one. Only the template has packs — the five sibling apps keep their artwork checked in against their screens. See [Configurable Template](configurable-template.md#artwork-asset-packs-staged-at-build-time).

**Slot** — One named picture position in the template, keyed by its relative path (`onboarding/step1.png`, `paywall/hero.png`). The slot list is a contract: every pack must supply exactly the same five, and `constants/t/asset-slots.ts` is the only place their paths are written down. Do not confuse a slot with a token — a token is a colour resolved at runtime, a slot is a file resolved at bundle time.

**Staging directory** — `assets/t/`, the fixed destination the pack is copied into and the only path the template's `require()` calls point at. Deliberately not the reference project's `assets/`, which holds the shipped Erudite artwork a pack would otherwise overwrite. A pack's `target` field names it, and both the script and the backend check that name against a one-entry allowlist.

**Pack manifest** — The `manifest.json` inside each pack. It is the build-time contract with the backend: which packs exist, which onboarding shapes they suit, and the human label and declared pixel size of every slot. The app resolves nothing through it; the copy that lands in `assets/t/` serves only as a record of which pack a binary was built from.

## Content

**Snapshot** — The offline mirror of everything one app needs for one language: the app descriptor, every category with its subcategories, and the full question pool. Fetched once, cached for 24 hours, and served from disk thereafter. See [Content and Offline](content-and-offline.md#the-content-snapshot).

**Image map** — A client-only field added to a cached snapshot, mapping each remote image URL to the local file it was downloaded to. `resolveLocalImage` reads it and falls back to the remote URL when an entry is missing.

**Image-answer question** — The inverted question shape: the prompt is a country name and each of the four options is a picture. Served from its own endpoint rather than inside the snapshot, because its option images need their own download pass. Used by the "By continent" modes in [Flags Quiz](flags-quiz.md#the-two-game-modes) and [Coat of Arms](coat-of-arms-quiz.md#the-two-game-modes).

**Clean image / original image** — The two variants of one question picture. The *clean* one has the answer painted out of the artwork and is what the player sees while answering; the *original* is the untouched artwork and is revealed as a reward after a correct answer. Only Coat of Arms uses this today. See [Coat of Arms](coat-of-arms-quiz.md#the-spoiler-problem-and-the-two-image-variants).

**Seen set** — An on-device record of which question ids a player has already been served, bucketed per mode or category, used to keep questions from repeating across sessions. Erudite only. See [Content and Offline](content-and-offline.md#cross-session-no-repeats).

## Gameplay

**Level** — A numbered chunk of the catalogue, but sized and derived differently per app. In [Logo Quiz](logo-quiz.md#levels-and-the-premium-split) it comes from each question's persisted `order` field. In [Sport Quiz](sport-quiz.md#levels-and-ordering) it is a chunk of 20 (Classic) or 15 (Legends) computed from a deterministic id hash. Flags Quiz, Coat of Arms, and Italy Quiz have no levels at all — they present a run instead.

**Run** — A single pass through a shuffled question order in Flags Quiz, Coat of Arms, and Italy Quiz, persisted so an interrupted session resumes exactly where it stopped. Flags Quiz and Coat of Arms store it as `{ order, pos, wrong }`; [Italy Quiz](italy-quiz.md#resuming-a-run) stores question *ids* instead of indices, so a growing question pool cannot repoint a saved run. A *retry run* replays only the previously missed questions and is deliberately never persisted. See [Flags Quiz](flags-quiz.md#resuming-a-run).

**Reveal** — The animated transition after an answer. In Flags Quiz and Coat of Arms it means the correct option gliding to centre while the wrong ones unmount; in Coat of Arms it additionally means the original picture dissolving in over the clean one. In Erudite it just means all options turning green or red.

**Photo mix** — The share of an [Italy Quiz](italy-quiz.md#a-run-of-fifty-composed-to-a-photo-ratio) run that must be picture questions, pinned per subcategory. It is applied when the run is drawn rather than by trimming the pool, so every question stays eligible for a later run.

**Plate** — One tile of the 4×5 grid covering an athlete's photo in Sport Quiz's Sports Legends mode. The player buys plates one at a time to uncover the picture. See [Sport Quiz](sport-quiz.md#sports-legends-and-the-puzzle-plates).

**Mode** — Overloaded across apps. In Erudite it is one of ten tiles (Random 10, Survival, Hard, …) that changes the quiz engine's behaviour. In the sibling apps it means one of two or three distinct games with their own screens.

## Economy and Monetization

**Lives** — The spend currency for wrong answers in Erudite and Logo Quiz. Flags Quiz, Coat of Arms, Sport Quiz, and Italy Quiz have none. See [Gamification](gamification.md#lives).

**Coins** — The currency in Logo Quiz and Sport Quiz. In Sport Quiz it is the *only* currency, and the 15-coin floor is the app's single hard gate. See [Sport Quiz](sport-quiz.md#the-coin-economy).

**Premium** — A client-side flag unlocking Erudite's gated modes and Logo Quiz's later levels, backed by the RevenueCat `premium` entitlement wherever store billing is enabled. Flags Quiz, Coat of Arms, Sport Quiz, and Italy Quiz have no premium tier.

**Entitlement / offering** — RevenueCat terms. An *entitlement* (`premium`) is what a purchase grants; an *offering* (`default`) is the set of packages the paywall can sell. An empty offering means the store catalog is not provisioned for that app.

**Capability gating** — The rule that billing and ads turn on per platform based on whether a key is configured, never on a hardcoded `Platform.OS`. It is why iOS monetization lights up automatically once its keys are supplied. See [iOS Monetization Parity](ios-monetization-parity.md).

**Fail closed** — The deliberate behaviour on a real store device where billing is unavailable: no purchase and no free grant either. Contrast with Expo Go and web, where a local grant keeps the dev flow working.

**Consumable** — A one-off product credited straight to a balance and then spent: Erudite's life and hint bundles, Sport Quiz's coin packs. It grants no entitlement, which is why Sport Quiz needs no offering and has no paywall. Every app buys its consumables through one shared seam, so the fail-closed rule cannot be bypassed. See [Gamification](gamification.md#the-fail-closed-grant-policy).

**Public SDK key** — The RevenueCat key a build ships with (`appl_…` on iOS, `goog_…` on Android). It is safe to commit and is scoped to one RevenueCat project, so an app using another app's key resolves an empty catalog. The `sk_…` *secret* key is a different thing and must never enter this repo.

**Sandbox purchase** — A free test transaction against the App Store, automatic in any TestFlight build. It is the only way to confirm this tree actually charges, since no emulator has billing. See [Verifying an iOS purchase](ios-monetization-parity.md#verifying-an-ios-purchase-testflight-sandbox).

## Delivery

**OTA / EAS Update** — Over-the-air delivery of a new JS bundle to installed apps, with no store build or review. Only reaches binaries whose runtime version matches and that were built after `expo-updates` was wired in. See [Development](development.md#over-the-air-updates-eas-update).

**Runtime version** — The compatibility key an OTA update is published against, pinned here to the fixed string `1.0.0`. It must match the constant the build backend stamps into every build, or published updates silently reach nothing.

**Prebuild** — Regenerating the native `android/` and `ios/` projects from the Expo config. Required after any native change, and slow enough to need backgrounding. See [Long-Running Operations](long-running-operations.md).

## See Also

- [Architecture](architecture.md) -- System structure and the sibling-app family
- [Configurable Template](configurable-template.md) -- Templates, remote tokens, and ramps
- [Data Model](data-model.md) -- The entities these terms name
- [Content and Offline](content-and-offline.md) -- Snapshot, image map, and seen sets
- [INDEX](INDEX.md) -- Documentation entry point
