/**
 * Unit tests for lib/revenuecat.ts.
 *
 * The module decides `revenueCatEnabled` at import time from the platform, the
 * Expo execution environment, and whether the native module can be required +
 * configured. Each scenario re-imports the module in isolation with mocked
 * `react-native`, `expo-constants`, and `react-native-purchases`, so no real
 * native code is ever loaded.
 */

type PurchasesMock = {
  configure: jest.Mock;
  getProducts: jest.Mock;
  purchaseStoreProduct: jest.Mock;
  getOfferings: jest.Mock;
  purchasePackage: jest.Mock;
  restorePurchases: jest.Mock;
  getCustomerInfo: jest.Mock;
  PRODUCT_CATEGORY: { NON_SUBSCRIPTION: string; SUBSCRIPTION: string };
};

function makePurchasesMock(): PurchasesMock {
  return {
    configure: jest.fn(),
    getProducts: jest.fn(),
    purchaseStoreProduct: jest.fn(),
    getOfferings: jest.fn(),
    purchasePackage: jest.fn(),
    restorePurchases: jest.fn(),
    getCustomerInfo: jest.fn(),
    PRODUCT_CATEGORY: { NON_SUBSCRIPTION: 'NON_SUBSCRIPTION', SUBSCRIPTION: 'SUBSCRIPTION' },
  };
}

interface LoadOptions {
  platform?: string;
  execEnv?: 'storeClient' | 'standalone' | 'bare';
  /** Provide a module factory; throw inside it to simulate a missing native module. */
  purchasesFactory?: () => unknown;
}

function loadRevenueCat(opts: LoadOptions = {}): typeof import('@/lib/revenuecat') {
  let mod!: typeof import('@/lib/revenuecat');
  jest.isolateModules(() => {
    jest.doMock('react-native', () => ({ Platform: { OS: opts.platform ?? 'android' } }));
    jest.doMock('expo-constants', () => ({
      __esModule: true,
      default: { executionEnvironment: opts.execEnv ?? 'standalone' },
      ExecutionEnvironment: { StoreClient: 'storeClient', Standalone: 'standalone', Bare: 'bare' },
    }));
    if (opts.purchasesFactory) {
      jest.doMock('react-native-purchases', opts.purchasesFactory);
    }
    mod = require('@/lib/revenuecat');
  });
  return mod;
}

/** Load the module in the ENABLED state with a controllable Purchases mock. */
function loadEnabled(): {
  rc: typeof import('@/lib/revenuecat');
  purchases: PurchasesMock;
} {
  const purchases = makePurchasesMock();
  const rc = loadRevenueCat({
    platform: 'android',
    execEnv: 'standalone',
    purchasesFactory: () => ({ __esModule: true, default: purchases }),
  });
  return { rc, purchases };
}

afterEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
});

describe('revenueCatEnabled gating', () => {
  it('is false on web', () => {
    const purchases = makePurchasesMock();
    const rc = loadRevenueCat({
      platform: 'web',
      purchasesFactory: () => ({ __esModule: true, default: purchases }),
    });
    expect(rc.revenueCatEnabled).toBe(false);
    expect(purchases.configure).not.toHaveBeenCalled();
  });

  it('is false in Expo Go (executionEnvironment === storeClient)', () => {
    const purchases = makePurchasesMock();
    const rc = loadRevenueCat({
      platform: 'android',
      execEnv: 'storeClient',
      purchasesFactory: () => ({ __esModule: true, default: purchases }),
    });
    expect(rc.revenueCatEnabled).toBe(false);
    expect(purchases.configure).not.toHaveBeenCalled();
  });

  it('is false on iOS (no key yet)', () => {
    const purchases = makePurchasesMock();
    const rc = loadRevenueCat({
      platform: 'ios',
      purchasesFactory: () => ({ __esModule: true, default: purchases }),
    });
    expect(rc.revenueCatEnabled).toBe(false);
    expect(purchases.configure).not.toHaveBeenCalled();
  });

  it('is false when the native module is missing (require throws)', () => {
    const rc = loadRevenueCat({
      platform: 'android',
      execEnv: 'standalone',
      purchasesFactory: () => {
        throw new Error('Native module RNPurchases not found');
      },
    });
    expect(rc.revenueCatEnabled).toBe(false);
  });

  it('is true on a configured Android build and calls configure with the key', () => {
    const { rc, purchases } = loadEnabled();
    expect(rc.revenueCatEnabled).toBe(true);
    expect(purchases.configure).toHaveBeenCalledWith({ apiKey: expect.any(String) });
    expect(purchases.configure).toHaveBeenCalledWith({
      apiKey: 'goog_hFgRbNrOlUHcMtKClkwWcYIBLvd',
    });
  });
});

