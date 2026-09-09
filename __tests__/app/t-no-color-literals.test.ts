/**
 * ACCEPTANCE GUARD: no colour literal anywhere in the /t surface.
 *
 * This is a SOURCE SCAN rather than a render assertion, deliberately. A hex on
 * a branch no test exercises — an error state, a rarely-hit modal, a tile
 * variant — is still a hex, and a render-based check would happily miss it. The
 * point of the configurable template is that its entire palette is data, so the
 * check has to be about the code, not about one render of it.
 *
 * SCOPE IS DERIVED, NOT DECLARED
 * ------------------------------
 * The scan roots are the template's own directories (SCAN_ROOTS below). From
 * there the scope is a transitive IMPORT WALK: every `@/components/…`,
 * `@/hooks/…` and `@/constants/t/…` module those files reach, and everything
 * those reach in turn.
 *
 * This replaces a hand-maintained list of six "shared dependencies", which had
 * ALREADY ROTTEN: components/home/quiz-config-modal.tsx renders
 * components/home/category-picker.tsx, which was never added and was therefore
 * unguarded. A missing entry in a hand list is invisible — the suite stays green
 * and simply checks less. A walk cannot have that failure mode, and the file the
 * hand list dropped is asserted below by name so the gap stays closed.
 *
 * Every failure prints the import chain that pulled the file into scope, because
 * scope now grows on its own: adding an import to an app/t screen can put a file
 * nobody was thinking about under this rule, and "why is this test even looking
 * at my file" has to be answerable from the failure alone.
 *
 * EXEMPTIONS, and why each is not a hole:
 *  - constants/t/tile-palette.ts IS the literals. It is the one reviewable
 *    place they are allowed to live, and __tests__/constants/t-tile-palette.ts
 *    pins every value in it against the shipped Erudite artwork. It is asserted
 *    below to really contain literals, so a dead exemption cannot linger.
 *  - constants/t/oauth-brand.ts is the OTHER kind of seam: six Apple/Google
 *    brand hexes that are not ours to choose (Apple's HIG allows a black or
 *    white Sign in with Apple button; Google fixes the `G` at #4285F4 on white),
 *    so an operator preset moving them would ship a guideline violation. Unlike
 *    the tile spectrum this one is PERMANENT — remoting it would be the bug, not
 *    the fix — which is why the values live outside the funnel entirely instead
 *    of becoming palette tokens. __tests__/app/t-account.test.tsx reads each one
 *    back off a rendered button under a preset and under both appearances.
 *  - constants/theme.ts and lib/theme/** are the bundled palette and the wire
 *    parser; theme-bundled-parity.test.ts already pins those. The walk is scoped
 *    so it never reaches lib/ at all, and that negative is asserted.
 *  - lib/achievements.ts is a bundled badge-ARTWORK catalog (seven two-stop
 *    gradients), appearance-independent and never read into a stylesheet under
 *    app/t/ — screens hand `progress.def` straight to the badge component.
 *  - constants/category-visuals.ts likewise ships emoji + Erudite tile
 *    gradients. app/t reads only `visual.emoji` from it and takes its gradients
 *    from constants/t/tile-palette.ts; that split is asserted below rather than
 *    assumed, since the module IS reachable and only the prefix filter keeps it
 *    out of scope.
 *  - Everything under app/ outside app/t/ — the Erudite build and its five
 *    siblings are checked-in-palette apps by design.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..', '..');

/**
 * Where the walk starts. Each root carries a floor, because a root that
 * silently resolved to nothing would make every assertion below vacuously true.
 */
const SCAN_ROOTS: { dir: string; minFiles: number; why: string }[] = [
  { dir: 'app/t', minFiles: 4, why: 'the template screens' },
  // A ROOT rather than a reachability target, matching how hooks/t and
  // constants/t are already treated: a file here is literal-scanned whether or
  // not anything imports it yet, so a t-scoped component cannot land unguarded
  // in the window before its consumers switch over.
  { dir: 'components/t', minFiles: 1, why: 'template-only components — the bottom bar' },
  { dir: 'hooks/t', minFiles: 2, why: 'template-only hooks' },
  { dir: 'constants/t', minFiles: 2, why: 'template-only constants' },
];

