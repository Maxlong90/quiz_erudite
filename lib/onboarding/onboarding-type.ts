/**
 * Which onboarding variant the configurable template renders.
 *
 * The value is operator data: the backend serves it, the client switches on it.
 * This module is the single source of truth for the union — the parser below, the
 * theme envelope that carries it (lib/theme/contract.ts), the cache record that
 * persists it (lib/theme/theme-cache.ts) and the hook the screens read
 * (hooks/t/use-onboarding-type.ts) all derive from T_ONBOARDING_TYPES.
 *
 * It lives under lib/ rather than constants/t/ because both lib/theme/contract.ts
 * and hooks/use-app-theme.ts consume it, and lib/ → constants/t/ is the wrong
 * dependency direction.
 *
 * Like lib/theme/contract.ts this module is I/O-FREE and imports nothing from
 * React Native. Nothing here throws and nothing here logs: parsing hostile input
 * is the whole job, so every failure is a value the caller must handle.
 */

/**
 * The variants this build ships. `classic` names the screen that ships TODAY.
 *
 * The naming mirrors the reference implementation this feature was specified
 * against, where `case "universal"` selects the new screen and `default` falls
 * back to the base one. Keeping `classic` as the default is what makes a build
 * that gets no answer from the backend render pixel-identically to what ships now.
 *
 * This list must equal the backend's admin enum, and equal the values an asset
 * pack manifest may declare in `onboarding_types`.
 */
export const T_ONBOARDING_TYPES = ['classic', 'universal'] as const;

export type TOnboardingType = (typeof T_ONBOARDING_TYPES)[number];

/** Fail-open default: what a build with no backend answer renders — today's screen. */
export const T_ONBOARDING_DEFAULT: TOnboardingType = 'classic';

/**
 * `null` for absent, the wrong type, or a variant this build does not ship.
 *
 * The match is EXACT — no case normalisation, no trimming. 'UNIVERSAL', 'Classic'
 * and ' classic ' are all rejected. Leniency looks helpful and is not: this union
 * has to equal the backend's admin enum byte for byte, and quietly coercing a
 * near-miss would hide a real mismatch behind a screen that happens to render.
 *
 * A variant a FUTURE backend knows about and this build does not also lands here,
 * which is correct — an unshipped screen cannot be rendered, so the default is the
 * only honest answer.
 */
export function parseOnboardingType(raw: unknown): TOnboardingType | null {
  if (typeof raw !== 'string') return null;
  return (T_ONBOARDING_TYPES as readonly string[]).includes(raw) ? (raw as TOnboardingType) : null;
}

/**
 * The total wrapper, and the ONE place the fail-open default is applied.
 *
 * Callers that need to tell "absent" from "resolved" (the cache, which stores the
 * distinction) use parseOnboardingType instead; everyone rendering a screen wants
 * this one, because a screen must always have a variant to draw.
 */
export function resolveOnboardingType(raw: unknown): TOnboardingType {
  return parseOnboardingType(raw) ?? T_ONBOARDING_DEFAULT;
}
