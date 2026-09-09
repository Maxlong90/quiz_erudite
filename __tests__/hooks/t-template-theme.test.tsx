/**
 * hooks/t/use-template-theme.ts — the configurable template's colour funnel.
 *
 * Two things have to hold, and only one of them is about colour:
 *
 *   1. The derived roles track the palette they came from, INCLUDING an operator
 *      override. A template whose scale is merely literal-free but frozen to the
 *      bundled purple would pass a grep and fail the point of the feature.
 *   2. The same palette always yields the SAME OBJECT BY REFERENCE, across
 *      components and not merely across one component's re-renders. Roughly
 *      sixty-nine call sites are `useMemo(() => makeStyles(c), [c])`; a fresh
 *      object per render rebuilds every stylesheet in the template, every
 *      render. That is the regression this file exists to catch, because nothing
 *      visual would show it.
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

let mockIsTTemplateBuild = false;
jest.mock('@/constants/app-templates', () => ({
  ...jest.requireActual('@/constants/app-templates'),
  isTTemplateBuild: () => mockIsTTemplateBuild,
}));

import { EruditeColors, type EruditePalette } from '@/constants/theme';
import { AppThemeProvider } from '@/hooks/app-theme-provider';
import { deriveTemplateTheme, useTemplateTheme } from '@/hooks/t/use-template-theme';
import { ThemePrefProvider, useThemePref } from '@/hooks/use-theme-pref';
import { BUNDLED_THEME } from '@/lib/theme/bundled';
import { resolvePalette } from '@/lib/theme/resolve';
import { SCHEMA_VERSION_V2 } from '@/__tests__/fixtures/remote-theme-v2';

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

describe('the derived tier scale', () => {
  it.each([
    ['dark', EruditeColors.dark],
    ['light', EruditeColors.light],
  ])('maps high/mid/low onto success/accent/danger in %s', (_name, palette) => {
    const theme = deriveTemplateTheme(palette);
    expect({ tierHigh: theme.tierHigh, tierMid: theme.tierMid, tierLow: theme.tierLow }).toEqual({
      tierHigh: palette.success,
      tierMid: palette.accent,
      tierLow: palette.danger,
    });
  });

  it('uses the accent for the middle band rather than gold', () => {
    // The ported scale was #22c55e / #f59e0b / #ef4444 and the palette has no
    // amber. gold is illegible on the light backdrop; accent is legible on both.
    // Pinned so the choice is not quietly undone.
    const light = deriveTemplateTheme(EruditeColors.light);
    expect(light.tierMid).toBe(EruditeColors.light.accent);
    expect(light.tierMid).not.toBe(EruditeColors.light.gold);
  });

  it('leaves every palette token exactly as it was', () => {
    const theme = deriveTemplateTheme(EruditeColors.dark);
    for (const key of Object.keys(EruditeColors.dark) as (keyof EruditePalette)[]) {
      expect({ key, value: theme[key] }).toEqual({ key, value: EruditeColors.dark[key] });
    }
  });

  it('passes scrim through as the wire-normalised 8-digit hex', () => {
    // scrim was an rgba() literal until Э1; it is now 8-digit hex in BOTH
    // appearances, byte-identical to what the wire serves. Nothing here may
    // rewrite it — an unparseable colour throws in native code, and the bundled
    // value must equal the wire's so an untouched preset reads as untouched.
    expect(deriveTemplateTheme(EruditeColors.dark).scrim).toBe(EruditeColors.dark.scrim);
    expect(deriveTemplateTheme(EruditeColors.light).scrim).toBe(EruditeColors.light.scrim);
  });
});

describe('reference identity', () => {
  it('returns the same object for the same palette', () => {
    expect(deriveTemplateTheme(EruditeColors.dark)).toBe(deriveTemplateTheme(EruditeColors.dark));
  });

  it('returns different objects for different palettes', () => {
    expect(deriveTemplateTheme(EruditeColors.dark)).not.toBe(
      deriveTemplateTheme(EruditeColors.light),
    );
  });

  it('is stable across re-renders of a component', () => {
    const { result, rerender } = renderHook(() => useTemplateTheme(), { wrapper });
    const first = result.current;
    rerender({});
    rerender({});
    expect(result.current).toBe(first);
  });

  it('hands two separate components the very same object', () => {
    // The reason the memo is a module-level WeakMap and not a useMemo: a
    // per-component memo cell would give these two different objects under one
    // palette, and their makeStyles memos would stop agreeing.
    const one = renderHook(() => useTemplateTheme(), { wrapper });
    const two = renderHook(() => useTemplateTheme(), { wrapper });
    expect(one.result.current).toBe(two.result.current);
  });

  it('follows the appearance preference, still by reference', async () => {
    const { result } = renderHook(
      () => ({ theme: useTemplateTheme(), pref: useThemePref() }),
      { wrapper },
    );
    expect(result.current.theme).toBe(deriveTemplateTheme(EruditeColors.dark));

    await result.current.pref.setTheme('light');
    await waitFor(() =>
      expect(result.current.theme).toBe(deriveTemplateTheme(EruditeColors.light)),
    );
  });

  it('works with no AppThemeProvider at all, as most suites render', () => {
    const { result } = renderHook(() => useTemplateTheme(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <ThemePrefProvider>{children}</ThemePrefProvider>
      ),
    });
    expect(result.current.tierMid).toBe(EruditeColors.dark.accent);
  });
});

describe('under an operator preset', () => {
  it('moves the middle tier with the overridden accent', () => {
    // Proves the scale is THEMED, not merely literal-free. Driven through
    // resolvePalette so it is the real overlay path, not a hand-built object.
    const overridden = resolvePalette(EruditeColors.dark, {
      ...BUNDLED_THEME.dark,
      accent: '#ff0055',
    });
    expect(overridden).not.toBe(EruditeColors.dark);
    expect(deriveTemplateTheme(overridden).tierMid).toBe('#ff0055');
  });

  it('repaints the live hook when the backend serves a new accent', async () => {
    mockIsTTemplateBuild = true;
    mockGet.mockResolvedValueOnce({
      status: 200,
      headers: { etag: '"v1"' },
      data: {
        schema_version: SCHEMA_VERSION_V2,
        theme: { ...BUNDLED_THEME, dark: { ...BUNDLED_THEME.dark, accent: '#ff0055' } },
      },
    });

    const { result } = renderHook(() => useTemplateTheme(), { wrapper });
    await waitFor(() => expect(result.current.tierMid).toBe('#ff0055'));
    expect(result.current.tierHigh).toBe(EruditeColors.dark.success);
    expect(result.current.tierLow).toBe(EruditeColors.dark.danger);
  });

  it('repaints the outer bands when the backend moves success and danger', async () => {
    // The Э1 widening put success and danger on the wire, so a preset now moves
    // the whole traffic-light scale, not just the middle band. This is the
    // assertion the pre-widening suite pinned as "not settable yet".
    mockIsTTemplateBuild = true;
    mockGet.mockResolvedValueOnce({
      status: 200,
      headers: { etag: '"v1"' },
      data: {
        schema_version: SCHEMA_VERSION_V2,
        theme: {
          ...BUNDLED_THEME,
          dark: { ...BUNDLED_THEME.dark, success: '#00aa00', danger: '#aa0000' },
        },
      },
    });

    const { result } = renderHook(() => useTemplateTheme(), { wrapper });
    await waitFor(() => expect(result.current.tierHigh).toBe('#00aa00'));
    expect(result.current.tierLow).toBe('#aa0000');
    expect(result.current.tierMid).toBe(EruditeColors.dark.accent);
  });
});
