/**
 * `.easignore` — the file list `eas build` uploads to the EAS worker.
 *
 * THE DEFECT THIS EXISTS TO PREVENT
 * ---------------------------------
 * `.easignore` REPLACES `.gitignore` rather than adding to it. From the moment a
 * root `.easignore` exists, eas-cli reads no `.gitignore` anywhere in the tree;
 * only `.git` and `node_modules` stay hardcoded (eas-cli's own
 * `build/vcs/local.js`). Expo's reference states both the precedence and the
 * remedy outright — "include all files and directories from your .gitignore
 * file and add additional files you want to ignore"
 * (https://docs.expo.dev/build-reference/easignore/), which is precisely the
 * shape asserted below. So the obvious way to add one rule — a `.easignore`
 * whose entire content is `asset-packs/` — silently starts uploading everything
 * `.gitignore` was hiding: `.env`, `android/` (2.9 GB of local prebuild output),
 * `dist/`, `.expo/`, and the `*.jks` / `*.p8` / `*.p12` / `*.mobileprovision`
 * patterns that exist precisely to keep signing material off other people's
 * machines. The build backend clones fresh so IT would not carry `android/`, but
 * a developer running `eas build` from a working checkout would ship `.env` to
 * the worker and get a green build for it.
 *
 * The committed file is therefore `.gitignore` verbatim plus one appended rule,
 * and the two are a PAIR from now on. Drift is the failure mode, not the missing
 * pack rule — and drift is not merely a human forgetting: `.gitignore` carries a
 * machine-appended `# >>> suslik-managed skills (auto)` block, so a tool will
 * extend one file and never the other.
 *
 * WHY DRIFT IS A LEAK AND NOT AN INCONVENIENCE
 * -------------------------------------------
 * The two directions are not symmetric. A rule added to `.gitignore` and not to
 * `.easignore` is a new secret pattern uploaded to EAS — the next `.env.production`
 * or keystore glob — and it is silent. A rule EAS needs that git hides would be a
 * loud build failure instead. That asymmetry is why the pairing below is asserted
 * as a strict prefix with a fully constrained remainder rather than as a loose
 * "most rules are present" comparison.
 *
 * WHAT MUST SURVIVE THE FILTER, AND WHY IT IS NOT OBVIOUS
 * ------------------------------------------------------
 * The backend writes into `assets/` AFTER cloning and BEFORE `eas build`:
 * `assets/images/{icon,splash-icon}.png` (ProcessBuildTask::injectAssets, with
 * app.json rewritten to point at them) and `assets/t/<slot>` + `assets/t/manifest.json`
 * (AssetPackStager). Both look generated, and excluding either breaks a build in a
 * way that names neither this file nor the pipeline:
 *
 *   - `assets/images/` excluded -> the EAS worker fails ~20 minutes in with
 *     `resource drawable/splashscreen_logo not found`;
 *   - `assets/t/` excluded -> Metro fails the bundle, because the rule is
 *     path-based and drops the artwork COMMITTED in this repo alongside the
 *     staged pack, leaving the literal `require('@/assets/t/…')` calls in
 *     constants/t/asset-slots.ts and app/t/tokens.tsx with nothing to resolve.
 *
 * This suite is the local mirror of `App\Services\Build\EasArchiveGuard`, which
 * fails a PIPELINE build in seconds naming the offending rule and its line
 * number. A developer's local `eas build` gets no such tripwire — the same
 * guard/mirror division of labour as `SplashConfigGuard` and
 * __tests__/app/splash-native-config.test.ts, which explicitly deferred the
 * `assets/images/` assertion to this file because a conditional "if a
 * .easignore exists then…" check is inert by construction.
 *
 * WHY STRUCTURAL AND NOT A RENDER TEST
 * ------------------------------------
 * None of this reaches a React tree. It is a filter over a directory walk, so the
 * proof is a filesystem proof: the committed rules, run through the same matcher
 * eas-cli uses, give the right verdict for every file the build needs and every
 * file it must never carry.
 */
import { execFileSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

import {
  DEFAULT_PACK,
  PACKS_DIR,
  defaultPackSlots,
  manifestOf,
  packNames,
  stagedRequiresIn,
} from '../helpers/asset-packs';
import { uploadFilterFor } from '../helpers/eas-upload';
import { REPO_ROOT, filesUnder } from '../helpers/repo-tree';

const ASSETS_DIR = join(REPO_ROOT, 'assets');

/** The sources that hold a literal `require('@/assets/t/…')`, per t-asset-packs. */
const STAGED_REQUIRE_SOURCES = ['constants/t/asset-slots.ts', 'app/t/tokens.tsx'];

const gitignore = readFileSync(join(REPO_ROOT, '.gitignore'), 'utf8');
const easignore = readFileSync(join(REPO_ROOT, '.easignore'), 'utf8');

/** What `.easignore` adds on top of the copied `.gitignore`. */
const appended = easignore.startsWith(gitignore) ? easignore.slice(gitignore.length) : '';

/** Rules in a section of an ignore file — comments and blank lines dropped. */
function rulesIn(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));
}

