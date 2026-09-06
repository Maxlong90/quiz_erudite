import { purchaseConsumableProduct, storePricesByPackId } from '@/lib/store-purchase';
import { COIN_PACKS, type CoinPack } from '@/lib/sport-quiz/economy';
import type { PurchaseOutcome } from '@/lib/revenuecat';

/**
 * Sport Quiz real-money purchases — coin packs only. This app sells no
 * subscription, so it has no premium seam, no RevenueCat entitlement and no
 * offering; the backend deliberately provisioned three consumables and nothing
 * else. Store I/O only: crediting the coins stays in the use-sport-quiz
 * provider, so the shop grants ONLY after a resolved real purchase.
 *
 * The fail-closed grant policy lives in lib/store-purchase.ts and is shared with
 * Erudite and Logo Quiz. What is specific to Sport Quiz is which platforms can
 * charge: the App Store catalog exists (the `sportquiz_coins_*` consumables), so
 * iOS transacts for real once its EAS profile supplies
 * EXPO_PUBLIC_REVENUECAT_IOS_KEY; there is no Google Play catalog and no Google
 * public key, and lib/revenuecat.ts hands this slug no committed Android key, so
 * Android device builds keep RevenueCat disabled and fail closed here. Expo Go
 * and web keep the local-grant stub so the dev economy stays playable.
 */

/** Buy a coin pack. Returns the {@link PurchaseOutcome}; the caller grants the coins on `'purchased'`. */
export function purchaseCoinPack(pack: CoinPack): Promise<PurchaseOutcome> {
  return purchaseConsumableProduct(pack.storeProductId);
}

/**
 * Live store prices for every coin pack, keyed by the pack `id` (not the store
 * product id) so the shop looks them up with the key it renders with. Empty when
 * RevenueCat is off or the catalog isn't live yet — the shop then keeps each
 * pack's hardcoded `price`.
 */
export function getSportQuizStorePrices(): Promise<Record<string, string>> {
  return storePricesByPackId(COIN_PACKS);
}
