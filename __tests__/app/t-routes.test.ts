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
 * a template build, so /t is the only route that reaches the quiz loop, the
 * browse path and /paywall on the configurable build — nothing else would notice
 * if one of them moved out from under it.
 */
import fs from 'fs';
import path from 'path';

const APP_DIR = path.join(__dirname, '..', '..', 'app');

/**
 * Every route the template's own screens push, and the file expo-router
 * resolves each to. Named for the home because that is where the tree starts;
 * it covers the whole /t subtree, not one screen's push list.
 */
const TEMPLATE_DESTINATIONS: { route: string; file: string; why: string }[] = [
  {
    route: '/t/tokens',
    file: 't/tokens.tsx',
    why: 'long-press on the wordmark — the only device-level view of the live theme',
  },
  { route: '/t/quiz', file: 't/quiz.tsx', why: 'every mode tile that starts a run' },
  {
    route: '/t/results',
    file: 't/results.tsx',
    why: 'where every finished run lands, and the only way back to /t',
  },
  {
    route: '/t/category/[slug]',
    file: 't/category/[slug].tsx',
    why: 'tapping a category tile with questions in it',
  },
  {
    route: '/t/quiz-mode/[slug]',
    file: 't/quiz-mode/[slug].tsx',
    why: 'tapping a subcategory tile on the category screen',
  },
  {
    route: '/paywall',
    file: 'paywall.tsx',
    why: 'a premium-locked tile on the home OR on the mode picker — not ported yet',
  },
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
  it.each(TEMPLATE_DESTINATIONS)('$route is a real screen ($why)', ({ route, file }) => {
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

  /**
   * Screen names as expo-router derives them: the path under app/t/ with the
   * .tsx dropped, segments joined by `/`. Recursive on purpose — a nested route
   * such as `category/[slug]` registers under its full path, and a flat
   * readdirSync would report the layout as registering a screen that "does not
   * exist" the moment one lands. Today the result is unchanged.
   */
  function screenFilesUnder(dir: string): string[] {
    return fs.readdirSync(path.join(APP_DIR, 't', dir), { withFileTypes: true }).flatMap((entry) => {
      const relative = dir ? `${dir}/${entry.name}` : entry.name;
      if (entry.isDirectory()) return screenFilesUnder(relative);
      if (!entry.name.endsWith('.tsx') || entry.name === '_layout.tsx') return [];
      return [relative.replace(/\.tsx$/, '')];
    });
  }

  it('registers every screen file under app/t/', () => {
    const files = screenFilesUnder('');

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

/**
 * ESCAPE CHECK: no screen under app/t/ may navigate out of the /t subtree.
 *
 * This is the single highest-frequency bug available in this port. Every screen
 * here is a copy of an Erudite screen, and those screens go home with
 * `router.replace('/')`. app/t/quiz.tsx alone inherited FOUR of them. On a
 * template build app/index.tsx redirects '/' to '/t/splash', so a missed one
 * does not crash or dead-end — it silently bounces the player through the splash
 * screen on the way home, which only shows up on a device.
 *
 * A source scan rather than a render assertion, for the same reason
 * t-no-color-literals.test.ts is one: a route on a branch no test exercises (an
 * error state, a modal's onClose) is still a route.
 */
const ROUTE_LITERAL = /(['"`])(\/[^'"`\n]*)\1/g;

/**
 * Destinations that legitimately leave /t because their screens are not ported
 * yet. Each entry is asserted BOTH to be tolerated by the check above AND to
 * still be PRESENT somewhere under app/t — so the day the screen lands and the
 * last caller is re-pointed, the second assertion goes red asking for the entry
 * to be deleted. A temporary list that deletes itself, the same idiom the
 * literals guard used for its AHEAD_OF_THE_WALK list.
 *
 * `until` is a CONDITION rather than a subtask letter, because the letter is
 * exactly what rotted: the '/category/' entry that used to sit here was labelled
 * Э7-D and landed in Э7-C. A condition cannot go stale the way a queue position
 * can, and it is what the reader actually needs to know.
 */
const NOT_YET_PORTED: { prefix: string; until: string; why: string }[] = [
  {
    prefix: '/paywall',
    until: 'the paywall is ported',
    why: 'BOTH app/t/index.tsx and app/t/quiz-mode/[slug].tsx send a premium-locked tap there — re-point both in the commit that deletes this entry, or the assertion below stays green off the survivor while the escape check fires on the other',
  },
];

function routeLiteralsIn(relativePath: string): { route: string; line: number }[] {
  return codeOf(relativePath)
    .split('\n')
    .flatMap((text, index) =>
      [...text.matchAll(ROUTE_LITERAL)].map((match) => ({ route: match[2], line: index + 1 })),
    );
}

describe('every route the template navigates to stays inside /t', () => {
  // Recursive, so a nested screen added later is covered without a change here.
  function sourceFilesUnder(dir: string): string[] {
    return fs.readdirSync(path.join(APP_DIR, dir), { withFileTypes: true }).flatMap((entry) => {
      const relative = `${dir}/${entry.name}`;
      if (entry.isDirectory()) return sourceFilesUnder(relative);
      return /\.tsx?$/.test(entry.name) ? [relative] : [];
    });
  }

  const templateSources = sourceFilesUnder('t');

  it('scans a real set of files', () => {
    // A silently empty list would make every assertion below vacuously true.
    expect(templateSources.length).toBeGreaterThanOrEqual(6);
  });

  it.each(templateSources)('%s navigates only to /t routes', (file) => {
    const escaping = routeLiteralsIn(file).filter(
      ({ route }) =>
        route !== '/t' &&
        !route.startsWith('/t/') &&
        !NOT_YET_PORTED.some((pending) => route.startsWith(pending.prefix)),
    );
    expect({ file, escaping }).toEqual({ file, escaping: [] });
  });

  it.each(NOT_YET_PORTED)(
    '$prefix is still reached from app/t — once $until, delete the entry ($why)',
    ({ prefix }) => {
      const callers = templateSources.filter((file) =>
        routeLiteralsIn(file).some(({ route }) => route.startsWith(prefix)),
      );
      expect({ prefix, callers: callers.length > 0 }).toEqual({ prefix, callers: true });
    },
  );

  it('really does reach into the quiz loop', () => {
    // Proves the scanner sees route literals at all, rather than that the regex
    // silently matches nothing and every file trivially passes.
    const home = routeLiteralsIn('t/index.tsx').map(({ route }) => route);
    expect(home).toContain('/t/quiz');
    // The browse chain: home -> category -> quiz-mode -> quiz. Prefix matches
    // rather than equality, because two of the three are template literals.
    expect(home.some((route) => route.startsWith('/t/category/'))).toBe(true);
    expect(
      routeLiteralsIn('t/category/[slug].tsx').some(({ route }) =>
        route.startsWith('/t/quiz-mode/'),
      ),
    ).toBe(true);
    expect(routeLiteralsIn('t/quiz-mode/[slug].tsx').map(({ route }) => route)).toContain('/t/quiz');
    expect(routeLiteralsIn('t/quiz.tsx').map(({ route }) => route)).toContain('/t/results');
    expect(routeLiteralsIn('t/results.tsx').map(({ route }) => route)).toContain('/t');
  });

  it.each([
    ["router.replace('/');", ['/']],
    ['router.push(`/t/category/${slug}`);', ['/t/category/${slug}']],
    ["const url = 'https://example.test/';", []],
    ["await AsyncStorage.getItem('quiz.seen.v1.');", []],
  ])('picks the route out of %s', (source, expected) => {
    // A URL cannot match: the opening quote is followed by `h`, not `/`. Neither
    // can a storage key. A template literal must, because app/t/index.tsx uses
    // one for the category route.
    expect([...source.matchAll(ROUTE_LITERAL)].map((match) => match[2])).toEqual(expected);
  });
});

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