describe('.easignore is .gitignore plus one EAS-only rule', () => {
  it('exists at the repo root', () => {
    // The precondition every assertion below leans on, asserted rather than
    // branched on. splash-native-config.test.ts left this here for exactly that
    // reason: a guard that skips itself when the file is missing is a guard that
    // passes by failing to look.
    expect(existsSync(join(REPO_ROOT, '.easignore'))).toBe(true);
  });

  it('opens with .gitignore, verbatim', () => {
    // A prefix rather than a set comparison: order and text both matter, since
    // gitignore rules are order-sensitive once a `!` negation is involved. If
    // this goes red, .gitignore moved — regenerate with `cp .gitignore .easignore`
    // and re-append the EAS-only block at the end of the file.
    expect(easignore.startsWith(gitignore)).toBe(true);
  });

  it('cannot fuse its first rule onto the last .gitignore line', () => {
    // The concatenation above is only safe while .gitignore ends in a newline.
    // Without one, `cp` + append would weld the copied tail to the EAS banner and
    // quietly destroy both rules.
    expect(gitignore.endsWith('\n')).toBe(true);
  });

  it('appends exactly one rule, and it is the pack sources', () => {
    // The remainder is fully constrained: everything after the copied prefix is
    // comments except this single rule. Prefix + this is what makes a loose
    // "starts with / ends with" pair unnecessary — there is no unexamined middle.
    expect(rulesIn(appended)).toEqual(['asset-packs/']);
  });

  it('says why in the file, not only here', () => {
    // The replace-not-extend trap has to be readable by whoever next opens the
    // file with an editor rather than a test runner.
    expect(appended).toContain('.gitignore');
    expect(appended).toContain('assets/');
  });

  it('the copied prefix is a real rule set, not an empty file', () => {
    // Anti-vacuity: an empty .gitignore would make `startsWith` trivially true
    // and leave every protective rule silently absent from the upload.
    expect(rulesIn(gitignore).length).toBeGreaterThanOrEqual(20);
  });

  it('is the only ignore file eas-cli will now read', () => {
    // The one new hazard this file introduces. Without .easignore, eas-cli
    // applies EVERY .gitignore in the tree; with it, none of them. A nested
    // .gitignore added later therefore keeps working for git and is silently
    // inert for EAS, and nothing else in the repo would notice.
    //
    // Asked of the tracked tree rather than of a directory walk: walking would
    // mean descending into node_modules and android/ for a one-entry answer, and
    // an ignore file has to be committed to reach a build in the first place.
    const tracked = execFileSync('git', ['ls-files', '--', '.gitignore', '**/.gitignore'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    })
      .split('\n')
      .filter(Boolean)
      .sort();
    expect(tracked).toEqual(['.gitignore']);
  });
});

