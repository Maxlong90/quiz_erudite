# Gamification

The app keeps players returning through a small economy and a progression system, all stored on the device. Lives gate how many wrong answers a session tolerates, hints let players buy their way past a hard question, mistakes feed a review mode, career stats roll up into achievements, and a premium flag unlocks the advanced modes. None of this touches the backend — every store lives in AsyncStorage and resets only when the player clears the app.

## Lives

Lives (`lib/lives.ts`, surfaced by `hooks/use-lives.ts`) are the spend currency of a session. A wrong answer in most modes costs one life; survival is the exception, where a wrong answer ends the run instead of spending. When the count hits zero mid-quiz, the out-of-lives modal opens and routes the player to the shop.

Lives are replenished three ways: a daily claim of ten, the shop, or a rewarded ad. There is no cap — an earlier version capped lives at 30 and silently lost overflow on claim, so lives are now pure uncapped currency and every grant lands in full.

### The rewarded ad ("watch ad → +1 life")

The watch-ad button (in the shop's "Free lives" card and the out-of-lives modal) runs a real AdMob rewarded ad through `lib/ads.ts`, which wraps `react-native-google-mobile-ads` behind the same graceful-degradation guard as RevenueCat. `watchAdForLife()` loads and shows the ad, then grants exactly `+1` life **only** inside the SDK's `EARNED_REWARD` callback — a dismiss without reward, a load/show failure, or a no-fill grants nothing and surfaces a friendly "no reward" message. The AdMob-side reward amount/item is ignored; the app always grants one life itself, and the flow settles once so a single tap can never double-grant.

Where an ad cannot be served — Expo Go, web, iOS (off until its rewarded unit id is supplied), or a build without the native module — `adsEnabled` is `false`, `watchAdForLife()` returns `'unavailable'`, and the button hides itself, so a free life is never granted where no ad ran. The gating is capability-driven (any native platform with a rewarded unit id enables ads), so iOS lights up automatically once its id is provided — see [iOS Monetization Parity](ios-monetization-parity.md). Premium players have unlimited lives, so the shop's watch-ad card is also hidden for them (they never reach the quiz out-of-lives gate either). Ads require a native build; see [Development](development.md#admob-rewarded-ads).

### The daily claim and clock-cheat protection

The daily claim keys off the local calendar day, not UTC, so it resets at the player's own midnight. Keying only on the date string was exploitable: moving the device clock forward flips `todayKey` to a "new day" instantly, so a player could re-grant themselves ten lives repeatedly by advancing the clock. There is no server to act as a trusted time source in this offline model, so the store now defends best-effort with a second stamp.

Alongside the last claim date, the store persists `lastClaimAt` — the epoch milliseconds of the last claim. `canClaim` allows a grant only when **both** conditions hold: the local calendar day has changed **and** at least roughly twenty hours of wall-clock time have elapsed since `lastClaimAt`. Advancing the clock alone no longer helps — the player would also have to wait out the real gap, so the exploit degrades to the normal once-a-day cadence.

Two edge cases shape the rule. A backward clock jump (`now` is earlier than `lastClaimAt`) is refused outright as anti-rollback, and `claimDaily` keeps the greater existing timestamp so a player cannot rewind their way into an earlier window. Legacy state that predates `lastClaimAt` — and any never-claimed player — omits the stamp and is treated as claimable, so the upgrade never blocks an existing player. This protection is explicitly best-effort: a determined offline user can still defeat it, which is an accepted trade-off for a fully on-device economy.

## Hints

Hints (`lib/hints.ts`, surfaced by `hooks/use-hints.ts`) come in exactly three kinds, each with its own count. An earlier build shipped five kinds; the `ai` (explanation) and `letter` (reveal-a-letter) hints were removed entirely because they overlapped poorly with the modes and, in the letter case, tangled with the hard-mode typing gameplay. Any persisted counts for the two retired kinds are simply ignored on read.

| Kind | Effect | Default count |
|------|--------|---------------|
| fiftyFifty | Removes wrong options until exactly two remain — the correct one plus one random wrong | 3 |
| statistics | Shows how other players answered this question | 2 |
| replaceQuestion | Swaps the current question for a fresh, unused one of the same subcategory | 1 |

The hint bar during a quiz spends from these counts; a kind at zero is unavailable (unless the player is premium — see below). Hints are replenished only through the shop, in bundles that grant all three kinds at once.

**fiftyFifty** hides every wrong option except one, so it always leaves the correct answer next to a single distractor regardless of how many options the question carries. The surviving wrong option is chosen at random.

**statistics** presents a per-option pick rate as a small labelled bar with a percentage under each option. It prefers **real** player data: every answered question (except Hard mode, which has no discrete option index) is queued locally and flushed to the backend anonymously in batches, and the backend serves back aggregated per-question distributions once a question crosses a sample threshold. That distribution is cached on-device (`lib/answer-stats.ts`, key `question.stats.v1`) and read synchronously at hint time, so the hint works offline. When a question isn't in the cache — below threshold, or not yet fetched — the hint **falls back** to a distribution generated deterministically per question (`generateStatsForQuestion` in `app/quiz.tsx`), which always looks populated. Real percentages are honest (largest-remainder rounding to sum 100, no shaping of the correct option); only the generated fallback biases the correct option to 40–60%. The bar renders identically either way. Because options are shuffled per session (`shuffleOptions`), each question carries an `optionOrder` permutation (display index → canonical backend index): reporting translates the tapped display index back to the canonical index so the server aggregates a stable order, and the hint permutes the canonical `counts[]` back onto the shuffled display order before rendering. Reporting and caching are strictly fire-and-forget and never delay or block gameplay; the outbound queue (key `answers.queue.v1`) survives offline, retries later, and is capped so it can't grow unbounded. See the API contract in `docs/data-model.md` for the `POST /apps/{slug}/answers` and `GET /apps/{slug}/question-stats` endpoints. No accounts, PII, or device identifiers are involved — the data is anonymous, aggregate-only counts.

**replaceQuestion** is the one hint that works in every mode. Because 50/50 and statistics both act on multiple-choice options, they only make sense in the regular modes; hard mode offers replaceQuestion alone, so no purchased hint is ever globally unusable. When triggered, `applyReplaceQuestion` looks for an unused question through `findReplacementQuestion` (a pure candidate picker in `lib/replace-question.ts`), matching the current question's subcategory and — in hard mode — the same hard-eligibility filter. The data model has no per-question difficulty field, so "same difficulty" is honored through these proxies. The candidate is excluded if it is already in the current session or in the cross-session seen set for this bucket.

The swap is careful with session state. It only spends a hint when a candidate actually exists — if none is available it flashes a transient "no other question to swap in" banner and spends nothing. On success it dispatches the reducer's `REPLACE_QUESTION` action, which swaps the question in place at the current index, keeps the array length stable so the progress denominator does not move, resets that slot's answer to unanswered, and leaves every other answer untouched. The action is a no-op once the current question is answered. The screen then clears the current question's hint overlays manually — because the swapped-in question sits at the same index, the per-question reset keyed on the index would not otherwise fire — and records the new question's id into the seen set so it is never repeated later.

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

### Premium means unlimited lives and hints

An active-premium player never spends lives and never spends hints. The quiz screen derives two predicates from the premium flag — `livesSpendingEnabled` and `hintsSpendingEnabled` — and routes every spend and gate through them. When `livesSpendingEnabled` is off, a wrong answer skips the `spendLife` decrement, the out-of-lives modal never opens, and the pre-quiz lives gate is bypassed so a premium player with zero lives can still start. When `hintsSpendingEnabled` is off, using a hint skips both the remaining-count check and the `consumeHint` decrement, and the hint buttons stay enabled regardless of stock. The lives bar and hint badges show an infinity glyph instead of a number for premium players.

The premium flag is null while it loads. That null is treated as non-premium, so spending stays on until the flag resolves — the safe default that never gives away free plays during a loading race.

These two predicates exist as a single, deliberate seam. A planned premium "hard mode" for rankings and prizes will re-enable spending for premium users in that mode only, by adding a ranked-mode condition to both predicates. That mode is not built yet; the clean predicate is the placeholder for it.

Billing runs through RevenueCat / Google Play on Android device builds (`lib/revenuecat.ts`). The paywall reads the `default` offering and presents **three selectable, no-trial tiers** — weekly, monthly, and yearly — that map to the RevenueCat packages `$rc_weekly`, `$rc_monthly`, and `$rc_annual`, each attached to its period's base (non-trial) subscription product. `fetchPremiumPackages` resolves all three by their RevenueCat convenience accessor first and by package id as a fallback, so a missing accessor never silently drops a tier. Each card shows the localized `priceString` from the store.

Yearly is the featured "best value" option and the default selection. Its card carries a computed save badge — the percentage saved against twelve months of the monthly plan (`savePercent`) — derived from the live numeric prices when present and from hardcoded fallbacks otherwise, so the badge is never NaN. There is intentionally **no trial wording** anywhere, because these are base products with no free trial.

A single CTA purchases whichever tier is selected. `purchasePremiumPackage` runs the store purchase for that chosen package and reports whether the `premium` entitlement is active afterwards; the local premium flag only flips once that entitlement is live. A user cancellation is a silent no-op. The paywall also offers **Restore Purchases**, shown only when RevenueCat is enabled.

### The free-unlock guard

`handleSubscribe` enforces one invariant: when RevenueCat is enabled, premium is granted **only** through a confirmed store purchase. A production bug once violated this — the local-unlock fallback fired whenever `revenueCatEnabled` was off **or** the selected package was null, so on a real Android build a `default` offering that failed to load left every package null and the CTA granted premium for free, persisted to `app.premium.v1`. The guard now distinguishes three cases instead of collapsing them:

- **RevenueCat disabled in a dev environment** (Expo Go or web, checked with `isExpoGo || Platform.OS === 'web'`) — no real store exists, so the MVP local `setPremium(true)` grant still runs. This keeps the dev flow working and is the only path that flips premium without a purchase.
- **RevenueCat disabled on a real store device** (a native platform where billing is off — today iOS, before its RevenueCat key is supplied) — the paywall must **not** hand out premium for free, so it surfaces the error alert and bails without granting. This mirrors the shop's fail-closed consumable policy below and is the behavior change the capability-driven parity work introduced; iOS no longer local-grants premium on a real device. See [iOS Monetization Parity](ios-monetization-parity.md).
- **RevenueCat enabled, package present** — the only production purchase path: it goes through `purchasePremiumPackage` and flips premium only when the entitlement comes back live.
- **RevenueCat enabled, package null** — a misconfigured or unloaded offering. It surfaces an error alert (`paywall.error.title` / `paywall.error.body`) and bails **without granting premium**. The store is the only way through.

The offering load also fails loudly now. The paywall tracks an `offeringStatus` of `loading` → `ready` / `unavailable`: an empty result or a thrown fetch marks it `unavailable` and reports the error to Sentry rather than silently keeping all-null packages. While the offering is still `loading`, the Subscribe CTA is disabled so a tap can never race ahead of the packages and fall through to an error or a stale grant. Hardcoded fallback prices (weekly $4.99, monthly $12.99, yearly $49.99) still hydrate the three cards for display when a live tier can't be read, but they no longer back a purchase.

> A consequence: until the RevenueCat `default` offering and the Google Play subscription products are fully provisioned, the enabled-Android paywall surfaces the error alert on Subscribe instead of granting premium. That is the intended safe degradation — provisioning the offering is a separate ops task.

### The forced post-onboarding paywall

The paywall has two kinds of entry. User-initiated entries (tapping a locked mode on the home screen, in `quiz-mode/[slug]`, or via the bottom bar) always work and ignore every flag. The other entry is the *forced* paywall shown automatically once, right after the onboarding carousel finishes — and that one is gated.

`app/onboarding.tsx` decides the destination after `markSeen` runs (both on the final "Start" press and on "Skip"). The gate is capability-driven, not platform-hardcoded: it shows the paywall only when **both** conditions hold — store billing is actually enabled on this platform (`revenueCatEnabled`) **and** the per-platform backend flag is true (iOS reads `show_paywall_ios`, Android reads `show_paywall_android`). Gating on `revenueCatEnabled` guarantees a paywall is never forced on a platform that cannot charge, so iOS stays safe until its RevenueCat key is supplied and then lights up automatically with no code change. Any other case — a missing or not-yet-loaded snapshot, the flag absent or false, web, or a disabled store — sends the player straight to home. The default is therefore "no forced paywall", which is the reviewer-safe state.

This gate exists for store review. Reviewers run the build with the flag off, so they see a fully usable app with no forced paywall; once the build is approved, the owner flips the platform flag on in the backend admin (Nova) to start showing the offer to new users. The gate is re-evaluated on every cold start, not just the first launch: the intro flow never gates on a persisted "seen" flag, so it always runs splash → language → onboarding before this decision. With the flag off, no one ever hits the paywall; with it on, the offer can reappear on a later cold start rather than only once.

The flags travel in the content snapshot's `app` descriptor (`show_paywall_android` and `show_paywall_ios` on the `ContentSnapshot.app` interface in `lib/content-cache.ts`), alongside `show_paywall_review_button` and `seconds_before_quit_button_shown`. Because the client reads the **cached** snapshot, two things are required for a flag change to take effect: the app must re-sync the snapshot (or be reinstalled) after the owner toggles the flag, and shipping the gating logic itself needs a new app build. The current live value is false — the correct default for submitting a build to review.

The trial-enabled and quarterly/semiannual products still exist in Google Play and RevenueCat and stay attached to the `premium` entitlement, but are deliberately excluded from the `default` offering; they are reserved for a future trial A/B-test offering.

On launch the premium provider syncs from the live entitlement, but only ever *upgrades* (a returning subscriber stays premium); it never downgrades offline, where the entitlement is treated as unknown. Two backend-controlled app flags shape the paywall's exits: `seconds_before_quit_button_shown` hides both the close ✕ and the "continue free" link for a configured delay so the offer is seen first, and `show_paywall_review_button` gates the reviewer-unlock flow (a backend-validated login that grants premium without a real purchase). This button is likewise capability-gated on `revenueCatEnabled`, so it appears only where real purchases exist — Google Play today, and the App Store automatically once the iOS key is supplied.

The shop (`app/shop.tsx`, catalog in `lib/iap.ts`) sells lives, hints, and combo bundles whose ids are the store product ids. Tapping a bundle runs the real purchase and only credits the contents locally on success (cancellation is a no-op; store errors surface as a failure); displayed prices are hydrated from store metadata when available.

### The fail-closed grant policy

Consumable purchases enforce the same invariant as the paywall's free-unlock guard: a bundle is credited **only** after a resolved real store purchase. An earlier `purchaseBundle` violated this — whenever RevenueCat was disabled it fell straight through to a local delay-then-grant stub, so on Expo Go, on web, on iOS (no key yet), or on any real device where RevenueCat init failed, the shop handed out consumables for free. That is the same class of bug as the paywall #568 free-grant.

The grant now splits by whether the platform can actually charge the player. On a real store platform — `Platform.OS` is `android` or `ios` — the purchase must go through RevenueCat, and if the store is unavailable or a product id is missing, `purchaseBundle` fails closed: it throws so the UI shows a purchase error and nothing is granted. The local stub grant runs only in genuinely non-store dev environments, gated explicitly on `isExpoGo || Platform.OS === 'web'`, never on iOS or Android. `isExpoGo` is exported from `lib/revenuecat.ts` precisely so the two cases can be told apart.

The error must reach the player, so the out-of-lives buy path was fixed too: `components/lives/buy-lives-modal.tsx` used to swallow purchase failures silently and now surfaces an error the same way the shop screen does.

The catalog is a fixed nine-product contract shared with the backend, which provisions the same ids as Google Play managed (consumable) products and registers them in RevenueCat. Changing an id here without changing it there breaks purchasing, so the ids are treated as immutable. The nine products fall into three categories the shop renders as separate sections — three lives packs, three hint packs, and three combos:

| Category | Bundles | Grants |
|----------|---------|--------|
| lives | `lives.10`, `lives.30`, `lives.100` | 10 / 30 / 100 lives |
| hints | `hints.5`, `hints.10`, `hints.20` | 5 / 10 / 20 of each of the three hint kinds |
| combo | `combo.10.5`, `combo.30.10`, `combo.100.20` | lives plus hints together (10+5, 30+10, 100+20) |

The out-of-lives modal (`components/lives/buy-lives-modal.tsx`) reuses this catalog but filters to `category === 'lives'`, so it offers only the three lives packs.

RevenueCat is enabled per-platform by **capability, not by a hardcoded `Platform.OS`**: the SDK turns on for any native platform that has a public store key configured. Android ships with a committed fallback key so it is always on; iOS has no committed key, so it stays disabled until the owner supplies `EXPO_PUBLIC_REVENUECAT_IOS_KEY`, then lights up automatically with no code change (see [iOS Monetization Parity](ios-monetization-parity.md)). RevenueCat is therefore disabled today in Expo Go, on web, on iOS, or whenever the native module is missing. What that disabled state does depends on whether the platform can charge the player. In Expo Go and on web — genuine dev environments — the shop and paywall still fall back to the local-grant stub so the dev flow never breaks. On a real iOS device, **both** the shop's consumable purchases and the paywall's premium unlock now fail closed with an error rather than local-granting — the parity work brought the paywall in line with the fail-closed consumable policy so no free premium is ever handed out on a real store device. The public Android key is read from `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` with a committed fallback; release builds set it explicitly per profile in `eas.json` (`preview` and `production`). The wired key and the fallback must belong to the same RevenueCat project the backend provisions — a mismatch makes `getOfferings` return an empty `default` offering, which is exactly the all-null-packages condition the free-unlock guard now blocks. See [Development](development.md#configure-the-backend) for the key wiring.

## See Also

- [Quiz Flow](quiz-flow.md) -- Where lives, hints, and mistakes are spent and earned
- [Data Model](data-model.md) -- The local progress store keys
- [Content and Offline](content-and-offline.md) -- Seen sets behind stats and Explorer
- [Architecture](architecture.md) -- Where the premium provider sits
- [iOS Monetization Parity](ios-monetization-parity.md) -- Capability-driven gating and the iOS credentials still required
