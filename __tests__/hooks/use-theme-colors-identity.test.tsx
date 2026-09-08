/**
 * useThemeColors after the theme engine landed (hooks/use-theme-colors.ts).
 *
 * This is a ONE-LINE change with SIXTY-NINE consumers, essentially all of them
 * shaped `useMemo(() => makeStyles(colors), [colors])`. Two things must hold or
 * that line is a regression:
 *
 *   1. On a legacy build it returns the EXACT SAME OBJECT it returned before —
 *      EruditeColors[theme] by reference — so no stylesheet is rebuilt.
 *   2. It still works with no AppThemeProvider above it, which is how most of the
 *      existing test suite renders components.
 */
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const mockGet = jest.fn();
jest.mock('@/api/client', () => ({
  APP_SLUG: 'configurable-quiz',
  API_URL: 'https://example.test/api/v1',
  apiClient: { get: (...args: unknown[]) => mockGet(...args) },
}));

let mockIsTTemplateBuild = false;
jest.mock('@/constants/app-templates', () => ({
  ...jest.requireActual('@/constants/app-templates'),
  isTTemplateBuild: () => mockIsTTemplateBuild,
}));

import { EruditeColors } from '@/constants/theme';
import { AppThemeProvider } from '@/hooks/app-theme-provider';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { ThemePrefProvider, useThemePref } from '@/hooks/use-theme-pref';
import { BUNDLED_THEME } from '@/lib/theme/bundled';

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <ThemePrefProvider>
      <AppThemeProvider>{children}</AppThemeProvider>
    </ThemePrefProvider>
  );
}

beforeEach(async () => {
  mockIsTTemplateBuild = false;
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

describe('on a legacy build', () => {
  it('returns EruditeColors[theme] by reference', () => {
    const { result } = renderHook(() => useThemeColors(), { wrapper });
    expect(result.current).toBe(EruditeColors.dark);
  });

  it('follows the appearance preference, still by reference', async () => {
    const { result } = renderHook(
      () => ({ colors: useThemeColors(), pref: useThemePref() }),
      { wrapper },
    );
    expect(result.current.colors).toBe(EruditeColors.dark);

    await result.current.pref.setTheme('light');
    await waitFor(() => expect(result.current.colors).toBe(EruditeColors.light));
  });

  it('is referentially stable across re-renders', () => {
    const { result, rerender } = renderHook(() => useThemeColors(), { wrapper });
    const first = result.current;
    rerender({});
    rerender({});
    expect(result.current).toBe(first);
  });

  it('works with no AppThemeProvider at all', () => {
    const { result } = renderHook(() => useThemeColors(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <ThemePrefProvider>{children}</ThemePrefProvider>
      ),
    });
    expect(result.current).toBe(EruditeColors.dark);
  });

  it('never touches the network, even indirectly', async () => {
    renderHook(() => useThemeColors(), { wrapper });
    await Promise.resolve();
    expect(mockGet).not.toHaveBeenCalled();
  });
});

describe('on a configurable build', () => {
  beforeEach(() => {
    mockIsTTemplateBuild = true;
  });

  it('overlays the remote tokens', async () => {
    mockGet.mockResolvedValueOnce({
      status: 200,
      headers: { etag: '"v1"' },
      data: {
        schema_version: 1,
        theme: { ...BUNDLED_THEME, dark: { ...BUNDLED_THEME.dark, accent: '#ff0055' } },
      },
    });

    const { result } = renderHook(() => useThemeColors(), { wrapper });
    await waitFor(() => expect(result.current.accent).toBe('#ff0055'));
  });

  it('leaves the tokens the backend does not serve at their bundled values', async () => {
    mockGet.mockResolvedValueOnce({
      status: 200,
      headers: { etag: '"v1"' },
      data: {
        schema_version: 1,
        theme: { ...BUNDLED_THEME, dark: { ...BUNDLED_THEME.dark, accent: '#ff0055' } },
      },
    });

    const { result } = renderHook(() => useThemeColors(), { wrapper });
    await waitFor(() => expect(result.current.accent).toBe('#ff0055'));

    for (const key of ['text', 'surface', 'scrim', 'success', 'gold', 'explanationText'] as const) {
      expect(result.current[key]).toBe(EruditeColors.dark[key]);
    }
  });

  it('returns EruditeColors by reference when the preset is unedited', async () => {
    mockGet.mockResolvedValueOnce({
      status: 200,
      headers: { etag: '"v1"' },
      data: { schema_version: 1, theme: BUNDLED_THEME },
    });

    const { result } = renderHook(() => useThemeColors(), { wrapper });
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(result.current).toBe(EruditeColors.dark);
  });
});
