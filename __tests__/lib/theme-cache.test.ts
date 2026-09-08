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
  APP_SLUG: 'configurable-quiz',
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

const BUILD_KEY = 'theme.remote.v1';

function record(overrides: Partial<CachedThemeRecord> = {}): CachedThemeRecord {
  return {
    record: 1,
    etag: '"abc123"',
    schemaVersion: 1,
    theme: BUNDLED_THEME,
    appSlug: 'configurable-quiz',
    syncedAt: 1_700_000_000_000,
    ...overrides,
  };
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

describe('themeKey', () => {
  it('uses the bare key for the build slug', () => {
    expect(themeKey('configurable-quiz')).toBe(BUILD_KEY);
    expect(themeKey()).toBe(BUILD_KEY);
  });

  it('namespaces a secondary slug', () => {
    expect(themeKey('erudite-quiz')).toBe(`${BUILD_KEY}:erudite-quiz`);
  });

  it('NEVER collides with the appearance-preference key', () => {
    // 'app.theme.v1' belongs to hooks/use-theme-pref.ts. Writing a theme blob
    // there would corrupt the user's dark/light choice.
    for (const slug of ['configurable-quiz', 'erudite-quiz', 'logo-quiz']) {
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
    await AsyncStorage.setItem(BUILD_KEY, JSON.stringify(record({ schemaVersion: 2 })));
    expect(await loadCachedTheme()).toBeNull();
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

describe('touchCachedTheme', () => {
  it('updates only the freshness stamp', async () => {
    await saveCachedTheme(record());
    await touchCachedTheme('configurable-quiz', 1_800_000_000_000);

    const loaded = await loadCachedTheme();
    expect(loaded?.syncedAt).toBe(1_800_000_000_000);
    expect(loaded?.etag).toBe('"abc123"');
    expect(loaded?.theme).toEqual(BUNDLED_THEME);
    expect(loaded?.schemaVersion).toBe(1);
  });

  it('does nothing when there is no record to touch', async () => {
    await touchCachedTheme('configurable-quiz', 1_800_000_000_000);
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
    await clearCachedTheme('configurable-quiz');
    expect(await loadCachedTheme('erudite-quiz')).not.toBeNull();
  });
});
