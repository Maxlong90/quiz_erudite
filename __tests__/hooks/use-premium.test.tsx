/**
 * Tests for PremiumProvider's launch-time entitlement sync (hooks/use-premium.ts):
 * it must UPGRADE to premium from a live entitlement, but never DOWNGRADE — a
 * false result or a thrown (offline/unknown) sync leaves the stored flag intact,
 * and the sync is skipped entirely when disabled or already premium.
 */
import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';

let mockEnabled = true;
const mockIsPremiumEntitlementActive = jest.fn();

jest.mock('@/lib/revenuecat', () => ({
  get revenueCatEnabled() {
    return mockEnabled;
  },
  isPremiumEntitlementActive: (...args: unknown[]) => mockIsPremiumEntitlementActive(...args),
}));

import { PremiumProvider, usePremium } from '@/hooks/use-premium';

const STORAGE_KEY = 'app.premium.v1';

function wrapper({ children }: { children: React.ReactNode }) {
  return <PremiumProvider>{children}</PremiumProvider>;
}

function render() {
  return renderHook(() => usePremium(), { wrapper });
}

beforeEach(async () => {
  mockEnabled = true;
  mockIsPremiumEntitlementActive.mockReset();
  await AsyncStorage.clear();
});

describe('PremiumProvider entitlement sync', () => {
  it('upgrades to premium when the entitlement is active and the local flag is false', async () => {
    mockIsPremiumEntitlementActive.mockResolvedValue(true);

    const { result } = render();

    await waitFor(() => expect(result.current.isPremium).toBe(true));
    expect(await AsyncStorage.getItem(STORAGE_KEY)).toBe('1');
  });

  it('never downgrades: an inactive entitlement leaves a non-premium user non-premium', async () => {
    mockIsPremiumEntitlementActive.mockResolvedValue(false);

    const { result } = render();

    await waitFor(() => expect(mockIsPremiumEntitlementActive).toHaveBeenCalled());
    expect(result.current.isPremium).toBe(false);
    // No write to '1' happened.
    expect(await AsyncStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('never downgrades: a thrown (offline/unknown) sync leaves the flag untouched', async () => {
    mockIsPremiumEntitlementActive.mockRejectedValue(new Error('offline'));

    const { result } = render();

    await waitFor(() => expect(mockIsPremiumEntitlementActive).toHaveBeenCalled());
    expect(result.current.isPremium).toBe(false);
  });

  it('keeps an already-premium user premium without consulting the entitlement', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, '1');
    mockIsPremiumEntitlementActive.mockResolvedValue(false); // would downgrade if consulted

    const { result } = render();

    await waitFor(() => expect(result.current.isPremium).toBe(true));
    // Sync is skipped when the local flag is already premium.
    expect(mockIsPremiumEntitlementActive).not.toHaveBeenCalled();
  });

  it('skips the entitlement sync entirely when RevenueCat is disabled', async () => {
    mockEnabled = false;

    const { result } = render();

    await waitFor(() => expect(result.current.isPremium).toBe(false));
    expect(mockIsPremiumEntitlementActive).not.toHaveBeenCalled();
  });

  it('setPremium persists and updates the flag', async () => {
    mockEnabled = false; // isolate from the sync path
    const { result } = render();
    await waitFor(() => expect(result.current.isPremium).toBe(false));

    await act(async () => {
      await result.current.setPremium(true);
    });

    await waitFor(() => expect(result.current.isPremium).toBe(true));
    expect(await AsyncStorage.getItem(STORAGE_KEY)).toBe('1');
  });
});
