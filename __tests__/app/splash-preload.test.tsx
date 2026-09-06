/**
 * Logo Quiz splash preload + navigation (app/logo-quiz/splash.tsx).
 *
 * The Logo Quiz build owns this splash (the shared erudite app/splash.tsx
 * redirects here — see splash.test.tsx). While it is up it warms the brand logos
 * into expo-image's memory-disk cache so the first level opens with no per-tile
 * decode pop-in. These tests lock that contract:
 *   - it prefetches EVERY question's imageUri: the first 3 levels (45 logos)
 *     first, the rest right after, both with cachePolicy 'memory-disk';
 *   - the splash lasts EXACTLY 3s and navigation is NEVER gated on the preload —
 *     on an empty cache the sync+prefetch used to overrun the minimum and only a
 *     10s hard cap released it, which read as a splash hanging for ten seconds;
 *   - it is fully fail-open: a snapshot load / prefetch error never throws and
 *     never blocks the handoff to /logo-quiz.
 * The content layer is mocked so the preload can be driven deterministically.
 */
import React from 'react';
import { act, render } from '@testing-library/react-native';

// --- module boundaries ------------------------------------------------------

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  router: { replace: (...args: unknown[]) => mockReplace(...args) },
}));

const mockLoadCachedSnapshot = jest.fn();
const mockSyncContent = jest.fn();
jest.mock('@/lib/content-cache', () => ({
  loadCachedSnapshot: (...args: unknown[]) => mockLoadCachedSnapshot(...args),
  syncContent: (...args: unknown[]) => mockSyncContent(...args),
}));

const mockBuildLevels = jest.fn();
jest.mock('@/lib/logo-quiz/content', () => ({
  buildLevels: (...args: unknown[]) => mockBuildLevels(...args),
  LOGO_QUIZ_SLUG: 'logo-quiz',
}));

const mockPrefetch = jest.fn();
jest.mock('expo-image', () => ({
  Image: { prefetch: (...args: unknown[]) => mockPrefetch(...args) },
}));

// Bundled Welcome art is warmed alongside the logos; it is local and irrelevant
// to the timing contract, so it just resolves.
const mockLoadAsync = jest.fn();
jest.mock('expo-asset', () => ({
  Asset: { loadAsync: (...args: unknown[]) => mockLoadAsync(...args) },
}));

// Fixed locale so the preload targets the 'en' snapshot deterministically.
jest.mock('@/hooks/use-locale', () => ({
  useLocale: () => ({ locale: 'en' }),
}));

// Trim the visual-only bits so the render is light and hook order is preserved.
jest.mock('@/constants/logo-quiz/labels', () => ({
  useLQLabels: () => ({ tagline: 'Train Your Brain!' }),
}));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('@/components/logo-quiz/app-background', () => {
  const { View } = require('react-native');
  return { BG_BASE: '#AEC1F5', AppBackground: () => <View testID="app-background" /> };
});

import LogoQuizSplash from '@/app/logo-quiz/splash';

// --- fixtures ----------------------------------------------------------------

const SPLASH_MS = 3000;

// 4 levels x 15 logos = 60 imageUris. The first 45 (levels 1-3) are prefetched
// first; the remaining 15 follow.
const URIS = Array.from({ length: 60 }, (_, i) => `uri-${i}`);
const FIRST_45 = URIS.slice(0, 45);
const REST_15 = URIS.slice(45);
const LEVELS = [0, 1, 2, 3].map((li) => ({
  level: li + 1,
  questions: URIS.slice(li * 15, li * 15 + 15).map((uri, qi) => ({ id: li * 15 + qi, imageUri: uri })),
}));

const SNAPSHOT_EN = { locale: 'en' };
const CACHE = { cachePolicy: 'memory-disk' };

/** Advance fake timers by `ms` and drain the microtask queue inside act(). */
async function advance(ms: number) {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });
}

