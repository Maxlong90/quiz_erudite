/**
 * Logo Quiz splash preload + navigation gating (app/splash.tsx).
 *
 * On the logo-quiz build the splash warms the brand logos into expo-image's
 * memory-disk cache before leaving, so the first level opens with no per-tile
 * decode pop-in. These tests lock the gating contract of that preload:
 *   - it prefetches EVERY question's imageUri, awaiting the first 3 levels
 *     (45 logos) and backgrounding the rest, with cachePolicy 'memory-disk';
 *   - navigation is deferred until BOTH the 3s minimum AND the first-levels
 *     prefetch complete, but a hard cap (~10s) guarantees the user is never
 *     trapped when the sync/prefetch stalls;
 *   - it is fully fail-open: a snapshot load / prefetch error never throws and
 *     never blocks the handoff.
 * The theming/tagline branch is covered separately in splash.test.tsx; here the
 * content layer is mocked so the preload logic can be driven deterministically.
 */
import React from 'react';
import { act, render } from '@testing-library/react-native';

// --- force the logo-quiz branch ---------------------------------------------
// APP_SLUG is read at module-load time (it fixes SPLASH_DURATION_MS = 3000) and
// again in the render (isLogoQuiz). Every test here is the logo-quiz build, so
// mock it as a static constant — a getter over an outer `let` would still be in
// its TDZ when the hoisted `import SplashScreen` loads the module.
jest.mock('@/api/client', () => ({ APP_SLUG: 'logo-quiz' }));

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

// Fixed locale so the preload targets the 'en' snapshot deterministically.
jest.mock('@/hooks/use-locale', () => ({
  useLocale: () => ({ locale: 'en' }),
}));

// Trim the visual-only bits so the render is light and hook order is preserved.
jest.mock('@/hooks/use-translation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('@/hooks/use-theme-pref', () => ({
  useThemePref: () => ({ theme: 'light', ready: true, setTheme: jest.fn() }),
}));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('@/components/logo-quiz/app-background', () => {
  const { View } = require('react-native');
  return { BG_BASE: '#AEC1F5', AppBackground: () => <View testID="app-background" /> };
});

import SplashScreen from '@/app/splash';

// --- fixtures ----------------------------------------------------------------

const SPLASH_DURATION_MS = 3000; // logo-quiz minimum (asserted indirectly below)
const SPLASH_HARD_CAP_MS = 10000;

// 4 levels x 15 logos = 60 imageUris. The first 45 (levels 1-3) must be awaited
// before navigating; the remaining 15 are backgrounded.
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
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

describe('logo-quiz splash: logo preload + navigation gating', () => {
  it('prefetches the first 45 logos (memory-disk) then backgrounds the rest, and defers nav to the 3s minimum', async () => {
    const { unmount } = render(<SplashScreen />);

    // Let the preload run (load snapshot -> buildLevels -> prefetch chain).
    await advance(0);
    await flush();

    // First 3 levels awaited, remaining logos backgrounded — both memory-disk.
    expect(mockLoadCachedSnapshot).toHaveBeenCalledWith('logo-quiz');
    expect(mockSyncContent).not.toHaveBeenCalled(); // cache hit for the right locale
    expect(mockBuildLevels).toHaveBeenCalledWith(SNAPSHOT_EN);
    expect(mockPrefetch).toHaveBeenNthCalledWith(1, FIRST_45, CACHE);
    expect(mockPrefetch).toHaveBeenNthCalledWith(2, REST_15, CACHE);

    // Preload finished quickly, but the 3s minimum still holds the splash.
    await advance(SPLASH_DURATION_MS - 1);
    expect(mockReplace).not.toHaveBeenCalled();

    // Crossing the 3s minimum releases the handoff. No onboarding flag -> /language.
    await advance(1);
    await flush();
    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith('/language');

    unmount();
  });

  it('syncs the snapshot when the cache is empty, then prefetches', async () => {
    mockLoadCachedSnapshot.mockResolvedValue(null); // nothing cached yet
    const { unmount } = render(<SplashScreen />);

    await advance(0);
    await flush();

    expect(mockSyncContent).toHaveBeenCalledWith({ locale: 'en', appSlug: 'logo-quiz' });
    expect(mockPrefetch).toHaveBeenNthCalledWith(1, FIRST_45, CACHE);

    unmount();
  });

  it('re-syncs when the cached snapshot is for the wrong locale', async () => {
    mockLoadCachedSnapshot.mockResolvedValue({ locale: 'ru' }); // stale locale
    const { unmount } = render(<SplashScreen />);

    await advance(0);
    await flush();

    expect(mockSyncContent).toHaveBeenCalledWith({ locale: 'en', appSlug: 'logo-quiz' });
    expect(mockPrefetch).toHaveBeenCalled();

    unmount();
  });

  it('is fail-open: a snapshot-load rejection never throws and still navigates after the minimum', async () => {
    mockLoadCachedSnapshot.mockRejectedValue(new Error('cache blew up'));
    const { unmount } = render(<SplashScreen />);

    await advance(0);
    await flush();

    // Preload swallowed the error — nothing prefetched, no crash.
    expect(mockPrefetch).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();

    // The splash still hands off on the 3s minimum despite the failed preload.
    await advance(SPLASH_DURATION_MS);
    await flush();
    expect(mockReplace).toHaveBeenCalledWith('/language');

    unmount();
  });

  it('never traps the user: a stalled prefetch is released by the ~10s hard cap', async () => {
    // Prefetch that never resolves -> the min+preload branch can never win.
    mockPrefetch.mockReturnValue(new Promise<void>(() => {}));
    const { unmount } = render(<SplashScreen />);

    await advance(0);
    await flush();
    expect(mockPrefetch).toHaveBeenCalledWith(FIRST_45, CACHE);

    // Past the 3s minimum but before the cap: still waiting on the stalled preload.
    await advance(SPLASH_DURATION_MS);
    await flush();
    expect(mockReplace).not.toHaveBeenCalled();

    // The hard cap fires and forces the handoff regardless of the stalled prefetch.
    await advance(SPLASH_HARD_CAP_MS - SPLASH_DURATION_MS);
    await flush();
    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith('/language');

    unmount();
  });

  it('routes to home when onboarding has already been seen', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    await AsyncStorage.setItem('onboarding.seen.v1', '1');
    const { unmount } = render(<SplashScreen />);

    await advance(SPLASH_DURATION_MS);
    await flush();

    expect(mockReplace).toHaveBeenCalledWith('/');

    unmount();
  });
});
