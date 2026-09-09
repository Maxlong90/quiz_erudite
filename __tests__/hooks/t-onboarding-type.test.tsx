/**
 * hooks/t/use-onboarding-type.ts — the seam that selects an onboarding variant.
 *
 * The hook is the ONLY thing screens are allowed to read the variant through, so
 * two properties matter more than the value it returns:
 *
 *   1. It is FAIL-OPEN at every step. No provider, a non-configurable build, an
 *      offline device and a backend that has never heard of the key all resolve
 *      to the variant that ships today. A screen must always have something to
 *      draw, and "nothing" is not an option.
 *   2. It is FROZEN at first render. The splash settles the value before any
 *      consumer mounts, so the only later change would come from the gallery's
 *      manual refetch — and swapping the variant mid-flow would remount the
 *      onboarding component and silently reset the page the user was on.
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

import { AppThemeProvider } from '@/hooks/app-theme-provider';
import {
  forcedOnboardingType,
  setForcedOnboardingType,
  useOnboardingType,
} from '@/hooks/t/use-onboarding-type';
import { useAppTheme } from '@/hooks/use-app-theme';
import { ThemePrefProvider } from '@/hooks/use-theme-pref';
import { T_ONBOARDING_DEFAULT } from '@/lib/onboarding/onboarding-type';
import { BUNDLED_THEME } from '@/lib/theme/bundled';

const ETAG = '"v1"';

function themeResponse(onboardingType: unknown) {
  return {
    status: 200,
    data: { schema_version: 1, onboarding_type: onboardingType, theme: BUNDLED_THEME },
    headers: { etag: ETAG },
  };
}

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <ThemePrefProvider>
      <AppThemeProvider>{children}</AppThemeProvider>
    </ThemePrefProvider>
  );
}

/**
 * Stands in for app/t/splash.tsx, which holds navigation until
 * `hydrated && networkSettled` before letting /t/onboarding mount.
 *
 * That gate is precisely what makes freezing at first render SAFE, so a test of
 * the frozen hook that mounts it alongside the provider would be testing a
 * sequence production never performs — and would capture the pre-network default
 * every time, whatever the backend said.
 */
function SplashGate({ children }: { children: React.ReactNode }) {
  const theme = useAppTheme();
  if (!(theme?.hydrated && theme?.networkSettled)) return null;
  return <>{children}</>;
}

function gatedWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ThemePrefProvider>
      <AppThemeProvider>
        <SplashGate>{children}</SplashGate>
      </AppThemeProvider>
    </ThemePrefProvider>
  );
}

/**
 * The dev pin is MODULE state, so it outlives a test the way it outlives a
 * navigation. Released here rather than in the override block alone, so that a
 * leaked pin cannot quietly answer for the eight fail-open cases below.
 *
 * jest.resetModules() would be the wrong tool: it would hand a screen test a
 * different copy of this module than the component it is driving, and the pin
 * would land in one of them.
 */
const REAL_DEV = __DEV__;

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  mockIsTTemplateBuild = false;
  setForcedOnboardingType(null);
});

afterEach(() => {
  (global as unknown as { __DEV__: boolean }).__DEV__ = REAL_DEV;
});

describe('without a live engine', () => {
  it('returns the default with NO provider at all', () => {
    // useAppTheme() is null here. This is the case that lets Э8-B render the
    // onboarding screen in a test with no theme mock whatsoever.
    const { result } = renderHook(() => useOnboardingType());
    expect(result.current).toBe(T_ONBOARDING_DEFAULT);
  });

  it('returns the default on a shipped, non-configurable build', async () => {
    mockIsTTemplateBuild = false;
    const { result } = renderHook(
      () => ({ type: useOnboardingType(), theme: useAppTheme() }),
      { wrapper },
    );

    expect(result.current.type).toBe(T_ONBOARDING_DEFAULT);
    // The inert value, so the build performed no I/O to reach that answer.
    expect(result.current.theme?.networkSettled).toBe(true);
    expect(mockGet).not.toHaveBeenCalled();
  });
});

describe('under the configurable template', () => {
  beforeEach(() => {
    mockIsTTemplateBuild = true;
  });

  it('surfaces the variant the backend selected', async () => {
    mockGet.mockResolvedValueOnce(themeResponse('universal'));
    const { result } = renderHook(() => useOnboardingType(), { wrapper: gatedWrapper });

    // Nothing rendered until the gate opened — exactly as on the real splash.
    await waitFor(() => expect(result.current).toBe('universal'));
  });

  it('falls back to the default when the device is offline', async () => {
    mockGet.mockRejectedValueOnce(new Error('offline'));
    const { result } = renderHook(() => useOnboardingType(), { wrapper: gatedWrapper });

    await waitFor(() => expect(result.current).toBe(T_ONBOARDING_DEFAULT));
  });

  it('surfaces the default when the backend serves a variant this build lacks', async () => {
    mockGet.mockResolvedValueOnce(themeResponse('martian'));
    const { result } = renderHook(() => useOnboardingType(), { wrapper: gatedWrapper });

    await waitFor(() => expect(result.current).toBe(T_ONBOARDING_DEFAULT));
  });
});

