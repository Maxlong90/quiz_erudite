/**
 * The theme cache (lib/theme/theme-cache.ts).
 *
 * Two things are being protected here. First, KEY NAMESPACING: the dark/light
 * PREFERENCE already lives at 'app.theme.v1', and a collision there would
 * silently overwrite the user's appearance choice with a JSON blob. Second,
 * FAIL-OPEN READS: a corrupt, foreign or future record must resolve to "no
 * cache" and drop the caller back to the bundled palette, never throw.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@/api/client', () => ({
  APP_SLUG: 'test-quiz',
  API_URL: 'https://example.test/api/v1',
  apiClient: { get: jest.fn() },
}));

import { BUNDLED_THEME } from '@/lib/theme/bundled';
import {
  clearCachedTheme,
  loadCachedTheme,
  saveCachedTheme,
  themeKey,
  touchCachedTheme,
  type CachedThemeRecord,
} from '@/lib/theme/theme-cache';
import { SCHEMA_VERSION_V2 } from '@/__tests__/fixtures/remote-theme-v2';

const BUILD_KEY = 'theme.remote.v1';

function record(overrides: Partial<CachedThemeRecord> = {}): CachedThemeRecord {
  return {
    record: 1,
    etag: '"abc123"',
    schemaVersion: SCHEMA_VERSION_V2,
    theme: BUNDLED_THEME,
    appSlug: 'test-quiz',
    syncedAt: 1_700_000_000_000,
    ...overrides,
  };
}

/** The ten keys a schema-v1 build understood — the whole of its record's theme. */
const V1_TOKEN_KEYS = [
  'bgGradient',
  'bgSolid',
  'accent',
  'accentSoft',
  'accentBg',
  'accentBgSoft',
  'accentBorderSoft',
  'optIdleBg',
  'optIdleBorder',
  'optIdleText',
] as const;

function v1Theme(): CachedThemeRecord['theme'] {
  const tokens: Record<string, unknown> = {};
  for (const key of V1_TOKEN_KEYS) tokens[key] = BUNDLED_THEME.dark[key];
  return {
    name: null,
    supports_dark: true,
    light: tokens as CachedThemeRecord['theme']['light'],
    dark: tokens as CachedThemeRecord['theme']['dark'],
  };
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

describe('themeKey', () => {
  it('uses the bare key for the build slug', () => {
    expect(themeKey('test-quiz')).toBe(BUILD_KEY);
    expect(themeKey()).toBe(BUILD_KEY);
  });

  it('namespaces a secondary slug', () => {
    expect(themeKey('erudite-quiz')).toBe(`${BUILD_KEY}:erudite-quiz`);
  });

  it('NEVER collides with the appearance-preference key', () => {
    // 'app.theme.v1' belongs to hooks/use-theme-pref.ts. Writing a theme blob
    // there would corrupt the user's dark/light choice.
    for (const slug of ['test-quiz', 'erudite-quiz', 'logo-quiz']) {
      expect(themeKey(slug)).not.toBe('app.theme.v1');
      expect(themeKey(slug).startsWith('theme.remote.')).toBe(true);
    }
  });
});

describe('loadCachedTheme / saveCachedTheme', () => {
  it('round-trips a record', async () => {
    await saveCachedTheme(record());
    const loaded = await loadCachedTheme();
    expect(loaded).toEqual(record());
    expect(loaded?.etag).toBe('"abc123"');
  });

  it('writes under the namespaced key for a secondary slug', async () => {
    await saveCachedTheme(record({ appSlug: 'erudite-quiz' }));
    expect(await AsyncStorage.getItem(`${BUILD_KEY}:erudite-quiz`)).not.toBeNull();
    expect(await AsyncStorage.getItem(BUILD_KEY)).toBeNull();
    expect(await loadCachedTheme('erudite-quiz')).not.toBeNull();
  });

  it('returns null when there is no cache', async () => {
    expect(await loadCachedTheme()).toBeNull();
  });

  it('drops (and deletes) a record written in an older format', async () => {
    await AsyncStorage.setItem(BUILD_KEY, JSON.stringify(record({ record: 0 })));
    expect(await loadCachedTheme()).toBeNull();
    // Reclaimed, so we do not re-parse the same garbage on every launch.
    expect(await AsyncStorage.getItem(BUILD_KEY)).toBeNull();
  });

  it('rejects a record belonging to another app', async () => {
    await AsyncStorage.setItem(BUILD_KEY, JSON.stringify(record({ appSlug: 'logo-quiz' })));
    expect(await loadCachedTheme()).toBeNull();
  });

  it('rejects a record from a build that understood a newer schema', async () => {
    await AsyncStorage.setItem(BUILD_KEY, JSON.stringify(record({ schemaVersion: 3 })));
    expect(await loadCachedTheme()).toBeNull();
  });

  it('drops (and deletes) a schema-v1 ten-token record written by an older build', async () => {
    // THE migration pin for the v1 -> v2 widening. An old build's record passes
    // the version gate (1 <= 2) but its ten-token theme fails the re-parse for
    // the thirty-five keys it lacks, so it is dropped like any unreadable blob —
    // the device falls back to the bundled tier for one session and the next
    // fetch re-earns a full body. This is the self-healing path chosen instead
    // of a RECORD_FORMAT bump, which would also nuke an OFFLINE device's palette
    // (see the onboarding-discriminant note below).
    await AsyncStorage.setItem(
      BUILD_KEY,
      JSON.stringify(record({ schemaVersion: 1, theme: v1Theme() })),
    );
    expect(await loadCachedTheme()).toBeNull();
    // Reclaimed, so we do not re-parse the same garbage on every launch.
    expect(await AsyncStorage.getItem(BUILD_KEY)).toBeNull();
  });

  it('rejects a stored payload that no longer parses', async () => {
    const corrupted = record();
    const theme = { ...corrupted.theme, dark: { ...corrupted.theme.dark, accent: 'papayawhip' } };
    await AsyncStorage.setItem(BUILD_KEY, JSON.stringify({ ...corrupted, theme }));
    expect(await loadCachedTheme()).toBeNull();
  });

  it('returns null on corrupt JSON instead of throwing', async () => {
    await AsyncStorage.setItem(BUILD_KEY, '{not json at all');
    await expect(loadCachedTheme()).resolves.toBeNull();
  });

  // NOTE: these two drive the failure through a one-shot implementation rather
  // than jest.spyOn(...).mockRestore(). AsyncStorage is already a jest mock here
  // (see jest.setup.js), and spying on an existing mock hands back that same
  // mock — so mockRestore() RESETS it, silently stripping the in-memory storage
  // implementation for every test that follows.
  it('returns null when storage itself fails', async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('storage unavailable'));
    await expect(loadCachedTheme()).resolves.toBeNull();
  });

  it('swallows a write failure — the theme is already applied in memory', async () => {
    (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('disk full'));
    await expect(saveCachedTheme(record())).resolves.toBeUndefined();
  });
});

