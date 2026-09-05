# Glossary

This tree builds six apps that share infrastructure but not vocabulary. Several words mean different things depending on which app you are reading about — "level" and "run" most of all. This glossary fixes the meaning of each term and points at the document that explains it properly.

## Build and App Family

**App slug** — The build-time identifier in `EXPO_PUBLIC_APP_SLUG`, exposed in code as `APP_SLUG`. It does double duty: it is the path segment in every backend endpoint (`/apps/{slug}/…`) *and* the switch that decides which of the six apps the build is. See [Architecture](architecture.md#key-design-decisions).

**Sibling app** — Any of the five non-Erudite experiences built from this tree: Logo Quiz, Flags Quiz, Coat of Arms, Sport Quiz, Italy Quiz. Each has its own screens, artwork, and economy, and redirects away from the Erudite hub at launch.

**Erudite** — The default app and the one most of these docs describe by default: the seven-subject general-knowledge quiz with lives, hints, and premium modes.

**Variant** — Overloaded, and worth disambiguating. A *build variant* is one of the six apps. An *image variant* is `clean` or `original` — the two versions of a single question picture. Context always disambiguates, but never use the bare word in new prose.

## Content

**Snapshot** — The offline mirror of everything one app needs for one language: the app descriptor, every category with its subcategories, and the full question pool. Fetched once, cached for 24 hours, and served from disk thereafter. See [Content and Offline](content-and-offline.md#the-content-snapshot).

**Image map** — A client-only field added to a cached snapshot, mapping each remote image URL to the local file it was downloaded to. `resolveLocalImage` reads it and falls back to the remote URL when an entry is missing.

**Image-answer question** — The inverted question shape: the prompt is a country name and each of the four options is a picture. Served from its own endpoint rather than inside the snapshot, because its option images need their own download pass. Used by the "By continent" modes in [Flags Quiz](flags-quiz.md#the-two-game-modes) and [Coat of Arms](coat-of-arms-quiz.md#the-two-game-modes).

**Clean image / original image** — The two variants of one question picture. The *clean* one has the answer painted out of the artwork and is what the player sees while answering; the *original* is the untouched artwork and is revealed as a reward after a correct answer. Only Coat of Arms uses this today. See [Coat of Arms](coat-of-arms-quiz.md#the-spoiler-problem-and-the-two-image-variants).

**Seen set** — An on-device record of which question ids a player has already been served, bucketed per mode or category, used to keep questions from repeating across sessions. Erudite only. See [Content and Offline](content-and-offline.md#cross-session-no-repeats).

## Gameplay

**Level** — A numbered chunk of the catalogue, but sized and derived differently per app. In [Logo Quiz](logo-quiz.md#levels-and-the-premium-split) it comes from each question's persisted `order` field. In [Sport Quiz](sport-quiz.md#levels-and-ordering) it is a chunk of 20 (Classic) or 15 (Legends) computed from a deterministic id hash. Flags Quiz and Coat of Arms have no levels at all.

**Run** — A single pass through a shuffled question order in Flags Quiz and Coat of Arms, persisted as `{ order, pos, wrong }` so an interrupted session resumes exactly where it stopped. A *retry run* replays only the previously missed indices and is deliberately never persisted. See [Flags Quiz](flags-quiz.md#resuming-a-run).

**Reveal** — The animated transition after an answer. In Flags Quiz and Coat of Arms it means the correct option gliding to centre while the wrong ones unmount; in Coat of Arms it additionally means the original picture dissolving in over the clean one. In Erudite it just means all options turning green or red.

**Plate** — One tile of the 4×5 grid covering an athlete's photo in Sport Quiz's Sports Legends mode. The player buys plates one at a time to uncover the picture. See [Sport Quiz](sport-quiz.md#sports-legends-and-the-puzzle-plates).

**Mode** — Overloaded across apps. In Erudite it is one of ten tiles (Random 10, Survival, Hard, …) that changes the quiz engine's behaviour. In the sibling apps it means one of two or three distinct games with their own screens.

## Economy and Monetization

**Lives** — The spend currency for wrong answers in Erudite and Logo Quiz. Flags Quiz, Coat of Arms, and Sport Quiz have none. See [Gamification](gamification.md#lives).

**Coins** — The currency in Logo Quiz and Sport Quiz. In Sport Quiz it is the *only* currency, and the 15-coin floor is the app's single hard gate. See [Sport Quiz](sport-quiz.md#the-coin-economy).

**Premium** — A client-side flag unlocking Erudite's gated modes and Logo Quiz's later levels, backed by the RevenueCat `premium` entitlement wherever store billing is enabled. Flags Quiz, Coat of Arms, and Sport Quiz have no premium tier.

**Entitlement / offering** — RevenueCat terms. An *entitlement* (`premium`) is what a purchase grants; an *offering* (`default`) is the set of packages the paywall can sell. An empty offering means the store catalog is not provisioned for that app.

**Capability gating** — The rule that billing and ads turn on per platform based on whether a key is configured, never on a hardcoded `Platform.OS`. It is why iOS monetization lights up automatically once its keys are supplied. See [iOS Monetization Parity](ios-monetization-parity.md).

**Fail closed** — The deliberate behaviour on a real store device where billing is unavailable: no purchase and no free grant either. Contrast with Expo Go and web, where a local grant keeps the dev flow working.

## Delivery

**OTA / EAS Update** — Over-the-air delivery of a new JS bundle to installed apps, with no store build or review. Only reaches binaries whose runtime version matches and that were built after `expo-updates` was wired in. See [Development](development.md#over-the-air-updates-eas-update).

**Runtime version** — The compatibility key an OTA update is published against, pinned here to the fixed string `1.0.0`. It must match the constant the build backend stamps into every build, or published updates silently reach nothing.

**Prebuild** — Regenerating the native `android/` and `ios/` projects from the Expo config. Required after any native change, and slow enough to need backgrounding. See [Long-Running Operations](long-running-operations.md).

## See Also

- [Architecture](architecture.md) -- System structure and the sibling-app family
- [Data Model](data-model.md) -- The entities these terms name
- [Content and Offline](content-and-offline.md) -- Snapshot, image map, and seen sets
- [INDEX](INDEX.md) -- Documentation entry point
