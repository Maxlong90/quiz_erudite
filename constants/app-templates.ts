import type { Href } from 'expo-router';

import { APP_SLUG } from '@/api/client';

/**
 * Registry of the app-template builds — the single source of truth for "this
 * build is its own app, not the erudite hub".
 *
 * The tree ships the erudite quiz AND a growing set of standalone template apps
 * selected at build time by EXPO_PUBLIC_APP_SLUG. Every template owns its splash,
 * home, economy and first-run flow; NOTHING from the erudite build (its splash,
 * language picker, onboarding carousel, paywall, dark navy scaffold) may leak
 * into them.
 *
 * That leak used to be the default, because the root Stack's initialRoute is the
 * shared erudite app/splash.tsx: it rendered FIRST for every build, showing a
 * brief erudite splash before the app's own and — on a FRESH install, i.e. what
 * an App Review reviewer and every new user gets — handing off into the erudite
 * language picker → onboarding → paywall. It went unnoticed on the dark
 * templates (their palette matches the erudite navy) and on dev devices (the
 * onboarding flag was already set), and only surfaced on the light Logo Quiz.
 *
 * Register a new template HERE and the guards below pick it up everywhere:
 *   - app/splash.tsx  — redirects to `splash` so the erudite splash never renders
 *   - app/index.tsx   — redirects cold starts to `splash`
 *   - app/_layout.tsx — paints the root scaffold `scaffoldBg` instead of the
 *                       erudite dark navy, so a light app never flashes navy
 *
 * __tests__/app/app-templates.test.tsx fails the build if an app under app/ has
 * its own splash.tsx but is missing here, so a new template cannot silently
 * inherit the erudite flow again.
 */
export interface AppTemplate {
  /** The build's own splash route — its true entry point. */
  splash: Href;
  /**
   * Base colour of the app's background, painted on the ROOT navigator scaffold
   * (system bg, navigator card, per-screen content bg) so the cold-start hand-off
   * never shows the erudite navy behind the app's own screens. Keep in sync with
   * the app's `components/<app>/app-background.tsx` BG_BASE.
   */
  scaffoldBg: string;
}

/** Keyed by EXPO_PUBLIC_APP_SLUG (the backend app slug, not the route folder). */
export const APP_TEMPLATES: Record<string, AppTemplate> = {
  'logo-quiz': { splash: '/logo-quiz/splash', scaffoldBg: '#AEC1F5' },
  'flags-quiz': { splash: '/flags-quiz/splash', scaffoldBg: '#0B54BC' },
  'coat-of-arms': { splash: '/coat-of-arms/splash', scaffoldBg: '#0B54BC' },
  'sport-quiz': { splash: '/sport-quiz/splash', scaffoldBg: '#0C1E30' },
  // Route folder (`italy-quiz`) intentionally differs from the backend slug.
  'italy-history-and-geography-quiz': { splash: '/italy-quiz/splash', scaffoldBg: '#7C74C9' },
  // The configurable template (app/t). Its scaffold is the BUNDLED dark bgSolid
  // (EruditeColors.dark.bgSolid, '#1a1a47'), so the cold-start scaffold matches
  // the tier the app paints with before any theme data arrives and there is
  // nothing to flash. Pinned by __tests__/constants/t-template-slugs.test.ts.
  'test-quiz': { splash: '/t/splash', scaffoldBg: '#1a1a47' },
  // scaffoldBg = FQColors.bgBase — the average tone of the "light haze" backdrop.
  'football-quiz': { splash: '/football-quiz/splash', scaffoldBg: '#2B2B26' },
};

/**
 * Builds whose palette is DATA rather than code — the configurable AppTemplate
 * (app/t), themed at runtime from GET /api/v1/apps/{slug}/theme.
 *
 * This list is the INERTNESS GATE for the remote theme engine. A build not named
 * here cannot fetch a theme, cannot read the theme cache key and cannot apply a
 * palette: APP_SLUG is baked into the binary from EXPO_PUBLIC_APP_SLUG and this
 * list is a checked-in literal, so the guarantee is static and holds no matter
 * what an operator does in Nova.
 *
 * The alternative — shipping the engine live everywhere and relying on every
 * production preset resolving to the bundled palette — was rejected: it makes
 * inertness a property of production DATA, so an operator saving the colour form
 * for a shipped app (the exact workflow the backend exists to enable) would
 * instantly re-skin a store build nobody QA'd. Inertness a non-engineer can
 * revoke by clicking Save is not inertness.
 *
 * `'test-quiz'` is a CONTRACT with the backend: the demo App is seeded by
 * 2026_09_07_000003_seed_configurable_quiz_demo.php and renamed to this slug by
 * 2026_09_08_000001_rename_demo_app_to_test_app.php. Renaming it there breaks
 * this client, and vice versa. Note the slug names the APP, not the template —
 * the app_categories row keeps code `configurable`.
 *
 * Adding a shipped slug here is a deliberate, reviewable act that re-skins a live
 * app; __tests__/constants/t-template-slugs.test.ts fails the build if one
 * appears by accident.
 */
export const T_TEMPLATE_SLUGS = ['test-quiz'] as const;

export type TTemplateSlug = (typeof T_TEMPLATE_SLUGS)[number];

/**
 * The template this build IS, or null for the erudite build (which keeps the
 * shared splash + intro). APP_SLUG is a build-time constant, so the result is
 * stable across renders — callers can branch on it before hooks without changing
 * hook order. A function rather than a constant so the lookup happens at call
 * time, which keeps it honest under tests that vary the build slug.
 */
export function currentTemplate(): AppTemplate | null {
  return APP_TEMPLATES[APP_SLUG] ?? null;
}

/**
 * True when THIS build is a configurable-template build, i.e. when the remote
 * theme engine is switched on. A function, not a constant, for the same reason
 * as currentTemplate(): the lookup happens at call time, which keeps it honest
 * under tests that vary the build slug.
 */
export function isTTemplateBuild(): boolean {
  return (T_TEMPLATE_SLUGS as readonly string[]).includes(APP_SLUG);
}
