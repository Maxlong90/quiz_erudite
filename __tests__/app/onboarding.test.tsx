/**
 * Navigation tests for the onboarding screen (app/onboarding.tsx).
 *
 * Focus on the gating rule for the FORCED post-onboarding paywall. After the
 * user finishes or skips onboarding (markSeen() resolves), the destination is
 * `/paywall` ONLY when store billing is actually enabled on this platform
 * (revenueCatEnabled) AND the per-platform backend flag is true — iOS reads
 * `show_paywall_ios`, Android reads `show_paywall_android`. In every other case
 * — flag false/absent, snapshot not loaded, store disabled, or web — the user
 * lands on `/` (home), never the paywall. Gating on revenueCatEnabled is the
 * guardrail that keeps a paywall from ever being forced on a platform that
 * cannot charge, and keeps store reviewers (who run with the flag OFF) on a
 * fully usable app. The gate is capability-driven, NOT platform-hardcoded, so
 * iOS lights up automatically once its RevenueCat key exists.
 *
 * The skip button drives the assertions because onSkip() always navigates once
 * markSeen() resolves, so it exercises the destination logic on any page.
 */
import React from 'react';
import { Platform } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

// --- mock boundaries ---------------------------------------------------------

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  router: { replace: (...args: unknown[]) => mockReplace(...args) },
}));

// Controllable store-billing capability flag (real module needs a native SDK).
let mockRevenueCatEnabled = true;
jest.mock('@/lib/revenuecat', () => ({
  get revenueCatEnabled() {
    return mockRevenueCatEnabled;
  },
}));

let mockSnapshot: unknown = null;
jest.mock('@/hooks/use-content-cache', () => ({
  useContentCache: () => ({ snapshot: mockSnapshot }),
}));

const mockMarkSeen = jest.fn().mockResolvedValue(undefined);
jest.mock('@/hooks/use-onboarding', () => ({
  useOnboarding: () => ({ hasSeen: false, markSeen: mockMarkSeen }),
}));

// Return the key verbatim so we can query buttons by their string key.
jest.mock('@/hooks/use-translation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// Trim native/visual-only modules to keep the render lightweight.
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('@/components/ui/icon-symbol', () => ({ IconSymbol: () => null }));

import OnboardingScreen from '@/app/onboarding';

/** Override Platform.OS for the duration of a single test. */
function setPlatform(os: typeof Platform.OS) {
  Object.defineProperty(Platform, 'OS', { configurable: true, value: os });
}

const originalOS = Platform.OS;

beforeEach(() => {
  mockSnapshot = null;
  mockRevenueCatEnabled = true;
  mockReplace.mockClear();
  mockMarkSeen.mockClear();
});

afterEach(() => {
  setPlatform(originalOS);
  jest.useRealTimers();
});

/** Tap "Skip" and wait for markSeen() to resolve before asserting on routing. */
async function skipOnboarding() {
  const { getByText } = render(<OnboardingScreen />);
  fireEvent.press(getByText('onboarding.skip'));
  await waitFor(() => expect(mockMarkSeen).toHaveBeenCalled());
}

describe('onboarding post-markSeen navigation', () => {
  it('navigates to /paywall on Android when billing is enabled and show_paywall_android is true', async () => {
    setPlatform('android');
    mockSnapshot = { app: { show_paywall_android: true } };

    await skipOnboarding();

    expect(mockReplace).toHaveBeenCalledWith('/paywall');
  });

  it('navigates to / on Android when the flag is true but billing is disabled (capability guardrail)', async () => {
    setPlatform('android');
    mockRevenueCatEnabled = false;
    mockSnapshot = { app: { show_paywall_android: true } };

    await skipOnboarding();

    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('navigates to / on Android when the flag is false', async () => {
    setPlatform('android');
    mockSnapshot = { app: { show_paywall_android: false } };

    await skipOnboarding();

    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('navigates to / on Android when the flag is absent', async () => {
    setPlatform('android');
    mockSnapshot = { app: {} };

    await skipOnboarding();

    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('navigates to / on Android when the snapshot has not loaded yet', async () => {
    setPlatform('android');
    mockSnapshot = null;

    // With no snapshot, destinationAfterOnboarding() intentionally waits up to
    // 4s for one to arrive before falling back to home. Drive that bounded wait
    // with fake timers so the navigation resolves deterministically — and so the
    // pending timer is flushed before teardown instead of leaking a handle.
    jest.useFakeTimers();
    const { getByText } = render(<OnboardingScreen />);
    fireEvent.press(getByText('onboarding.skip'));
    await jest.advanceTimersByTimeAsync(4000);

    expect(mockMarkSeen).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('navigates to /paywall on iOS when billing is enabled and show_paywall_ios is true (parity)', async () => {
    setPlatform('ios');
    mockSnapshot = { app: { show_paywall_ios: true } };

    await skipOnboarding();

    expect(mockReplace).toHaveBeenCalledWith('/paywall');
  });

  it('navigates to / on iOS when show_paywall_ios is true but billing is disabled (iOS safe-off)', async () => {
    setPlatform('ios');
    mockRevenueCatEnabled = false;
    mockSnapshot = { app: { show_paywall_ios: true } };

    await skipOnboarding();

    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('navigates to / on iOS when only the Android flag is set (reads the iOS flag)', async () => {
    setPlatform('ios');
    mockSnapshot = { app: { show_paywall_android: true, show_paywall_ios: false } };

    await skipOnboarding();

    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('navigates to / on web even when a flag is true (billing never enabled on web)', async () => {
    setPlatform('web');
    mockRevenueCatEnabled = false;
    mockSnapshot = { app: { show_paywall_android: true, show_paywall_ios: true } };

    await skipOnboarding();

    expect(mockReplace).toHaveBeenCalledWith('/');
  });
});
