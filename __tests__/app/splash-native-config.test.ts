/**
 * The native splash config in app.json — the entry that decides what Android and
 * iOS show BEFORE any JavaScript runs.
 *
 * THE DEFECT THIS EXISTS TO PREVENT
 * --------------------------------
 * `expo-splash-screen`'s two Android halves disagree about who owns the icon, and
 * they disagree SILENTLY:
 *
 *   - plugin/build/withAndroidSplashStyles.js writes
 *     `windowSplashScreenAnimatedIcon = @drawable/splashscreen_logo` into
 *     values/styles.xml UNCONDITIONALLY;
 *   - plugin/build/withAndroidSplashImages.js generates that drawable only when
 *     the options carry an `image` (or per-density keys, or an explicit
 *     `drawable`) — and it CLEARS every existing splash drawable first.
 *
 * So an options object with no image makes prebuild emit a reference to a
 * resource it never creates, and aapt2 fails with
 * `resource drawable/splashscreen_logo not found`. That is what a9b3c32
 * ("solid (icon-less) native splash", 2026-08-29) left behind: the plugin has no
 * icon-less mode, so removing `image` did not remove the icon, it removed the
 * FILE the icon still points at.
 *
 * WHY NOTHING CAUGHT IT FOR THREE MONTHS
 * --------------------------------------
 * The build backend injects `image: ./assets/images/splash-icon.png` into this
 * same entry on every build (ProcessBuildTask::injectAssets -> setSplashPluginImage),
 * so every SHIPPED build was fine and only a bare `npx expo prebuild -p android`
 * on this repo was broken. Two things followed from that, neither intended:
 * the icon-less splash never actually shipped, and — with `imageWidth` dropped
 * alongside `image` — the plugin's default of 100 quietly governed every build
 * from then on.
 *
 * The backend now guards its own side (App\Services\Build\SplashConfigGuard fails
 * a build in seconds if the config it is about to hand EAS would dangle
 * @drawable/splashscreen_logo). This file is the mirror of that guard on the side
 * that actually ships to EAS. Nothing else in the repo reads this entry.
 *
 * WHY STRUCTURAL AND NOT A RENDER TEST
 * ------------------------------------
 * None of this reaches a React tree. It is consumed by a config plugin during
 * prebuild, so the proof is a config proof: the committed JSON says what the
 * plugin needs, the file it names is on disk and is really a PNG, and every one
 * of the eight build slugs still inherits it.
 *
 * The `.easignore` that task #1247 adds must never exclude `assets/images/` —
 * that is where the backend injects the splash image this file pins. Deliberately
 * NOT asserted here: there is no `.easignore` today, and a conditional
 * "if the file exists then…" check is inert by construction — a guard that passes
 * by failing to look. It belongs in that task, against a file that exists.
 */
import { readFileSync, statSync } from 'fs';
import { join } from 'path';

// APP_TEMPLATES derives CURRENT_TEMPLATE from the build slug, which pulls the
// axios-backed api client. Only the static map matters here, so stub the slug —
// same treatment as __tests__/app/app-templates.test.tsx.
jest.mock('@/api/client', () => ({ APP_SLUG: 'erudite-quiz' }));

import { APP_TEMPLATES } from '@/constants/app-templates';

import { pngSize } from '../helpers/png';

const ROOT = join(__dirname, '..', '..');

/**
 * The canvas the plugin composites the icon onto, in dp at mdpi
 * (`canvasSize = 288 * multiplier` in withAndroidSplashImages.js). The icon is
 * drawn at `imageWidth * multiplier` and offset by `(canvasSize - size) / 2`, so
 * an imageWidth above this makes that offset NEGATIVE and the icon is clipped on
 * every edge. Re-derived from the plugin source by a test below, not trusted.
 */
const PLUGIN_CANVAS_DP = 288;

/** The largest density multiplier the plugin writes (xxxhdpi). */
const MAX_DENSITY_MULTIPLIER = 4;

/**
 * The plugin's compiled config-plugin sources, reached BY PATH rather than by
 * module specifier. Its package.json `exports` map publishes only `.`,
 * `./plugin`, `./package.json` and `./app.plugin.js`, so
 * `require('expo-splash-screen/plugin/build/…')` does not resolve at all, and
 * `./plugin` is the assembled plugin — requiring it would drag in
 * expo/config-plugins and @expo/image-utils for no benefit.
 */
const PLUGIN_BUILD_DIR = join(ROOT, 'node_modules', 'expo-splash-screen', 'plugin', 'build');
const PLUGIN_IMAGES_SOURCE = join(PLUGIN_BUILD_DIR, 'withAndroidSplashImages.js');
const PLUGIN_ANDROID_CONFIG = join(PLUGIN_BUILD_DIR, 'getAndroidSplashConfig.js');

interface SplashProps {
  image?: string;
  drawable?: unknown;
  imageWidth?: number;
  resizeMode?: string;
  backgroundColor?: string;
  dark?: { image?: string; backgroundColor?: string };
}

type PluginEntry = string | [string, SplashProps?];

const baseConfig = JSON.parse(readFileSync(join(ROOT, 'app.json'), 'utf8')).expo;

