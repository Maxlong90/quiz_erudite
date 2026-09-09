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
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@/api/client', () => ({
  APP_SLUG: 'test-quiz',
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
import {
  forcedOnboardingType,
  setForcedOnboardingType,
} from '@/hooks/t/use-onboarding-type';
import { ThemePrefProvider } from '@/hooks/use-theme-pref';
import { T_ONBOARDING_DEFAULT } from '@/lib/onboarding/onboarding-type';
import { BUNDLED_THEME } from '@/lib/theme/bundled';
import { REMOTE_TOKEN_KEYS } from '@/lib/theme/contract';
import { overriddenKeys, resolvePalettes } from '@/lib/theme/resolve';

function themeValue(overrides: Record<string, unknown> = {}) {
  const theme = (overrides.theme as typeof BUNDLED_THEME) ?? BUNDLED_THEME;
  return {
    palettes: resolvePalettes(EruditeColors, theme),
    source: 'network',
    schemaVersion: 1,
    name: 'test-quiz 1',
    supportsDark: true,
    hydrated: true,
    networkSettled: true,
    unsupportedSchemaVersion: null,
    onboardingType: T_ONBOARDING_DEFAULT,
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

/** The pin is module state and __DEV__ is a global; both leak between cases. */
const REAL_DEV = __DEV__;

beforeEach(() => {
  jest.clearAllMocks();
  mockRefresh.mockResolvedValue(undefined);
  mockClearCachedTheme.mockResolvedValue(undefined);
  mockThemeValue = themeValue();
  setForcedOnboardingType(null);
});

afterEach(() => {
  (global as unknown as { __DEV__: boolean }).__DEV__ = REAL_DEV;
  setForcedOnboardingType(null);
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
    expect(screen.getByText('test-quiz')).toBeTruthy();
    expect(screen.getByText('test-quiz 1')).toBeTruthy();
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

/**
 * The onboarding variant: what the backend chose, and what a developer pinned
 * over it by hand.
 *
 * The pin matters more than a debug toggle usually would. The deployed backend
 * serves schema_version 2 while this client understands 1, so the envelope that
 * carries `onboarding_type` is rejected before anything reads it — until that is
 * fixed, this control is the ONLY way to reach the second onboarding screen on a
 * device.
 */
describe('the onboarding variant row', () => {
  it('names the variant the backend selected', () => {
    mockThemeValue = themeValue({ onboardingType: 'universal' });
    renderGallery();

    expect(screen.getByText('onboarding_type')).toBeTruthy();
    expect(screen.getByTestId('theme-onboarding-type')).toHaveTextContent('universal');
  });

  it('badges nothing while the engine is in charge', () => {
    renderGallery();
    expect(screen.queryByTestId('theme-onboarding-type-forced')).toBeNull();
  });

  it('cycles the pin through the whole union and back to auto', () => {
    // The expected sequence is SPELLED OUT rather than derived from
    // T_ONBOARDING_TYPES on purpose. The implementation's FORCE_CYCLE is itself
    // derived from that union, so an expectation built the same way would be a
    // tautology — green for whatever order the implementation happened to
    // produce, including one that skipped a member outright.
    renderGallery();
    const button = () => screen.getByTestId('theme-force-onboarding');
    expect(button()).toHaveTextContent('force onboarding: auto');

    fireEvent.press(button());
    expect(button()).toHaveTextContent('force onboarding: classic');
    expect(forcedOnboardingType()).toBe('classic');

    fireEvent.press(button());
    expect(button()).toHaveTextContent('force onboarding: universal');
    expect(forcedOnboardingType()).toBe('universal');

    // `none` draws no screen, so the gallery row is the only place a developer
    // can confirm the pin took — hence it must be reachable from this control.
    fireEvent.press(button());
    expect(button()).toHaveTextContent('force onboarding: none');
    expect(forcedOnboardingType()).toBe('none');

    // Releasing is one more press, not a second control.
    fireEvent.press(button());
    expect(button()).toHaveTextContent('force onboarding: auto');
    expect(forcedOnboardingType()).toBeNull();
  });

  it('does not lie about the backend value while a pin is active', () => {
    // THE case for reporting the wire rather than the resolution: with a pin the
    // app draws `universal` while the backend really did say `classic`, and every
    // other row in this card states what the build was GIVEN. Showing the
    // resolved value would be wrong in both directions at once.
    mockThemeValue = themeValue({ onboardingType: 'classic' });
    renderGallery();
    fireEvent.press(screen.getByTestId('theme-force-onboarding'));
    fireEvent.press(screen.getByTestId('theme-force-onboarding'));

    expect(screen.getByTestId('theme-onboarding-type')).toHaveTextContent('classic');
    expect(screen.getByTestId('theme-onboarding-type-forced')).toHaveTextContent(
      'forced: universal',
    );
  });

  it('leaves nothing on the device', async () => {
    // Module state, never storage: a pin must not survive a cold start, or a
    // developer would hand a colleague a build stuck on a screen no backend chose.
    const setItem = jest.spyOn(AsyncStorage, 'setItem');
    renderGallery();
    fireEvent.press(screen.getByTestId('theme-force-onboarding'));

    expect(setItem).not.toHaveBeenCalled();
    setItem.mockRestore();
  });

  it('keeps the row but drops the control where __DEV__ is false', () => {
    // The row reports operator data and belongs on a release build like every
    // other line in the card. The control writes developer-only state and does
    // not — which is also why it lives in its own action row rather than as a
    // fourth child of one whose layout an operator sees.
    (global as unknown as { __DEV__: boolean }).__DEV__ = false;
    renderGallery();

    expect(screen.getByTestId('theme-onboarding-type')).toBeTruthy();
    expect(screen.queryByTestId('theme-force-onboarding')).toBeNull();
  });
});