describe('what eas build would upload', () => {
  const filter = uploadFilterFor(REPO_ROOT, '.easignore');
  const before = uploadFilterFor(REPO_ROOT, '.gitignore');

  const PACK_FILES = packNames().flatMap((dir) =>
    filesUnder(join(PACKS_DIR, dir)).map((rel) => `asset-packs/${dir}/${rel}`),
  );

  const ASSET_FILES = filesUnder(ASSETS_DIR).map((rel) => `assets/${rel}`);

  /**
   * Paths the build needs that no walk of this checkout can discover, because the
   * backend writes them into its clone after cloning. Derived where possible and
   * pinned only where derivation is impossible.
   */
  const BACKEND_WRITTEN = [
    // ProcessBuildTask::injectAssets normalises the operator's artwork to these
    // two names and rewrites app.json to point at them. `icon.png` happens to
    // exist here as the configurable template's committed icon; `splash-icon.png`
    // is what app.json's expo-splash-screen entry names today. Both are pinned
    // rather than derived because the INJECTION is what must survive, not the
    // committed file that shares its name.
    'assets/images/icon.png',
    'assets/images/splash-icon.png',
    // AssetPackStager stages the selected pack over the committed artwork.
    'assets/t/manifest.json',
    ...defaultPackSlots().map((slot) => `assets/t/${slot}`),
    // Every path the config files name, so an asset a future slug starts using
    // is protected without anyone remembering to add it here.
    ...configuredAssetPaths(),
    // Every staged require, extracted rather than transcribed.
    ...STAGED_REQUIRE_SOURCES.flatMap(stagedRequiresIn).map((rel) => `assets/t/${rel}`),
  ];

  const UNIQUE_BACKEND_WRITTEN = [...new Set(BACKEND_WRITTEN)].sort();

  /**
   * Files that must stay out of the archive whatever else changes. Pinned
   * literals, because the point is the RULE and most of these paths do not exist
   * in a clean checkout — `ignores()` is a pure string test and never stats.
   */
  const MUST_NOT_UPLOAD = [
    '.env', // real secrets
    '.env.local',
    'android/app/build.gradle', // 2.9 GB of local prebuild output
    'dist/index.html',
    '.expo/settings.json',
    'release.jks', // signing material
    'certs/key.p8',
    'certs/cert.p12',
    'profile.mobileprovision',
    'node_modules/react/index.js', // the hardcoded defaults
    '.git/config',
  ];

  it('reads the rules out of .easignore', () => {
    expect(filter.source).toBe('.easignore');
  });

  it('the matcher is really matching', () => {
    // Anti-vacuity on the harness itself, before any verdict below is trusted. A
    // filter built from an empty rule set answers `false` to everything, which
    // would make the whole "keeps assets/" half pass for the wrong reason; one
    // built from a catch-all answers `true` to everything and would make the
    // "drops asset-packs/" half pass the same way.
    expect(filter.ignores('node_modules/react/index.js')).toBe(true);
    expect(filter.ignores('app.json')).toBe(false);
  });

  it('finds the pack sources and the artwork on disk', () => {
    // Floors derived from the manifests rather than hand-written, so a third pack
    // or a sixth slot widens the sweeps below automatically. Two packs is the
    // floor at which the swap mechanism exists at all.
    expect(packNames().length).toBeGreaterThanOrEqual(2);
    expect(PACK_FILES.length).toBeGreaterThanOrEqual(
      packNames().length * (defaultPackSlots().length + 1),
    );
    expect(ASSET_FILES.length).toBeGreaterThanOrEqual(20);
    expect(UNIQUE_BACKEND_WRITTEN.length).toBeGreaterThanOrEqual(8);
    expect(UNIQUE_BACKEND_WRITTEN).toEqual(
      expect.arrayContaining([
        'assets/images/icon.png',
        'assets/images/splash-icon.png',
        'assets/t/manifest.json',
        `assets/t/${defaultPackSlots()[0]}`,
      ]),
    );
  });

  it.each(PACK_FILES)('drops %s', (path) => {
    expect(filter.ignores(path)).toBe(true);
  });

  it.each(UNIQUE_BACKEND_WRITTEN)('keeps %s, which the build writes or reads', (path) => {
    expect(filter.ignores(path)).toBe(false);
  });

  it('excludes nothing under assets/ at all', () => {
    // Blunter than the list above and it catches what no derivation can: a rule
    // that happens to match an injected path nobody thought to enumerate. If a
    // stray `.DS_Store` or `*.pem` ever lands in this tree, going red here is the
    // correct answer rather than a false positive.
    expect(ASSET_FILES.filter((path) => filter.ignores(path))).toEqual([]);
  });

  it.each(MUST_NOT_UPLOAD)('still drops %s', (path) => {
    expect(filter.ignores(path)).toBe(true);
  });

  it('changed exactly one verdict, and it is the pack sources', () => {
    // Efficacy, and the measured claim this change was accepted on. Against the
    // union of everything the assertions above reason about, adding .easignore
    // must flip the pack sources to excluded and touch nothing else — proving both
    // that the file does something and that it does nothing more.
    const universe = [...PACK_FILES, ...ASSET_FILES, ...UNIQUE_BACKEND_WRITTEN, ...MUST_NOT_UPLOAD];
    const flipped = universe.filter((path) => before.ignores(path) !== filter.ignores(path)).sort();
    expect(flipped).toEqual([...PACK_FILES].sort());
  });

  it('drops no file the app bundles', () => {
    // The staged copy is what Metro reads; the pack sources are pure build input
    // that nothing requires. Losing that distinction is how `assets/t/` gets
    // excluded for looking generated.
    const stagedPack = filesUnder(join(PACKS_DIR, `${DEFAULT_PACK}.assets`));
    expect(stagedPack.length).toBeGreaterThan(0);
    stagedPack.forEach((rel) => {
      expect({ file: rel, uploaded: !filter.ignores(`assets/t/${rel}`) }).toEqual({
        file: rel,
        uploaded: true,
      });
    });
  });
});

/** Every `./assets/...` path named by app.json or app.config.js, deduped. */
function configuredAssetPaths(): string[] {
  const sources = ['app.json', 'app.config.js'].map((rel) =>
    readFileSync(join(REPO_ROOT, rel), 'utf8'),
  );
  const found = sources.flatMap((source) => [
    ...source.matchAll(/['"]\.\/(assets\/[^'"]+)['"]/g),
  ].map((m) => m[1]));
  return [...new Set(found)];
}

describe('the manifests the sweeps derive from', () => {
  it('describe the pack the staged copy came from', () => {
    // Guards the derivation itself: if manifestOf ever stopped resolving, every
    // `defaultPackSlots()`-derived list above would silently shrink to nothing.
    expect(manifestOf(`${DEFAULT_PACK}.assets`).pack).toBe(DEFAULT_PACK);
    expect(defaultPackSlots().length).toBeGreaterThanOrEqual(5);
  });

  it('finds the config files naming real artwork', () => {
    const configured = configuredAssetPaths();
    expect(configured.length).toBeGreaterThanOrEqual(4);
    expect(configured).toEqual(expect.arrayContaining(['assets/images/splash-icon.png']));
  });
});
