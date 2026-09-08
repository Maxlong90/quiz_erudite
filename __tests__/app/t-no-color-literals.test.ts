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
    ['components/bottom-bar.tsx', 'the nav the template home mounts'],
    ['components/home/quiz-config-modal.tsx', 'a modal the home opens'],
    [
      'components/home/category-picker.tsx',
      'the file the old hand list dropped — this is that regression',
    ],
    ['components/ui/icon-symbol.ios.tsx', 'proves platform variants are picked up, not just the .tsx'],
    ['hooks/use-theme-colors.ts', 'the palette source itself, reached via hooks/t'],
  ])('the walk reaches %s (%s)', (file) => {
    expect({ file, reachedVia: reached.get(file) ?? null }).toEqual({
      file,
      reachedVia: expect.any(Array),
    });
  });

  it('reaches a whole surface, not a handful of files', () => {
    // A FLOOR, never an exact count: an exact count fails on every unrelated
    // import added anywhere in the closure, which trains people to bump the
    // number without looking at what moved. Was 18; the ported quiz loop
    // (app/t/quiz.tsx and app/t/results.tsx) roughly doubled the closure to 36,
    // so this floor moved once and should keep lagging the real number.
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

describe('the template reads its colours through one funnel', () => {
  it.each(sourceFilesUnder('app/t'))('%s does not reach past useTemplateTheme()', (file) => {
    // hooks/t/use-template-theme.ts is the sole importer of the palette hook, so
    // "where do the template's colours come from" is a one-file fact. The walk
    // still reaches hooks/use-theme-colors.ts through hooks/t, so it stays
    // scanned either way.
    expect(codeOf(file)).not.toContain('@/hooks/use-theme-colors');
  });

  it('takes only the emoji from constants/category-visuals.ts', () => {
    // That module IS reachable from app/t/index.tsx and holds Erudite tile
    // gradients; only the constants/t/ prefix filter keeps it out of scope.
    // Reachability is not usage — so pin the usage rather than assume it.
    expect(codeOf('app/t/index.tsx')).not.toMatch(/\bvisual\.gradient\b/);
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

  it('keeps the ESLint mirror of the tile-palette exemption in step', () => {
    // The exemption lives in two files with nothing tying them together; this is
    // the tie. Read as text rather than require()d — pulling eslint-config-expo
    // through the RN transform is not worth it.
    expect(readFileSync(join(ROOT, 'eslint.config.js'), 'utf8')).toContain(
      'constants/t/tile-palette.ts',
    );
  });
});
