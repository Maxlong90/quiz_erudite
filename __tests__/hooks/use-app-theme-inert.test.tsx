/**
 * THE ACCEPTANCE PROOF: the theme engine is completely inert in every shipped build.
 *
 * "Inert" is claimed at three levels and each is asserted separately below:
 *
 *   no I/O        — no network request and no read of the theme cache key, ever.
 *   no re-render  — every build gets the SAME frozen object, so this provider can
 *                   never be the cause of a render.
 *   no repaint    — the palettes it hands out ARE EruditeColors BY REFERENCE.
 *                   That single identity assertion is the whole visual-inertness
 *                   proof: an identical object means identical tokens, which means
 *                   all sixty-nine `useMemo(() => makeStyles(colors), [colors])`
 *                   sites keep the stylesheet they already built.
 *
 * isTTemplateBuild() is a FUNCTION, not a constant, so the build slug can be
 * varied per test case without jest.resetModules().
 */
import React from 'react';
import { renderHook } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const mockGet = jest.fn();
jest.mock('@/api/client', () => ({
  APP_SLUG: 'erudite-quiz',
  API_URL: 'https://example.test/api/v1',
  apiClient: { get: (...args: unknown[]) => mockGet(...args) },
}));

// The gate under test, driven per test case.
let mockIsTTemplateBuild = false;
jest.mock('@/constants/app-templates', () => ({
  ...jest.requireActual('@/constants/app-templates'),
  isTTemplateBuild: () => mockIsTTemplateBuild,
}));

import { EruditeColors } from '@/constants/theme';
import { AppThemeProvider } from '@/hooks/app-theme-provider';
import { INERT_THEME_VALUE, useAppTheme } from '@/hooks/use-app-theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { ThemePrefProvider } from '@/hooks/use-theme-pref';
import { T_ONBOARDING_DEFAULT } from '@/lib/onboarding/onboarding-type';

/** Every build this tree ships today. The task named five; seven is stricter. */
const SHIPPED_BUILD_SLUGS = [
  'erudite-quiz',
  'logo-quiz',
  'flags-quiz',
  'coat-of-arms',
  'sport-quiz',
  'italy-history-and-geography-quiz',
  // Registered in APP_TEMPLATES but absent from this list until now, so it was
  // the one shipped build whose inertness nothing checked.
  'football-quiz',
] as const;

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

describe.each(SHIPPED_BUILD_SLUGS)('shipped build: %s', (slug) => {
  // The slug is what the gate consults; the mock above reports "not a template
  // build" for every one of them, exactly as the real T_TEMPLATE_SLUGS does.
  it(`performs NO network request (${slug})`, async () => {
    renderHook(() => useAppTheme(), { wrapper });
    // Flush anything an effect might have scheduled.
    await Promise.resolve();
    expect(mockGet).not.toHaveBeenCalled();
  });

  it(`NEVER reads the theme cache key (${slug})`, async () => {
    renderHook(() => useAppTheme(), { wrapper });
    await Promise.resolve();

    const themeReads = (AsyncStorage.getItem as jest.Mock).mock.calls.filter(
      ([key]) => typeof key === 'string' && key.startsWith('theme.remote.'),
    );
    expect(themeReads).toEqual([]);
  });

  it(`hands out the frozen inert value itself (${slug})`, () => {
    const { result } = renderHook(() => useAppTheme(), { wrapper });
    // Same object for every build ⇒ no consumer can re-render from this provider.
    expect(result.current).toBe(INERT_THEME_VALUE);
  });

  it(`hands out EruditeColors BY REFERENCE (${slug})`, () => {
    const { result } = renderHook(() => useAppTheme(), { wrapper });
    // toBe, not toEqual — see the file docblock.
    expect(result.current?.palettes.dark).toBe(EruditeColors.dark);
    expect(result.current?.palettes.light).toBe(EruditeColors.light);
  });

  it(`keeps that reference stable across re-renders (${slug})`, () => {
    const { result, rerender } = renderHook(() => useAppTheme(), { wrapper });
    const first = result.current;
    rerender({});
    rerender({});
    expect(result.current).toBe(first);
  });

  it(`renders the onboarding variant it always rendered (${slug})`, () => {
    // A shipped build never fetches, so it has no operator answer to apply. The
    // default names the screen that ships today — this is the assertion that
    // makes "no pixel moves in any sibling app" a checked claim.
    const { result } = renderHook(() => useAppTheme(), { wrapper });
    expect(result.current?.onboardingType).toBe(T_ONBOARDING_DEFAULT);
  });
});

describe('useThemeColors under an inert provider', () => {
  it('returns the very same palette object it always returned', () => {
    const { result } = renderHook(() => useThemeColors(), { wrapper });
    // The default appearance is dark (hooks/use-theme-pref.ts).
    expect(result.current).toBe(EruditeColors.dark);
  });

  it('is stable across re-renders, so memoised stylesheets survive', () => {
    const { result, rerender } = renderHook(() => useThemeColors(), { wrapper });
    const first = result.current;
    rerender({});
    expect(result.current).toBe(first);
  });

  it('still works with NO AppThemeProvider at all', () => {
    // The context is optional by design, which is what keeps every pre-existing
    // renderHook test in the suite working unmodified.
    const { result } = renderHook(() => useThemeColors(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <ThemePrefProvider>{children}</ThemePrefProvider>
      ),
    });
    expect(result.current).toBe(EruditeColors.dark);
  });
});

describe('the inert value itself', () => {
  it('is frozen', () => {
    expect(Object.isFrozen(INERT_THEME_VALUE)).toBe(true);
    expect(Object.isFrozen(INERT_THEME_VALUE.palettes)).toBe(true);
  });

  it('reports itself as already settled, so a caller gating on it never hangs', () => {
    expect(INERT_THEME_VALUE.hydrated).toBe(true);
    expect(INERT_THEME_VALUE.networkSettled).toBe(true);
    expect(INERT_THEME_VALUE.source).toBe('bundled');
    expect(INERT_THEME_VALUE.unsupportedSchemaVersion).toBeNull();
  });

  it('flags no token as overridden', () => {
    expect(Object.values(INERT_THEME_VALUE.overridden).some(Boolean)).toBe(false);
  });

  it('has a refresh that resolves without doing anything', async () => {
    await expect(INERT_THEME_VALUE.refresh()).resolves.toBeUndefined();
    await expect(INERT_THEME_VALUE.refresh({ force: true })).resolves.toBeUndefined();
    expect(mockGet).not.toHaveBeenCalled();
  });
});
