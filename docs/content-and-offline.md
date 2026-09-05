# Content and Offline

The app is offline-first: rather than fetch questions per session, it downloads the entire content set for one language as a single snapshot, caches it on the device with its images, and serves gameplay from that cache. This makes play resilient to a poor or absent connection and keeps quiz starts instant. A separate seen-set mechanism, also on-device, ensures players rarely see the same question twice across sessions.

## The Content Snapshot

The snapshot is one bundle holding everything a language needs: the app descriptor, every category with its nested subcategories, and the full question pool. It is fetched from `GET /apps/{slug}/snapshot?locale=` and managed by `lib/content-cache.ts`, with the React context in `hooks/use-content-cache.ts` exposing the current snapshot, a sync status (idle, syncing, ready, error), and a 0..1 progress value.

`syncContent` drives the download. It runs when the active locale changes and can be forced from settings. The flow is:

1. If a cached snapshot exists, matches the requested locale, and is under 24 hours old, return it without touching the network.
2. Otherwise fetch the snapshot JSON (progress 0 → 20%).
3. Collect every image URL — question images plus category and subcategory icons — deduplicate them, and download with up to six concurrent workers (progress 20 → 100%).
4. Persist the snapshot (with its image map and sync timestamp) to AsyncStorage and store the version number separately.

```
locale change / forced resync
            │
            ↓
   cached & fresh (<24h)? ──yes──→ return cached snapshot
            │ no
            ↓
   fetch snapshot JSON ──→ collect image URLs ──→ download (6 workers)
            │                                            │
            └──────────────→ persist snapshot + images ←─┘
```

## Image Caching

On native, downloaded images are written to a `snapshot-images/` directory under the app's document directory, and the snapshot's `imageMap` records each remote URL against its local file URI. During gameplay, `resolveLocalImage` swaps a remote URL for its cached local path when one exists, so the UI renders from disk. A failed download is simply skipped — the map omits that URL and the UI falls back to fetching it remotely, so a single bad download never blocks a quiz.

Each cached file's name is derived from a hash of the *whole* remote URL, not just its last path segment. This matters because the Logo Quiz backend serves every question image from a fixed `/questions/{id}/image` path, so every URL ends in the same `image` segment. Naming files by that segment gave every question one shared filename, and the first logo downloaded was reused for every question — the "wrong pictures" bug. `imageFilename` folds the full URL into a short stable hash (keeping a readable tail) so each question gets a unique file. When this scheme changed, the snapshot storage keys were bumped from `v1` to `v2` (`snapshotKey`, `versionKey`), which drops any poisoned `v1` cache whose `imageMap` still points every URL at one file and forces a one-time resync that rebuilds the map with unique files.

The web platform has no writable filesystem, so it skips the local image cache entirely: downloads are reported complete immediately and `resolveLocalImage` returns the remote URL for the browser to cache itself.

## Two Image Variants per Question

A question can carry a second picture. [Coat of Arms](coat-of-arms-quiz.md) shows a *cleaned* coat during play — the country's name painted out of the artwork — and reveals the untouched *original* as a reward after a correct answer. The backend models this as two variants of the same image and exposes the second one on the snapshot question as `image_url_original`.

Two properties of that field shape how the cache treats it. It is **absent, not null**, on every question without an original and in every other app's snapshot, so the cache must tolerate `undefined` rather than assume the key exists. And its URL differs from the playable one (it carries a `?variant=original` parameter plus its own checksum-derived cache-buster), so it hashes to its own `imageMap` entry and its own file on disk instead of colliding with the clean variant.

`syncContent` therefore collects *both* URLs from every question when it builds the download list, filtering out the absent ones. That single change is what makes the reward image work offline; it is a no-op for every app whose questions have no original. Because the URL carries a checksum, replacing a cleaned coat on the backend changes the URL and invalidates the cached file on its own — no version bump or forced resync is needed to push corrected artwork to devices.

