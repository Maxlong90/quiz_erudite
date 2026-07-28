/**
 * Tests for lib/content-cache.ts slug namespacing — the cache is keyed per app
 * slug so multiple experiences built from this codebase (the main quiz and the
 * logo quiz) never clobber each other's snapshot JSON. The app matching the
 * build's APP_SLUG keeps the original un-suffixed keys (back-compat), while any
 * secondary slug (e.g. 'logo-quiz') is namespaced. AsyncStorage is auto-mocked
 * globally; the api client and expo-file-system are mocked so no network or
 * filesystem is touched.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

import {
  loadCachedSnapshot,
  getCachedVersion,
  clearCache,
  type ContentSnapshot,
} from '@/lib/content-cache';

// APP_SLUG is the "primary" app for this build — it keeps un-suffixed keys.
jest.mock('@/api/client', () => ({
  APP_SLUG: 'erudite-quiz',
  apiClient: { get: jest.fn(), post: jest.fn() },
}));

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///docs/',
  getInfoAsync: jest.fn().mockResolvedValue({ exists: true }),
  makeDirectoryAsync: jest.fn().mockResolvedValue(undefined),
  downloadAsync: jest.fn().mockResolvedValue(undefined),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
}));

const deleteAsync = FileSystem.deleteAsync as jest.Mock;

const PRIMARY = 'erudite-quiz';
const SECONDARY = 'logo-quiz';

const BASE_SNAPSHOT_KEY = 'content.snapshot.v1';
const BASE_VERSION_KEY = 'content.snapshot.version.v1';
const LQ_SNAPSHOT_KEY = 'content.snapshot.v1:logo-quiz';
const LQ_VERSION_KEY = 'content.snapshot.version.v1:logo-quiz';

function snapshot(slug: string, version: number): ContentSnapshot {
  return {
    app: { slug, name: slug, supported_locales: ['en'] },
    locale: 'en',
    version,
    generated_at: '2026-07-28T00:00:00Z',
    categories: [],
    questions: [],
    syncedAt: 1,
  };
}

beforeEach(async () => {
  await AsyncStorage.clear();
  deleteAsync.mockClear();
});

describe('loadCachedSnapshot namespacing', () => {
  it('reads the un-suffixed key for the primary app (default appSlug === APP_SLUG)', async () => {
    await AsyncStorage.setItem(BASE_SNAPSHOT_KEY, JSON.stringify(snapshot(PRIMARY, 10)));

    const loaded = await loadCachedSnapshot(); // defaults to APP_SLUG
    expect(loaded?.app.slug).toBe(PRIMARY);
    expect(loaded?.version).toBe(10);
  });

  it('reads the :<slug>-suffixed key for a secondary app', async () => {
    await AsyncStorage.setItem(LQ_SNAPSHOT_KEY, JSON.stringify(snapshot(SECONDARY, 20)));

    const loaded = await loadCachedSnapshot(SECONDARY);
    expect(loaded?.app.slug).toBe(SECONDARY);
    expect(loaded?.version).toBe(20);
  });

  it('keeps the two apps isolated — neither reads the other’s cache', async () => {
    await AsyncStorage.setItem(BASE_SNAPSHOT_KEY, JSON.stringify(snapshot(PRIMARY, 10)));
    await AsyncStorage.setItem(LQ_SNAPSHOT_KEY, JSON.stringify(snapshot(SECONDARY, 20)));

    expect((await loadCachedSnapshot(PRIMARY))?.app.slug).toBe(PRIMARY);
    expect((await loadCachedSnapshot(SECONDARY))?.app.slug).toBe(SECONDARY);
  });

  it('returns null when the namespaced key is empty', async () => {
    await AsyncStorage.setItem(BASE_SNAPSHOT_KEY, JSON.stringify(snapshot(PRIMARY, 10)));
    // Primary cache exists, but the logo-quiz namespace is empty.
    expect(await loadCachedSnapshot(SECONDARY)).toBeNull();
  });
});

describe('getCachedVersion namespacing', () => {
  it('reads the version from the correctly namespaced key per slug', async () => {
    await AsyncStorage.setItem(BASE_VERSION_KEY, '10');
    await AsyncStorage.setItem(LQ_VERSION_KEY, '20');

    expect(await getCachedVersion()).toBe(10); // primary
    expect(await getCachedVersion(SECONDARY)).toBe(20);
  });

  it('returns null when the version key is absent for the requested slug', async () => {
    expect(await getCachedVersion(SECONDARY)).toBeNull();
  });
});

describe('clearCache namespacing', () => {
  it('clears only the requested slug’s keys, leaving the other app’s cache intact', async () => {
    await AsyncStorage.setItem(BASE_SNAPSHOT_KEY, JSON.stringify(snapshot(PRIMARY, 10)));
    await AsyncStorage.setItem(BASE_VERSION_KEY, '10');
    await AsyncStorage.setItem(LQ_SNAPSHOT_KEY, JSON.stringify(snapshot(SECONDARY, 20)));
    await AsyncStorage.setItem(LQ_VERSION_KEY, '20');

    await clearCache(SECONDARY);

    // logo-quiz namespace wiped...
    expect(await AsyncStorage.getItem(LQ_SNAPSHOT_KEY)).toBeNull();
    expect(await AsyncStorage.getItem(LQ_VERSION_KEY)).toBeNull();
    // ...while the primary app's cache is untouched.
    expect(await AsyncStorage.getItem(BASE_SNAPSHOT_KEY)).not.toBeNull();
    expect(await AsyncStorage.getItem(BASE_VERSION_KEY)).toBe('10');
  });

  it('removes the slug’s namespaced image directory', async () => {
    await clearCache(SECONDARY);
    expect(deleteAsync).toHaveBeenCalledTimes(1);
    // Secondary slug gets its own suffixed image dir under documentDirectory.
    expect(deleteAsync.mock.calls[0][0]).toBe('file:///docs/snapshot-images-logo-quiz/');
  });

  it('uses the un-suffixed image directory for the primary app', async () => {
    await clearCache(); // defaults to APP_SLUG
    expect(deleteAsync.mock.calls[0][0]).toBe('file:///docs/snapshot-images/');
  });
});
