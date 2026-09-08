/**
 * ROUTE INTEGRITY for the configurable template's home screen.
 *
 * __tests__/app/t-home.test.tsx proves the screen calls router.push with the
 * right path — but it MOCKS expo-router, so every destination it asserts is a
 * string, not a screen. Delete app/t/tokens.tsx or move app/paywall.tsx and that
 * suite stays green while the running app dead-ends on a blank route.
 *
 * This file closes that gap the same way __tests__/app/app-templates.test.tsx
 * does for the per-app splashes: by checking on disk that every destination the
 * template home can navigate to is backed by a real route file.
 *
 * It matters more here than on the Erudite home. app/index.tsx redirects away on
 * a template build, so /t is the only route that reaches /quiz, /category/… and
 * /paywall on the configurable build — nothing else would notice if one of them
 * moved out from under it.
 */
import fs from 'fs';
import path from 'path';

const APP_DIR = path.join(__dirname, '..', '..', 'app');

/** Route paths app/t/index.tsx pushes, and the file expo-router resolves each to. */
const HOME_DESTINATIONS: { route: string; file: string; why: string }[] = [
  {
    route: '/t/tokens',
    file: 't/tokens.tsx',
    why: 'long-press on the wordmark — the only device-level view of the live theme',
  },
  { route: '/quiz', file: 'quiz.tsx', why: 'every mode tile that starts a run' },
  {
    route: '/category/[slug]',
    file: 'category/[slug].tsx',
    why: 'tapping a category tile with questions in it',
  },
  { route: '/paywall', file: 'paywall.tsx', why: 'tapping a premium-locked mode tile' },
];

/** Routes the BottomBar rendered by the template home can reach. */
const BOTTOM_BAR_DESTINATIONS = [
  'account.tsx',
  'paywall.tsx',
  'shop.tsx',
  'stats.tsx',
  'settings.tsx',
];

describe('every destination the template home navigates to exists', () => {
  it.each(HOME_DESTINATIONS)('$route is a real screen ($why)', ({ route, file }) => {
    const target = path.join(APP_DIR, file);
    expect({ route, file, exists: fs.existsSync(target) }).toEqual({
      route,
      file,
      exists: true,
    });
  });

  it.each(BOTTOM_BAR_DESTINATIONS)('the bottom bar can still reach %s', (file) => {
    expect(fs.existsSync(path.join(APP_DIR, file))).toBe(true);
  });
});

describe('the template stack', () => {
  const layout = fs.readFileSync(path.join(APP_DIR, 't', '_layout.tsx'), 'utf8');
  const screenNames = [...layout.matchAll(/<Stack\.Screen\s+name="([^"]+)"/g)].map((m) => m[1]);

  it('registers every screen file under app/t/', () => {
    const files = fs
      .readdirSync(path.join(APP_DIR, 't'))
      .filter((name) => name.endsWith('.tsx') && name !== '_layout.tsx')
      .map((name) => name.replace(/\.tsx$/, ''));

    // An unregistered screen still renders (expo-router is file-based) but
    // silently loses the per-screen options declared here — for `tokens` that
    // is the slide animation, for `splash` it is the deliberate absence of one.
    expect({ files: files.sort(), registered: [...screenNames].sort() }).toEqual({
      files: files.sort(),
      registered: files.sort(),
    });
  });

  it('keeps home and splash registered alongside the moved gallery', () => {
    expect(screenNames).toEqual(expect.arrayContaining(['splash', 'index', 'tokens']));
  });

  it('paints nothing behind the screens, so ScreenBackground owns the backdrop', () => {
    // The transparent card background is what lets each screen's themed
    // gradient be the only thing painted underneath.
    expect(layout).toMatch(/backgroundColor:\s*'transparent'/);
  });
});

/**
 * Strip comments before scanning source. The template home DOCUMENTS the traps
 * it avoids ("Hence no Redirect, no intro-gate…"), so a naive text match would
 * fire on the explanation rather than on code — the same false positive
 * __tests__/app/t-no-color-literals.test.ts guards against.
 */
function codeOf(relativePath: string): string {
  return fs
    .readFileSync(path.join(APP_DIR, relativePath), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:"'`\\])\/\/.*$/gm, '$1');
}

describe('the template home is a screen, not the erudite entry gate', () => {
  const home = codeOf(path.join('t', 'index.tsx'));

  /**
   * The single most damaging mistake available in this port. app/index.tsx's
   * HomeRoute consumes a process-lifetime cold-start flag and redirects into the
   * ERUDITE splash → language picker → onboarding. On a template build
   * app/index.tsx returns its redirect BEFORE consuming that flag, so if the
   * template home consumed it the player would be dropped into the erudite intro
   * — exactly the leak constants/app-templates.ts exists to prevent. Re-checking
   * currentTemplate() here would instead loop /t → /t/splash → /t forever.
   *
   * Asserted on the source rather than by rendering, because both faults are a
   * redirect on FIRST mount in a real app — the mocked-router render in
   * t-home.test.tsx cannot see either.
   */
  it.each([
    ['@/lib/intro-gate', 'consumeColdStart would burn the flag and leak the erudite intro flow'],
    ['@/constants/app-templates', 'currentTemplate would loop /t -> /t/splash -> /t'],
  ])('never imports %s (%s)', (moduleId) => {
    expect(home).not.toContain(moduleId);
  });

  it('renders instead of redirecting', () => {
    expect(home).not.toMatch(/\bRedirect\b/);
  });

  it('reuses the shared ScreenBackground rather than forking a t-scoped copy', () => {
    // That component is the app's only bgGradient consumer and the proof that a
    // remote token reaches a native LinearGradient through unchanged code.
    expect(home).toContain("@/components/screen-background");
  });
});