describe('purchaseConsumable', () => {
  it('fetches the non-subscription product and resolves "purchased" on success', async () => {
    const { rc, purchases } = loadEnabled();
    purchases.getProducts.mockResolvedValue([{ identifier: 'lives.10', priceString: '$0.99' }]);
    purchases.purchaseStoreProduct.mockResolvedValue({ customerInfo: {} });

    await expect(rc.purchaseConsumable('lives.10')).resolves.toBe('purchased');
    expect(purchases.getProducts).toHaveBeenCalledWith(['lives.10'], 'NON_SUBSCRIPTION');
    expect(purchases.purchaseStoreProduct).toHaveBeenCalledWith({
      identifier: 'lives.10',
      priceString: '$0.99',
    });
  });

  it('resolves "cancelled" when the error carries userCancelled', async () => {
    const { rc, purchases } = loadEnabled();
    purchases.getProducts.mockResolvedValue([{ identifier: 'lives.10' }]);
    purchases.purchaseStoreProduct.mockRejectedValue({ userCancelled: true });

    await expect(rc.purchaseConsumable('lives.10')).resolves.toBe('cancelled');
  });

  it('resolves "cancelled" when the error code is "1" (PURCHASE_CANCELLED_ERROR)', async () => {
    const { rc, purchases } = loadEnabled();
    purchases.getProducts.mockResolvedValue([{ identifier: 'lives.10' }]);
    purchases.purchaseStoreProduct.mockRejectedValue({ code: '1' });

    await expect(rc.purchaseConsumable('lives.10')).resolves.toBe('cancelled');
  });

  it('rethrows real store errors', async () => {
    const { rc, purchases } = loadEnabled();
    purchases.getProducts.mockResolvedValue([{ identifier: 'lives.10' }]);
    purchases.purchaseStoreProduct.mockRejectedValue({ code: '2', message: 'store down' });

    await expect(rc.purchaseConsumable('lives.10')).rejects.toMatchObject({ code: '2' });
  });

  it('throws when the product id is not found in the store', async () => {
    const { rc, purchases } = loadEnabled();
    purchases.getProducts.mockResolvedValue([]);

    await expect(rc.purchaseConsumable('lives.10')).rejects.toThrow(/not found/i);
  });

  it('throws when RevenueCat is disabled', async () => {
    const rc = loadRevenueCat({ platform: 'web' });
    await expect(rc.purchaseConsumable('lives.10')).rejects.toThrow(/not enabled/i);
  });
});

describe('purchasePremium package selection (pickPremiumPackage)', () => {
  const ENTITLED = { customerInfo: { entitlements: { active: { premium: {} } } } };

  function offering(over: Record<string, unknown>) {
    return {
      annual: null,
      monthly: null,
      availablePackages: [],
      ...over,
    };
  }

  async function runWith(offeringObj: Record<string, unknown>) {
    const { rc, purchases } = loadEnabled();
    purchases.getOfferings.mockResolvedValue({
      all: { default: offeringObj },
      current: offeringObj,
    });
    purchases.purchasePackage.mockResolvedValue(ENTITLED);
    const result = await rc.purchasePremium();
    return { result, purchases };
  }

  it('prefers the annual package', async () => {
    const annual = { identifier: 'annual', product: { identifier: 'premium_yearly' } };
    const monthly = { identifier: 'monthly', product: { identifier: 'premium_monthly' } };
    const { result, purchases } = await runWith(
      offering({ annual, monthly, availablePackages: [monthly, annual] }),
    );
    expect(purchases.purchasePackage).toHaveBeenCalledWith(annual);
    expect(result).toEqual({ outcome: 'purchased', premiumActive: true });
  });

  it('falls back to a yearly/annual product id when there is no annual package', async () => {
    const yearly = { identifier: 'custom', product: { identifier: 'premium_yearly' } };
    const monthly = { identifier: 'monthly', product: { identifier: 'premium_monthly' } };
    const { purchases } = await runWith(
      offering({ annual: null, monthly, availablePackages: [monthly, yearly] }),
    );
    expect(purchases.purchasePackage).toHaveBeenCalledWith(yearly);
  });

  it('falls back to monthly when neither annual nor a yearly id is present', async () => {
    const monthly = { identifier: 'monthly', product: { identifier: 'premium_monthly' } };
    const { purchases } = await runWith(
      offering({ annual: null, monthly, availablePackages: [monthly] }),
    );
    expect(purchases.purchasePackage).toHaveBeenCalledWith(monthly);
  });

  it('falls back to the first available package as a last resort', async () => {
    const first = { identifier: 'weekly', product: { identifier: 'premium_weekly' } };
    const { purchases } = await runWith(
      offering({ annual: null, monthly: null, availablePackages: [first] }),
    );
    expect(purchases.purchasePackage).toHaveBeenCalledWith(first);
  });
});

