/**
 * ACCEPTANCE GUARD: no colour literal anywhere in the /t surface.
 *
 * This is a SOURCE SCAN rather than a render assertion, deliberately. A hex on
 * a branch no test exercises — an error state, a rarely-hit modal, a tile
 * variant — is still a hex, and a render-based check would happily miss it. The
 * point of the configurable template is that its entire palette is data, so the
 * check has to be about the code, not about one render of it.
 *
 * Scope is app/t/** plus the shared components those screens actually render.
 * The shared components are already clean, and none of them has a guard of its
 * own; including them here means a literal cannot be smuggled into the template
 * by way of a component it borrows.
 *
 * EXEMPTIONS, and why each is not a hole:
 *  - constants/t/tile-palette.ts IS the literals. It is the one reviewable
 *    place they are allowed to live, and __tests__/constants/t-tile-palette.ts
 *    pins every value in it against the shipped Erudite artwork.
 *  - constants/theme.ts and lib/theme/** are the bundled palette and the wire
 *    parser; theme-bundled-parity.test.ts already pins those.
 *  - Everything under app/ outside app/t/ — the Erudite build and its five
 *    siblings are checked-in-palette apps by design.
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..', '..');

/** Files the /t home renders that are not themselves under app/t/. */
const SHARED_DEPENDENCIES = [
  'components/screen-background.tsx',
  'components/bottom-bar.tsx',
  'components/home/quiz-config-modal.tsx',
  'components/home/time-limit-modal.tsx',
  'components/home/hard-mode-modal.tsx',
  'components/lives/claim-lives-modal.tsx',
];

/** #rgb..#rrggbbaa, plus any rgb()/rgba() call. */
const COLOR_LITERAL = /#[0-9a-fA-F]{3,8}\b|\brgba?\(/g;

function sourceFilesUnder(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(join(ROOT, dir))) {
    const relative = join(dir, entry);
    if (statSync(join(ROOT, relative)).isDirectory()) {
      found.push(...sourceFilesUnder(relative));
    } else if (/\.tsx?$/.test(entry)) {
      found.push(relative);
    }
  }
  return found;
}

/**
 * Strip comments before scanning: the /t modules cite the ramp hexes they
 * replaced, and a docblock is exactly where such a reference belongs.
 *
 * The line-comment pattern refuses to fire after `:`, a quote or a backslash so
 * it never eats the `//` of a URL.
 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:"'`\\])\/\/.*$/gm, '$1');
}

function literalsIn(relativePath: string): { file: string; line: number; match: string }[] {
  const lines = stripComments(readFileSync(join(ROOT, relativePath), 'utf8')).split('\n');
  return lines.flatMap((text, index) =>
    (text.match(COLOR_LITERAL) ?? []).map((match) => ({
      file: relativePath,
      line: index + 1,
      match,
    })),
  );
}

describe('the /t surface holds no colour literals', () => {
  const templateFiles = sourceFilesUnder(join('app', 't'));

  it('finds the template screens to scan', () => {
    // A silently empty glob would make every assertion below vacuously true.
    expect(templateFiles).toEqual(expect.arrayContaining([join('app', 't', 'index.tsx')]));
    expect(templateFiles.length).toBeGreaterThanOrEqual(4);
  });

  it.each(templateFiles)('%s draws every colour from a token', (file) => {
    // Every colour here must arrive as an EruditePalette token via
    // useThemeColors(), or as a named ramp from constants/t/tile-palette.ts.
    expect(literalsIn(file)).toEqual([]);
  });

  it.each(SHARED_DEPENDENCIES)('%s, which /t renders, is clean too', (file) => {
    expect(literalsIn(file)).toEqual([]);
  });

  it('does not mistake `transparent` or a testID for a colour', () => {
    // Both appear in the scanned files; neither is a literal, and a guard that
    // cried wolf on them would be turned off within a week.
    expect(literalsIn(join('app', 't', '_layout.tsx'))).toEqual([]);
    expect(literalsIn(join('app', 't', 'tokens.tsx'))).toEqual([]);
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
});
