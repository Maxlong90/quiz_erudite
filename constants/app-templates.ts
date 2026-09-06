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
};

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
