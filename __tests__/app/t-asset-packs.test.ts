/**
 * The asset-pack contract: `asset-packs/<pack>.assets/` and the manifests the
 * backend reads to build its pack picker.
 *
 * WHY THESE ARE STRUCTURAL TESTS AND NOT RENDER TESTS
 * ---------------------------------------------------
 * jest-expo's asset transformer rewrites EVERY image module to
 * `module.exports = 1` (node_modules/jest-expo/src/preset/assetFileTransformer.js).
 * So no rendering test anywhere in this repo can tell which PNG a `require()`
 * resolved to — the identity is gone before the test runs. The mechanism is a
 * filesystem mechanism, so the proof is a filesystem proof: manifests agree with
 * the bytes on disk, the requires agree with the manifests, and the staged copy
 * agrees with the pack it came from.
 *
 * What that combination actually buys is the two failure modes this feature can
 * silently rot into — a slot declared in a manifest that nothing renders, and a
 * `require()` pointing at a path no pack supplies. Both ship green and fail on a
 * device, months later, as a blank image.
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..', '..');
const PACKS_DIR = join(ROOT, 'asset-packs');
const STAGING_DIR = join(ROOT, 'assets', 't');

/**
 * The pack whose artwork is committed in `assets/t/`, i.e. what every build
 * starts from before the build service stages anything else.
 */
const DEFAULT_PACK = 'base';

/** The one legal staging destination. See the `target` note below. */
const ALLOWED_TARGET = 'assets/t';

/**
 * Onboarding shapes a pack's artwork is drawn for. An allowlist rather than free
 * text on purpose: an unvalidated string field is a field nobody maintains, and
 * the backend filters packs by it.
 */
const ALLOWED_ONBOARDING_TYPES = ['universal'];

interface SlotSpec {
  w: number;
  h: number;
  title: string;
}

interface PackManifest {
  schema: number;
  pack: string;
  title: string;
  onboarding_types: string[];
  target: string;
  slots: Record<string, SlotSpec>;
}

function packNames(): string[] {
  return readdirSync(PACKS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function manifestOf(packDir: string): PackManifest {
  return JSON.parse(readFileSync(join(PACKS_DIR, packDir, 'manifest.json'), 'utf8'));
}

/**
 * Read a PNG's real dimensions straight out of its IHDR chunk — no dependency,
 * and it starts by proving the file IS a PNG, which is what makes a truncated
 * write or a renamed JPEG fail loudly here instead of on a device.
 */
function pngSize(absolutePath: string): { w: number; h: number } {
  const bytes = readFileSync(absolutePath);
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  expect({ file: absolutePath, png: bytes.subarray(0, 8).equals(signature) }).toEqual({
    file: absolutePath,
    png: true,
  });
  return { w: bytes.readUInt32BE(16), h: bytes.readUInt32BE(20) };
}

/** Every file under a directory, as paths relative to it, with `/` separators. */
function filesUnder(dir: string, prefix = ''): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    return entry.isDirectory() ? filesUnder(join(dir, entry.name), rel) : [rel];
  });
}