/**
 * What the walk is allowed to follow. Everything else — `@/lib/…`, `@/api/…`,
 * `@/i18n/…`, `@/assets/…`, and `@/constants/` outside `t/` — is out of scope by
 * design (see the exemptions above), and the negative is asserted.
 */
const IN_SCOPE_PREFIXES = ['components/', 'hooks/', 'constants/t/'];

/** Exempt BY NAME. Each is asserted below to exist AND to really hold literals. */
const EXEMPT = new Map<string, string>([
  [
    'constants/t/tile-palette.ts',
    'IS the literals; __tests__/constants/t-tile-palette.test.ts pins every value',
  ],
  [
    'constants/t/oauth-brand.ts',
    'IS the literals: vendor-mandated Apple/Google brand colour no operator preset may move; __tests__/app/t-account.test.tsx pins each one as a rendered style prop',
  ],
]);

/** #rgb..#rrggbbaa, plus any rgb()/rgba() call. */
const COLOR_LITERAL = /#[0-9a-fA-F]{3,8}\b|\brgba?\(/g;

/**
 * Import specifiers, anchored on `from` / `require(` / `import(` rather than on
 * `import`, so `export { x } from '@/y'` and `export * from '@/y'` are the same
 * edge, and so `require('@/…')` — which constants/t/asset-slots.ts and
 * app/t/tokens.tsx both use — is not missed.
 */
