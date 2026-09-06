/**
 * Integration tests for the Sport Quiz shop (app/sport-quiz/shop.tsx) — the one
 * screen that can hand out coins, so what it must never do is grant them without
 * a resolved purchase.
 *
 * Locked in here:
 *  - a resolved 'purchased' credits exactly that pack's coins, once;
 *  - a user cancellation credits NOTHING and shows no error (dismissing the
 *    native sheet is not a failure);
 *  - a store failure — including the fail-closed 'Store unavailable' a real
 *    Android device throws, since Sport Quiz has no Google Play catalog —
 *    credits NOTHING and surfaces the purchase-error alert;
 *  - live store prices replace the hardcoded ones when RevenueCat resolves them.
 *
 * The store seam (@/lib/sport-quiz/iap) and the coins provider are mocked; the
 * screen's own purchase handling runs for real.
 */
import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

// --- controllable mock state -------------------------------------------------

const mockAddCoins = jest.fn();
const mockPurchaseCoinPack = jest.fn();
const mockGetStorePrices = jest.fn();
let mockRevenueCatEnabled = true;

jest.mock('@/hooks/sport-quiz/use-sport-quiz', () => ({
  // useSportQuiz throws outside its provider, so the hook is mocked rather than wrapped.
  useSportQuiz: () => ({
    coins: 500,
    wheelLastSpinAt: Date.now(), // wheel on cooldown — keeps the tile out of the way
    addCoins: (...args: unknown[]) => mockAddCoins(...args),
  }),
  useNow: () => Date.now(),
}));
jest.mock('@/lib/sport-quiz/iap', () => ({
  purchaseCoinPack: (...args: unknown[]) => mockPurchaseCoinPack(...args),
  getSportQuizStorePrices: (...args: unknown[]) => mockGetStorePrices(...args),
}));
jest.mock('@/lib/revenuecat', () => ({
  get revenueCatEnabled() {
    return mockRevenueCatEnabled;
  },
}));
jest.mock('@/hooks/use-locale', () => ({ useLocale: () => ({ locale: 'en' }) }));

// native / visual-only siblings
// reanimated is mocked globally — see __mocks__/react-native-reanimated.js
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
}));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return { LinearGradient: View };
});
jest.mock('react-native-safe-area-context', () => {
  const ReactModule = require('react');
  const { View: RNView } = require('react-native');
  return {
    SafeAreaView: ({ children, ...props }: { children: React.ReactNode }) =>
      ReactModule.createElement(RNView, props, children),
  };
});
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('@/components/sport-quiz/app-background', () => ({ AppBackground: () => null }));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

/* eslint-disable import/first -- screen under test must load AFTER its mocks */
import SportQuizShop from '@/app/sport-quiz/shop';
import { COIN_PACKS } from '@/lib/sport-quiz/economy';
/* eslint-enable import/first */

const pack500 = COIN_PACKS.find((p) => p.id === 'coins_500')!;

let alertSpy: jest.SpyInstance;

beforeEach(() => {
  // A successful purchase schedules a 1.4s "bought ✓" flash; fake timers keep
  // that from outliving the test and leaking into Jest's worker teardown.
  jest.useFakeTimers();
  mockRevenueCatEnabled = true;
  mockAddCoins.mockReset();
  mockPurchaseCoinPack.mockReset();
  mockGetStorePrices.mockReset().mockResolvedValue({});
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

afterEach(() => {
  alertSpy.mockRestore();
  jest.clearAllTimers();
  jest.useRealTimers();
});

/** Press the CTA of the 500-coin pack (labelled with its price). */
async function buy500(screen: ReturnType<typeof render>) {
  await act(async () => {
    fireEvent.press(screen.getByText(pack500.price));
  });
}

describe('buying a coin pack', () => {
  it('credits the coins once when the store resolves the purchase', async () => {
    mockPurchaseCoinPack.mockResolvedValue('purchased');
    const screen = render(<SportQuizShop />);

    await buy500(screen);

    expect(mockPurchaseCoinPack).toHaveBeenCalledWith(pack500);
    expect(mockAddCoins).toHaveBeenCalledTimes(1);
    expect(mockAddCoins).toHaveBeenCalledWith(pack500.coins);
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('credits NOTHING and shows no error when the user cancels', async () => {
    mockPurchaseCoinPack.mockResolvedValue('cancelled');
    const screen = render(<SportQuizShop />);

    await buy500(screen);

    expect(mockAddCoins).not.toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('credits NOTHING and alerts when the store fails (fail closed)', async () => {
    // What a real Android device does today: no Play catalog -> Store unavailable.
    mockPurchaseCoinPack.mockRejectedValue(new Error('Store unavailable'));
    const screen = render(<SportQuizShop />);

    await buy500(screen);

    expect(mockAddCoins).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(alertSpy.mock.calls[0][0]).toBe('Purchase Failed');
  });

  it('ignores a second tap while a purchase is in flight', async () => {
    let resolvePurchase: (outcome: string) => void = () => {};
    mockPurchaseCoinPack.mockReturnValue(
      new Promise<string>((resolve) => {
        resolvePurchase = resolve;
      }),
    );
    const screen = render(<SportQuizShop />);

    // First tap starts the purchase; the CTA is replaced by a spinner.
    fireEvent.press(screen.getByText(pack500.price));
    await waitFor(() => expect(screen.queryByText(pack500.price)).toBeNull());

    // Another pack's CTA is disabled meanwhile — pressing it starts nothing.
    const otherPack = COIN_PACKS.find((p) => p.id === 'coins_100')!;
    fireEvent.press(screen.getByText(otherPack.price));
    expect(mockPurchaseCoinPack).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolvePurchase('purchased');
    });
    expect(mockAddCoins).toHaveBeenCalledTimes(1);
  });
});

describe('prices', () => {
  it('shows the live store price when RevenueCat resolves one', async () => {
    mockGetStorePrices.mockResolvedValue({ coins_500: '349,00 ₽' });
    const screen = render(<SportQuizShop />);

    await waitFor(() => expect(screen.getByText('349,00 ₽')).toBeTruthy());
    // The pack without a live price keeps its hardcoded fallback.
    expect(screen.getByText(COIN_PACKS[0].price)).toBeTruthy();
  });

  it('does not ask the store for prices when billing is off', async () => {
    mockRevenueCatEnabled = false;
    const screen = render(<SportQuizShop />);

    expect(mockGetStorePrices).not.toHaveBeenCalled();
    expect(screen.getByText(pack500.price)).toBeTruthy();
  });
});