describe('freezing', () => {
  it('keeps the first value even when the engine changes it later', async () => {
    mockIsTTemplateBuild = true;
    // Settle offline first, so the consumer mounts on the default...
    mockGet.mockRejectedValueOnce(new Error('offline'));
    const { result, rerender } = renderHook(
      () => ({ type: useOnboardingType(), theme: useAppTheme() }),
      { wrapper: gatedWrapper },
    );
    await waitFor(() => expect(result.current?.type).toBe(T_ONBOARDING_DEFAULT));

    // ...then let the gallery's forced refetch bring a different variant in,
    // which is the only way the value can move after the splash.
    mockGet.mockResolvedValueOnce(themeResponse('universal'));
    await result.current.theme!.refresh({ force: true });
    await waitFor(() => expect(result.current.theme?.onboardingType).toBe('universal'));
    rerender({});

    // The engine moved; the hook did not. Swapping the variant mid-flow would
    // remount the onboarding component and reset the user's page — strictly
    // worse than finishing the flow on the variant it started.
    expect(result.current.theme?.onboardingType).toBe('universal');
    expect(result.current.type).toBe(T_ONBOARDING_DEFAULT);
  });

  it('keeps the first value even when a pin arrives later', () => {
    // The pin sits INSIDE the freeze, and that is the documented arrangement:
    // flipping it from the gallery must not swap the screen under a flow that is
    // already running. It takes effect on the next fresh mount, which the
    // /t/settings dev reset supplies.
    const { result, rerender } = renderHook(() => useOnboardingType());
    expect(result.current).toBe(T_ONBOARDING_DEFAULT);

    setForcedOnboardingType('universal');
    rerender({});
    expect(result.current).toBe(T_ONBOARDING_DEFAULT);
  });

  it('picks up the new value on a genuinely fresh mount', async () => {
    // The freeze is per-mount, not per-process: the next cold start reads the
    // value the previous run persisted.
    mockIsTTemplateBuild = true;
    mockGet.mockResolvedValue(themeResponse('universal'));

    const first = renderHook(() => useOnboardingType(), { wrapper: gatedWrapper });
    await waitFor(() => expect(first.result.current).toBe('universal'));
    first.unmount();

    const second = renderHook(() => useOnboardingType(), { wrapper: gatedWrapper });
    await waitFor(() => expect(second.result.current).toBe('universal'));
  });
});

/**
 * The developer's manual pin.
 *
 * It exists because the backend-driven switch is currently UNREACHABLE on a
 * device: the deployed backend serves `schema_version: 2`, the client understands
 * 1, so the whole envelope is rejected as unsupported and the `onboarding_type`
 * inside it is never read. Until the widened-token work lands, this is the only
 * path to the second screen on hardware — which makes it worth as much test
 * weight as the wire path, and makes its INERTNESS in a release build the single
 * most important assertion in this file.
 */
describe('the dev force override', () => {
  it('shows a variant the engine never sent', () => {
    // No provider at all, so useAppTheme() is null and the fail-open default is
    // the only thing this hook could otherwise return.
    setForcedOnboardingType('universal');
    const { result } = renderHook(() => useOnboardingType());
    expect(result.current).toBe('universal');
  });

  it('outranks a variant the backend really did send', async () => {
    // Not merely filling a blank: the engine has a live, different answer here,
    // and the pin has to win over it rather than beside it.
    mockIsTTemplateBuild = true;
    mockGet.mockResolvedValueOnce(themeResponse('universal'));
    setForcedOnboardingType('classic');

    const { result } = renderHook(
      () => ({ type: useOnboardingType(), theme: useAppTheme() }),
      { wrapper: gatedWrapper },
    );

    await waitFor(() => expect(result.current?.theme?.onboardingType).toBe('universal'));
    expect(result.current.type).toBe('classic');
  });

  it('hands the decision back to the engine when released', async () => {
    setForcedOnboardingType('universal');
    expect(forcedOnboardingType()).toBe('universal');

    setForcedOnboardingType(null);
    expect(forcedOnboardingType()).toBeNull();

    const { result } = renderHook(() => useOnboardingType());
    expect(result.current).toBe(T_ONBOARDING_DEFAULT);
  });

  it('is inert where __DEV__ is false', () => {
    // THE assertion that matters. Metro constant-folds __DEV__ in a release
    // bundle, so this branch is dead code there — but the gate is written on the
    // READ rather than on the setter precisely so that a call site slipping into
    // shipped code cannot reopen the path. Flippable under Jest because
    // @react-native/jest-preset defines __DEV__ writable and babel-preset-expo
    // does not inline it.
    setForcedOnboardingType('universal');
    (global as unknown as { __DEV__: boolean }).__DEV__ = false;

    expect(forcedOnboardingType()).toBeNull();
    const { result } = renderHook(() => useOnboardingType());
    expect(result.current).toBe(T_ONBOARDING_DEFAULT);
  });

  it('leaves nothing behind on the device', async () => {
    // Module state, never storage. A pin must not survive a cold start, or a
    // developer would hand a colleague a build stuck on a screen the backend
    // never selected.
    const setItem = jest.spyOn(AsyncStorage, 'setItem');
    setForcedOnboardingType('universal');
    renderHook(() => useOnboardingType());

    expect(setItem).not.toHaveBeenCalled();
    setItem.mockRestore();
  });
});
