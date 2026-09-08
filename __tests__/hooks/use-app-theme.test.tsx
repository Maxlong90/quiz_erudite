/**
 * The theme engine in motion (hooks/use-app-theme.ts): bundled → cache → network.
 *
 * The invariant running through every case: the engine is FAIL-OPEN. Offline, a
 * timeout, a corrupt payload, a schema from the future — each one leaves the app
 * showing the best palette it already had, and none of them may throw into the
 * render tree or leave a gate un-settled (which would strand the splash).
 */
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const mockGet = jest.fn();
jest.mock('@/api/client', () => ({
  APP_SLUG: 'test-quiz',
  API_URL: 'https://example.test/api/v1',
  apiClient: { get: (...args: unknown[]) => mockGet(...args) },
}));

jest.mock('@/constants/app-templates', () => ({
  ...jest.requireActual('@/constants/app-templates'),
  isTTemplateBuild: () => true,
}));

import { EruditeColors } from '@/constants/theme';
import { AppThemeProvider } from '@/hooks/app-theme-provider';
import { useAppTheme } from '@/hooks/use-app-theme';
import { ThemePrefProvider } from '@/hooks/use-theme-pref';
import { BUNDLED_THEME } from '@/lib/theme/bundled';
import { saveCachedTheme, loadCachedTheme } from '@/lib/theme/theme-cache';

const CACHE_KEY = 'theme.remote.v1';
const OLD_ETAG = '"old-validator"';
const NEW_ETAG = '"new-validator"';

/** An operator palette that differs from bundled in one visible token. */
function editedTheme(accent = '#ff0055') {
  return {
    ...BUNDLED_THEME,
    name: 'test-quiz 1',
    dark: { ...BUNDLED_THEME.dark, accent },
    light: { ...BUNDLED_THEME.light, accent },
  };
}

function response(theme: unknown, etag: string | null = NEW_ETAG, schemaVersion = 1) {
  return {
    status: 200,
    data: { schema_version: schemaVersion, theme },
    headers: etag ? { etag } : {},
  };
}

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <ThemePrefProvider>
      <AppThemeProvider>{children}</AppThemeProvider>
    </ThemePrefProvider>
  );
}

function renderEngine() {
  return renderHook(() => useAppTheme(), { wrapper });
}

/** Seed a warm cache holding the bundled palette under OLD_ETAG. */
async function seedCache(theme = BUNDLED_THEME, etag: string | null = OLD_ETAG) {
  await saveCachedTheme({
    record: 1,
    etag,
    schemaVersion: 1,
    theme,
    appSlug: 'test-quiz',
    syncedAt: 1_700_000_000_000,
  });
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

describe('cold start, empty cache', () => {
  it('starts on the bundled tier and lands on network', async () => {
    mockGet.mockResolvedValueOnce(response(editedTheme()));
    const { result } = renderEngine();

    // Whatever else happens, the FIRST frame is already paintable.
    expect(result.current?.source).toBe('bundled');
    expect(result.current?.palettes.dark).toBe(EruditeColors.dark);

    await waitFor(() => expect(result.current?.source).toBe('network'));
    expect(result.current?.palettes.dark.accent).toBe('#ff0055');
    expect(result.current?.hydrated).toBe(true);
    expect(result.current?.networkSettled).toBe(true);
    expect(result.current?.name).toBe('test-quiz 1');
    expect(result.current?.etag).toBe(NEW_ETAG);
  });

  it('fetches unconditionally when it holds no validator', async () => {
    mockGet.mockResolvedValueOnce(response(editedTheme()));
    const { result } = renderEngine();
    await waitFor(() => expect(result.current?.networkSettled).toBe(true));

    expect(mockGet.mock.calls[0][1].headers).toBeUndefined();
  });

  it('persists what it fetched, so the next launch is warm', async () => {
    mockGet.mockResolvedValueOnce(response(editedTheme()));
    const { result } = renderEngine();
    await waitFor(() => expect(result.current?.source).toBe('network'));

    const cached = await loadCachedTheme('test-quiz');
    expect(cached?.etag).toBe(NEW_ETAG);
    expect(cached?.theme.dark.accent).toBe('#ff0055');
  });

  it('stays bundled and settles when the device is offline', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network Error'));
    const { result } = renderEngine();

    // networkSettled MUST still flip, or the splash would hold to its cap.
    await waitFor(() => expect(result.current?.networkSettled).toBe(true));
    expect(result.current?.source).toBe('bundled');
    expect(result.current?.palettes.dark).toBe(EruditeColors.dark);
    expect(await AsyncStorage.getItem(CACHE_KEY)).toBeNull();
  });
});

