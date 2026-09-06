/**
 * Guardrail for the app-template registry (constants/app-templates.ts).
 *
 * The tree ships the erudite quiz plus a growing set of standalone template apps
 * picked at build time by EXPO_PUBLIC_APP_SLUG. The root Stack's initialRoute is
 * the shared erudite app/splash.tsx, so a template that is NOT in the registry
 * silently inherits the erudite flow: a brief erudite splash before its own and,
 * on a fresh install, the erudite language picker → onboarding → paywall. It is
 * invisible on dark templates and on dev devices that already ran onboarding, so
 * it reaches the store unnoticed — exactly how it shipped on Logo Quiz.
 *
 * These tests make that mistake impossible to miss: adding app/<app>/splash.tsx
 * without registering the build fails here, with the fix spelled out.
 */
import fs from 'fs';
import path from 'path';

// The registry derives CURRENT_TEMPLATE from the build slug, which pulls the
// axios-backed api client. Only the static map matters here, so stub the slug.
jest.mock('@/api/client', () => ({ APP_SLUG: 'erudite-quiz' }));

import { APP_TEMPLATES } from '@/constants/app-templates';

const APP_DIR = path.join(__dirname, '..', '..', 'app');

/** Route folders that own a splash screen, e.g. ['logo-quiz', 'sport-quiz', …]. */
function appsWithOwnSplash(): string[] {
  return fs
    .readdirSync(APP_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => fs.existsSync(path.join(APP_DIR, name, 'splash.tsx')))
    .sort();
}

/** '/logo-quiz/splash' -> 'logo-quiz' (the route folder the entry points at). */
function routeFolderOf(splashRoute: string): string {
  return splashRoute.replace(/^\//, '').split('/')[0];
}

describe('app-template registry', () => {
  it('registers every app that owns a splash screen', () => {
    const registered = new Set(
      Object.values(APP_TEMPLATES).map((t) => routeFolderOf(String(t.splash))),
    );
    const missing = appsWithOwnSplash().filter((folder) => !registered.has(folder));

    expect({
      missing,
      hint:
        missing.length > 0
          ? `app/${missing[0]}/splash.tsx exists but no APP_TEMPLATES entry points at it. ` +
            'Add { splash: "/<folder>/splash", scaffoldBg: "<its BG_BASE>" } keyed by the ' +
            "build's EXPO_PUBLIC_APP_SLUG, or it will render the erudite splash and, on a " +
            'fresh install, the erudite language picker / onboarding / paywall.'
          : 'all app splashes are registered',
    }).toEqual({ missing: [], hint: 'all app splashes are registered' });
  });

  it('points every entry at a splash screen that exists', () => {
    for (const [slug, template] of Object.entries(APP_TEMPLATES)) {
      const route = String(template.splash);
      const file = path.join(APP_DIR, routeFolderOf(route), 'splash.tsx');
      expect({ slug, route, exists: fs.existsSync(file) }).toEqual({
        slug,
        route,
        exists: true,
      });
    }
  });

  it('gives every entry its own opaque scaffold colour', () => {
    for (const [slug, template] of Object.entries(APP_TEMPLATES)) {
      // A non-opaque or missing colour lets the erudite navy show through during
      // the cold-start hand-off — the "dark first splash" this registry prevents.
      expect({ slug, scaffoldBg: template.scaffoldBg }).toEqual({
        slug,
        scaffoldBg: expect.stringMatching(/^#[0-9a-fA-F]{6}$/),
      });
    }
  });
});