/** Every `require('@/assets/t/...')` argument in a source file. */
function stagedRequiresIn(relativeSourcePath: string): string[] {
  const source = readFileSync(join(ROOT, relativeSourcePath), 'utf8');
  return [...source.matchAll(/require\('@\/assets\/t\/([^']+)'\)/g)].map((m) => m[1]);
}

const PACKS = packNames();

describe('asset packs', () => {
  it('finds the packs on disk', () => {
    // A silently empty glob would make every assertion below vacuously true.
    // Two is the floor: with one pack the swap mechanism is untestable.
    expect(PACKS.length).toBeGreaterThanOrEqual(2);
    expect(PACKS).toEqual(expect.arrayContaining([`${DEFAULT_PACK}.assets`]));
  });

  it.each(PACKS)('%s is named for the convention the build service globs', (dir) => {
    expect(dir).toMatch(/^[a-z0-9-]+\.assets$/);
  });

  it.each(PACKS)('%s carries a manifest describing itself', (dir) => {
    const manifest = manifestOf(dir);
    expect(manifest.schema).toBe(1);
    // The backend resolves a pack by directory name, so a manifest that
    // disagreed with its own folder would pick the wrong art.
    expect(manifest.pack).toBe(dir.replace(/\.assets$/, ''));
    // The human label in the operator's pack picker; without it the backend
    // would have to title-case a slug.
    expect(typeof manifest.title).toBe('string');
    expect(manifest.title.length).toBeGreaterThan(0);
    expect(manifest.onboarding_types.length).toBeGreaterThan(0);
    manifest.onboarding_types.forEach((type) => {
      expect(ALLOWED_ONBOARDING_TYPES).toContain(type);
    });
  });

  it.each(PACKS)('%s stages only into the template directory', (dir) => {
    // `target` is manifest-supplied, which makes it a path-traversal and
    // clobber vector: a pack declaring `assets/onboarding` would destroy the
    // shipped Erudite artwork that app/onboarding.tsx statically requires 22
    // times. Pinned here, and specified for the backend to reject the same way.
    expect(manifestOf(dir).target).toBe(ALLOWED_TARGET);
  });

  it.each(PACKS)('%s declares slots as safe relative paths', (dir) => {
    Object.entries(manifestOf(dir).slots).forEach(([key, spec]) => {
      expect({
        key,
        traversal: key.includes('..'),
        absolute: key.startsWith('/'),
        backslash: key.includes('\\'),
      }).toEqual({ key, traversal: false, absolute: false, backslash: false });
      expect(Number.isInteger(spec.w) && spec.w > 0).toBe(true);
      expect(Number.isInteger(spec.h) && spec.h > 0).toBe(true);
      // Shown next to the image in the operator's Nova form.
      expect(typeof spec.title === 'string' && spec.title.length > 0).toBe(true);
    });
  });

  it('every pack declares the identical slot set', () => {
    // Substitutability is the whole point: any pack must be able to replace any
    // other. A pack missing a slot is a build whose require() resolves to
    // nothing. If this fails after adding a slot, add it to EVERY manifest and
    // author the artwork in every pack.
    const bySlots = PACKS.map((dir) => ({
      pack: dir,
      slots: Object.keys(manifestOf(dir).slots).sort(),
    }));
    const reference = bySlots[0].slots;
    bySlots.forEach(({ pack, slots }) => {
      expect({ pack, slots }).toEqual({ pack, slots: reference });
    });
  });

  it.each(PACKS)('%s ships every slot it declares, at the declared size', (dir) => {
    Object.entries(manifestOf(dir).slots).forEach(([key, spec]) => {
      const absolute = join(PACKS_DIR, dir, key);
      expect({ slot: `${dir}/${key}`, exists: statSync(absolute).isFile() }).toEqual({
        slot: `${dir}/${key}`,
        exists: true,
      });
      // Manifest-versus-bytes. The operator's form lays images out from these
      // numbers, and the backend never opens the PNGs to check.
      expect({ slot: `${dir}/${key}`, ...pngSize(absolute) }).toEqual({
        slot: `${dir}/${key}`,
        w: spec.w,
        h: spec.h,
      });
    });
  });

  it.each(PACKS)('%s holds nothing beyond its manifest and its slots', (dir) => {
    const declared = Object.keys(manifestOf(dir).slots);
    // manifest.json is expected; anything else is either dead weight the build
    // would copy or a slot someone forgot to declare.
    expect(filesUnder(join(PACKS_DIR, dir)).sort()).toEqual(
      ['manifest.json', ...declared].sort(),
    );
  });
});

describe('the staged copy in assets/t', () => {
  const stagedManifest: PackManifest = JSON.parse(
    readFileSync(join(STAGING_DIR, 'manifest.json'), 'utf8'),
  );

  it(`is the ${DEFAULT_PACK} pack, byte for byte`, () => {
    // This is what stops a local swap experiment from being committed and
    // silently changing what every future build starts from. Expect it to go
    // RED while `node scripts/apply-asset-pack.mjs neon` is staged — that
    // redness IS the demonstration that the swap reaches the bundled bytes.
    const packDir = join(PACKS_DIR, `${DEFAULT_PACK}.assets`);
    const staged = filesUnder(STAGING_DIR).sort();

    expect(staged).toEqual(filesUnder(packDir).sort());
    staged.forEach((rel) => {
      const same = readFileSync(join(STAGING_DIR, rel)).equals(readFileSync(join(packDir, rel)));
      expect({ file: rel, matchesPack: same }).toEqual({ file: rel, matchesPack: true });
    });
  });

  it('holds exactly the declared slots plus the manifest', () => {
    // No .DS_Store, no leftovers from a pack with a different slot list — the
    // staging copy clears the directory first precisely so this stays true.
    expect(filesUnder(STAGING_DIR).sort()).toEqual(
      ['manifest.json', ...Object.keys(stagedManifest.slots)].sort(),
    );
  });
});

describe('the requires and the manifests are the same set', () => {
  /**
   * Sources allowed to require staged artwork. Centralised in asset-slots.ts by
   * design (see its docblock); the screens are listed so a stray direct require
   * is caught rather than silently tolerated.
   */
  const SOURCES = [
    join('constants', 't', 'asset-slots.ts'),
    join('app', 't', 'splash.tsx'),
    join('app', 't', 'onboarding.tsx'),
    join('app', 't', 'tokens.tsx'),
  ];

  it('every slot in the manifest is required by real code, and vice versa', () => {
    const required = SOURCES.flatMap(stagedRequiresIn)
      // manifest.json is required by the token gallery as a debug label, not as
      // a slot. Excluded by extension rather than by name so a future JSON
      // sidecar does not need a second special case.
      .filter((path) => path.endsWith('.png'));

    const declared = Object.keys(manifestOf(`${DEFAULT_PACK}.assets`).slots);
    // Left side catches "slot declared but nothing renders it"; right side
    // catches "require with no pack behind it". Both ship green today and fail
    // on a device as a blank image.
    expect([...new Set(required)].sort()).toEqual(declared.sort());
  });

  it('asset-slots.ts maps every slot with a literal require', () => {
    const source = readFileSync(join(ROOT, 'constants', 't', 'asset-slots.ts'), 'utf8');
    Object.keys(manifestOf(`${DEFAULT_PACK}.assets`).slots).forEach((slot) => {
      // A computed or manifest-derived value here would stop Metro bundling the
      // file — React Native has no dynamic require, which is the entire reason
      // packs are staged at build time instead of chosen at runtime.
      expect({ slot, literal: source.includes(`'${slot}': require('@/assets/t/${slot}')`) }).toEqual(
        { slot, literal: true },
      );
    });
  });

  it('the slot type union matches the manifest', () => {
    const { T_ASSET_SLOTS } = require('@/constants/t/asset-slots');
    expect(Object.keys(T_ASSET_SLOTS).sort()).toEqual(
      Object.keys(manifestOf(`${DEFAULT_PACK}.assets`).slots).sort(),
    );
  });
});
