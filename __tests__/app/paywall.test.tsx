/**
 * Component tests for the multi-tier paywall (app/paywall.tsx).
 *
 * Focus on the behavior the rewrite introduced: three selectable tier cards
 * (Yearly / Monthly / Weekly) with Yearly featured + preselected, the "best
 * value" / "save %" badges computed from fallback prices when RevenueCat is
 * disabled, tier selection, the disabled-path subscribe fallback to
 * setPremium(true), the enabled-path purchase of the SELECTED package, and the
 * absence of any trial wording.
 *
 * The real useTranslation is used (locale pinned to `en`) so assertions hit the
 * actual i18n strings and the new paywall.* keys are exercised end-to-end.
 * Native/heavy modules are mocked at their import boundary.
 */
import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

// --- mock boundaries ---------------------------------------------------------

let mockEnabled = false;
// Whether the app is running in Expo Go — the only non-web env where the
// disabled-store local unlock is allowed. On a real store device it stays
// false so subscribe fails closed.
let mockIsExpoGo = false;
const mockFetchPremiumPackages = jest.fn();
const mockPurchasePremiumPackage = jest.fn();
const mockRestorePremium = jest.fn();

jest.mock('@/lib/revenuecat', () => ({
  get revenueCatEnabled() {
    return mockEnabled;
  },
  get isExpoGo() {
    return mockIsExpoGo;
  },
  fetchPremiumPackages: (...args: unknown[]) => mockFetchPremiumPackages(...args),
  purchasePremiumPackage: (...args: unknown[]) => mockPurchasePremiumPackage(...args),
  restorePremium: (...args: unknown[]) => mockRestorePremium(...args),
}));

const mockSetPremium = jest.fn().mockResolvedValue(undefined);
jest.mock('@/hooks/use-premium', () => ({
  usePremium: () => ({ setPremium: mockSetPremium, isPremium: false, resetPremium: jest.fn() }),
}));

let mockSnapshot: unknown = null;
jest.mock('@/hooks/use-content-cache', () => ({
  useContentCache: () => ({ snapshot: mockSnapshot }),
}));

// Pin the locale so the real useTranslation resolves English strings.
jest.mock('@/hooks/use-locale', () => ({
  useLocale: () => ({ locale: 'en' }),
}));

// Stub Sentry so the offering-load failure tracking never pulls in the native
// @sentry/react-native module during the test run.
jest.mock('@/lib/sentry', () => ({
  sentryEnabled: false,
  Sentry: { captureException: jest.fn(), captureMessage: jest.fn() },
}));

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  router: { replace: (...args: unknown[]) => mockReplace(...args) },
}));

