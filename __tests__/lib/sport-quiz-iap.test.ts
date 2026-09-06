/**
 * Unit tests for lib/sport-quiz/iap.ts — the Sport Quiz real-money purchase seam
 * (coin packs only; this app sells no subscription).
 *
 * What is locked in: the FAIL-CLOSED policy (a real store platform with billing
 * off throws and grants nothing — this is what keeps Android, which has no
 * Google Play catalog, from handing coins out for free), the Expo Go / web
 * local-grant dev affordance, cancel-as-no-op, that purchases run with the
 * `sportquiz_*` store product ids (NOT the local pack ids) so they match the App
 * Store Connect / RevenueCat catalog, and the price re-keying.
 *
 * `@/lib/revenuecat` is mocked behind getters so each test can flip
 * `revenueCatEnabled` / `isExpoGo`; `react-native`'s Platform.OS is overridden
 * per test. The shared lib/store-purchase.ts runs for real underneath.
 */

import { Platform } from 'react-native';

let mockEnabled = false;
let mockIsExpoGo = false;
const mockPurchaseConsumable = jest.fn();
const mockFetchProductPrices = jest.fn();

jest.mock('@/lib/revenuecat', () => ({
  get revenueCatEnabled() {
    return mockEnabled;
  },
  get isExpoGo() {
    return mockIsExpoGo;
  },
  purchaseConsumable: (...args: unknown[]) => mockPurchaseConsumable(...args),
  fetchProductPrices: (...args: unknown[]) => mockFetchProductPrices(...args),
}));

// eslint-disable-next-line import/first -- module under test must load AFTER its mocks
import { getSportQuizStorePrices, purchaseCoinPack } from '@/lib/sport-quiz/iap';
// eslint-disable-next-line import/first
import { COIN_PACKS } from '@/lib/sport-quiz/economy';

const coinPack = COIN_PACKS.find((p) => p.id === 'coins_500')!;

const originalOS = Platform.OS;

function setPlatform(os: typeof Platform.OS) {
  Object.defineProperty(Platform, 'OS', { configurable: true, value: os });
}

beforeEach(() => {
  mockEnabled = false;
  mockIsExpoGo = false;
  setPlatform('android');
  mockPurchaseConsumable.mockReset();
  mockFetchProductPrices.mockReset().mockResolvedValue({});
});

afterAll(() => {
  setPlatform(originalOS);
});

describe('catalog store product ids (must match the ASC / RevenueCat sportquiz_* catalog)', () => {
  it('maps every coin pack to its sportquiz_ store product id', () => {
    expect(COIN_PACKS.map((p) => [p.id, p.storeProductId])).toEqual([
      ['coins_100', 'sportquiz_coins_100'],
      ['coins_500', 'sportquiz_coins_500'],
      ['coins_1000', 'sportquiz_coins_1000'],
    ]);
  });
});

describe('coin packs — disabled, genuine dev environment (local stub)', () => {
  it('returns purchased in Expo Go without calling the store', async () => {
    mockIsExpoGo = true;
    setPlatform('ios'); // Expo Go can run on an iOS simulator — still a dev env.
    await expect(purchaseCoinPack(coinPack)).resolves.toBe('purchased');
    expect(mockPurchaseConsumable).not.toHaveBeenCalled();
  });

  it('returns purchased on web without calling the store', async () => {
    setPlatform('web');
    await expect(purchaseCoinPack(coinPack)).resolves.toBe('purchased');
    expect(mockPurchaseConsumable).not.toHaveBeenCalled();
  });
});

describe('coin packs — disabled on a REAL store platform (fail closed)', () => {
  // Android is the live case: Sport Quiz has no Google Play catalog and no
  // committed Android key, so a device build must refuse rather than grant.
  it('throws Store unavailable on Android and calls nothing', async () => {
    setPlatform('android');
    await expect(purchaseCoinPack(coinPack)).rejects.toThrow('Store unavailable');
    expect(mockPurchaseConsumable).not.toHaveBeenCalled();
  });

  it('throws Store unavailable on iOS when billing is off (not Expo Go)', async () => {
    setPlatform('ios');
    await expect(purchaseCoinPack(coinPack)).rejects.toThrow('Store unavailable');
    expect(mockPurchaseConsumable).not.toHaveBeenCalled();
  });
});

describe('coin packs — enabled (real RevenueCat purchase)', () => {
  beforeEach(() => {
    mockEnabled = true;
    setPlatform('ios');
  });

  it('runs the real purchase with the storeProductId, not the local pack id', async () => {
    mockPurchaseConsumable.mockResolvedValue('purchased');
    await expect(purchaseCoinPack(coinPack)).resolves.toBe('purchased');
    expect(mockPurchaseConsumable).toHaveBeenCalledWith('sportquiz_coins_500');
  });

  it('passes a user cancellation through as a no-op outcome', async () => {
    mockPurchaseConsumable.mockResolvedValue('cancelled');
    await expect(purchaseCoinPack(coinPack)).resolves.toBe('cancelled');
  });

  it('rethrows real store errors (e.g. BILLING_UNAVAILABLE)', async () => {
    mockPurchaseConsumable.mockRejectedValue(new Error('PurchaseNotAllowedError'));
    await expect(purchaseCoinPack(coinPack)).rejects.toThrow('PurchaseNotAllowedError');
  });
});

describe('getSportQuizStorePrices', () => {
  it('asks for every store product id and re-keys the result by pack id', async () => {
    mockFetchProductPrices.mockResolvedValue({
      sportquiz_coins_100: '$0.99',
      sportquiz_coins_1000: '6,99 €',
    });
    const prices = await getSportQuizStorePrices();
    expect(mockFetchProductPrices).toHaveBeenCalledWith([
      'sportquiz_coins_100',
      'sportquiz_coins_500',
      'sportquiz_coins_1000',
    ]);
    // Re-keyed from storeProductId back to the local pack id.
    expect(prices).toEqual({ coins_100: '$0.99', coins_1000: '6,99 €' });
  });

  it('returns an empty map when the store returns nothing (catalog not live)', async () => {
    mockFetchProductPrices.mockResolvedValue({});
    await expect(getSportQuizStorePrices()).resolves.toEqual({});
  });
});
