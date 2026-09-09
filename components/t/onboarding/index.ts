import type { ComponentType } from 'react';

import { OnboardingClassic } from '@/components/t/onboarding/classic';
import { OnboardingUniversal } from '@/components/t/onboarding/universal';
import type { TOnboardingVariantProps } from '@/components/t/onboarding/contract';
import type { TOnboardingType } from '@/lib/onboarding/onboarding-type';

/**
 * Which component renders which `onboarding_type`.
 *
 * The host (app/t/onboarding.tsx) looks a variant up here by the value
 * useOnboardingType() resolved, so adding an onboarding shape is one entry in
 * this map plus one file next to it — not a route, not a branch in the host, and
 * not a change to the flow.
 *
 * A FULL Record, NEVER Partial
 * ----------------------------
 * `Record<TOnboardingType, …>` cannot be satisfied with a missing key, so
 * widening the union in lib/onboarding/onboarding-type.ts without shipping the
 * screen is a compile error here. That belt is looser than it sounds — there is
 * no `tsc` npm script in this repo (only `npx tsc --noEmit` by hand, which
 * already fails on this branch for unrelated reasons), so the assertion that
 * really holds the line is the registry-completeness case in
 * __tests__/components/t-onboarding-variants.test.tsx, which iterates
 * T_ONBOARDING_TYPES against this object's keys at runtime.
 *
 * THE `universal` ALIAS IS RETIRED (Э8-B-2)
 * ----------------------------------------
 * Between Э8-A and Э8-B-2 both keys pointed at OnboardingClassic, because the
 * union — and a backend able to send `universal` — shipped ahead of the second
 * screen. That alias made useOnboardingType() observably INERT: both keys
 * rendered the same tree, so no render assertion anywhere could tell them apart
 * and nothing would have gone red had the repoint been forgotten. It was held in
 * place by a deliberately intolerant tripwire in
 * __tests__/components/t-onboarding-variants.test.tsx, written to FAIL on the
 * repoint rather than to accept either state, and deleted by the same commit
 * that repointed the entry below.
 *
 * What carries it now is the per-variant marker case in that same file, which
 * asserts `t-onboarding-variant-${type}` for each registry KEY. Each variant
 * hardcodes exactly one marker, so distinct markers imply distinct components —
 * a re-alias fails immediately, which the older union-regex form would not have
 * caught. That is what the root testIDs are for.
 */
export const T_ONBOARDING_VARIANTS: Record<
  TOnboardingType,
  ComponentType<TOnboardingVariantProps>
> = {
  classic: OnboardingClassic,
  universal: OnboardingUniversal,
};
