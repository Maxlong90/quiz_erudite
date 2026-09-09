import type { ComponentType } from 'react';

import { OnboardingClassic } from '@/components/t/onboarding/classic';
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
 * WHY `universal` POINTS AT THE CLASSIC SCREEN
 * -------------------------------------------
 * Deliberate and temporary. Э8-A shipped the union — and with it a backend able
 * to send `universal` — AHEAD of the second screen, so this map has to answer
 * for a value that has no artwork yet. Pointing it at the screen that does ship
 * means an operator selecting `universal` today gets the classic onboarding
 * rather than a crash or a blank; repointing this one line IS the landing of
 * Э8-B-2.
 *
 * Note what that costs in the meantime: useOnboardingType() is observably INERT.
 * Both keys resolve to the same component, so no render assertion can tell the
 * two apart and nothing goes red if the repoint is forgotten. That is exactly
 * why OnboardingClassic carries a `t-onboarding-variant-classic` root testID —
 * the assertion that catches a forgotten repoint costs one line the moment there
 * is a second id to assert against.
 */
export const T_ONBOARDING_VARIANTS: Record<
  TOnboardingType,
  ComponentType<TOnboardingVariantProps>
> = {
  classic: OnboardingClassic,
  // TEMPORARY: Э8-B-2 replaces this with the universal variant. See above.
  universal: OnboardingClassic,
};
