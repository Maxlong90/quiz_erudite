import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import type PurchasesModule from 'react-native-purchases';
import type { CustomerInfo, PurchasesOffering, PurchasesPackage } from 'react-native-purchases';

/**
 * RevenueCat (Google Play billing) integration. Mirrors lib/sentry.ts: the
 * public Android key comes from EXPO_PUBLIC_REVENUECAT_ANDROID_KEY with a
 * committed fallback, and the whole module degrades gracefully. In Expo Go,
 * on web, on iOS (no key yet), or when the native module is missing, it stays
 * DISABLED and callers fall back to the existing local-grant behavior so dev
 * never breaks.
 *
 * All react-native-purchases usage is contained in this file. The native
 * module is only ever `require`d behind the availability guard, so importing
 * this module is safe everywhere.
 */

// Public key — safe to commit. Overridable via env / EAS secret.
const ANDROID_KEY =
  process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || 'goog_hFgRbNrOlUHcMtKClkwWcYIBLvd';

/** RevenueCat entitlement that unlocks Premium. */
export const PREMIUM_ENTITLEMENT = 'premium';
/** Offering holding the monthly / yearly subscription packages. */
export const DEFAULT_OFFERING = 'default';

// Expo Go ships no custom native modules, so react-native-purchases is absent.
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
// Android-only for now: no iOS key yet, and the SDK isn't used on web.
const isSupportedPlatform = Platform.OS === 'android';

type PurchasesType = typeof PurchasesModule;

let purchases: PurchasesType | null = null;
let enabled = false;

if (isSupportedPlatform && !isExpoGo && ANDROID_KEY) {
  try {
    // Lazy require so the native module is never touched in Expo Go / web.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-purchases');
    purchases = (mod.default ?? mod) as PurchasesType;
    purchases.configure({ apiKey: ANDROID_KEY });
    enabled = true;
  } catch {
    // Native module unavailable (e.g. JS running without a prebuild) — stay
    // disabled and let callers use the local-grant fallback.
    purchases = null;
    enabled = false;
  }
}

/** True when the native SDK is present and configured (Android device builds). */
export const revenueCatEnabled = enabled;

/** Result of a purchase flow that the user may have cancelled. */
export type PurchaseOutcome = 'purchased' | 'cancelled';

export interface PremiumPurchaseResult {
  outcome: PurchaseOutcome;
  /** Whether the `premium` entitlement is active after the purchase. */
  premiumActive: boolean;
}

/**
 * True when an error thrown by a purchase/restore call is a user cancellation,
 * which we treat as a no-op rather than a failure. `code === '1'` is
 * PURCHASE_CANCELLED_ERROR; `userCancelled` is the legacy flag.
 */
function isUserCancelled(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { userCancelled?: boolean | null; code?: string };
  return e.userCancelled === true || e.code === '1';
}

function isPremiumActive(info: CustomerInfo): boolean {
  return !!info.entitlements.active[PREMIUM_ENTITLEMENT];
}

/**
 * Run the real store purchase for a consumable product (lives / hints). Throws
 * when RevenueCat is disabled — callers must gate on {@link revenueCatEnabled}.
 * Resolves `'cancelled'` for a user cancellation (no grant), `'purchased'` on
 * success, and rethrows real store errors so the UI can show a failure.
 */
export async function purchaseConsumable(productId: string): Promise<PurchaseOutcome> {
  if (!purchases) throw new Error('RevenueCat is not enabled');
  try {
    // Consumables are non-subscription products on Google Play.
    const products = await purchases.getProducts(
      [productId],
      purchases.PRODUCT_CATEGORY.NON_SUBSCRIPTION,
    );
    const product = products.find((p) => p.identifier === productId) ?? products[0];
    if (!product) throw new Error(`Store product not found: ${productId}`);
    await purchases.purchaseStoreProduct(product);
    return 'purchased';
  } catch (error) {
    if (isUserCancelled(error)) return 'cancelled';
    throw error;
  }
}

/** Pick the headline subscription package — annual first, then monthly, then any. */
function pickPremiumPackage(offering: PurchasesOffering): PurchasesPackage | null {
  if (offering.annual) return offering.annual;
  const yearly = offering.availablePackages.find(
    (p) =>
      p.product.identifier.includes('yearly') || p.product.identifier.includes('annual'),
  );
  if (yearly) return yearly;
  if (offering.monthly) return offering.monthly;
  return offering.availablePackages[0] ?? null;
}

/**
 * Present the Premium subscription purchase (annual as the primary offer) and
 * report whether the `premium` entitlement is active afterwards. Throws when
 * disabled; resolves `outcome: 'cancelled'` for a user cancellation.
 */
export async function purchasePremium(): Promise<PremiumPurchaseResult> {
  if (!purchases) throw new Error('RevenueCat is not enabled');
  const offerings = await purchases.getOfferings();
  const offering = offerings.all[DEFAULT_OFFERING] ?? offerings.current;
  if (!offering) throw new Error('No RevenueCat offering available');
  const pkg = pickPremiumPackage(offering);
  if (!pkg) throw new Error('No subscription package available');
  try {
    const { customerInfo } = await purchases.purchasePackage(pkg);
    return { outcome: 'purchased', premiumActive: isPremiumActive(customerInfo) };
  } catch (error) {
    if (isUserCancelled(error)) return { outcome: 'cancelled', premiumActive: false };
    throw error;
  }
}

/**
 * Restore previous purchases and report whether Premium is now active.
 * Resolves false when disabled; throws on SDK/network errors.
 */
export async function restorePremium(): Promise<boolean> {
  if (!purchases) return false;
  const info = await purchases.restorePurchases();
  return isPremiumActive(info);
}

/**
 * Whether the live `premium` entitlement is currently active. Resolves false
 * when disabled. Throws on network/SDK errors so callers can treat the result
 * as unknown (e.g. never downgrade offline).
 */
export async function isPremiumEntitlementActive(): Promise<boolean> {
  if (!purchases) return false;
  const info = await purchases.getCustomerInfo();
  return isPremiumActive(info);
}

/**
 * Fetch the localized store price string for each product id. Returns an empty
 * map when disabled or on error, so callers keep their hardcoded fallback price.
 */
export async function fetchProductPrices(
  productIds: string[],
): Promise<Record<string, string>> {
  if (!purchases || productIds.length === 0) return {};
  try {
    const products = await purchases.getProducts(
      productIds,
      purchases.PRODUCT_CATEGORY.NON_SUBSCRIPTION,
    );
    const prices: Record<string, string> = {};
    for (const product of products) prices[product.identifier] = product.priceString;
    return prices;
  } catch {
    return {};
  }
}
