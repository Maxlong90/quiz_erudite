import {
  fetchPremiumPackages,
  purchasePremium,
  revenueCatEnabled,
  type PremiumPurchaseResult,
  type PurchaseOutcome,
} from '@/lib/revenuecat';
import {
  isDevGrantEnvironment,
  purchaseConsumableProduct,
  storePricesByPackId,
} from '@/lib/store-purchase';
import { COIN_PACKS, LIFE_PACKS, type CoinPack, type LifePack } from '@/lib/logo-quiz/economy';

/**
 * Logo Quiz real-money purchases (coin packs, life packs, weekly premium). This
 * is the store-I/O seam; consumables run through the shared fail-closed policy
 * in lib/store-purchase.ts. The economy MUTATION (crediting coins / lives /
 * premium) stays in the use-logo-quiz provider; these functions only run the
 * store call and report the outcome, so the provider can grant ONLY after a
 * resolved real purchase.
 *
 * Until App 2's backend catalog is created the on-device offering is empty, so
 * device builds fail closed and only Expo Go / web local-grant.
 */

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
export function getLogoQuizStorePrices(): Promise<Record<string, string>> {
  return storePricesByPackId([...COIN_PACKS, ...LIFE_PACKS]);
}

/**
 * Resolve the live weekly premium price string, or null when the store is off /
 * the offering isn't populated yet (the shop then shows PREMIUM_FALLBACK_PRICE).
 */
export async function getLogoQuizPremiumPrice(): Promise<string | null> {
  const packages = await fetchPremiumPackages();
  return packages.weekly?.product.priceString ?? null;
}