describe('warm start', () => {
  it('applies the cached theme before the network answers', async () => {
    await seedCache(editedTheme('#00ff88'));
    mockGet.mockResolvedValueOnce({ status: 304, data: '', headers: { etag: OLD_ETAG } });

    const { result } = renderEngine();
    await waitFor(() => expect(result.current?.source).toBe('cache'));
    expect(result.current?.palettes.dark.accent).toBe('#00ff88');
  });

  it('replays the cached validator and stays on cache for a 304', async () => {
    await seedCache(editedTheme('#00ff88'));
    mockGet.mockResolvedValueOnce({ status: 304, data: '', headers: { etag: OLD_ETAG } });

    const { result } = renderEngine();
    await waitFor(() => expect(result.current?.networkSettled).toBe(true));

    expect(mockGet.mock.calls[0][1].headers).toEqual({ 'If-None-Match': OLD_ETAG });
    expect(result.current?.source).toBe('cache');
    expect(result.current?.palettes.dark.accent).toBe('#00ff88');
  });

  it('moves to the network tier when the operator has edited the preset', async () => {
    await seedCache(editedTheme('#00ff88'));
    mockGet.mockResolvedValueOnce(response(editedTheme('#ff0055')));

    const { result } = renderEngine();
    await waitFor(() => expect(result.current?.source).toBe('network'));
    expect(result.current?.palettes.dark.accent).toBe('#ff0055');
    expect((await loadCachedTheme())?.theme.dark.accent).toBe('#ff0055');
  });

  it('keeps the cached palette when the network fails', async () => {
    await seedCache(editedTheme('#00ff88'));
    mockGet.mockRejectedValueOnce(new Error('Network Error'));

    const { result } = renderEngine();
    await waitFor(() => expect(result.current?.networkSettled).toBe(true));
    expect(result.current?.source).toBe('cache');
    expect(result.current?.palettes.dark.accent).toBe('#00ff88');
  });

  it('ignores a cache record belonging to another app', async () => {
    await saveCachedTheme({
      record: 1,
      etag: OLD_ETAG,
      schemaVersion: 1,
      theme: editedTheme('#00ff88'),
      appSlug: 'some-other-app',
      syncedAt: 1,
    });
    mockGet.mockRejectedValueOnce(new Error('offline'));

    const { result } = renderEngine();
    await waitFor(() => expect(result.current?.networkSettled).toBe(true));
    expect(result.current?.source).toBe('bundled');
  });
});

describe('hostile responses', () => {
  it('keeps the cached tier on a malformed payload and persists NOTHING', async () => {
    await seedCache(editedTheme('#00ff88'));
    mockGet.mockResolvedValueOnce(response({ name: 'broken', supports_dark: true }));

    const { result } = renderEngine();
    await waitFor(() => expect(result.current?.networkSettled).toBe(true));

    expect(result.current?.source).toBe('cache');
    expect(result.current?.palettes.dark.accent).toBe('#00ff88');
    // The stored record is untouched — still the last known good.
    const cached = await loadCachedTheme();
    expect(cached?.etag).toBe(OLD_ETAG);
    expect(cached?.theme.dark.accent).toBe('#00ff88');
  });

  it('keeps the cached tier on a schema from the future and persists NOTHING', async () => {
    await seedCache(editedTheme('#00ff88'));
    mockGet.mockResolvedValueOnce(response(editedTheme('#ff0055'), NEW_ETAG, 2));

    const { result } = renderEngine();
    await waitFor(() => expect(result.current?.unsupportedSchemaVersion).toBe(2));

    expect(result.current?.source).toBe('cache');
    expect(result.current?.palettes.dark.accent).toBe('#00ff88');
    // Persisting the ETag alone would earn a 304 next launch with nothing behind
    // it; persisting the body would store a shape this build cannot read.
    const cached = await loadCachedTheme();
    expect(cached?.etag).toBe(OLD_ETAG);
    expect(cached?.schemaVersion).toBe(1);
  });

  it('reports the unsupported version while still settling the network gate', async () => {
    mockGet.mockResolvedValueOnce(response(editedTheme(), NEW_ETAG, 7));
    const { result } = renderEngine();

    await waitFor(() => expect(result.current?.networkSettled).toBe(true));
    expect(result.current?.unsupportedSchemaVersion).toBe(7);
    expect(result.current?.source).toBe('bundled');
  });

  it('never throws into the render tree, whatever the transport does', async () => {
    for (const rejection of [new Error('boom'), 'a string', null, undefined]) {
      jest.clearAllMocks();
      await AsyncStorage.clear();
      mockGet.mockRejectedValueOnce(rejection);

      const { result } = renderEngine();
      await waitFor(() => expect(result.current?.networkSettled).toBe(true));
      expect(result.current?.source).toBe('bundled');
    }
  });
});