/** Drain any pending microtasks (promise chains) without advancing timers. */
async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  // Sensible defaults; individual tests override as needed.
  mockLoadCachedSnapshot.mockResolvedValue(SNAPSHOT_EN);
  mockSyncContent.mockResolvedValue(SNAPSHOT_EN);
  mockBuildLevels.mockReturnValue(LEVELS);
  mockPrefetch.mockResolvedValue(undefined);
  mockLoadAsync.mockResolvedValue(undefined);
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

describe('logo-quiz splash: logo preload + navigation', () => {
  it('prefetches the first 45 logos (memory-disk) then the rest, and hands off at 3s', async () => {
    const { unmount } = render(<LogoQuizSplash />);

    // Let the preload run (load snapshot -> buildLevels -> prefetch chain).
    await advance(0);
    await flush();

    expect(mockLoadCachedSnapshot).toHaveBeenCalledWith('logo-quiz');
    expect(mockSyncContent).not.toHaveBeenCalled(); // cache hit for the right locale
    expect(mockBuildLevels).toHaveBeenCalledWith(SNAPSHOT_EN);
    expect(mockPrefetch).toHaveBeenNthCalledWith(1, FIRST_45, CACHE);
    expect(mockPrefetch).toHaveBeenNthCalledWith(2, REST_15, CACHE);

    // The 3s minimum holds the splash…
    await advance(SPLASH_MS - 1);
    expect(mockReplace).not.toHaveBeenCalled();

    // …and crossing it hands off to the Logo Quiz home.
    await advance(1);
    await flush();
    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith('/logo-quiz');

    unmount();
  });

  it('syncs the snapshot when the cache is empty, then prefetches', async () => {
    mockLoadCachedSnapshot.mockResolvedValue(null); // nothing cached yet
    const { unmount } = render(<LogoQuizSplash />);

    await advance(0);
    await flush();

    expect(mockSyncContent).toHaveBeenCalledWith({ locale: 'en', appSlug: 'logo-quiz' });
    expect(mockPrefetch).toHaveBeenNthCalledWith(1, FIRST_45, CACHE);

    unmount();
  });

  it('re-syncs when the cached snapshot is for the wrong locale', async () => {
    mockLoadCachedSnapshot.mockResolvedValue({ locale: 'ru' }); // stale locale
    const { unmount } = render(<LogoQuizSplash />);

    await advance(0);
    await flush();

    expect(mockSyncContent).toHaveBeenCalledWith({ locale: 'en', appSlug: 'logo-quiz' });
    expect(mockPrefetch).toHaveBeenCalled();

    unmount();
  });

  it('is fail-open: a snapshot-load rejection never throws and still hands off at 3s', async () => {
    mockLoadCachedSnapshot.mockRejectedValue(new Error('cache blew up'));
    const { unmount } = render(<LogoQuizSplash />);

    await advance(0);
    await flush();

    // Preload swallowed the error — nothing prefetched, no crash.
    expect(mockPrefetch).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();

    await advance(SPLASH_MS);
    await flush();
    expect(mockReplace).toHaveBeenCalledWith('/logo-quiz');

    unmount();
  });

  it('never hangs: a stalled prefetch does NOT hold the splash past 3s', async () => {
    // A prefetch that never resolves used to gate navigation, so only the 10s
    // hard cap released it — the ten-second splash. Now it runs detached.
    mockPrefetch.mockReturnValue(new Promise<void>(() => {}));
    const { unmount } = render(<LogoQuizSplash />);

    await advance(0);
    await flush();
    expect(mockPrefetch).toHaveBeenCalledWith(FIRST_45, CACHE);

    await advance(SPLASH_MS);
    await flush();
    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith('/logo-quiz');

    unmount();
  });

  it('does not navigate after unmount', async () => {
    const { unmount } = render(<LogoQuizSplash />);
    await advance(0);
    await flush();

    unmount();
    await advance(SPLASH_MS * 2);
    await flush();

    expect(mockReplace).not.toHaveBeenCalled();
  });
});
