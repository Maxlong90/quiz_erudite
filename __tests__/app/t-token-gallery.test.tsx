/**
 * The token gallery (app/t/tokens.tsx), reached by long-pressing the wordmark
 * on the template home.
 *
 * It is the instrument for the whole engine on a real device — which tier is
 * applied, which validator is held, which tokens the operator actually changed —
 * and the only way to hand-test the forced-refetch and empty-cache branches
 * without a rebuild. These tests keep that instrument honest.
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

jest.mock('@/api/client', () => ({
  APP_SLUG: 'configurable-quiz',
  API_URL: 'https://example.test/api/v1',
  apiClient: { get: jest.fn() },
}));

const mockClearCachedTheme = jest.fn().mockResolvedValue(undefined);
jest.mock('@/lib/theme/theme-cache', () => ({
  ...jest.requireActual('@/lib/theme/theme-cache'),
  clearCachedTheme: (...args: unknown[]) => mockClearCachedTheme(...args),
}));

const mockRefresh = jest.fn().mockResolvedValue(undefined);
let mockThemeValue: any;
jest.mock('@/hooks/use-app-theme', () => ({
  ...jest.requireActual('@/hooks/use-app-theme'),
  useAppTheme: () => mockThemeValue,
}));

/* eslint-disable import/first -- screen under test loads AFTER its mocks */
import TThemeTokensScreen from '@/app/t/tokens';
import { EruditeColors } from '@/constants/theme';
import { ThemePrefProvider } from '@/hooks/use-theme-pref';
import { BUNDLED_THEME } from '@/lib/theme/bundled';
import { REMOTE_TOKEN_KEYS } from '@/lib/theme/contract';
import { overriddenKeys, resolvePalettes } from '@/lib/theme/resolve';

function themeValue(overrides: Record<string, unknown> = {}) {
  const theme = (overrides.theme as typeof BUNDLED_THEME) ?? BUNDLED_THEME;
  return {
    palettes: resolvePalettes(EruditeColors, theme),
    source: 'network',
    schemaVersion: 1,
    name: 'configurable-quiz 1',
    supportsDark: true,
    hydrated: true,
    networkSettled: true,
    unsupportedSchemaVersion: null,
    etag: '"11511dfaed2703fa7de40fbbfac96552721edf14905494dc86e00397889afb4a"',
    syncedAt: Date.now(),
    overridden: overriddenKeys(theme),
    refresh: mockRefresh,
    ...overrides,
  };
}

function renderGallery() {
  return render(
    <ThemePrefProvider>
      <TThemeTokensScreen />
    </ThemePrefProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRefresh.mockResolvedValue(undefined);
  mockClearCachedTheme.mockResolvedValue(undefined);
  mockThemeValue = themeValue();
});

describe('token gallery', () => {
  it('renders a row for every remote token', () => {
    renderGallery();
    for (const key of REMOTE_TOKEN_KEYS) {
      expect(screen.getByTestId(`theme-token-${key}`)).toBeTruthy();
    }
  });

  it('shows the build slug and the preset name', () => {
    renderGallery();
    expect(screen.getByText('configurable-quiz')).toBeTruthy();
    expect(screen.getByText('configurable-quiz 1')).toBeTruthy();
  });

  it('labels a preset-less app rather than showing an empty name', () => {
    mockThemeValue = themeValue({ name: null });
    renderGallery();
    expect(screen.getByText('(default preset)')).toBeTruthy();
  });

  it.each(['bundled', 'cache', 'network'] as const)('badges the %s tier', (source) => {
    mockThemeValue = themeValue({ source });
    renderGallery();
    expect(screen.getByTestId('theme-source-badge')).toHaveTextContent(source.toUpperCase());
  });

  it('shows the schema version', () => {
    renderGallery();
    expect(screen.getByText('schema_version')).toBeTruthy();
    expect(screen.getByText('1')).toBeTruthy();
  });

  it('marks ONLY the tokens the operator changed', () => {
    const edited = { ...BUNDLED_THEME, dark: { ...BUNDLED_THEME.dark, accent: '#ff0055' } };
    mockThemeValue = themeValue({ theme: edited });
    renderGallery();

    expect(screen.getByTestId('theme-token-accent-overridden')).toBeTruthy();
    expect(screen.queryByTestId('theme-token-bgSolid-overridden')).toBeNull();
    expect(screen.queryByTestId('theme-token-optIdleText-overridden')).toBeNull();
  });

  it('marks nothing when the preset is untouched', () => {
    renderGallery();
    for (const key of REMOTE_TOKEN_KEYS) {
      expect(screen.queryByTestId(`theme-token-${key}-overridden`)).toBeNull();
    }
  });

  it('surfaces an unsupported schema version in the open', () => {
    mockThemeValue = themeValue({ unsupportedSchemaVersion: 2 });
    renderGallery();
    expect(screen.getByTestId('theme-unsupported')).toBeTruthy();
  });

  it('hides the unsupported warning in the normal case', () => {
    renderGallery();
    expect(screen.queryByTestId('theme-unsupported')).toBeNull();
  });

  it('forces an unconditional refetch from "Refetch now"', async () => {
    renderGallery();
    fireEvent.press(screen.getByTestId('theme-refetch'));

    // Skipping If-None-Match is what makes a Nova edit visible in seconds.
    await waitFor(() => expect(mockRefresh).toHaveBeenCalledWith({ force: true }));
  });

  it('clears the cache and then resyncs from "Clear cache"', async () => {
    renderGallery();
    fireEvent.press(screen.getByTestId('theme-clear-cache'));

    // The only way to hand-test the empty-cache branch on a device.
    await waitFor(() => expect(mockClearCachedTheme).toHaveBeenCalled());
    expect(mockRefresh).toHaveBeenCalledWith();
  });

  it('lets the operator check both appearances without leaving', async () => {
    const edited = {
      ...BUNDLED_THEME,
      dark: { ...BUNDLED_THEME.dark, accent: '#ff0055' },
      light: { ...BUNDLED_THEME.light, accent: '#00aa66' },
    };
    mockThemeValue = themeValue({ theme: edited });
    renderGallery();

    expect(screen.getByText('#ff0055')).toBeTruthy();
    fireEvent.press(screen.getByTestId('theme-toggle-appearance'));
    await waitFor(() => expect(screen.getByText('#00aa66')).toBeTruthy());
  });

  it('renders the gradient stops rather than "[object Object]"', () => {
    renderGallery();
    expect(screen.getByText('#1a1a47  #2d1f5e  #1a1a47')).toBeTruthy();
  });

  it('still renders with no provider above it', () => {
    mockThemeValue = null;
    expect(() => renderGallery()).not.toThrow();
    expect(screen.getByTestId('theme-source-badge')).toHaveTextContent('BUNDLED');
  });
});
