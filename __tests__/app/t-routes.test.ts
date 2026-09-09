/**
 * ROUTE INTEGRITY for the configurable template's home screen.
 *
 * __tests__/app/t-home.test.tsx proves the screen calls router.push with the
 * right path — but it MOCKS expo-router, so every destination it asserts is a
 * string, not a screen. Delete app/t/tokens.tsx or move app/t/paywall.tsx and
 * that suite stays green while the running app dead-ends on a blank route.
 *
 * This file closes that gap the same way __tests__/app/app-templates.test.tsx
 * does for the per-app splashes: by checking on disk that every destination the
 * template home can navigate to is backed by a real route file.
 *
 * It matters more here than on the Erudite home. app/index.tsx redirects away on
 * a template build, so /t is the only route that reaches the quiz loop, the
 * browse path and the paywall on the configurable build — nothing else would
 * notice if one of them moved out from under it.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..', '..');
const APP_DIR = path.join(ROOT, 'app');

/**
 * THE SOURCE SCANNERS, hoisted above every declaration that uses them.
 *
 * Their position is load-bearing rather than cosmetic. BOTTOM_BAR_DESTINATIONS
 * below is DERIVED by calling routeLiteralsIn at module-evaluation time, and
 * these four used to be declared halfway down the file. A `const` read before
 * its initialiser runs throws `ReferenceError: Cannot access 'ROUTE_LITERAL'
 * before initialization`, which reads like a broken test file rather than like
 * the ordering mistake it is.
 *
 * They are ROOT-relative while the existsSync machinery below stays APP_DIR-
 * relative, because the scan now spans TWO trees: app/t/ and components/t/. The
 * template's bottom bar lives outside app/, and scanning only app/ is exactly
 * the blind spot that let the SHARED bar's six Erudite destinations survive the
 * entire nine-screen port unnoticed. Re-rooting the rest of the file would churn
 * seven `why` strings for nothing.
 */

/**
 * Strip comments before scanning source. The template home DOCUMENTS the traps
 * it avoids ("Hence no Redirect, no intro-gate…"), so a naive text match would
 * fire on the explanation rather than on code — the same false positive
 * __tests__/app/t-no-color-literals.test.ts guards against.
 */
