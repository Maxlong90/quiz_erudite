# Gamification

The app keeps players returning through a small economy and a progression system, all stored on the device. Lives gate how many wrong answers a session tolerates, hints let players buy their way past a hard question, mistakes feed a review mode, career stats roll up into achievements, and a premium flag unlocks the advanced modes. None of this touches the backend — every store lives in AsyncStorage and resets only when the player clears the app.

## Lives

Lives (`lib/lives.ts`, surfaced by `hooks/use-lives.ts`) are the spend currency of a session. A wrong answer in most modes costs one life; survival is the exception, where a wrong answer ends the run instead of spending. When the count hits zero mid-quiz, the out-of-lives modal opens and routes the player to the shop.

Lives are replenished three ways: a daily claim of ten, the shop, or a rewarded-ad stub. The daily claim keys off the local calendar day, not UTC, so it resets at the player's own midnight. The store records the last claim date; the claim is available whenever that date is not today and is a no-op if already claimed. There is no cap — an earlier version capped lives at 30 and silently lost overflow on claim, so lives are now pure uncapped currency and every grant lands in full.

## Hints

Hints (`lib/hints.ts`, surfaced by `hooks/use-hints.ts`) come in four kinds, each with its own count:

| Kind | Effect | Default count |
|------|--------|---------------|
| fiftyFifty | Removes two wrong options | 3 |
| statistics | Shows how often each option is chosen | 2 |
| ai | Suggests an answer | 1 |
| letter | Reveals one letter (used in hard mode) | 2 |

The hint bar during a quiz spends from these counts; a kind at zero is unavailable. Hints are replenished only through the shop, in bundles that grant several kinds at once.

## Mistakes

Every wrong answer logs its question ID to the mistake store (`lib/mistakes.ts`). The store is a 200-entry ring buffer ordered most-recent-first: a repeat mistake moves to the head rather than duplicating, and the oldest entries fall off past 200. The Mistakes mode replays these questions, giving players a targeted way to revisit what they missed; the tile disables itself when the store is empty.

## Career Stats

The stats store (`lib/quiz-stats.ts`) accumulates five running totals: quizzes taken, total seconds played, total questions answered, total correct, and perfect quizzes. A perfect quiz is a fully completed run of at least five questions answered 100% correctly — bailing out early never earns it. The quiz screen records into these totals on every session end via `recordQuizCompletion`; early exits still accrue questions, time, and correct counts but do not bump the quiz count or qualify as perfect. The stats screen (`app/stats.tsx`) reads these totals and renders per-subject breakdowns by resolving seen question IDs back to their subject through the snapshot.

## Achievements

Achievements (`lib/achievements.ts`) turn the career stats into visible milestones. Seven achievements each track one metric across ascending thresholds; crossing a threshold promotes the achievement one level.

| Achievement | Metric | Thresholds |
|-------------|--------|------------|
| Activity | Quizzes taken | 1, 10, 50, 200 |
| Knowledge | Questions answered | 10, 100, 500, 2000 |
| Accuracy | Correct answers | 10, 100, 500, 2000 |
| Time | Seconds played | 600, 1800, 10800, 36000 |
| Explorer | Distinct subjects touched | 1, 3, 5, 7 |
| Mistakes | Mistakes logged | 5, 25, 100 |
| Perfect | Perfect quizzes | 1, 5, 25, 100 |

After each quiz, the results screen gathers the current metrics, computes each achievement's level, and compares it against the highest level already celebrated (stored under `quiz.achievements.seenLevels.v1`). Any level that just went up queues an unlock modal; once shown, the new levels are marked seen so the same milestone is never celebrated twice. The Explorer metric is computed by resolving seen question IDs to their subjects through the snapshot, so progress counts correctly even for mixed-category modes whose seen IDs share one bucket.

## Premium and the Shop

A single premium flag (`hooks/use-premium.ts`, stored as `app.premium.v1`) gates the advanced modes. Free players see three open modes; the rest carry a crown and route to the paywall (`app/paywall.tsx`) when tapped.

Billing runs through RevenueCat / Google Play on Android device builds (`lib/revenuecat.ts`). The paywall presents the `default` offering — annual is the headline package — and only flips the local flag once the `premium` entitlement is active; it also offers **Restore Purchases**. On launch the premium provider syncs from the live entitlement, but only ever *upgrades* (a returning subscriber stays premium); it never downgrades offline, where the entitlement is treated as unknown. The Android reviewer-unlock flow (a backend-validated login that grants premium without a real purchase) is unchanged and still gated by the `show_paywall_review_button` app flag.

The shop (`app/shop.tsx`, catalog in `lib/iap.ts`) sells lives and hint bundles whose ids are the Google Play product ids. On Android device builds, tapping a bundle runs the real purchase and only credits the contents locally on success (cancellation is a no-op; store errors surface as a failure); displayed prices are hydrated from store metadata when available. The catalog spans single-currency lives packs, multi-kind hint packs, and a combined power bundle.

RevenueCat is **Android only** for now (no iOS key yet) and degrades gracefully: in Expo Go, on web, on iOS, or whenever the native module is missing, it stays disabled and both the shop and the paywall fall back to the original local-grant behavior so the dev flow never breaks. The public Android key is read from `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` with a committed fallback.

## See Also

- [Quiz Flow](quiz-flow.md) -- Where lives, hints, and mistakes are spent and earned
- [Data Model](data-model.md) -- The local progress store keys
- [Content and Offline](content-and-offline.md) -- Seen sets behind stats and Explorer
- [Architecture](architecture.md) -- Where the premium provider sits
