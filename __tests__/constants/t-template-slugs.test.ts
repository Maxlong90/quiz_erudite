/**
 * THE INERTNESS GATE (constants/app-templates.ts, T_TEMPLATE_SLUGS).
 *
 * The remote theme engine is switched on per BUILD SLUG. Because APP_SLUG is
 * baked into the binary from EXPO_PUBLIC_APP_SLUG and this list is a checked-in
 * literal, a build that is not named here provably cannot fetch a theme, read the
 * theme cache or apply a palette — the guarantee is static, and no operator
 * action in Nova can revoke it.
 *
 * Adding a shipped slug to that list re-skins a live, store-published app with a
 * palette nobody QA'd or took screenshots of. That must never happen by accident,
 * so it fails here by name.
 */
jest.mock('@/api/client', () => ({ APP_SLUG: 'erudite-quiz' }));

import { APP_TEMPLATES, T_TEMPLATE_SLUGS } from '@/constants/app-templates';
import { EruditeColors } from '@/constants/theme';

/**
 * Every build this tree currently ships: the erudite flagship plus the five
 * siblings. The task named five; proving inertness for all six is strictly
 * stronger, so it cannot be the wrong reading.
 */
const SHIPPED_BUILD_SLUGS = [
  'erudite-quiz',
  'logo-quiz',
  'flags-quiz',
  'coat-of-arms',
  'sport-quiz',
  'italy-history-and-geography-quiz',
] as const;

describe('T_TEMPLATE_SLUGS', () => {
  it('is exactly the configurable demo slug', () => {
    // A CONTRACT with the backend, fixed by migration
    // 2026_09_07_000003_seed_configurable_quiz_demo.php. Renaming it in either
    // repo breaks the other.
    expect(T_TEMPLATE_SLUGS).toEqual(['configurable-quiz']);
  });

  it.each(SHIPPED_BUILD_SLUGS)('does NOT contain the shipped build %s', (slug) => {
    expect(T_TEMPLATE_SLUGS as readonly string[]).not.toContain(slug);
  });

  it('registers every configurable slug in APP_TEMPLATES too', () => {
    // Otherwise the build would fall through to the shared erudite splash and,
    // on a fresh install, the erudite language picker / onboarding / paywall.
    for (const slug of T_TEMPLATE_SLUGS) {
      expect(Object.keys(APP_TEMPLATES)).toContain(slug);
    }
  });

  it('scaffolds the configurable template in the BUNDLED dark background', () => {
    // The scaffold is painted during the cold-start hand-off, before any theme
    // data exists. Matching the bundled tier is what makes that hand-off flashless.
    expect(APP_TEMPLATES['configurable-quiz'].scaffoldBg).toBe(EruditeColors.dark.bgSolid);
    expect(APP_TEMPLATES['configurable-quiz'].scaffoldBg).toBe('#1a1a47');
  });

  it('points the configurable template at its own splash', () => {
    expect(APP_TEMPLATES['configurable-quiz'].splash).toBe('/t/splash');
  });
});