describe('purchasePremium outcomes', () => {
  const annual = { identifier: 'annual', product: { identifier: 'premium_yearly' } };
  const offerings = {
    all: { default: { annual, monthly: null, availablePackages: [annual] } },
    current: { annual, monthly: null, availablePackages: [annual] },
  };

  it('reports premiumActive false when the entitlement is not active after purchase', async () => {
    const { rc, purchases } = loadEnabled();
    purchases.getOfferings.mockResolvedValue(offerings);
    purchases.purchasePackage.mockResolvedValue({
      customerInfo: { entitlements: { active: {} } },
    });
    await expect(rc.purchasePremium()).resolves.toEqual({
      outcome: 'purchased',
      premiumActive: false,
    });
  });

  it('returns a cancelled no-op outcome on user cancellation', async () => {
    const { rc, purchases } = loadEnabled();
    purchases.getOfferings.mockResolvedValue(offerings);
    purchases.purchasePackage.mockRejectedValue({ userCancelled: true });
    await expect(rc.purchasePremium()).resolves.toEqual({
      outcome: 'cancelled',
      premiumActive: false,
    });
  });

  it('throws when there is no offering available', async () => {
    const { rc, purchases } = loadEnabled();
    purchases.getOfferings.mockResolvedValue({ all: {}, current: null });
    await expect(rc.purchasePremium()).rejects.toThrow(/offering/i);
  });

  it('throws when RevenueCat is disabled', async () => {
    const rc = loadRevenueCat({ platform: 'web' });
    await expect(rc.purchasePremium()).rejects.toThrow(/not enabled/i);
  });
});

describe('restorePremium', () => {
  it('returns true when the premium entitlement is active', async () => {
    const { rc, purchases } = loadEnabled();
    purchases.restorePurchases.mockResolvedValue({ entitlements: { active: { premium: {} } } });
    await expect(rc.restorePremium()).resolves.toBe(true);
  });

  it('returns false when no premium entitlement is active', async () => {
    const { rc, purchases } = loadEnabled();
    purchases.restorePurchases.mockResolvedValue({ entitlements: { active: {} } });
    await expect(rc.restorePremium()).resolves.toBe(false);
  });

  it('returns false (no native call) when disabled', async () => {
    const rc = loadRevenueCat({ platform: 'web' });
    await expect(rc.restorePremium()).resolves.toBe(false);
  });
});

describe('isPremiumEntitlementActive', () => {
  it('reflects the live customer info', async () => {
    const { rc, purchases } = loadEnabled();
    purchases.getCustomerInfo.mockResolvedValue({ entitlements: { active: { premium: {} } } });
    await expect(rc.isPremiumEntitlementActive()).resolves.toBe(true);

    purchases.getCustomerInfo.mockResolvedValue({ entitlements: { active: {} } });
    await expect(rc.isPremiumEntitlementActive()).resolves.toBe(false);
  });

  it('propagates network/SDK errors so callers treat the result as unknown', async () => {
    const { rc, purchases } = loadEnabled();
    purchases.getCustomerInfo.mockRejectedValue(new Error('offline'));
    await expect(rc.isPremiumEntitlementActive()).rejects.toThrow('offline');
  });

  it('returns false when disabled', async () => {
    const rc = loadRevenueCat({ platform: 'web' });
    await expect(rc.isPremiumEntitlementActive()).resolves.toBe(false);
  });
});

describe('fetchProductPrices', () => {
  it('maps product ids to localized price strings', async () => {
    const { rc, purchases } = loadEnabled();
    purchases.getProducts.mockResolvedValue([
      { identifier: 'lives.10', priceString: '$0.99' },
      { identifier: 'hints.5', priceString: '$1.99' },
    ]);
    await expect(rc.fetchProductPrices(['lives.10', 'hints.5'])).resolves.toEqual({
      'lives.10': '$0.99',
      'hints.5': '$1.99',
    });
  });

  it('returns an empty map on error (callers keep hardcoded prices)', async () => {
    const { rc, purchases } = loadEnabled();
    purchases.getProducts.mockRejectedValue(new Error('store error'));
    await expect(rc.fetchProductPrices(['lives.10'])).resolves.toEqual({});
  });

  it('returns an empty map when disabled', async () => {
    const rc = loadRevenueCat({ platform: 'web' });
    await expect(rc.fetchProductPrices(['lives.10'])).resolves.toEqual({});
  });
});
