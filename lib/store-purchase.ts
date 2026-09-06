import { Platform } from 'react-native';

import {
  fetchProductPrices,
  isExpoGo,
  purchaseConsumable,
  revenueCatEnabled,
  type PurchaseOutcome,
} from '@/lib/revenuecat';

/**
 * The shared consumable-purchase seam every app's shop buys through — the one
 * place the FAIL-CLOSED grant policy is written down.
 *
 * The policy (previously copied into lib/iap.ts, lib/logo-quiz/iap.ts and, with
 * this task, Sport Quiz): a consumable is honoured only when RevenueCat resolves
 * the purchase. The local-grant stub is permitted exclusively in a genuine
 * non-store dev environment (Expo Go or web), NEVER on a real iOS / Android
 * device — there an unavailable store throws so the UI shows an error and
 * nothing is granted. A device that can actually charge the player must never
 * hand out a consumable for free.
 *
 * This module does store I/O only. The economy MUTATION (crediting coins, lives,
 * hints) stays with each app's own provider, so a grant can only follow a
 * resolved purchase.
 */

/** A purchasable pack: a local `id` the UI renders with, plus its store product id. */
export interface StorePack {
  /** Stable local id — React key, price lookup key, "bought ✓" flash. */
  id: string;
  /** App Store / Google Play / RevenueCat product id. Immutable catalog contract. */
  storeProductId: string;
}

/** True only in a genuine dev environment where a local grant is acceptable. */
export function isDevGrantEnvironment(): boolean {
  return isExpoGo || Platform.OS === 'web';
}

/**
 * Run the real store purchase for one consumable product id. Resolves
 * `'purchased'` / `'cancelled'` on a real store; local-grants (`'purchased'`)
 * after `stubDelayMs` in Expo Go / web; throws `Store unavailable` on a real
 * device where billing is off.
 */
export async function purchaseConsumableProduct(
  storeProductId: string,
  stubDelayMs = 700,
): Promise<PurchaseOutcome> {
  if (revenueCatEnabled) {
    // Real store: 'purchased' | 'cancelled', rethrows real store errors.
    return purchaseConsumable(storeProductId);
  }
  if (isDevGrantEnvironment()) {
    // Stub path: pretend we hit the store so dev flows still exercise the grant.
    await new Promise((resolve) => setTimeout(resolve, stubDelayMs));
    return 'purchased';
  }
  // Real store platform with the store unavailable — fail closed.
  throw new Error('Store unavailable');
}

/**
 * Resolve live localized store prices for a pack catalog, keyed by the pack `id`
 * (not the store product id) so a shop looks prices up with the same key it
 * renders with. Empty when RevenueCat is disabled or the catalog isn't live yet
 * — callers then keep their hardcoded `price` fallback.
 */
export async function storePricesByPackId(
  packs: readonly StorePack[],
): Promise<Record<string, string>> {
  const byStoreId = await fetchProductPrices(packs.map((pack) => pack.storeProductId));
  const byPackId: Record<string, string> = {};
  for (const pack of packs) {
    const price = byStoreId[pack.storeProductId];
    if (price) byPackId[pack.id] = price;
  }
  return byPackId;
}
