/**
 * Unit tests for lib/iap.ts#purchaseBundle — the enabled (real RevenueCat
 * purchase) vs disabled (local-grant stub) branching, the grant-only-on-success
 * and cancel-as-no-op semantics, and getBundleStorePrices.
 *
 * `@/lib/revenuecat` is mocked behind getters so each test can flip
 * `revenueCatEnabled` and control `purchaseConsumable`. `@/lib/lives` and
 * `@/lib/hints` are mocked to spy on the local grants.
 */

let mockEnabled = false;
const mockPurchaseConsumable = jest.fn();
const mockFetchProductPrices = jest.fn();

jest.mock('@/lib/revenuecat', () => ({
  get revenueCatEnabled() {
    return mockEnabled;
  },
  purchaseConsumable: (...args: unknown[]) => mockPurchaseConsumable(...args),
  fetchProductPrices: (...args: unknown[]) => mockFetchProductPrices(...args),
}));

const mockAddLives = jest.fn().mockResolvedValue(undefined);
const mockAddHintsBundle = jest.fn().mockResolvedValue(undefined);

jest.mock('@/lib/lives', () => ({ addLives: (...a: unknown[]) => mockAddLives(...a) }));
jest.mock('@/lib/hints', () => ({ addHintsBundle: (...a: unknown[]) => mockAddHintsBundle(...a) }));

import { BUNDLES, getBundleStorePrices, purchaseBundle } from '@/lib/iap';

const livesBundle = BUNDLES.find((b) => b.id === 'lives.10')!;
const hintsBundle = BUNDLES.find((b) => b.id === 'hints.5')!;
const comboBundle = BUNDLES.find((b) => b.id === 'combo.10.5')!;

beforeEach(() => {
  mockEnabled = false;
  mockPurchaseConsumable.mockReset();
  mockFetchProductPrices.mockReset().mockResolvedValue({});
  mockAddLives.mockClear();
  mockAddHintsBundle.mockClear();
});

describe('BUNDLES catalog (Google Play product ids must not change)', () => {
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
});

describe('purchaseBundle — disabled (Expo Go / web stub)', () => {
  it('grants lives locally without calling the store', async () => {
    await purchaseBundle(livesBundle);
    expect(mockPurchaseConsumable).not.toHaveBeenCalled();
    expect(mockAddLives).toHaveBeenCalledWith(10);
    expect(mockAddHintsBundle).not.toHaveBeenCalled();
  });

  it('grants hints locally for a hints bundle', async () => {
    await purchaseBundle(hintsBundle);
    expect(mockAddHintsBundle).toHaveBeenCalledWith(hintsBundle.grants.hints);
    expect(mockAddLives).not.toHaveBeenCalled();
  });

  it('grants both lives and hints for a combo bundle', async () => {
    await purchaseBundle(comboBundle);
    expect(mockAddLives).toHaveBeenCalledWith(10);
    expect(mockAddHintsBundle).toHaveBeenCalledWith(comboBundle.grants.hints);
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