/** The `expo-splash-screen` entry out of an `expo.plugins` array, in either form. */
function splashEntryOf(plugins: PluginEntry[]): PluginEntry | undefined {
  return plugins.find((entry) =>
    Array.isArray(entry) ? entry[0] === 'expo-splash-screen' : entry === 'expo-splash-screen',
  );
}

function propsOf(plugins: PluginEntry[]): SplashProps | undefined {
  const entry = splashEntryOf(plugins);
  return Array.isArray(entry) ? entry[1] : undefined;
}

const props = propsOf(baseConfig.plugins) ?? {};

describe('the committed splash config', () => {
  it('is the array form, carrying props', () => {
    // Anti-vacuity, and it guards a real no-op: withSplashScreen.js runs
    // `if (props != null)` around BOTH platform mods, so a bare
    // "expo-splash-screen" string disables the plugin outright and every
    // assertion below would be reading `undefined` off an empty object.
    const entry = splashEntryOf(baseConfig.plugins);
    expect({ array: Array.isArray(entry), hasProps: propsOf(baseConfig.plugins) != null }).toEqual({
      array: true,
      hasProps: true,
    });
  });

  it('names an icon the repo actually ships', () => {
    // The SplashConfigGuard mirror, and the assertion that fails if a9b3c32 is
    // ever repeated. `drawable` short-circuits the density branch entirely
    // (withAndroidSplashImages.js: `if (drawable != null) … else …`), so exactly
    // one of the two must be present — neither means the dangling reference is
    // back, both means the `image` is dead config nobody reads.
    const named = [props.image !== undefined, props.drawable !== undefined].filter(Boolean).length;
    expect({
      named,
      why:
        named === 1
          ? 'ok'
          : 'values/styles.xml references @drawable/splashscreen_logo unconditionally, but the ' +
            'drawable is only generated when this entry carries an image (or an explicit ' +
            'drawable). Without exactly one of them a bare `expo prebuild -p android` emits a ' +
            'reference to a resource it never creates and aapt2 fails with ' +
            '`resource drawable/splashscreen_logo not found`.',
    }).toEqual({ named: 1, why: 'ok' });
  });

  it('points at a real PNG inside the repo', () => {
    // Scoped to the `image` form: an explicit `drawable` is XML the plugin copies
    // verbatim, with no PNG to open. When NEITHER is set this returns without
    // asserting — deliberately, so the test above owns that diagnosis alone
    // instead of six tests failing at once with the reason buried among them.
    if (props.image === undefined) return;
    const image = props.image;
    expect({
      relative: !image.startsWith('/'),
      traversal: image.includes('..'),
      backslash: image.includes('\\'),
    }).toEqual({ relative: true, traversal: false, backslash: false });

    const absolute = join(ROOT, image);
    expect({ image, exists: statSync(absolute).isFile() }).toEqual({ image, exists: true });
    // Opens the bytes: a truncated write or a JPEG renamed to .png would other-
    // wise fail inside @expo/image-utils during prebuild instead of here.
    pngSize(absolute);
  });

  it('ships an icon big enough for the largest density prebuild draws', () => {
    // The plugin resizes the SAME source file for all five densities, up to
    // `imageWidth * 4` at xxxhdpi. A smaller source is upscaled and lands blurry
    // on exactly the devices with the most pixels to show it off.
    if (props.image === undefined || props.imageWidth === undefined) return;
    const needed = props.imageWidth * MAX_DENSITY_MULTIPLIER;
    const { w, h } = pngSize(join(ROOT, props.image));
    expect({ enough: Math.min(w, h) >= needed, needed }).toEqual({ enough: true, needed });
  });

  it('pins the icon size instead of inheriting the plugin default', () => {
    // getAndroidSplashConfig.js reads `imageWidth: root.imageWidth ?? 100` and
    // getIosSplashConfig.js does the same. Dropping the key does not turn the
    // icon off — it silently resizes it, which is exactly what a9b3c32 did and
    // what nobody noticed for three months. Present and explicit, or not at all.
    expect({
      present: Object.keys(props).includes('imageWidth'),
      positiveInteger: Number.isInteger(props.imageWidth) && (props.imageWidth as number) > 0,
    }).toEqual({ present: true, positiveInteger: true });
  });

  it('keeps the icon inside the canvas the plugin composites onto', () => {
    // Above 288 the composite offset `(canvasSize - size) / 2` goes negative and
    // the icon is clipped on all four edges — and assets/images/splash-icon.png
    // has no alpha channel, so an oversized value renders as a full-bleed opaque
    // square rather than a logo. That square is what a9b3c32 set out to remove;
    // the pre-2026-08-29 value of 320 was over this line.
    //
    // Android's own guidance is tighter still: the unmasked part of the 288dp
    // launch icon should stay inside a 192dp circle. This asserts the hard
    // clipping bound; anything above 192 is worth a device screenshot.
    //
    // Presence is the previous test's job, so a missing key returns here rather
    // than failing twice for one cause.
    if (props.imageWidth === undefined) return;
    expect(props.imageWidth).toBeLessThanOrEqual(PLUGIN_CANVAS_DP);
  });

  it('the 288 canvas is still what the plugin composites onto', () => {
    // Anti-vacuity for the bound above, and the reason it is a separate test:
    // without this, PLUGIN_CANVAS_DP is a number THIS FILE remembers rather than
    // a number the plugin uses, and an SDK bump that changed the canvas would
    // leave the guard passing against a constant that means nothing. Read as
    // text, not required: withAndroidSplashImages.js pulls @expo/image-utils and
    // expo/config-plugins, neither of which belongs in a jest process.
    const source = readFileSync(PLUGIN_IMAGES_SOURCE, 'utf8');
    expect({
      canvas: source.includes(`const canvasSize = ${PLUGIN_CANVAS_DP} * multiplier;`),
      centred: source.includes('x: (canvasSize - size) / 2,'),
    }).toEqual({ canvas: true, centred: true });
  });

  it('uses a resizeMode both platforms accept', () => {
    // 'native' is Android-only legacy: getIosSplashConfig.js drops it
    // (`root.resizeMode !== 'native' ? … : undefined`) and the storyboard writer
    // throws on it. 'contain' is also the default both resolvers apply — it is
    // spelled out so the entry documents itself instead of depending on a value
    // that lives in node_modules.
    expect(['contain', 'cover']).toContain(props.resizeMode);
  });

  it('declares a dark icon only if that icon exists', () => {
    // Today `dark` carries a backgroundColor and no image, which is correct and
    // deliberate: with no dark image the plugin writes no drawable-night-*, and
    // because styles.xml is NOT theme-qualified, @drawable/splashscreen_logo
    // resolves in night mode by Android's normal fallback to drawable-mdpi. The
    // light icon is reused, and since dark.backgroundColor equals the light one
    // the two themes are pixel-identical. This only has teeth if someone adds a
    // dark icon later and mistypes the path.
    const darkImage = props.dark?.image;
    if (darkImage === undefined) return;
    expect({ darkImage, exists: statSync(join(ROOT, darkImage)).isFile() }).toEqual({
      darkImage,
      exists: true,
    });
  });

  it('resolves to a drawable at every density the plugin asks for', () => {
    // Asserted against the REAL resolver rather than a restatement of it: the
    // per-density keys each fall back to `image` (`mdpi: root.mdpi ?? root.image`),
    // and it is that fallback — not the presence of `image` — that decides
    // whether any file gets written. Safe to require: getAndroidSplashConfig.js
    // imports nothing at all. If a future SDK moves it, this fails loudly with
    // MODULE_NOT_FOUND, which is the point.
    const { getAndroidSplashConfig } = require(PLUGIN_ANDROID_CONFIG);
    const resolved = getAndroidSplashConfig(props);
    const densities = ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'];
    expect(densities.filter((key) => resolved[key] === undefined)).toEqual([]);
  });
});

