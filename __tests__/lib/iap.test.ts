/**
 * Unit tests for lib/iap.ts#purchaseBundle — the enabled (real store purchase)
 * vs disabled branching, the FAIL-CLOSED policy (a consumable is granted only
 * after a resolved real purchase; a real store platform with the store off
 * throws and grants nothing; only Expo Go / web may local-grant), the
 * grant-only-on-success / cancel-as-no-op semantics, the 3-kind hint bundles,
 * and getBundleStorePrices.
 *
 * `@/lib/revenuecat` is mocked behind getters so each test can flip
 * `revenueCatEnabled` / `isExpoGo` and control `purchaseConsumable`. `react-
 * native`'s Platform.OS is overridden per test. `@/lib/lives` and `@/lib/hints`
 * are mocked to spy on the local grants.
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

const mockAddLives = jest.fn().mockResolvedValue(undefined);
const mockAddHintsBundle = jest.fn().mockResolvedValue(undefined);

jest.mock('@/lib/lives', () => ({ addLives: (...a: unknown[]) => mockAddLives(...a) }));
jest.mock('@/lib/hints', () => ({ addHintsBundle: (...a: unknown[]) => mockAddHintsBundle(...a) }));

// eslint-disable-next-line import/first -- module under test must load AFTER its mocks
import { BUNDLES, getBundleStorePrices, purchaseBundle } from '@/lib/iap';

const livesBundle = BUNDLES.find((b) => b.id === 'lives.10')!;
const hintsBundle = BUNDLES.find((b) => b.id === 'hints.5')!;
const comboBundle = BUNDLES.find((b) => b.id === 'combo.10.5')!;

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
  mockAddLives.mockClear();
  mockAddHintsBundle.mockClear();
});

afterAll(() => {
  setPlatform(originalOS);
});

describe('BUNDLES catalog (store product ids must not change)', () => {
  it('keeps the exact ids', () => {
    expect(BUNDLES.map((b) => b.id)).toEqual([
      'lives.10',
      'lives.30',
      'lives.100',
      'hints.5',
      'hints.10',
      'hints.20',
      'combo.10.5',
      'combo.30.10',
      'combo.100.20',
    ]);
  });

  it('grants exactly the three canonical hint kinds per bundle (no ai / letter)', () => {
    for (const b of BUNDLES) {
      if (!b.grants.hints) continue;
      expect(Object.keys(b.grants.hints).sort()).toEqual([
        'fiftyFifty',
        'replaceQuestion',
        'statistics',
      ]);
      // Same N of each kind within a bundle.
      const values = Object.values(b.grants.hints);
      expect(new Set(values).size).toBe(1);
    }
  });
});

describe('purchaseBundle — disabled, genuine dev environment (local stub grants)', () => {
  it('grants lives locally in Expo Go without calling the store', async () => {
    mockIsExpoGo = true;
    setPlatform('ios'); // Expo Go can run on an iOS simulator — still a dev env.
    await purchaseBundle(livesBundle);
    expect(mockPurchaseConsumable).not.toHaveBeenCalled();
    expect(mockAddLives).toHaveBeenCalledWith(10);
    expect(mockAddHintsBundle).not.toHaveBeenCalled();
  });

  it('grants hints locally on web (3 kinds)', async () => {
    setPlatform('web');
    await purchaseBundle(hintsBundle);
    expect(mockAddHintsBundle).toHaveBeenCalledWith(hintsBundle.grants.hints);
    expect(mockAddHintsBundle).toHaveBeenCalledWith({
      fiftyFifty: 5,
      statistics: 5,
      replaceQuestion: 5,
    });
    expect(mockAddLives).not.toHaveBeenCalled();
  });

  it('grants both lives and hints for a combo bundle in Expo Go', async () => {
    mockIsExpoGo = true;
    await purchaseBundle(comboBundle);
    expect(mockAddLives).toHaveBeenCalledWith(10);
    expect(mockAddHintsBundle).toHaveBeenCalledWith(comboBundle.grants.hints);
  });
});

describe('purchaseBundle — disabled on a REAL store platform (fail closed)', () => {
  it('throws and grants NOTHING on Android when RevenueCat is off', async () => {
    setPlatform('android');
    await expect(purchaseBundle(livesBundle)).rejects.toThrow('Store unavailable');
    expect(mockPurchaseConsumable).not.toHaveBeenCalled();
    expect(mockAddLives).not.toHaveBeenCalled();
    expect(mockAddHintsBundle).not.toHaveBeenCalled();
  });

  it('throws and grants NOTHING on iOS when RevenueCat is off (not Expo Go)', async () => {
    setPlatform('ios');
    await expect(purchaseBundle(hintsBundle)).rejects.toThrow('Store unavailable');
    expect(mockAddHintsBundle).not.toHaveBeenCalled();
    expect(mockAddLives).not.toHaveBeenCalled();
  });
});

describe('purchaseBundle — enabled (real RevenueCat purchase)', () => {
  beforeEach(() => {
    mockEnabled = true;
  });

  it('runs the real purchase and grants locally only on success', async () => {
    mockPurchaseConsumable.mockResolvedValue('purchased');
    await purchaseBundle(livesBundle);
    expect(mockPurchaseConsumable).toHaveBeenCalledWith('lives.10');
    expect(mockAddLives).toHaveBeenCalledWith(10);
  });

  it('does NOT grant and does NOT throw when the purchase is cancelled', async () => {
    mockPurchaseConsumable.mockResolvedValue('cancelled');
    await expect(purchaseBundle(livesBundle)).resolves.toBeUndefined();
    expect(mockAddLives).not.toHaveBeenCalled();
    expect(mockAddHintsBundle).not.toHaveBeenCalled();
  });

  it('rethrows real store errors and does not grant', async () => {
    mockPurchaseConsumable.mockRejectedValue(new Error('store down'));
    await expect(purchaseBundle(hintsBundle)).rejects.toThrow('store down');
    expect(mockAddHintsBundle).not.toHaveBeenCalled();
  });
});

describe('getBundleStorePrices', () => {
  it('asks RevenueCat for prices of every bundle id', async () => {
    mockFetchProductPrices.mockResolvedValue({ 'lives.10': '$0.99' });
    const prices = await getBundleStorePrices();
    expect(mockFetchProductPrices).toHaveBeenCalledWith([
      'lives.10',
      'lives.30',
      'lives.100',
      'hints.5',
      'hints.10',
      'hints.20',
      'combo.10.5',
      'combo.30.10',
      'combo.100.20',
    ]);
    expect(prices).toEqual({ 'lives.10': '$0.99' });
  });
});
