/**
 * Navigation tests for the onboarding screen (app/onboarding.tsx).
 *
 * Focus on the gating rule for the FORCED post-onboarding paywall: after the
 * user finishes or skips onboarding (markSeen() resolves), the destination is
 * `/paywall` ONLY when the platform is Android AND the per-app backend flag
 * `show_paywall_android` is true. In every other case — flag false/absent,
 * snapshot not loaded, or a non-Android platform — the user lands on `/`
 * (home), never the paywall. This keeps Google Play reviewers (who run with
 * the flag OFF) on a fully usable app with no forced paywall.
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
  mockReplace.mockClear();
  mockMarkSeen.mockClear();
});

afterEach(() => {
  setPlatform(originalOS);
});

/** Tap "Skip" and wait for markSeen() to resolve before asserting on routing. */
async function skipOnboarding() {
  const { getByText } = render(<OnboardingScreen />);
  fireEvent.press(getByText('onboarding.skip'));
  await waitFor(() => expect(mockMarkSeen).toHaveBeenCalled());
}

describe('onboarding post-markSeen navigation', () => {
  it('navigates to /paywall on Android when show_paywall_android is true', async () => {
    setPlatform('android');
    mockSnapshot = { app: { show_paywall_android: true } };

    await skipOnboarding();

    expect(mockReplace).toHaveBeenCalledWith('/paywall');
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

    await skipOnboarding();

    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('navigates to / on iOS even when the flag is true (Android-only gate)', async () => {
    setPlatform('ios');
    mockSnapshot = { app: { show_paywall_android: true } };

    await skipOnboarding();

    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('navigates to / on web even when the flag is true (Android-only gate)', async () => {
    setPlatform('web');
    mockSnapshot = { app: { show_paywall_android: true } };

    await skipOnboarding();

    expect(mockReplace).toHaveBeenCalledWith('/');
  });
});
