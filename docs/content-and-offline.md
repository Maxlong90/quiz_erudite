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

The web platform has no writable filesystem, so it skips the local image cache entirely: downloads are reported complete immediately and `resolveLocalImage` returns the remote URL for the browser to cache itself.

## Per-App Cache Namespacing

One build tree ships two apps — the main quiz and the Logo Quiz — selected by the build's `APP_SLUG`. Both draw content through this same cache, so its storage is namespaced per app slug to stop one app's snapshot or images from clobbering the other's. `loadCachedSnapshot`, `getCachedVersion`, `clearCache`, and `syncContent` all take an app slug and default it to the build's `APP_SLUG`.

The app that matches `APP_SLUG` keeps the original un-suffixed AsyncStorage keys and `snapshot-images/` directory, so namespacing is a no-op for the primary app. Any other slug synced into the same build — for example a Logo Quiz screen syncing `logo-quiz` from an erudite build — gets a `:{slug}`-suffixed key set and its own `snapshot-images-{slug}/` directory. See [Logo Quiz](logo-quiz.md#from-mock-data-to-backend-content).

## Cache Freshness

The snapshot carries a `syncedAt` timestamp, and a 24-hour TTL governs reuse. A snapshot older than that, or one whose locale no longer matches the active language, is re-fetched on the next sync. Clearing the cache (from settings reset) removes both AsyncStorage keys and deletes the image directory.

## Answer-Statistics Sync

The statistics hint's real-data path rides the same "we're online" moment. When `runSync` finishes a content sync (`hooks/use-content-cache.ts`), it also — fire-and-forget, never blocking content — flushes the locally queued anonymous answer picks to `POST /apps/{slug}/answers` and refreshes the cached per-question distributions from `GET /apps/{slug}/question-stats`. Both the outbound queue (`answers.queue.v1`) and the stats cache (`question.stats.v1`) live in `lib/answer-stats.ts` and are best-effort: the queue survives offline and retries on the next opportunity (flushing also on quiz end), while the hint reads the cached distributions synchronously so it works with no live connection. This side effect belongs to the main app's provider only; the Logo Quiz content provider syncs the same way but skips it, as the answer-stats hint is an erudite-only feature. See `docs/gamification.md` and the API contract in `docs/data-model.md`.

## Cross-Session No-Repeats

To stop the same questions recurring, the app records which question IDs a player has already been served and excludes them from future pools. The records live in AsyncStorage under keys prefixed `quiz.seen.v1.`, one bucket per context:

- `__all__` for whole-pool modes such as Random 10 and Time Limit.
- One bucket per requested category/subcategory slug combination for topic-scoped modes.
- A variant suffix for hard mode, so a "hard typing" run does not exhaust the questions a normal run would draw.

When the quiz screen builds a pool, it drops any ID already in the relevant bucket. If too few unseen questions remain to fill the request, it resets that bucket and reuses the full pool, so a player who exhausts a topic simply starts the cycle over rather than hitting an empty quiz. After picking, the served IDs are written back into the bucket.

These same seen sets do double duty for progression: `getAllSeenIds` unions every bucket into one set, which the stats screen and the Explorer achievement use to resolve how many distinct subjects a player has touched. Bucketing alone could not answer that — the `__all__` bucket has no subject — so the IDs are resolved back to subjects through the snapshot. See [Gamification](gamification.md#career-stats).

## Today's Question

The daily question (`lib/today-question.ts`) picks one question ID and pins it for the local calendar day, stored with its date and locale under `quiz.today.v1`. The pick rolls over at the player's midnight and is recomputed when the date or language changes, giving every player a stable "question of the day" without a server round-trip. Opening it does not pad career stats.

## See Also

- [Quiz Flow](quiz-flow.md) -- How pools are filtered and questions served
- [Data Model](data-model.md) -- Snapshot and seen-set shapes
- [Gamification](gamification.md) -- Stats and achievements built on seen sets
- [Architecture](architecture.md) -- The content cache provider
- [Logo Quiz](logo-quiz.md) -- The second app that shares this cache under its own namespace
