import type { SupportedLocale } from '@/hooks/use-locale';
import { useTranslation } from '@/hooks/use-translation';
import type { StringKey } from '@/i18n/strings';

/**
 * The single text funnel for the configurable template — the sibling of
 * hooks/t/use-template-theme.ts, and for the same reason.
 *
 * THIS IS A SEAM, NOT A BEHAVIOUR
 * ------------------------------
 * Today it IS useTranslation(), verbatim and by delegation. It buys nothing at
 * runtime and it is not meant to: what it buys is a single place for task Э4 to
 * change. Э4 makes an operator able to override the template's wording from the
 * backend the way Э1 made them able to override its colours, and when it lands
 * ONLY THIS FUNCTION'S BODY MOVES — it will prefer a remote, operator-authored
 * string and fall back to i18n/strings.ts. No call site changes.
 *
 * WHY IT DELEGATES RATHER THAN REIMPLEMENTS
 * -----------------------------------------
 * Reading STRINGS/useLocale directly here would be a second translation engine
 * living beside the shipped one: two places to fix a missing locale, and — more
 * immediately — a call site that escapes every `jest.mock('@/hooks/use-translation')`
 * in the suite. Delegating keeps those mocks reaching this hook untouched, which
 * is precisely what let the onboarding split land without editing a test.
 *
 * StringKey STAYS THE KEY SPACE
 * -----------------------------
 * A remote layer may only OVERRIDE a key that already exists in all four locales;
 * it may not invent one. That is the whole safety argument for Э4: a missing,
 * empty, wrong-typed or hostile remote value degrades to the bundled sentence
 * rather than to a blank button. `reject a set you cannot half-apply; degrade a
 * scalar you can` — docs/configurable-template.md — applies to sentences too.
 *
 * SCOPE LIMIT: WHO IS ALLOWED TO CALL THIS
 * ----------------------------------------
 * The onboarding HOST (app/t/onboarding.tsx) is the only caller. The onboarding
 * variants under components/t/onboarding/ receive `t` as a prop and never reach
 * for it themselves. That is deliberate: one funnel point per screen is what
 * keeps Э4 a one-file edit instead of a sweep, and it keeps a variant
 * presentational — see components/t/onboarding/contract.ts for the ownership
 * rule the same split enforces for navigation and capability gating.
 *
 * TWO NOTES FOR WHOEVER LANDS Э4
 * ------------------------------
 *  - Memoise the returned `t` with useCallback on [locale, overrides]. Roughly
 *    sixty-nine call sites in this app are shaped
 *    `useMemo(() => makeStyles(colors), [colors])`, and translated labels feed
 *    the same pattern; use-template-theme.ts documents the identity argument at
 *    length. useTranslation() already keys its useCallback on [locale], so today
 *    there is nothing to memoise.
 *  - `locale` is typed SupportedLocale but is `undefined` inside
 *    __tests__/app/t-onboarding.test.tsx, whose frozen mock returns `{ t }` and
 *    nothing else. Inert today because nothing reads it. The first consumer of
 *    `locale` must widen that mock in a NEW test file — that one may not be
 *    edited (Э8-B-2 parameterises it).
 */
export type TemplateCopy = (key: StringKey, vars?: Record<string, string | number>) => string;

export function useTemplateCopy(): { t: TemplateCopy; locale: SupportedLocale } {
  return useTranslation();
}
