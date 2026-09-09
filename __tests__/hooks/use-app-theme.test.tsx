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
import {
  T_ONBOARDING_DEFAULT,
  T_ONBOARDING_TYPES,
  type TOnboardingType,
} from '@/lib/onboarding/onboarding-type';
import { BUNDLED_THEME } from '@/lib/theme/bundled';
import {
  saveCachedTheme,
  loadCachedTheme,
  type CachedThemeRecord,
} from '@/lib/theme/theme-cache';

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

/** A body that carries the onboarding discriminant, as a post-Э8 backend serves it. */
function responseWithType(
  onboardingType: unknown,
  theme: unknown = editedTheme(),
  etag: string | null = NEW_ETAG,
) {
  return {
    status: 200,
    data: { schema_version: 1, onboarding_type: onboardingType, theme },
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

function saveRecord(
  theme: CachedThemeRecord['theme'],
  etag: string | null,
  extra: Partial<CachedThemeRecord>,
) {
  return saveCachedTheme({
    record: 1,
    etag,
    schemaVersion: 1,
    theme,
    appSlug: 'test-quiz',
    syncedAt: 1_700_000_000_000,
    ...extra,
  });
}

/**
 * Seed a warm cache holding the bundled palette under OLD_ETAG.
 *
 * The record always carries an onboardingType, because that is what a record
 * written by THIS build looks like. Use seedLegacyCache for the other case — the
 * engine treats a record without the field deliberately differently, and letting
 * this helper produce one would silently rob every 'replays the validator'
 * assertion below of its meaning.
 */
async function seedCache(
  theme = BUNDLED_THEME,
  etag: string | null = OLD_ETAG,
  onboardingType: TOnboardingType = 'classic',
) {
  await saveRecord(theme, etag, { onboardingType });
}

/**
 * A record written BEFORE this build understood onboarding_type: the key is
 * genuinely ABSENT, not set to undefined. Note that
 * `seedCache(theme, etag, undefined)` would NOT model this — passing undefined to
 * a parameter with a default triggers the default.
 */
async function seedLegacyCache(theme = BUNDLED_THEME, etag: string | null = OLD_ETAG) {
  await saveRecord(theme, etag, {});
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

  it('keeps the cached tier on a schema from the future, warns loudly, and persists NOTHING', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      await seedCache(editedTheme('#00ff88'));
      mockGet.mockResolvedValueOnce(response(editedTheme('#ff0055'), NEW_ETAG, 3));

      const { result } = renderEngine();
      await waitFor(() => expect(result.current?.unsupportedSchemaVersion).toBe(3));

      expect(result.current?.source).toBe('cache');
      expect(result.current?.palettes.dark.accent).toBe('#00ff88');
      // The SILENT fallback is exactly why the v1-vs-v2 breakage shipped
      // unnoticed — this pin keeps the next schema bump loud, once per launch.
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('[theme] Backend serves schema v3'),
      );
      // Persisting the ETag alone would earn a 304 next launch with nothing behind
      // it; persisting the body would store a shape this build cannot read.
      const cached = await loadCachedTheme();
      expect(cached?.etag).toBe(OLD_ETAG);
      expect(cached?.schemaVersion).toBe(1);
    } finally {
      warn.mockRestore();
    }
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

describe('the onboarding discriminant', () => {
  it('starts at the default on the bundled tier', async () => {
    mockGet.mockRejectedValueOnce(new Error('offline'));
    const { result } = renderEngine();

    expect(result.current?.onboardingType).toBe(T_ONBOARDING_DEFAULT);
    await waitFor(() => expect(result.current?.networkSettled).toBe(true));
    expect(result.current?.onboardingType).toBe(T_ONBOARDING_DEFAULT);
  });

  it('surfaces the value the cache holds', async () => {
    await seedCache(editedTheme('#00ff88'), OLD_ETAG, 'universal');
    mockGet.mockRejectedValueOnce(new Error('offline'));

    const { result } = renderEngine();
    await waitFor(() => expect(result.current?.source).toBe('cache'));
    expect(result.current?.onboardingType).toBe('universal');
  });

  it.each(T_ONBOARDING_TYPES)('surfaces %s when the network serves it', async (type) => {
    mockGet.mockResolvedValueOnce(responseWithType(type));
    const { result } = renderEngine();

    await waitFor(() => expect(result.current?.source).toBe('network'));
    expect(result.current?.onboardingType).toBe(type);
    // and it is durable — the next launch reads it off disk.
    expect((await loadCachedTheme())?.onboardingType).toBe(type);
  });

  it('degrades a garbage value to the default WITHOUT losing the palette', async () => {
    // Decision C on the wire: a bad scalar must not cost the operator a palette.
    mockGet.mockResolvedValueOnce(responseWithType('martian', editedTheme('#ff0055')));
    const { result } = renderEngine();

    await waitFor(() => expect(result.current?.source).toBe('network'));
    expect(result.current?.onboardingType).toBe(T_ONBOARDING_DEFAULT);
    expect(result.current?.palettes.dark.accent).toBe('#ff0055');
  });

  it('keeps the cached value across a 304', async () => {
    await seedCache(editedTheme('#00ff88'), OLD_ETAG, 'universal');
    mockGet.mockResolvedValueOnce({ status: 304, data: '', headers: { etag: OLD_ETAG } });

    const { result } = renderEngine();
    await waitFor(() => expect(result.current?.networkSettled).toBe(true));
    expect(result.current?.onboardingType).toBe('universal');
  });

  it('keeps last-known-good when the network fails or serves a future schema', async () => {
    for (const failure of [
      () => mockGet.mockRejectedValueOnce(new Error('offline')),
      () => mockGet.mockResolvedValueOnce(response(editedTheme(), NEW_ETAG, 3)),
    ]) {
      await AsyncStorage.clear();
      jest.clearAllMocks();
      await seedCache(editedTheme('#00ff88'), OLD_ETAG, 'universal');
      failure();

      const { result } = renderEngine();
      await waitFor(() => expect(result.current?.networkSettled).toBe(true));
      expect(result.current?.onboardingType).toBe('universal');
    }
  });

  describe('upgrading a pre-Э8 cache record', () => {
    it('drops the validator once, keeps the palette, and stores a resolved value', async () => {
      // The record predates the field, so it holds no opinion about it. Sending
      // If-None-Match would earn a 304 and the value would never arrive — worse,
      // a backend hashing only the `theme` sub-object would 304 forever.
      await seedLegacyCache(editedTheme('#00ff88'), OLD_ETAG);
      mockGet.mockResolvedValueOnce(responseWithType('universal', editedTheme('#00ff88')));

      const { result } = renderEngine();
      await waitFor(() => expect(result.current?.networkSettled).toBe(true));

      expect(mockGet.mock.calls[0][1].headers).toBeUndefined();
      // Decision B's whole point: the incomplete record still themed the app while
      // the request was in flight.
      expect(result.current?.palettes.dark.accent).toBe('#00ff88');
      expect(result.current?.onboardingType).toBe('universal');
      expect((await loadCachedTheme())?.onboardingType).toBe('universal');
    });

    it('is self-limiting — the next launch is conditional again', async () => {
      await seedLegacyCache(editedTheme('#00ff88'), OLD_ETAG);
      mockGet.mockResolvedValueOnce(responseWithType('universal', editedTheme('#00ff88')));

      const first = renderEngine();
      await waitFor(() => expect(first.result.current?.networkSettled).toBe(true));
      expect(mockGet.mock.calls[0][1].headers).toBeUndefined();
      first.unmount();

      // Second launch: the record now carries a resolved type, so the engine is
      // back to replaying the validator. The upgrade costs exactly one body.
      mockGet.mockResolvedValueOnce({ status: 304, data: '', headers: { etag: NEW_ETAG } });
      const second = renderEngine();
      await waitFor(() => expect(second.result.current?.networkSettled).toBe(true));

      expect(mockGet.mock.calls[1][1].headers).toEqual({ 'If-None-Match': NEW_ETAG });
      expect(second.result.current?.onboardingType).toBe('universal');
    });
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