function codeOf(relativePath: string): string {
  return fs
    .readFileSync(path.join(ROOT, relativePath), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:"'`\\])\/\/.*$/gm, '$1');
}

/** Recursive, so a nested screen added later is covered without a change here. */
function sourceFilesUnder(dir: string): string[] {
  return fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((entry) => {
    const relative = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return sourceFilesUnder(relative);
    return /\.tsx?$/.test(entry.name) ? [relative] : [];
  });
}

/** A quoted string starting with `/`. The escape check below is built on it. */
const ROUTE_LITERAL = /(['"`])(\/[^'"`\n]*)\1/g;

function routeLiteralsIn(relativePath: string): { route: string; line: number }[] {
  return codeOf(relativePath)
    .split('\n')
    .flatMap((text, index) =>
      [...text.matchAll(ROUTE_LITERAL)].map((match) => ({ route: match[2], line: index + 1 })),
    );
}

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
    route: '/t/paywall',
    file: 't/paywall.tsx',
    why: 'a premium-locked tile on the home OR on the mode picker, and the onboarding pitch',
  },
  {
    route: '/t/splash',
    file: 't/splash.tsx',
    why: "the dev reset in settings, which wipes onboarding.seen.v1 and sends the player back through the template's first-launch path",
  },
];

/**
 * Where the template's own bottom bar can send the player — DERIVED from the
 * component's source, not listed here.
 *
 * A hand list used to sit at this spot, and it is worth recording what it did:
 * it named five ERUDITE screen files (app/account.tsx, app/shop.tsx and so on)
 * under a test name claiming to check the TEMPLATE's nav. Those five files ship
 * in the live app and will exist forever, so the assertion was unfalsifiable —
 * it stayed green through the entire nine-screen port while every slot in the
 * bar still navigated out of /t. Re-pointing it by hand at t/*.tsx would fix
 * today's fact and keep the mechanism that produced the rot; reading the routes
 * off the component means the list cannot disagree with the component.
 */
const BAR_SOURCE = 'components/t/bottom-bar.tsx';
const BAR_ROUTES = routeLiteralsIn(BAR_SOURCE).map(({ route }) => route);
const BOTTOM_BAR_DESTINATIONS = [...new Set(BAR_ROUTES)].sort();

/**
 * '/t' is the index route; every other slot is a flat file under app/t/.
 *
 * TOTAL on purpose: a route this cannot express yields a filename that does not
 * exist and the test goes red, rather than being silently skipped. The bar has
 * no dynamic route today — if one ever lands, that red is the correct signal to
 * teach this function about [slug].
 */
function routeToScreenFile(route: string): string {
  return route === '/t' ? 't/index.tsx' : `${route.slice(1)}.tsx`;
}

describe('every destination the template home navigates to exists', () => {
  it.each(TEMPLATE_DESTINATIONS)('$route is a real screen ($why)', ({ route, file }) => {
    const target = path.join(APP_DIR, file);
    expect({ route, file, exists: fs.existsSync(target) }).toEqual({
      route,
      file,
      exists: true,
    });
  });

  it('derives six destinations from the bar\'s five rendered slots', () => {
    // An exact count rather than a floor: this is the anti-vacuity guard for a
    // derived list, and a derived list that quietly resolved to nothing would
    // make the it.each below run zero cases and pass.
    //
    // Six from five because the leftmost slot is two routes — a gold crown to
    // /t/paywall for a free player, a person to /t/account once subscribed.
    expect(BOTTOM_BAR_DESTINATIONS).toHaveLength(6);
  });

  it.each([
    ['/t', 't/index.tsx', 'the index route is the one special case'],
    ['/t/shop', 't/shop.tsx', 'a flat slot'],
    ['/t/category/[slug]', 't/category/[slug].tsx', 'a nested route maps by path, no special case needed'],
  ])('routeToScreenFile(%s) -> %s (%s)', (route, file) => {
    // Pins the mapping the it.each below depends on. Without this the derived
    // list could resolve every route to a wrong-but-existing file and the
    // existence check would pass while proving nothing about the bar.
    expect(routeToScreenFile(route)).toBe(file);
  });

  it('is TOTAL — an inexpressible route yields a missing file, never a silent skip', () => {
    // The claim in routeToScreenFile's docblock, asserted rather than trusted.
    // A template-literal route is the realistic case (app/t/index.tsx uses one
    // for /t/category/${slug}). The point is that it produces a filename which
    // does NOT exist, so the existence check goes red and asks to be taught
    // about the new shape — rather than the route being quietly dropped.
    const inexpressible = routeToScreenFile('/t/category/${slug}');
    expect(inexpressible).toBe('t/category/${slug}.tsx');
    expect(fs.existsSync(path.join(APP_DIR, inexpressible))).toBe(false);
  });

  it.each(BOTTOM_BAR_DESTINATIONS)('the bottom bar can still reach %s', (route) => {
    const file = routeToScreenFile(route);
    expect({ route, file, exists: fs.existsSync(path.join(APP_DIR, file)) }).toEqual({
      route,
      file,
      exists: true,
    });
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
 * ESCAPE CHECK: nothing in the /t surface may navigate out of the /t subtree.
 *
 * This is the single highest-frequency bug available in this port. Every screen
 * here is a copy of an Erudite screen, and those screens go home with
 * `router.replace('/')`. app/t/quiz.tsx alone inherited FOUR of them. On a
 * template build app/index.tsx redirects '/' to '/t/splash', so a missed one
 * does not crash or dead-end — it silently bounces the player through the splash
 * screen on the way home, which only shows up on a device.
 *
 * The surface is app/t/ AND components/t/: the last file to escape this check
 * was not a screen at all but the bottom bar every screen mounts, which lived
 * outside app/ and was therefore never scanned.
 *
 * A source scan rather than a render assertion, for the same reason
 * t-no-color-literals.test.ts is one: a route on a branch no test exercises (an
 * error state, a modal's onClose) is still a route.
 */

/**
 * There is deliberately NO tolerance list here any more.
 *
 * One used to sit at this spot — NOT_YET_PORTED, a self-deleting register of
 * destinations that legitimately left /t because their screens had not been
 * copied yet. Its last entry was '/paywall', and app/t/paywall.tsx retired it:
 * every route the template reaches is now inside the subtree, so the escape
 * check below is unconditional. If a future port needs the mechanism back,
 * resurrect it from this file's history rather than adding a bare exemption —
 * the value was in the assertions that made an entry demand its own deletion,
 * not in the list itself.
 *
 * Note also what its `until` field was: a CONDITION, never a subtask letter. The
 * letter is exactly what rotted — the '/category/' entry it once carried was
 * labelled Э7-D and landed in Э7-C. Do not reintroduce one.
 */

/**
 * The two trees the escape check scans, each with its OWN floor.
 *
 * One combined floor is what this used to be, and it could not survive the
 * second tree: app/t/ alone supplies fourteen files, so `templateSources.length
 * >= 6` would stay green with components/t/ deleted, empty, or never created —
 * and the bottom bar going unscanned is precisely the gap this subtask closed.
 * A floor that a sibling can satisfy on another's behalf is not a floor.
 */
const TEMPLATE_TREES: { dir: string; minFiles: number; why: string }[] = [
  { dir: 'app/t', minFiles: 6, why: 'the template screens' },
  { dir: 'components/t', minFiles: 1, why: 'the t-scoped bottom bar every screen mounts' },
];

describe('every route the template navigates to stays inside /t', () => {
  const templateSources = TEMPLATE_TREES.flatMap(({ dir }) => sourceFilesUnder(dir));

  it.each(TEMPLATE_TREES)('$dir is a real tree with files in it ($why)', ({ dir, minFiles }) => {
    // A silently empty tree would make every assertion below vacuously true.
    expect(sourceFilesUnder(dir).length).toBeGreaterThanOrEqual(minFiles);
  });

  it.each(templateSources)('%s navigates only to /t routes', (file) => {
    const escaping = routeLiteralsIn(file).filter(
      ({ route }) => route !== '/t' && !route.startsWith('/t/'),
    );
    expect({ file, escaping }).toEqual({ file, escaping: [] });
  });

  it('really does reach into the quiz loop', () => {
    // Proves the scanner sees route literals at all, rather than that the regex
    // silently matches nothing and every file trivially passes.
    const home = routeLiteralsIn('app/t/index.tsx').map(({ route }) => route);
    expect(home).toContain('/t/quiz');
    // The browse chain: home -> category -> quiz-mode -> quiz. Prefix matches
    // rather than equality, because two of the three are template literals.
    expect(home.some((route) => route.startsWith('/t/category/'))).toBe(true);
    expect(
      routeLiteralsIn('app/t/category/[slug].tsx').some(({ route }) =>
        route.startsWith('/t/quiz-mode/'),
      ),
    ).toBe(true);
    expect(routeLiteralsIn('app/t/quiz-mode/[slug].tsx').map(({ route }) => route)).toContain('/t/quiz');
    expect(routeLiteralsIn('app/t/quiz.tsx').map(({ route }) => route)).toContain('/t/results');
    expect(routeLiteralsIn('app/t/results.tsx').map(({ route }) => route)).toContain('/t');
  });

  it('really does route the bottom bar, and all six slots land inside /t', () => {
    // The escape check above is a NEGATIVE: it passes just as happily for a bar
    // that navigates nowhere at all, which is what a botched port that dropped
    // the onPress handlers looks like.
    //
    // Set EQUALITY rather than arrayContaining (unlike the quiz-loop test
    // above): this is a six-route file entirely under our control, so equality
    // also catches a duplicated slot and a seventh route nobody meant to add.
    expect([...new Set(BAR_ROUTES)].sort()).toEqual([
      '/t',
      '/t/account',
      '/t/paywall',
      '/t/settings',
      '/t/shop',
      '/t/stats',
    ]);
  });

  it('really does reach the paywall, from all three of its entry points', () => {
    // This is what the deleted NOT_YET_PORTED set-assertion used to pin, kept
    // for the reason that assertion existed: the paywall is reached from three
    // separate files, and the port had to re-point FIVE literals across them.
    // Re-point four and the escape check above catches it — but only while the
    // route is spelled '/paywall'. Naming the three callers here keeps the
    // five-site edit pinned now that the tolerance list is gone, so a later
    // change that quietly drops one entry point goes red rather than silent.
    for (const file of ['app/t/index.tsx', 'app/t/quiz-mode/[slug].tsx', 'app/t/onboarding.tsx']) {
      expect({ file, routes: routeLiteralsIn(file).map(({ route }) => route) }).toEqual({
        file,
        routes: expect.arrayContaining(['/t/paywall']),
      });
    }
    // The exits. All five of the paywall's own router.replace calls go to '/t'
    // rather than to '/' — on a template build app/index.tsx redirects '/' to
    // '/t/splash', so a missed one bounces the player through the splash on the
    // way home instead of dead-ending, which is only visible on a device.
    const paywall = routeLiteralsIn('app/t/paywall.tsx').map(({ route }) => route);
    expect(paywall).toContain('/t');
    expect(paywall.filter((route) => route === '/t')).toHaveLength(5);
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
  const home = codeOf('app/t/index.tsx');

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
