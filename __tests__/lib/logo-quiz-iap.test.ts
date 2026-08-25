/**
 * Unit tests for lib/logo-quiz/iap.ts — the Logo Quiz real-money purchase seam.
 * Mirrors __tests__/lib/iap.test.ts: the enabled (real store) vs disabled
 * branching, the FAIL-CLOSED policy (a real store platform with the store off
 * throws and grants nothing; only Expo Go / web local-grant), the
 * grant-only-on-success / cancel-as-no-op semantics, that the store product ids
 * are the `logoquiz_*` catalog ids (NOT the local pack ids), and the price
 * helpers (storeProductId -> pack.id re-keying, weekly premium price).
 *
 * `@/lib/revenuecat` is mocked behind getters so each test can flip
 * `revenueCatEnabled` / `isExpoGo` and control the purchase / price calls.
 * `react-native`'s Platform.OS is overridden per test.
 */

import { Platform } from 'react-native';

let mockEnabled = false;
let mockIsExpoGo = false;
const mockPurchaseConsumable = jest.fn();
const mockPurchasePremium = jest.fn();
const mockFetchProductPrices = jest.fn();
const mockFetchPremiumPackages = jest.fn();

jest.mock('@/lib/revenuecat', () => ({
  get revenueCatEnabled() {
    return mockEnabled;
  },
  get isExpoGo() {
    return mockIsExpoGo;
  },
  purchaseConsumable: (...args: unknown[]) => mockPurchaseConsumable(...args),
  purchasePremium: (...args: unknown[]) => mockPurchasePremium(...args),
  fetchProductPrices: (...args: unknown[]) => mockFetchProductPrices(...args),
  fetchPremiumPackages: (...args: unknown[]) => mockFetchPremiumPackages(...args),
}));

// eslint-disable-next-line import/first -- module under test must load AFTER its mocks
import {
  getLogoQuizPremiumPrice,
  getLogoQuizStorePrices,
  purchaseCoinPack,
  purchaseLifePack,
  purchaseLogoQuizPremium,
} from '@/lib/logo-quiz/iap';
// eslint-disable-next-line import/first
import { COIN_PACKS, LIFE_PACKS } from '@/lib/logo-quiz/economy';

const coinPack = COIN_PACKS.find((p) => p.id === 'coins_500')!;
const lifePack = LIFE_PACKS.find((p) => p.id === 'lives_10')!;

const originalOS = Platform.OS;

function setPlatform(os: typeof Platform.OS) {
  Object.defineProperty(Platform, 'OS', { configurable: true, value: os });
}

beforeEach(() => {
  mockEnabled = false;
  mockIsExpoGo = false;
  setPlatform('android');
  mockPurchaseConsumable.mockReset();
  mockPurchasePremium.mockReset();
  mockFetchProductPrices.mockReset().mockResolvedValue({});
  mockFetchPremiumPackages.mockReset().mockResolvedValue({ weekly: null, monthly: null, annual: null });
});

afterAll(() => {
  setPlatform(originalOS);
});

describe('catalog store product ids (must match the backend logoquiz_* catalog)', () => {
  it('maps every pack to its logoquiz_ store product id', () => {
    expect(COIN_PACKS.map((p) => [p.id, p.storeProductId])).toEqual([
      ['coins_100', 'logoquiz_coins_100'],
      ['coins_500', 'logoquiz_coins_500'],
      ['coins_1000', 'logoquiz_coins_1000'],
    ]);
    expect(LIFE_PACKS.map((p) => [p.id, p.storeProductId])).toEqual([
      ['lives_3', 'logoquiz_lives_3'],
      ['lives_10', 'logoquiz_lives_10'],
    ]);
  });
});

describe('consumables — disabled, genuine dev environment (local stub)', () => {
  it('returns purchased in Expo Go without calling the store', async () => {
    mockIsExpoGo = true;
    setPlatform('ios');
    await expect(purchaseCoinPack(coinPack)).resolves.toBe('purchased');
    expect(mockPurchaseConsumable).not.toHaveBeenCalled();
  });

  it('returns purchased on web without calling the store', async () => {
    setPlatform('web');
    await expect(purchaseLifePack(lifePack)).resolves.toBe('purchased');
    expect(mockPurchaseConsumable).not.toHaveBeenCalled();
  });
});