describe('refresh', () => {
  it('re-fetches WITHOUT the validator when forced', async () => {
    await seedCache(editedTheme('#00ff88'));
    mockGet.mockResolvedValueOnce({ status: 304, data: '', headers: { etag: OLD_ETAG } });

    const { result } = renderEngine();
    await waitFor(() => expect(result.current?.networkSettled).toBe(true));

    mockGet.mockResolvedValueOnce(response(editedTheme('#123456')));
    await result.current!.refresh({ force: true });

    // Unconditional: the backend must answer with a body, which is what makes a
    // fresh Nova edit visible without a relaunch.
    expect(mockGet.mock.calls[1][1].headers).toBeUndefined();
    await waitFor(() => expect(result.current?.palettes.dark.accent).toBe('#123456'));
    expect(result.current?.source).toBe('network');
  });

  it('still sends the validator on a passive refresh', async () => {
    await seedCache(editedTheme('#00ff88'));
    mockGet.mockResolvedValue({ status: 304, data: '', headers: { etag: OLD_ETAG } });

    const { result } = renderEngine();
    await waitFor(() => expect(result.current?.networkSettled).toBe(true));

    await result.current!.refresh();
    expect(mockGet.mock.calls[1][1].headers).toEqual({ 'If-None-Match': OLD_ETAG });
  });

  it('resolves even when the forced fetch fails', async () => {
    mockGet.mockResolvedValueOnce(response(editedTheme()));
    const { result } = renderEngine();
    await waitFor(() => expect(result.current?.networkSettled).toBe(true));

    mockGet.mockRejectedValueOnce(new Error('offline'));
    await expect(result.current!.refresh({ force: true })).resolves.toBeUndefined();
    // The palette it already had survives.
    expect(result.current?.palettes.dark.accent).toBe('#ff0055');
  });
});

describe('palette resolution', () => {
  it('leaves the tokens the backend does not serve at their bundled values', async () => {
    mockGet.mockResolvedValueOnce(response(editedTheme('#ff0055')));
    const { result } = renderEngine();
    await waitFor(() => expect(result.current?.source).toBe('network'));

    const dark = result.current!.palettes.dark;
    expect(dark.text).toBe(EruditeColors.dark.text);
    expect(dark.surface).toBe(EruditeColors.dark.surface);
    expect(dark.success).toBe(EruditeColors.dark.success);
    expect(dark.explanationBg).toBe(EruditeColors.dark.explanationBg);
  });

  it('hands back EruditeColors BY REFERENCE when the preset is unedited', async () => {
    // The data-parity half of the safety story: the day a shipped app joins
    // T_TEMPLATE_SLUGS, an untouched preset re-renders nothing.
    mockGet.mockResolvedValueOnce(response(BUNDLED_THEME));
    const { result } = renderEngine();
    await waitFor(() => expect(result.current?.source).toBe('network'));

    expect(result.current?.palettes.dark).toBe(EruditeColors.dark);
    expect(result.current?.palettes.light).toBe(EruditeColors.light);
  });

  it('marks the tokens the operator actually changed', async () => {
    mockGet.mockResolvedValueOnce(response(editedTheme('#ff0055')));
    const { result } = renderEngine();
    await waitFor(() => expect(result.current?.source).toBe('network'));

    expect(result.current?.overridden.accent).toBe(true);
    expect(result.current?.overridden.bgSolid).toBe(false);
  });
});