describe('every build slug inherits it', () => {
  /** The erudite base plus every registered template — keyed by EXPO_PUBLIC_APP_SLUG. */
  const SLUGS = ['erudite-quiz', ...Object.keys(APP_TEMPLATES)];

  const ENV_KEYS = ['EXPO_PUBLIC_APP_SLUG', 'EXPO_OFFLINE', 'EXPO_DEV_OWNER'] as const;
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    ENV_KEYS.forEach((key) => {
      saved[key] = process.env[key];
      // EXPO_OFFLINE / EXPO_DEV_OWNER flip app.config.js into dev-tunnel mode. A
      // developer's shell must not change what this suite reports.
      delete process.env[key];
    });
  });

  afterEach(() => {
    ENV_KEYS.forEach((key) => {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key] as string;
    });
  });

  /** app.config.js resolved as the given build would resolve it. */
  function configFor(slug: string) {
    process.env.EXPO_PUBLIC_APP_SLUG = slug;
    return require('../../app.config.js')({});
  }

  it.each(SLUGS)('%s keeps the base splash entry', (slug) => {
    // app.config.js spreads `...base` in every branch and never touches
    // `plugins`, so all eight builds share ONE native splash config. That is the
    // property that makes this file's single set of assertions sufficient — and
    // the property that would break silently if a future branch rebuilt the
    // plugin array to change, say, one app's splash colour.
    expect({ slug, splash: splashEntryOf(configFor(slug).plugins) }).toEqual({
      slug,
      splash: splashEntryOf(baseConfig.plugins),
    });
  });

  it('the per-slug config really branches', () => {
    // Anti-vacuity for the sweep above, and the one that matters most: if
    // app.config.js ever threw, or returned `base` no matter the slug, every
    // assertion up there would pass for all eight slugs for entirely the wrong
    // reason. Pin a divergence that only a working branch produces.
    const flags = configFor('flags-quiz');
    expect({ slug: flags.slug, tablet: flags.ios.supportsTablet }).toEqual({
      slug: 'flags-quiz',
      tablet: false,
    });
    expect(baseConfig.ios.supportsTablet).toBe(true);
    // Seven templates plus erudite. A registry that lost entries would shrink
    // the sweep without failing it.
    expect(SLUGS.length).toBeGreaterThanOrEqual(8);
  });
});