## Per-App Cache Namespacing

One build tree ships several apps — the main quiz, Logo Quiz, Flags Quiz, Coat of Arms, and Sport Quiz — selected by the build's `APP_SLUG` (see [Architecture](architecture.md#key-design-decisions)). They all draw content through this same cache, so its storage is namespaced per app slug to stop one app's snapshot or images from clobbering another's. `loadCachedSnapshot`, `getCachedVersion`, `clearCache`, and `syncContent` all take an app slug and default it to the build's `APP_SLUG`.

The app that matches `APP_SLUG` keeps the original un-suffixed AsyncStorage keys and `snapshot-images/` directory, so namespacing is a no-op for the primary app. Any other slug synced into the same build — for example a Logo Quiz screen syncing `logo-quiz` from an erudite build — gets a `:{slug}`-suffixed key set and its own `snapshot-images-{slug}/` directory. See [Logo Quiz](logo-quiz.md#from-mock-data-to-backend-content).

## Caching Content Served Outside the Snapshot

Not all content rides the snapshot. The "By continent" modes in [Flags Quiz](flags-quiz.md#the-two-game-modes) and [Coat of Arms](coat-of-arms-quiz.md#the-two-game-modes) are backed by `image_answer_questions`, served from their own endpoint rather than the snapshot bundle. Their option images therefore cannot ride the snapshot's own image download.

`cacheImages` exists for this case. It downloads an arbitrary set of image URLs into a given app's namespaced image cache and returns the same URL → local-file map, reusing the exact directory scheme and unique-filename hashing as the snapshot sync. So a URL cached this way resolves through `resolveFromMap` just like a snapshot image resolves through `resolveLocalImage`, and it lands in the same `snapshot-images-{slug}/` directory. It is best-effort — failed downloads are skipped — and on web returns an empty map so callers fall back to the remote URLs. Each provider persists the raw image-answer payload alongside this map so the mode plays fully offline once synced.

### Forcing a refresh past the freshness window

The Coat of Arms provider deliberately syncs with `force`, bypassing the 24-hour reuse rule on every launch. Its catalogue grew from a partial set to the full 195 coats after the first release, and a player holding a fresh-enough cache of the small set would have been pinned to it for a day at a time. Forcing the fetch trades a little startup network for content that is never a release behind. Other apps keep the normal freshness window.

## Cache Freshness

The snapshot carries a `syncedAt` timestamp, and a 24-hour TTL governs reuse. A snapshot older than that, or one whose locale no longer matches the active language, is re-fetched on the next sync. Clearing the cache (from settings reset) removes both AsyncStorage keys and deletes the image directory.

## Store Links from the App Config

The snapshot's app descriptor also carries this app's public store listing URLs — `app_url_ios` and `app_url_android`. Both are backend-controlled, edited per-app in Nova (App resource → "App URL iOS" / "App URL Android"), and nullable. They exist so store links are content, not code: once a new app is released, filling in these two Nova fields is enough for the app to pick them up on its next snapshot sync. No rebuild or code change is needed for future releases.

Three surfaces need a store link — the "Rate us" and "Recommend" actions in settings (main app and Logo Quiz) and the share-question button. Each reads `snapshot.app` from its content-cache context and passes it through `getStoreLinks` (`lib/store-links.ts`), a pure helper that derives, for the current platform:

- `storeUrl` — the public listing URL, used for Share and Recommend.
- `rateDeepLink` — a native "write a review" deep link (`itms-apps://…?action=write-review` on iOS, `market://details?id=<package>` on Android).
- `rateFallbackUrl` — where to send the user if the review deep link cannot open (equal to `storeUrl`).

The helper is defensive so links never break. On iOS it keeps whatever URL the operator entered for Share/Recommend, but only builds the review deep link from a numeric App Store id parsed out of that URL. On Android it reads the package from the URL's `?id=` query parameter. When a field is empty or unparseable, the helper substitutes the historical hardcoded identifiers (bundle id `com.quizzzes.erudite`), so an app whose Nova fields are still blank keeps its previous behavior instead of regressing to a dead link. The Android subscription-management link reuses the same parsed package via `getAndroidPackage`.

Because these URLs ride the snapshot, they inherit its 24-hour freshness window: a change in Nova reaches the device on the next resync, not instantly.

## Answer-Statistics Sync

The statistics hint's real-data path rides the same "we're online" moment. When `runSync` finishes a content sync (`hooks/use-content-cache.ts`), it also — fire-and-forget, never blocking content — flushes the locally queued anonymous answer picks to `POST /apps/{slug}/answers` and refreshes the cached per-question distributions from `GET /apps/{slug}/question-stats`. Both the outbound queue (`answers.queue.v1`) and the stats cache (`question.stats.v1`) live in `lib/answer-stats.ts` and are best-effort: the queue survives offline and retries on the next opportunity (flushing also on quiz end), while the hint reads the cached distributions synchronously so it works with no live connection. This side effect belongs to the main app's provider only; every sibling app's content provider syncs the same way but skips it, as the answer-stats hint is an erudite-only feature. See `docs/gamification.md` and the API contract in `docs/data-model.md`.

## Cross-Session No-Repeats

To stop the same questions recurring, the app records which question IDs a player has already been served and excludes them from future pools. The records live in AsyncStorage under keys prefixed `quiz.seen.v1.`, one bucket per context:

- `__all__` for whole-pool modes such as Random 10 and Time Limit.
- One bucket per requested category/subcategory slug combination for topic-scoped modes.
- A variant suffix for hard mode, so a "hard typing" run does not exhaust the questions a normal run would draw.

When the quiz screen builds a pool, it drops any ID already in the relevant bucket. If too few unseen questions remain to fill the request, it resets that bucket and reuses the full pool, so a player who exhausts a topic simply starts the cycle over rather than hitting an empty quiz. After picking, the served IDs are written back into the bucket.

The quiz screen builds this pool two ways, and both enforce the same rules. It prefers the cached snapshot (`pickQuestionsFromCache`). When no usable snapshot exists — missing cache, a locale mismatch, or an empty pool — it falls back to the live `questions/random` endpoint. Each path first deduplicates the pool by question ID, so one session never serves the same question twice. Each then filters against the seen bucket, resets and reuses the full pool when too little remains, and writes the served IDs back. The live fallback needs this most. It fetches a fresh random batch every time, so without the filter it would ignore the seen set and could hand out within-batch duplicates — repeats a player would notice both inside one quiz and between sessions.

These same seen sets do double duty for progression: `getAllSeenIds` unions every bucket into one set, which the stats screen and the Explorer achievement use to resolve how many distinct subjects a player has touched. Bucketing alone could not answer that — the `__all__` bucket has no subject — so the IDs are resolved back to subjects through the snapshot. See [Gamification](gamification.md#career-stats).

## Today's Question

The daily question (`lib/today-question.ts`) picks one question ID and pins it for the local calendar day, stored with its date and locale under `quiz.today.v1`. The pick rolls over at the player's midnight and is recomputed when the date or language changes, giving every player a stable "question of the day" without a server round-trip. Opening it does not pad career stats.

## See Also

- [Quiz Flow](quiz-flow.md) -- How pools are filtered and questions served
- [Data Model](data-model.md) -- Snapshot and seen-set shapes
- [Gamification](gamification.md) -- Stats and achievements built on seen sets
- [Architecture](architecture.md) -- The content cache provider
- [Logo Quiz](logo-quiz.md) -- The second app that shares this cache under its own namespace
- [Flags Quiz](flags-quiz.md) -- A sibling that also caches a second content source outside the snapshot
- [Coat of Arms](coat-of-arms-quiz.md) -- The app that consumes the second image variant
- [Sport Quiz](sport-quiz.md) -- A sibling drawing its levels from the same snapshot
