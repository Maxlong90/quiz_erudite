/**
 * App template registry.
 *
 * The mobile codebase is shared across the whole app portfolio; the concrete
 * app is picked at build time (EXPO_PUBLIC_APP_SLUG), and the backend tags each
 * app with a stable "template" code via its App Template (see the backend
 * AppCategory.code). That code — delivered in the content snapshot as
 * `snapshot.app.template` — selects which root experience the app boots into.
 *
 * This module is the SINGLE branch point for that decision. Branch on the
 * `code` only, never on an app's name or slug: names/slugs are display-facing
 * and unstable, the template code is the contract.
 */

/** Root experiences the app can boot into. */
export type AppExperience = 'erudite' | 'logo_quiz';

/**
 * Safe default when the template code is missing or unrecognised — keeps older
 * snapshots (and any not-yet-mapped template) on the standard trivia home
 * rather than a blank or wrong screen.
 */
export const DEFAULT_EXPERIENCE: AppExperience = 'erudite';

/**
 * Map of backend template code -> root experience. Codes that intentionally
 * fall through to the default (e.g. 'coat_of_arms', 'sports', 'world') simply
 * have no entry here and resolve to DEFAULT_EXPERIENCE until they get their own
 * experience.
 */
const CODE_TO_EXPERIENCE: Record<string, AppExperience> = {
  erudite: 'erudite',
  logo_quiz: 'logo_quiz',
};

/**
 * Resolve a backend template code to the root experience the app should show.
 * Unknown, empty, null, or undefined codes fall back to DEFAULT_EXPERIENCE.
 */
export function resolveExperience(code?: string | null): AppExperience {
  if (!code) {
    return DEFAULT_EXPERIENCE;
  }
  return CODE_TO_EXPERIENCE[code] ?? DEFAULT_EXPERIENCE;
}
