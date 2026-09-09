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
 * This list must equal the backend's admin enum IN ORDER — see the order pin in
 * __tests__/lib/onboarding-type.test.ts and its counterpart,
 * tests/Unit/OnboardingTypeEnumTest::test_the_enum_holds_the_three_documented_cases.
 *
 * An asset pack manifest may declare only the RENDERED subset in
 * `onboarding_types`: `none` names the absence of a screen, so no pack can claim
 * to draw it, and filtering packs by it would empty the operator's picker. That
 * mirrors the backend's `OnboardingTypeEnum::constrainsPacks()`, where
 * `None => false`.
 */
export const T_ONBOARDING_TYPES = ['classic', 'universal', 'none'] as const;

export type TOnboardingType = (typeof T_ONBOARDING_TYPES)[number];

/**
 * The types that have a SCREEN BEHIND THEM — not the same set as the types an
 * operator may choose. `none` is a legitimate choice that draws nothing, and
 * separating the two sets is what lets the variant registry stay a TOTAL Record
 * (components/t/onboarding/index.ts) while `none` is deliberately absent from it.
 */
export type TOnboardingRenderedType = Exclude<TOnboardingType, 'none'>;

/**
 * Fail-open default: what a build with no backend answer renders — today's screen.
 *
 * Typed as the RENDERED subset, not the full union, so "the fail-open default must
 * actually draw something" is a compile-time fact rather than a convention. Every
 * `?? T_ONBOARDING_VARIANTS[T_ONBOARDING_DEFAULT]` in the tree depends on it: a
 * default that resolved to a non-rendering type would make each of those
 * `undefined`.
 */
export const T_ONBOARDING_DEFAULT: TOnboardingRenderedType = 'classic';

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

/**
 * Does this type put an onboarding screen on the display?
 *
 * The intro gate (app/t/splash.tsx) asks this next to the seen-flag to decide
 * whether the onboarding stack is entered at all. It is the whole mobile-side
 * implementation of `onboarding_type: none`.
 *
 * IT TAKES THE PARSED UNION, NOT `unknown`, ON PURPOSE. The strictness of this
 * module belongs to its PARSING BOUNDARY (parseOnboardingType); a second helper
 * that accepted raw input would be a second, weaker parser reachable around the
 * first. Owners of raw data compose instead:
 * `showsOnboarding(resolveOnboardingType(raw))`.
 *
 * IT ASKS `!== 'none'` RATHER THAN ALLOW-LISTING THE RENDERED TYPES. The two are
 * equivalent today and diverge the moment the union grows — and only one of them
 * diverges LOUDLY. Add a new type that DOES draw: the negative form returns
 * `true`, which is right, and forgetting to register its screen is then a compile
 * error against `Record<TOnboardingRenderedType, …>` plus a red registry test. An
 * allow-list would return `false` and SILENTLY SKIP onboarding for a type that
 * has a perfectly good screen. Stating the skip as an enumerated exception is
 * also how the backend states it (`OnboardingTypeEnum::constrainsPacks()`).
 *
 * The type predicate earns its keep twice: it derives the runtime subset below
 * without a cast, and it narrows the registry lookup in app/t/onboarding.tsx.
 *
 * It does not parse, so a value smuggled past the union (`'NONE' as
 * TOnboardingType`) reads as rendering — the fail-open direction, which the
 * host's `??` then catches.
 */
export function showsOnboarding(type: TOnboardingType): type is TOnboardingRenderedType {
  return type !== 'none';
}

/**
 * The rendered subset, derived rather than restated so the two cannot drift.
 *
 * Consumers that must enumerate SCREENS (the variant registry's completeness
 * assertions, the parameterised host tests) use this; consumers that enumerate
 * OPERATOR CHOICES (the parser, the gallery's force-cycle) use the full union.
 */
export const T_ONBOARDING_RENDERED_TYPES: readonly TOnboardingRenderedType[] =
  T_ONBOARDING_TYPES.filter(showsOnboarding);