describe('the onboarding discriminant', () => {
  it('round-trips when the record carries one', async () => {
    await saveCachedTheme(record({ onboardingType: 'universal' }));
    expect((await loadCachedTheme())?.onboardingType).toBe('universal');
  });

  it('still loads a pre-Э8 record that has no such field', async () => {
    // THE anti-regression for the decision not to bump RECORD_FORMAT. A bump
    // would make isUsable reject every stored record and loadCachedTheme delete
    // it — on an OFFLINE device the operator's colours would vanish for the whole
    // session, the exact failure the three-tier design exists to prevent. A v1
    // record is not WRONG, it is INCOMPLETE.
    const legacy = record();
    delete (legacy as Partial<CachedThemeRecord>).onboardingType;
    await AsyncStorage.setItem(BUILD_KEY, JSON.stringify(legacy));

    const loaded = await loadCachedTheme();
    expect(loaded).not.toBeNull();
    expect(loaded?.theme).toEqual(BUNDLED_THEME);
    expect(loaded?.etag).toBe('"abc123"');
    // Absent, not defaulted: the provider needs to tell "holds no opinion" from
    // "chose classic" so it can drop the validator once and earn a real answer.
    expect(loaded?.onboardingType).toBeUndefined();
  });

  it.each(['martian', 42, null, ''])(
    'normalises a disk-corrupted %p to undefined WITHOUT dropping the theme',
    async (corrupt) => {
      // isUsable deliberately does not police this field. Rejecting the record
      // over one bad scalar would delete the operator's palette to fix a screen
      // choice that already has a safe default.
      await AsyncStorage.setItem(
        BUILD_KEY,
        JSON.stringify({ ...record(), onboardingType: corrupt }),
      );

      const loaded = await loadCachedTheme();
      expect(loaded).not.toBeNull();
      expect(loaded?.theme).toEqual(BUNDLED_THEME);
      expect(loaded?.onboardingType).toBeUndefined();
      // And the record survives on disk — it is still the last known good palette.
      expect(await AsyncStorage.getItem(BUILD_KEY)).not.toBeNull();
    },
  );

  it('pins the record format at 1', () => {
    // RECORD_FORMAT is not exported, so assert it through what gets written.
    return saveCachedTheme(record({ onboardingType: 'universal' }))
      .then(() => AsyncStorage.getItem(BUILD_KEY))
      .then((raw) => {
        expect(JSON.parse(raw as string).record).toBe(1);
      });
  });
});

describe('touchCachedTheme', () => {
  it('updates only the freshness stamp', async () => {
    await saveCachedTheme(record());
    await touchCachedTheme('test-quiz', 1_800_000_000_000);

    const loaded = await loadCachedTheme();
    expect(loaded?.syncedAt).toBe(1_800_000_000_000);
    expect(loaded?.etag).toBe('"abc123"');
    expect(loaded?.theme).toEqual(BUNDLED_THEME);
    expect(loaded?.schemaVersion).toBe(SCHEMA_VERSION_V2);
  });

  it('preserves the onboarding discriminant across a 304', async () => {
    // touchCachedTheme spreads the existing record, so the field survives. If it
    // did not, every 304 would silently downgrade the record to a pre-Э8 one and
    // the engine would drop its validator on every single launch.
    await saveCachedTheme(record({ onboardingType: 'universal' }));
    await touchCachedTheme('test-quiz', 1_800_000_000_000);

    const loaded = await loadCachedTheme();
    expect(loaded?.onboardingType).toBe('universal');
    expect(loaded?.syncedAt).toBe(1_800_000_000_000);
  });

  it('does nothing when there is no record to touch', async () => {
    await touchCachedTheme('test-quiz', 1_800_000_000_000);
    expect(await loadCachedTheme()).toBeNull();
  });
});

describe('clearCachedTheme', () => {
  it('removes the record', async () => {
    await saveCachedTheme(record());
    await clearCachedTheme();
    expect(await loadCachedTheme()).toBeNull();
  });

  it('leaves another app’s record alone', async () => {
    await saveCachedTheme(record());
    await saveCachedTheme(record({ appSlug: 'erudite-quiz' }));
    await clearCachedTheme('test-quiz');
    expect(await loadCachedTheme('erudite-quiz')).not.toBeNull();
  });
});