const SPECIFIER = /(?:\bfrom|\brequire\(|\bimport\()\s*['"](@\/[^'"]+)['"]/g;

/**
 * Metro picks ONE platform variant at build time; a source scanner cannot know
 * which build it is scanning, so it takes the union. A hex in an .ios.tsx ships
 * to iOS, and half the surface would go unscanned if only the first match
 * counted.
 */
const SOURCE_EXTENSIONS = [
  '.ts',
  '.tsx',
  '.ios.ts',
  '.ios.tsx',
  '.android.ts',
  '.android.tsx',
  '.web.ts',
  '.web.tsx',
  '.native.ts',
  '.native.tsx',
];

/** Relative keys use `/` throughout so a prefix test is a plain startsWith. */
function sourceFilesUnder(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(join(ROOT, dir))) {
    const relative = `${dir}/${entry}`;
    if (statSync(join(ROOT, relative)).isDirectory()) {
      found.push(...sourceFilesUnder(relative));
    } else if (/\.tsx?$/.test(entry)) {
      found.push(relative);
    }
  }
  return found;
}

function resolveAll(specifier: string): string[] {
  const base = specifier.replace(/^@\//, '');
  return [
    ...SOURCE_EXTENSIONS.map((ext) => `${base}${ext}`),
    ...SOURCE_EXTENSIONS.map((ext) => `${base}/index${ext}`),
  ].filter((path) => existsSync(join(ROOT, path)) && statSync(join(ROOT, path)).isFile());
}

/**
 * Strip comments before scanning: the /t modules cite the ramp hexes they
 * replaced, and a docblock is exactly where such a reference belongs. It also
 * keeps a commented-out import from widening the scope.
 *
 * The line-comment pattern refuses to fire after `:`, a quote or a backslash so
 * it never eats the `//` of a URL.
 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:"'`\\])\/\/.*$/gm, '$1');
}

function codeOf(relativePath: string): string {
  return stripComments(readFileSync(join(ROOT, relativePath), 'utf8'));
}

function literalsIn(relativePath: string): { file: string; line: number; match: string }[] {
  return codeOf(relativePath)
    .split('\n')
    .flatMap((text, index) =>
      (text.match(COLOR_LITERAL) ?? []).map((match) => ({
        file: relativePath,
        line: index + 1,
        match,
      })),
    );
}

interface Walk {
  /** file -> the chain of imports that pulled it in, starting at a scan root. */
  reached: Map<string, string[]>;
  unresolved: { from: string; specifier: string }[];
}

/**
 * Breadth-first over the import graph.
 *
 * The visited set is keyed on the RESOLVED PATH and pre-seeded with the roots.
 * Keying on the specifier would re-expand a module from each of its importers —
 * the closure is a wide diamond, hooks/use-theme-colors.ts alone has eight
 * importers in it — and pre-seeding stops a file that is both a root and
 * reachable (constants/t/tile-palette.ts) producing a duplicate it.each name.
 *
 * Type-only imports are followed like any other. Over-inclusion costs zero files
 * today, whereas parsing type-ness wrongly would SHRINK the scope silently —
 * the wrong direction for a guard to be wrong in.
 */
function walkFromRoots(roots: string[]): Walk {
  const reached = new Map<string, string[]>();
  const unresolved: { from: string; specifier: string }[] = [];
  const visited = new Set(roots);
  const queue = roots.map((file) => ({ file, chain: [file] }));

  while (queue.length > 0) {
    const { file, chain } = queue.shift()!;
    for (const [, specifier] of codeOf(file).matchAll(SPECIFIER)) {
      const target = specifier.slice(2);
      // Filter BEFORE resolving, so the resolver only ever sees in-scope module
      // specifiers. That is what lets "resolves to nothing" be a hard failure:
      // an asset require() never enters it, so there is no false-positive
      // surface and no reason to soften it into a silent skip.
      if (!IN_SCOPE_PREFIXES.some((prefix) => target.startsWith(prefix))) continue;

      const files = resolveAll(specifier);
      if (files.length === 0) {
        unresolved.push({ from: file, specifier });
        continue;
      }
      for (const found of files) {
        if (visited.has(found)) continue;
        visited.add(found);
        const next = [...chain, found];
        reached.set(found, next);
        queue.push({ file: found, chain: next });
      }
    }
  }

  return { reached, unresolved };
}

const rootFiles = SCAN_ROOTS.flatMap((root) => sourceFilesUnder(root.dir));
const { reached, unresolved } = walkFromRoots(rootFiles);
const scanned = [...new Set([...rootFiles, ...reached.keys()])]
  .filter((file) => !EXEMPT.has(file))
  .sort();

describe('the scan covers what it claims to', () => {
  it.each(SCAN_ROOTS)('$dir is a real root with files in it ($why)', ({ dir, minFiles }) => {
    // A silently empty glob would make every assertion below vacuously true.
    expect({ dir, exists: existsSync(join(ROOT, dir)) }).toEqual({ dir, exists: true });
    expect(sourceFilesUnder(dir).length).toBeGreaterThanOrEqual(minFiles);
  });

  it.each([
    ['components/screen-background.tsx', 'the bgGradient consumer every /t screen renders'],
    ['components/home/quiz-config-modal.tsx', 'a modal the home opens'],
    [
      'components/home/category-picker.tsx',
      'the file the old hand list dropped — this is that regression',
    ],
    ['components/ui/icon-symbol.ios.tsx', 'proves platform variants are picked up, not just the .tsx'],
    ['hooks/use-theme-colors.ts', 'the palette source itself, reached via hooks/t'],
    [
      'components/quiz-mode/timed-count-modal.tsx',
      'the sheet app/t/quiz-mode/[slug].tsx opens for a timed run',
    ],
    [
      'components/settings/appearance-modal.tsx',
      'the sheet app/t/settings.tsx opens for the theme picker — one of the two files that port added to the closure',
    ],
  ])('the walk reaches %s (%s)', (file) => {
    expect({ file, reachedVia: reached.get(file) ?? null }).toEqual({
      file,
      reachedVia: expect.any(Array),
    });
  });

  it('no longer reaches the shared erudite bar', () => {
    // The inverse of the entry that used to sit in the list above, naming
    // components/bottom-bar.tsx as "the nav the template home mounts". The
    // template has its own bar now and nothing under /t imports the shared one,
    // so it must have left the closure entirely.
    expect({ reachedVia: reached.get('components/bottom-bar.tsx') ?? null }).toEqual({
      reachedVia: null,
    });
  });

  it('scans the t-scoped bar it was replaced with', () => {
    // Spelled against `scanned` rather than `reached`, and that is not a style
    // choice: walkFromRoots pre-seeds `visited` with the roots, so a file under
    // a SCAN_ROOT is never in `reached`. components/t is a root, so
    // `reached.get('components/t/bottom-bar.tsx')` would be null forever and an
    // assertion built on it would fail for the wrong reason.
    expect(scanned).toContain('components/t/bottom-bar.tsx');
  });

  it('reaches a whole surface, not a handful of files', () => {
    // A FLOOR, never an exact count: an exact count fails on every unrelated
    // import added anywhere in the closure, which trains people to bump the
    // number without looking at what moved. Was 18; the ported quiz loop
    // (app/t/quiz.tsx and app/t/results.tsx) roughly doubled the closure to 36,
    // so this floor moved once and should keep lagging the real number.
    //
    // The t-scoped bottom bar then moved it by exactly -1, and the floor did NOT
    // need to move — which is the point of one that lags. Dropping the shared
    // components/bottom-bar.tsx cost only that node: everything it imported is
    // reached independently (@/components/ui/icon-symbol and @/hooks/use-premium
    // through six other app/t screens each, @/hooks/use-theme-colors through
    // hooks/t/use-template-theme.ts, and @/constants/theme is filtered out by
    // IN_SCOPE_PREFIXES). Nothing was gained: the replacement is a SCAN_ROOT, and
    // walkFromRoots pre-seeds roots into `visited`, so it never enters `reached`.
    expect(reached.size).toBeGreaterThanOrEqual(30);
  });

  it('resolves every in-scope specifier it follows', () => {
    // An unresolvable in-scope import means the resolver has a blind spot, and a
    // blind spot here is a file that quietly stops being scanned.
    expect(unresolved).toEqual([]);
  });

  it.each(IN_SCOPE_PREFIXES.map((prefix) => [prefix]))(
    'only pulls in files under %s',
    () => {
      const strays = [...reached.keys()].filter(
        (file) => !IN_SCOPE_PREFIXES.some((prefix) => file.startsWith(prefix)),
      );
      expect(strays).toEqual([]);
    },
  );

  it.each([
    ['lib/', 'lib/achievements.ts and lib/theme/** are deliberate exemptions'],
    ['app/', 'the Erudite build and its siblings are checked-in-palette apps'],
  ])('never walks into %s (%s)', (prefix) => {
    expect([...reached.keys()].filter((file) => file.startsWith(prefix))).toEqual([]);
  });

  it('never walks into constants/ outside constants/t/', () => {
    // constants/theme.ts and constants/category-visuals.ts are literal-laden by
    // design; only the template's own constants are in scope.
    const strays = [...reached.keys()].filter(
      (file) => file.startsWith('constants/') && !file.startsWith('constants/t/'),
    );
    expect(strays).toEqual([]);
  });

  it.each([...EXEMPT.entries()])('the exemption for %s is still earned', (file) => {
    // If an exempt file ever goes clean the exemption is dead weight and should
    // be deleted — and this doubles as proof the scanner is not simply broken.
    expect({ file, exists: existsSync(join(ROOT, file)), literals: literalsIn(file).length > 0 })
      .toEqual({ file, exists: true, literals: true });
  });
});

describe('the /t surface holds no colour literals', () => {
  it.each(scanned)('%s draws every colour from a token', (file) => {
    // Every colour here must arrive as a token via hooks/t/use-template-theme.ts,
    // or as a named ramp from constants/t/tile-palette.ts. The chain rides along
    // in the assertion so a failure explains why the file is in scope at all.
    const reachedVia = reached.get(file) ?? ['(scan root)'];
    expect({ file, reachedVia, literals: literalsIn(file) }).toEqual({
      file,
      reachedVia,
      literals: [],
    });
  });

  it.each([
    ['components/quiz/lives-bar.tsx', 'app/t/quiz.tsx renders it directly'],
    [
      'components/achievements/achievement-badge.tsx',
      'app/t/results.tsx reaches it through the unlock modal',
    ],
  ])('the walk now covers %s (%s)', (file) => {
    // These two were carried by a temporary AHEAD_OF_THE_WALK list while they
    // were clean but unreachable — each entry asserted BOTH cleanliness AND
    // disjointness from the closure, so landing the screens that import them
    // turned the list red and asked for its own deletion. It is gone; this is
    // what replaces it, pinning that the walk really did take over rather than
    // that the coverage quietly vanished with the list.
    expect({ file, reachedVia: reached.get(file) ?? null }).toEqual({
      file,
      reachedVia: expect.any(Array),
    });
    expect(scanned).toContain(file);
  });
});

/**
 * Both directories that RENDER. components/t joined app/t when the template got
 * its own bottom bar.
 *
 * That component is also the clearest argument for the rule being a SOURCE scan.
 * It reads the palette at two separate call sites, and a copy that switched only
 * one of them is invisible at runtime: a TemplateTheme is a pure superset, so
 * both hooks return identical values for every token the bar reads. Verified —
 * reverting BarButton to useThemeColors() leaves every render assertion in
 * __tests__/components/t-bottom-bar.test.tsx green, and fails only here.
 *
 * The half-switched version is not a bug today. It is a bug the day the funnel
 * does something the raw hook does not, and by then nothing would point at it.
 */
const FUNNEL_DIRS = ['app/t', 'components/t'];
const FUNNEL = 'hooks/t/use-template-theme.ts';

describe('the template reads its colours through one funnel', () => {
  it.each(FUNNEL_DIRS.flatMap((dir) => sourceFilesUnder(dir)))(
    '%s does not reach past useTemplateTheme()',
    (file) => {
      // hooks/t/use-template-theme.ts is the sole importer of the palette hook,
      // so "where do the template's colours come from" is a one-file fact. The
      // walk still reaches hooks/use-theme-colors.ts through hooks/t, so it
      // stays scanned either way.
      expect(codeOf(file)).not.toContain('@/hooks/use-theme-colors');
    },
  );

  /**
   * Every app/t screen that mounts a bar at all — DERIVED, because a hand list
   * of five is exactly what rots when a sixth screen lands.
   *
   * codeOf strips comments, so app/t/_layout.tsx and app/t/paywall.tsx — which
   * DISCUSS the bar in prose without mounting one — are correctly excluded.
   */
  const BAR_MOUNTERS = sourceFilesUnder('app/t').filter((file) => /\bBottomBar\b/.test(codeOf(file)));

  it('finds the screens that mount a bar at all', () => {
    // Anti-vacuity: a filter that matched nothing would make the rule below run
    // zero cases and pass.
    expect(BAR_MOUNTERS.length).toBeGreaterThanOrEqual(5);
  });

  it.each(BAR_MOUNTERS)('%s mounts the t-scoped bar, never the shared one', (file) => {
    // WHY THIS EXISTS ALONGSIDE THE REACHABILITY ASSERTION ABOVE.
    //
    // Reachability is a PREDICATE over the whole closure — one bit, with no file
    // named. The direction it is phrased in decides whether it can see a partial
    // port at all, and the ORIGINAL phrasing could not: this list used to carry
    // a POSITIVE entry, `the walk reaches components/bottom-bar.tsx`, and with
    // four of the five screens switched and app/t/stats.tsx left behind that
    // suite stayed GREEN at 115 passed. Measured, not assumed. Five screens
    // import the bar, so any subset keeps the positive true.
    //
    // The inverse above fixes that direction and does go red on a partial port
    // (measured: 4-of-5 fails it). What it still cannot do is say WHICH screen,
    // or notice a screen that mounts neither bar — a third local copy, or a new
    // screen wired to something else entirely. That is this rule's job.
    //
    // BOTH halves are asserted. Negative-only passes for a screen that imports
    // neither bar; positive-only passes for one that imports both.
    //
    // Quote-anchored deliberately: unanchored, '@/components/bottom-bar' is not
    // a substring of '@/components/t/bottom-bar' because the `t/` intervenes —
    // but relying on that is a coincidence rather than a design.
    const code = codeOf(file);
    expect({
      file,
      tScoped: code.includes("'@/components/t/bottom-bar'"),
      shared: code.includes("'@/components/bottom-bar'"),
    }).toEqual({ file, tScoped: true, shared: false });
  });

  it('the funnel is the one file on the whole /t surface allowed past it', () => {
    // The POSITIVE half. The rule above is a negative and passes just as
    // happily for a surface where NOTHING imports the palette hook — including
    // one where the funnel itself stopped importing it and quietly returns
    // something else.
    //
    // The second expectation closes hooks/t and constants/t, which the rule
    // above does not scan. Without it a SECOND hook in hooks/t could reach the
    // palette directly and "one funnel" would silently become two.
    expect(codeOf(FUNNEL)).toContain('@/hooks/use-theme-colors');

    const breakers = [...sourceFilesUnder('hooks/t'), ...sourceFilesUnder('constants/t')].filter(
      (file) => file !== FUNNEL && codeOf(file).includes('@/hooks/use-theme-colors'),
    );
    expect(breakers).toEqual([]);
  });

  it.each([
    ['app/t/index.tsx', 'the home category tiles'],
    ['app/t/category/[slug].tsx', 'the header emoji and every subcategory tile fallback'],
    ['app/t/quiz-mode/[slug].tsx', 'the header emoji when the subcategory has none'],
  ])('%s takes only the emoji from constants/category-visuals.ts (%s)', (file) => {
    // That module IS reachable from app/t and holds the Erudite tile gradients;
    // only the constants/t/ prefix filter keeps it out of scope. Reachability is
    // not usage — so pin the usage rather than assume it. The POSITIVE half is
    // what stops this passing vacuously if a file stops reading `visual` at all.
    const code = codeOf(file);
    expect(code).toMatch(/\bvisual\.emoji\b/);
    expect(code).not.toMatch(/\bvisual\.gradient\b/);
  });
});

describe('the scanner itself', () => {
  it('does not mistake `transparent` or a testID for a colour', () => {
    // Both appear in the scanned files; neither is a literal, and a guard that
    // cried wolf on them would be turned off within a week.
    expect(literalsIn('app/t/_layout.tsx')).toEqual([]);
    expect(literalsIn('app/t/tokens.tsx')).toEqual([]);
  });

  it('would still catch a literal that the comment stripper walked past', () => {
    // Proves the scanner works rather than that the files happen to be short.
    const planted = '  backgroundColor: "#ff0055", // was rgba(0,0,0,0.5)\n';
    expect(stripComments(planted).match(COLOR_LITERAL)).toEqual(['#ff0055']);
  });

  it('ignores a hex cited inside a comment', () => {
    const documented = '// the shipped tile was #ffd23a -> #f59f3a\n';
    expect(stripComments(documented).match(COLOR_LITERAL)).toBeNull();
  });

  it('does not eat the // of a URL', () => {
    const url = "const docs = 'https://example.test/#ffffff';\n";
    // The URL survives the stripper, so its fragment is still scanned — the
    // stripper must not become a place to hide colours.
    expect(stripComments(url)).toContain('https://example.test');
  });

  it.each([
    ["import { a } from '@/hooks/x';", '@/hooks/x'],
    ["export { a } from '@/components/y';", '@/components/y'],
    ["export * from '@/constants/t/z';", '@/constants/t/z'],
    ["const m = require('@/hooks/w');", '@/hooks/w'],
    ["const m = await import('@/components/v');", '@/components/v'],
  ])('picks the specifier out of %s', (source, specifier) => {
    // Anchoring on `import` alone would miss three of these five, and a missed
    // edge is a subtree that silently stops being scanned.
    expect([...source.matchAll(SPECIFIER)].map((match) => match[1])).toEqual([specifier]);
  });

  it.each([...EXEMPT.keys()])('keeps the ESLint mirror of the exemption for %s in step', (file) => {
    // Each exemption lives in two files with nothing tying them together; this is
    // the tie. It iterates EXEMPT rather than naming a file, so half a pair
    // cannot land: a second exemption that reached this test hardcoded to the
    // first one would have added an eslint-less hole and left the suite green —
    // the silent under-checking this whole file exists to eliminate.
    //
    // Read as text rather than require()d — pulling eslint-config-expo through
    // the RN transform is not worth it — and comment-stripped, so a path merely
    // MENTIONED in a comment cannot stand in for one actually listed.
    //
    // It matches inside an `ignores: [...]` array rather than anywhere in the
    // file, and that narrowing is not theoretical: eslint.config.js names both
    // seams in the NO_COLOUR_LITERALS message it shows developers, so a
    // whole-file `toContain` passes for a file that was never exempted at all.
    // A plain containment check was written first and verified to do exactly
    // that — it stayed green with the `ignores` entry deleted and ESLint
    // raising six errors on the file.
    //
    // KNOWN LIMIT: this still cannot tell the rule-scoped `ignores` from the
    // GLOBAL one (an object carrying only `ignores`, which would stop linting
    // the file altogether rather than exempting it from one rule — the hazard
    // eslint.config.js warns about at that key). Distinguishing them means
    // reconstructing the config object from text, which is brittle enough to be
    // worse than the gap; require()ing it is what the paragraph above rules out.
    const ignoreLists = [
      ...stripComments(readFileSync(join(ROOT, 'eslint.config.js'), 'utf8'))
        .matchAll(/\bignores:\s*\[([^\]]*)\]/g),
    ].map((match) => match[1]);

    expect({ file, exempted: ignoreLists.some((list) => list.includes(`'${file}'`)) }).toEqual({
      file,
      exempted: true,
    });
  });
});