describe('consumables — disabled on a REAL store platform (fail closed)', () => {
  it('throws Store unavailable on Android and calls nothing', async () => {
    setPlatform('android');
    await expect(purchaseCoinPack(coinPack)).rejects.toThrow('Store unavailable');
    expect(mockPurchaseConsumable).not.toHaveBeenCalled();
  });

  it('throws Store unavailable on iOS (not Expo Go)', async () => {
    setPlatform('ios');
    await expect(purchaseLifePack(lifePack)).rejects.toThrow('Store unavailable');
  });
});

describe('consumables — enabled (real RevenueCat purchase)', () => {
  beforeEach(() => {
    mockEnabled = true;
  });

  it('runs the real purchase with the storeProductId, not the local id', async () => {
    mockPurchaseConsumable.mockResolvedValue('purchased');
    await expect(purchaseCoinPack(coinPack)).resolves.toBe('purchased');
    expect(mockPurchaseConsumable).toHaveBeenCalledWith('logoquiz_coins_500');
  });

  it('passes life pack cancellation through as a no-op outcome', async () => {
    mockPurchaseConsumable.mockResolvedValue('cancelled');
    await expect(purchaseLifePack(lifePack)).resolves.toBe('cancelled');
    expect(mockPurchaseConsumable).toHaveBeenCalledWith('logoquiz_lives_10');
  });

  it('rethrows real store errors', async () => {
    mockPurchaseConsumable.mockRejectedValue(new Error('store down'));
    await expect(purchaseCoinPack(coinPack)).rejects.toThrow('store down');
  });
});

describe('purchaseLogoQuizPremium', () => {
  it('delegates to purchasePremium when enabled', async () => {
    mockEnabled = true;
    mockPurchasePremium.mockResolvedValue({ outcome: 'purchased', premiumActive: true });
    await expect(purchaseLogoQuizPremium()).resolves.toEqual({
      outcome: 'purchased',
      premiumActive: true,
    });
    expect(mockPurchasePremium).toHaveBeenCalledTimes(1);
  });

  it('local-grants premium in Expo Go / web without a store call', async () => {
    mockIsExpoGo = true;
    await expect(purchaseLogoQuizPremium()).resolves.toEqual({
      outcome: 'purchased',
      premiumActive: true,
    });
    expect(mockPurchasePremium).not.toHaveBeenCalled();
  });

  it('fails closed on a real device with the store off', async () => {
    setPlatform('android');
    await expect(purchaseLogoQuizPremium()).rejects.toThrow('Store unavailable');
    expect(mockPurchasePremium).not.toHaveBeenCalled();
  });
});

describe('getLogoQuizStorePrices', () => {
  it('asks for every store product id and re-keys the result by pack id', async () => {
    mockFetchProductPrices.mockResolvedValue({
      logoquiz_coins_100: '$0.99',
      logoquiz_lives_10: '$2.99',
    });
    const prices = await getLogoQuizStorePrices();
    expect(mockFetchProductPrices).toHaveBeenCalledWith([
      'logoquiz_coins_100',
      'logoquiz_coins_500',
      'logoquiz_coins_1000',
      'logoquiz_lives_3',
      'logoquiz_lives_10',
    ]);
    // Re-keyed from storeProductId back to the local pack id.
    expect(prices).toEqual({ coins_100: '$0.99', lives_10: '$2.99' });
  });

  it('returns an empty map when the store returns nothing (catalog not live)', async () => {
    mockFetchProductPrices.mockResolvedValue({});
    await expect(getLogoQuizStorePrices()).resolves.toEqual({});
  });
});

describe('getLogoQuizPremiumPrice', () => {
  it('returns the weekly package price string', async () => {
    mockFetchPremiumPackages.mockResolvedValue({
      weekly: { product: { priceString: '$4.99' } },
      monthly: null,
      annual: null,
    });
    await expect(getLogoQuizPremiumPrice()).resolves.toBe('$4.99');
  });

  it('returns null when there is no weekly package', async () => {
    mockFetchPremiumPackages.mockResolvedValue({ weekly: null, monthly: null, annual: null });
    await expect(getLogoQuizPremiumPrice()).resolves.toBeNull();
  });
});
