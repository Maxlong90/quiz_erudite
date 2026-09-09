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

/**
 * The variant a developer has pinned by hand from the token gallery, or `null`.
 *
 * WHY THIS EXISTS AT ALL
 * ----------------------
 * It is not a convenience. Today it is the ONLY way to see the second onboarding
 * screen on hardware. The deployed backend serves `schema_version: 2` on every
 * slug while CLIENT_THEME_SCHEMA_VERSION is still 1, so the client rejects the
 * whole envelope as `unsupported-schema` and never reads the `onboarding_type`
 * riding inside it — a pre-existing gap that belongs to the widened-token work,
 * not to this feature (docs/configurable-template.md records the live state).
 * Without this override the switch is unobservable outside Jest.
 *
 * Module state, never persisted. It survives router.replace() — which is what
 * makes the gallery -> dev-reset -> splash -> onboarding walk work — and dies
 * with the process or with a Fast Refresh of this file. That is the property, not
 * a limitation: nothing a developer flips by hand can follow a build to a user.
 */
let forcedType: TOnboardingType | null = null;

/** Pin a variant, or release the pin with `null`. Called only by the gallery. */
export function setForcedOnboardingType(next: TOnboardingType | null): void {
  forcedType = next;
}

/**
 * The pin as the READ side sees it: always `null` outside a development build.
 *
 * THE GATE IS ON THE READ, NOT ON THE SETTER, and that is load-bearing twice
 * over. This is the only place the value is consulted, so gating here is TOTAL —
 * a future caller of the setter cannot open a live path by accident. And
 * `__DEV__` is read at CALL TIME rather than captured in a module const, so the
 * production-inertness case can flip the global; a `const DEV = __DEV__` at
 * module scope would freeze at import and make that assertion unwritable.
 *
 * Metro constant-folds `__DEV__` away in a release bundle, so this whole branch —
 * and, since nothing else references it, the module variable behind it — is dead
 * code the minifier drops.
 */
export function forcedOnboardingType(): TOnboardingType | null {
  return __DEV__ ? forcedType : null;
}

export function useOnboardingType(): TOnboardingType {
  /**
   * The engine read is bound UNCONDITIONALLY, on its own line, BEFORE the `??`
   * chain below. Do not fold it back into one expression.
   *
   * `useAppTheme()` is literally `useContext(AppThemeContext)`, and `??`
   * short-circuits the EVALUATION of its right operand — so
   * `forcedOnboardingType() ?? useAppTheme()?.onboardingType` skips a hook call
   * on exactly the renders where a pin is set. That changes the hook count
   * between renders of the same component instance and shifts the useRef below
   * it: "Rendered fewer hooks than expected", or silent garbage. The `?.` AFTER
   * the call is fine — it guards the property access, not the call.
   */
  const fromEngine = useAppTheme()?.onboardingType;
  // The pin sits INSIDE the freeze, deliberately. Forcing a variant does not
  // swap the screen under a mounted flow; it takes effect on the next fresh
  // mount, which the /t/settings dev reset provides by wiping the seen flag and
  // sending the developer back through the splash.
  const live = forcedOnboardingType() ?? fromEngine ?? T_ONBOARDING_DEFAULT;
  const frozen = useRef(live);
  return frozen.current;
}