// Trim native/visual-only modules to keep the render lightweight.
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('@/components/ui/icon-symbol', () => ({ IconSymbol: () => null }));
jest.mock('@/components/paywall/reviewer-unlock-modal', () => ({
  ReviewerUnlockModal: () => null,
}));
jest.mock('react-native-safe-area-context', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaView: ({ children, ...props }: { children: React.ReactNode }) =>
      ReactModule.createElement(View, props, children),
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

import PaywallScreen from '@/app/paywall';

beforeEach(() => {
  mockEnabled = false;
  mockIsExpoGo = false;
  mockSnapshot = null;
  mockFetchPremiumPackages.mockReset().mockResolvedValue({
    weekly: null,
    monthly: null,
    annual: null,
  });
  mockPurchasePremiumPackage.mockReset();
  mockRestorePremium.mockReset();
  mockSetPremium.mockClear();
  mockReplace.mockClear();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

afterEach(() => {
  (Alert.alert as jest.Mock).mockRestore();
});

/** A live `default` offering with all three tiers and store price strings. */
function liveOffering() {
  return {
    weekly: { identifier: '$rc_weekly', product: { priceString: '$5.99', price: 5.99 } },
    monthly: { identifier: '$rc_monthly', product: { priceString: '$15.99', price: 15.99 } },
    annual: { identifier: '$rc_annual', product: { priceString: '$59.99', price: 59.99 } },
  };
}

describe('paywall multi-tier rendering (RevenueCat disabled / Expo Go)', () => {
  // These cases represent a genuine dev environment (Expo Go), the only
  // non-web place the disabled-store local unlock is permitted.
  beforeEach(() => {
    mockIsExpoGo = true;
  });

  it('renders three tier cards with Yearly preselected by default', () => {
    const screen = render(<PaywallScreen />);

    // Labels for all three tiers are present.
    expect(screen.getByText('Yearly')).toBeTruthy();
    expect(screen.getByText('Monthly')).toBeTruthy();
    expect(screen.getByText('Weekly')).toBeTruthy();

    // Disabled => no live fetch was attempted.
    expect(mockFetchPremiumPackages).not.toHaveBeenCalled();

    // Yearly (annual) is the default selection; the others are not.
    expect(
      screen.getByTestId('paywall-tier-annual').props.accessibilityState.selected,
    ).toBe(true);
    expect(
      screen.getByTestId('paywall-tier-monthly').props.accessibilityState.selected,
    ).toBe(false);
    expect(
      screen.getByTestId('paywall-tier-weekly').props.accessibilityState.selected,
    ).toBe(false);
  });

  it('renders hardcoded fallback prices when disabled', () => {
    const screen = render(<PaywallScreen />);
    expect(screen.getByText('$49.99')).toBeTruthy();
    expect(screen.getByText('$12.99')).toBeTruthy();
    expect(screen.getByText('$4.99')).toBeTruthy();
  });

  it('shows the best-value and Save 68% badges on Yearly using fallback prices', () => {
    const screen = render(<PaywallScreen />);
    // round((1 - 49.99 / (12 * 12.99)) * 100) === 68
    expect(screen.getByText('Best value')).toBeTruthy();
    expect(screen.getByText('Save 68%')).toBeTruthy();
  });

  it('moves selection from Yearly to Monthly when the Monthly card is tapped', () => {
    const screen = render(<PaywallScreen />);

    fireEvent.press(screen.getByTestId('paywall-tier-monthly'));

    expect(
      screen.getByTestId('paywall-tier-monthly').props.accessibilityState.selected,
    ).toBe(true);
    expect(
      screen.getByTestId('paywall-tier-annual').props.accessibilityState.selected,
    ).toBe(false);
  });

  it('subscribes via the local setPremium fallback (no crash when packages are null)', async () => {
    const screen = render(<PaywallScreen />);

    fireEvent.press(screen.getByTestId('paywall-subscribe'));

    await waitFor(() => expect(mockSetPremium).toHaveBeenCalledWith(true));
    expect(mockReplace).toHaveBeenCalledWith('/');
    // Disabled path must never reach the store.
    expect(mockPurchasePremiumPackage).not.toHaveBeenCalled();
  });

  it('renders no trial wording anywhere', () => {
    const screen = render(<PaywallScreen />);
    const tree = JSON.stringify(screen.toJSON());
    expect(tree).not.toMatch(/trial/i);
    expect(tree).not.toMatch(/free trial/i);
  });
});

describe('paywall subscribe on a real store device with billing disabled (fail-closed)', () => {
  // e.g. iOS before its RevenueCat key is supplied: not Expo Go, not web, and
  // the store SDK is off. Subscribing must NOT grant premium for free — it
  // fails closed with an error, mirroring lib/iap.ts. This is the guardrail
  // that keeps a broken iOS paywall from ever unlocking premium.
  beforeEach(() => {
    mockEnabled = false;
    mockIsExpoGo = false;
  });

  it('shows an error and never grants premium when subscribing', async () => {
    const screen = render(<PaywallScreen />);

    fireEvent.press(screen.getByTestId('paywall-subscribe'));

    await waitFor(() => expect(Alert.alert).toHaveBeenCalled());
    expect(mockSetPremium).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockPurchasePremiumPackage).not.toHaveBeenCalled();
  });
});

describe('paywall multi-tier purchasing (RevenueCat enabled)', () => {
  beforeEach(() => {
    mockEnabled = true;
  });

  it('loads live prices from the default offering and purchases the selected package', async () => {
    mockFetchPremiumPackages.mockResolvedValue(liveOffering());
    mockPurchasePremiumPackage.mockResolvedValue({ outcome: 'purchased', premiumActive: true });

    const screen = render(<PaywallScreen />);

    // Live store prices replace the fallbacks once the offering resolves.
    await waitFor(() => expect(screen.getByText('$59.99')).toBeTruthy());
    expect(screen.getByText('$15.99')).toBeTruthy();
    expect(screen.getByText('$5.99')).toBeTruthy();
    expect(mockFetchPremiumPackages).toHaveBeenCalled();

    // Select Monthly, then subscribe — the SELECTED package is purchased.
    fireEvent.press(screen.getByTestId('paywall-tier-monthly'));
    fireEvent.press(screen.getByTestId('paywall-subscribe'));

    await waitFor(() =>
      expect(mockPurchasePremiumPackage).toHaveBeenCalledWith(liveOffering().monthly),
    );
    await waitFor(() => expect(mockSetPremium).toHaveBeenCalledWith(true));
    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('never grants premium when the offering failed to load (no package)', async () => {
    // Offering resolves empty (the beforeEach default), so the selected package
    // is null. The pre-fix bug granted premium for free here — it must not.
    const screen = render(<PaywallScreen />);

    // Wait for the load effect to settle: it was attempted and the CTA is no
    // longer in its loading state (offering resolved 'unavailable', not 'ready').
    await waitFor(() => expect(mockFetchPremiumPackages).toHaveBeenCalled());
    await waitFor(() =>
      expect(
        screen.getByTestId('paywall-subscribe').props.accessibilityState?.disabled,
      ).toBeFalsy(),
    );

    fireEvent.press(screen.getByTestId('paywall-subscribe'));

    await waitFor(() => expect(Alert.alert).toHaveBeenCalled());
    expect(mockSetPremium).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockPurchasePremiumPackage).not.toHaveBeenCalled();
  });

  it('does not unlock when the purchase is cancelled', async () => {
    mockFetchPremiumPackages.mockResolvedValue(liveOffering());
    mockPurchasePremiumPackage.mockResolvedValue({ outcome: 'cancelled', premiumActive: false });

    const screen = render(<PaywallScreen />);
    await waitFor(() => expect(screen.getByText('$59.99')).toBeTruthy());

    fireEvent.press(screen.getByTestId('paywall-subscribe'));

    await waitFor(() => expect(mockPurchasePremiumPackage).toHaveBeenCalled());
    // Default selection is the annual package.
    expect(mockPurchasePremiumPackage).toHaveBeenCalledWith(liveOffering().annual);
    expect(mockSetPremium).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('recomputes the Save % badge from live numeric prices', async () => {
    // round((1 - 59.99 / (12 * 15.99)) * 100) === 69
    mockFetchPremiumPackages.mockResolvedValue(liveOffering());

    const screen = render(<PaywallScreen />);

    await waitFor(() => expect(screen.getByText('Save 69%')).toBeTruthy());
  });
});
