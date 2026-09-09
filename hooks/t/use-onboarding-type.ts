import { useRef } from 'react';

import { useAppTheme } from '@/hooks/use-app-theme';
import { T_ONBOARDING_DEFAULT, type TOnboardingType } from '@/lib/onboarding/onboarding-type';

/**
 * Which onboarding variant this build should render.
 *
 * THE TRANSPORT IS DELIBERATELY HIDDEN HERE
 * -----------------------------------------
 * Today the value rides the theme envelope (GET /apps/{slug}/theme), for one
 * reason: that is the only payload app/t/splash.tsx already waits for. The splash
 * blocks navigation on `hydrated && networkSettled` from the theme engine, so the
 * value is guaranteed settled before /t/onboarding can mount — no new request, no
 * new gate, and no screen that swaps out mid-scroll when a second fetch lands.
 *
 * When task Э2/Э3 introduces /apps/{slug}/config, ONLY THIS FUNCTION'S BODY
 * MOVES. The union, the parser, the switch and both screens stay exactly where
 * they are. That is the entire point of routing every consumer through one hook
 * rather than letting screens read useAppTheme().onboardingType themselves.
 *
 * WHY IT IS FROZEN AT FIRST RENDER
 * --------------------------------
 * The splash already guarantees the value is settled before any consumer mounts,
 * so the only way it could change later is the token gallery's manual refetch.
 * Swapping the variant mid-flow would remount the onboarding component and
 * silently reset the page the user was on — a worse outcome than showing the
 * variant that was live when the flow started.
 *
 * Fail-open at every step: no provider at all, a non-configurable build, an
 * offline device and a backend that has never heard of the key all resolve to
 * T_ONBOARDING_DEFAULT, which names the screen that ships today.
 */
export function useOnboardingType(): TOnboardingType {
  const live = useAppTheme()?.onboardingType ?? T_ONBOARDING_DEFAULT;
  const frozen = useRef(live);
  return frozen.current;
}
