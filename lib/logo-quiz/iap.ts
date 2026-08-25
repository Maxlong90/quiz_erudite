import { Platform } from 'react-native';

import {
  fetchPremiumPackages,
  fetchProductPrices,
  isExpoGo,
  purchaseConsumable,
  purchasePremium,
  revenueCatEnabled,
  type PremiumPurchaseResult,
  type PurchaseOutcome,
} from '@/lib/revenuecat';
import { COIN_PACKS, LIFE_PACKS, type CoinPack, type LifePack } from '@/lib/logo-quiz/economy';

/**
 * Logo Quiz real-money purchases (coin packs, life packs, weekly premium). This
 * is the store-I/O seam — it mirrors lib/iap.ts' fail-closed contract exactly.
 * The economy MUTATION (crediting coins / lives / premium) stays in the
 * use-logo-quiz provider; these functions only run the store call and report the
 * outcome, so the provider can grant ONLY after a resolved real purchase.
 *
 * Grant policy (mirrors lib/iap.ts and the paywall #568 free-unlock guard): a
 * purchase is honoured only when RevenueCat resolves it. The local-grant stub is
 * permitted exclusively in genuine non-store dev environments (Expo Go or web),
 * NEVER on a real iOS / Android device — there an unavailable store fails closed
 * with an error and grants nothing. Until App 2's backend catalog is created the
 * on-device offering is empty, so device builds fail closed and only Expo Go /
 * web local-grant.
 */

/** True only in a genuine dev environment where a local grant is acceptable. */
function isDevGrantEnvironment(): boolean {
  return isExpoGo || Platform.OS === 'web';
}

/**
 * Run the real store purchase for one consumable product id. Resolves
 * `'purchased'` / `'cancelled'` on a real store; local-grants (`'purchased'`) in
 * Expo Go / web; throws `Store unavailable` on a real device with the store off.
 */
async function purchaseConsumableProduct(storeProductId: string): Promise<PurchaseOutcome> {
  if (revenueCatEnabled) {
    // Real store: 'purchased' | 'cancelled', rethrows real store errors.
    return purchaseConsumable(storeProductId);
  }
  if (isDevGrantEnvironment()) {
    // Stub path: pretend we hit the store so dev flows still exercise the grant.
    await new Promise((resolve) => setTimeout(resolve, 700));
    return 'purchased';
  }
  // Real store platform with the store unavailable — fail closed.
  throw new Error('Store unavailable');
}

/** Buy a coin pack. Returns the {@link PurchaseOutcome}; the caller grants the coins on `'purchased'`. */
export function purchaseCoinPack(pack: CoinPack): Promise<PurchaseOutcome> {
  return purchaseConsumableProduct(pack.storeProductId);
}

/** Buy a life pack. Returns the {@link PurchaseOutcome}; the caller grants the lives on `'purchased'`. */
export function purchaseLifePack(pack: LifePack): Promise<PurchaseOutcome> {
  return purchaseConsumableProduct(pack.storeProductId);
}

/**
 * Purchase the weekly premium subscription. Delegates to purchasePremium(),
 * whose package fall-through resolves the single `$rc_weekly` package in the
 * Logo Quiz `default` offering. Local-grants premium in Expo Go / web; fails
 * closed on a real device with the store off.
 */
export async function purchaseLogoQuizPremium(): Promise<PremiumPurchaseResult> {
  if (revenueCatEnabled) {
    return purchasePremium();
  }
  if (isDevGrantEnvironment()) {
    return { outcome: 'purchased', premiumActive: true };
  }
  throw new Error('Store unavailable');
}

/**
 * Resolve live store prices for every coin / life pack, keyed by the pack `id`
 * (not the store product id) so the shop looks prices up by the same key it
 * renders with. Returns an empty map when RevenueCat is disabled or the catalog
 * isn't live yet — callers keep the hardcoded `price` fallback.
 */
export async function getLogoQuizStorePrices(): Promise<Record<string, string>> {
  const packs = [...COIN_PACKS, ...LIFE_PACKS];
  const byStoreId = await fetchProductPrices(packs.map((pack) => pack.storeProductId));
  const byPackId: Record<string, string> = {};
  for (const pack of packs) {
    const price = byStoreId[pack.storeProductId];
    if (price) byPackId[pack.id] = price;
  }
  return byPackId;
}

/**
 * Resolve the live weekly premium price string, or null when the store is off /
 * the offering isn't populated yet (the shop then shows PREMIUM_FALLBACK_PRICE).
 */
export async function getLogoQuizPremiumPrice(): Promise<string | null> {
  const packages = await fetchPremiumPackages();
  return packages.weekly?.product.priceString ?? null;
}
