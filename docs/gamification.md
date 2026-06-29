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

Billing runs through RevenueCat / Google Play on Android device builds (`lib/revenuecat.ts`). The paywall reads the `default` offering and presents **three selectable, no-trial tiers** — weekly, monthly, and yearly — that map to the RevenueCat packages `$rc_weekly`, `$rc_monthly`, and `$rc_annual`, each attached to its period's base (non-trial) subscription product. `fetchPremiumPackages` resolves all three by their RevenueCat convenience accessor first and by package id as a fallback, so a missing accessor never silently drops a tier. Each card shows the localized `priceString` from the store.

Yearly is the featured "best value" option and the default selection. Its card carries a computed save badge — the percentage saved against twelve months of the monthly plan (`savePercent`) — derived from the live numeric prices when present and from hardcoded fallbacks otherwise, so the badge is never NaN. There is intentionally **no trial wording** anywhere, because these are base products with no free trial.

A single CTA purchases whichever tier is selected. `purchasePremiumPackage` runs the store purchase for that chosen package and reports whether the `premium` entitlement is active afterwards; the local premium flag only flips once that entitlement is live. A user cancellation is a silent no-op. The paywall also offers **Restore Purchases**, shown only when RevenueCat is enabled.

### The free-unlock guard

`handleSubscribe` enforces one invariant: when RevenueCat is enabled, premium is granted **only** through a confirmed store purchase. A production bug once violated this — the local-unlock fallback fired whenever `revenueCatEnabled` was off **or** the selected package was null, so on a real Android build a `default` offering that failed to load left every package null and the CTA granted premium for free, persisted to `app.premium.v1`. The guard now splits the two cases instead of collapsing them:

- **RevenueCat disabled** (Expo Go, web, iOS, or a missing native module) — no real store exists, so the MVP local `setPremium(true)` grant still runs. This keeps the dev flow working and is the only path that flips premium without a purchase.
- **RevenueCat enabled, package present** — the only production path: it goes through `purchasePremiumPackage` and flips premium only when the entitlement comes back live.
- **RevenueCat enabled, package null** — a misconfigured or unloaded offering. It surfaces an error alert (`paywall.error.title` / `paywall.error.body`) and bails **without granting premium**. The store is the only way through.

The offering load also fails loudly now. The paywall tracks an `offeringStatus` of `loading` → `ready` / `unavailable`: an empty result or a thrown fetch marks it `unavailable` and reports the error to Sentry rather than silently keeping all-null packages. While the offering is still `loading`, the Subscribe CTA is disabled so a tap can never race ahead of the packages and fall through to an error or a stale grant. Hardcoded fallback prices (weekly $4.99, monthly $12.99, yearly $49.99) still hydrate the three cards for display when a live tier can't be read, but they no longer back a purchase.

> A consequence: until the RevenueCat `default` offering and the Google Play subscription products are fully provisioned, the enabled-Android paywall surfaces the error alert on Subscribe instead of granting premium. That is the intended safe degradation — provisioning the offering is a separate ops task.

The trial-enabled and quarterly/semiannual products still exist in Google Play and RevenueCat and stay attached to the `premium` entitlement, but are deliberately excluded from the `default` offering; they are reserved for a future trial A/B-test offering.

On launch the premium provider syncs from the live entitlement, but only ever *upgrades* (a returning subscriber stays premium); it never downgrades offline, where the entitlement is treated as unknown. Two backend-controlled app flags shape the paywall's exits: `seconds_before_quit_button_shown` hides both the close ✕ and the "continue free" link for a configured delay so the offer is seen first, and `show_paywall_review_button` gates the Android reviewer-unlock flow (a backend-validated login that grants premium without a real purchase).

The shop (`app/shop.tsx`, catalog in `lib/iap.ts`) sells lives, hints, and combo bundles whose ids are the Google Play product ids. On Android device builds, tapping a bundle runs the real purchase and only credits the contents locally on success (cancellation is a no-op; store errors surface as a failure); displayed prices are hydrated from store metadata when available.

The catalog is a fixed nine-product contract shared with the backend, which provisions the same ids as Google Play managed (consumable) products and registers them in RevenueCat. Changing an id here without changing it there breaks purchasing, so the ids are treated as immutable. The nine products fall into three categories the shop renders as separate sections — three lives packs, three hint packs, and three combos:

| Category | Bundles | Grants |
|----------|---------|--------|
| lives | `lives.10`, `lives.30`, `lives.100` | 10 / 30 / 100 lives |
| hints | `hints.5`, `hints.10`, `hints.20` | 5 / 10 / 20 of each of the four hint kinds |
| combo | `combo.10.5`, `combo.30.10`, `combo.100.20` | lives plus hints together (10+5, 30+10, 100+20) |

The out-of-lives modal (`components/lives/buy-lives-modal.tsx`) reuses this catalog but filters to `category === 'lives'`, so it offers only the three lives packs.

RevenueCat is **Android only** for now (no iOS key yet) and degrades gracefully: in Expo Go, on web, on iOS, or whenever the native module is missing, it stays disabled and both the shop and the paywall fall back to the original local-grant behavior so the dev flow never breaks. The public Android key is read from `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` with a committed fallback; release builds set it explicitly per profile in `eas.json` (`preview` and `production`). The wired key and the fallback must belong to the same RevenueCat project the backend provisions — a mismatch makes `getOfferings` return an empty `default` offering, which is exactly the all-null-packages condition the free-unlock guard now blocks. See [Development](development.md#configure-the-backend) for the key wiring.

## See Also

- [Quiz Flow](quiz-flow.md) -- Where lives, hints, and mistakes are spent and earned
- [Data Model](data-model.md) -- The local progress store keys
- [Content and Offline](content-and-offline.md) -- Seen sets behind stats and Explorer
- [Architecture](architecture.md) -- Where the premium provider sits
