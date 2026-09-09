import type { TAssetSlot } from '@/constants/t/asset-slots';
import type { StringKey } from '@/i18n/strings';

/**
 * The contract between the onboarding HOST (app/t/onboarding.tsx) and whichever
 * onboarding VARIANT a build's `onboarding_type` selects.
 *
 * Types only, no runtime value: this file is the agreement, not an
 * implementation of it. components/t/onboarding/index.ts is the registry.
 *
 * THE OWNERSHIP RULE
 * ------------------
 * A variant is PRESENTATIONAL and CONTROLLED. It owns pixels — layout, artwork,
 * typography, how (or whether) it animates between pages. It owns no state that
 * outlives a gesture and it decides nothing.
 *
 * The host owns everything with a consequence: the markSeen() ordering, the
 * store-billing capability gate, and navigation. A variant that imports
 * `expo-router`, `@/hooks/use-onboarding` or `@/lib/revenuecat` has taken
 * ownership of an invariant the HOST is tested for — __tests__/app/t-routes.test.ts
 * pins both route literals to app/t/onboarding.tsx, and
 * __tests__/app/t-onboarding.test.tsx proves onboarding is marked seen before any
 * navigation on every path. Neither notices a variant quietly navigating on its
 * own, so __tests__/components/t-onboarding-variants.test.tsx forbids those three
 * imports at the source level instead.
 *
 * WHAT THE FIELDS GUARANTEE
 * -------------------------
 *  - `pageCount` is PASSED, never derived from `steps.length + 1`. The host
 *    computes `isPremiumSlide` from the same number and picks the button label
 *    from it, so a progress indicator that counted for itself could disagree with
 *    the button about which page is last.
 *  - `primaryLabel` arrives ALREADY capability-gated: it reads "get premium" only
 *    where a store can actually charge. A variant may not recompute it. That is
 *    exactly the line along which capability gating would silently fork.
 *  - `t` is the host's copy funnel (hooks/t/use-template-copy.ts) handed down.
 *    Variants do not call it for themselves — see that file's scope limit.
 *  - `onPageChange` reports a page the USER reached by gesture. Never call it to
 *    acknowledge a page change the host made; the host already knows, and the
 *    round trip is how a controlled list ends up fighting its own scroll.
 *
 * THE TESTIDS, IDENTICAL IN EVERY VARIANT NOW AND LATER
 * -----------------------------------------------------
 * A variant is swapped by backend data, so the suite must be able to make the
 * same assertion against any of them:
 *
 *  - `t-onboarding-skip`              the skip control
 *  - `t-onboarding-primary`           the primary button
 *  - `t-onboarding-art-<slot>`        the artwork of the page CURRENTLY ON SCREEN
 *  - `t-onboarding-variant-<type>`    root marker naming the variant that rendered
 *  - `t-onboarding-page-<n>`          the ACTIVE progress indicator, and only it
 *
 * The last one exists because a variant may mount every page at once (the
 * classic pager does), in which case no art testID reports which page is
 * VISIBLE. Inactive indicators carry no testID at all: RNTL's matchTestId opens
 * with `if (typeof text !== 'string') return false`, so `undefined` is
 * unmatchable rather than merely unmatched.
 */

/** One intro page: a bundled picture and the two bundled strings under it. */
export interface TOnboardingStep {
  slot: TAssetSlot;
  titleKey: StringKey;
  subtitleKey: StringKey;
}

export interface TOnboardingVariantProps {
  /** The intro pages, in order. Index `steps.length` is the closing premium page. */
  steps: readonly TOnboardingStep[];
  /** Artwork for the closing premium page. */
  premiumSlot: TAssetSlot;
  premiumTitleKey: StringKey;
  premiumSubtitleKey: StringKey;
  /** The page the HOST believes is current, `0` .. `pageCount - 1`. */
  page: number;
  /** Intro pages plus the closing premium page. Passed, not derived. */
  pageCount: number;
  /** Already capability-gated by the host. Render it verbatim. */
  primaryLabel: string;
  skipLabel: string;
  t: (key: StringKey) => string;
  onPrimaryPress: () => void;
  onSkip: () => void;
  /** Report a page the user reached BY GESTURE. */
  onPageChange: (page: number) => void;
}
