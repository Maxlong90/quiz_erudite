import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import type PurchasesModule from 'react-native-purchases';
import type { CustomerInfo, PurchasesOffering, PurchasesPackage } from 'react-native-purchases';

/**
 * RevenueCat (store billing) integration. Mirrors lib/sentry.ts: the public
 * store keys come from env (EXPO_PUBLIC_REVENUECAT_ANDROID_KEY /
 * EXPO_PUBLIC_REVENUECAT_IOS_KEY) and the whole module degrades gracefully.
 *
 * Gating is capability-driven, NOT platform-hardcoded: the SDK is enabled on
 * any native platform (android / ios) for which a public key is configured.
 * Android ships with a committed fallback key so it is always on; iOS has NO
 * fallback, so it stays DISABLED until EXPO_PUBLIC_REVENUECAT_IOS_KEY is
 * provided — at which point iOS lights up automatically with no code change.
 * On web, in Expo Go, or when the native module is missing it also stays
 * disabled and callers fall back to the existing local-grant behavior so dev
 * never breaks.
 *
 * All react-native-purchases usage is contained in this file. The native
 * module is only ever `require`d behind the availability guard, so importing
 * this module is safe everywhere.
 */

// Android public key — safe to commit. Overridable via env / EAS secret.
const ANDROID_KEY =
  process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || 'goog_hFgRbNrOlUHcMtKClkwWcYIBLvd';
// iOS public key — NO committed fallback. Until the owner supplies an
// App Store RevenueCat key via EXPO_PUBLIC_REVENUECAT_IOS_KEY, iOS billing
// stays off (capability flag below is false), so no broken paywall ships.
const IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || '';

// The public key for the current native platform (empty string when none).
const keyForPlatform = Platform.OS === 'ios' ? IOS_KEY : ANDROID_KEY;

/** RevenueCat entitlement that unlocks Premium. */
export const PREMIUM_ENTITLEMENT = 'premium';
/** Offering holding the monthly / yearly subscription packages. */
export const DEFAULT_OFFERING = 'default';

// Expo Go ships no custom native modules, so react-native-purchases is absent.
// Exported so consumables/purchases can tell a genuine dev environment (Expo Go)
// apart from a real store platform where a failed store must fail closed.
export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
// Capability-driven: enabled on any native platform that has a configured key.
// Never on web (the SDK isn't used there). iOS is therefore off until its key
// is supplied, then on automatically — no platform hardcoding.
const isSupportedPlatform = Platform.OS !== 'web' && !!keyForPlatform;

type PurchasesType = typeof PurchasesModule;

let purchases: PurchasesType | null = null;
let enabled = false;

if (isSupportedPlatform && !isExpoGo) {
  try {
    // Lazy require so the native module is never touched in Expo Go / web.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-purchases');
    purchases = (mod.default ?? mod) as PurchasesType;
    purchases.configure({ apiKey: keyForPlatform });
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

/** The three Premium subscription packages surfaced on the multi-tier paywall. */
export interface PremiumPackages {
  weekly: PurchasesPackage | null;
  monthly: PurchasesPackage | null;
  annual: PurchasesPackage | null;
}

/**
 * Read the weekly / monthly / annual subscription packages from the `default`
 * offering for the multi-tier paywall. Each is resolved by its RevenueCat
 * convenience accessor first, then by package lookup_key (`$rc_weekly` etc.) as
 * a fallback, so a missing accessor doesn't drop a tier. Returns all-null when
 * disabled or on any error — the paywall then renders its hardcoded prices.
 */
export async function fetchPremiumPackages(): Promise<PremiumPackages> {
  const empty: PremiumPackages = { weekly: null, monthly: null, annual: null };
  if (!purchases) return empty;
  try {
    const offerings = await purchases.getOfferings();
    const offering = offerings.all[DEFAULT_OFFERING] ?? offerings.current;
    if (!offering) return empty;
    const byLookupKey = (lookupKey: string): PurchasesPackage | null =>
      offering.availablePackages.find((p) => p.identifier === lookupKey) ?? null;
    return {
      weekly: offering.weekly ?? byLookupKey('$rc_weekly'),
      monthly: offering.monthly ?? byLookupKey('$rc_monthly'),
      annual: offering.annual ?? byLookupKey('$rc_annual'),
    };
  } catch {
    return empty;
  }
}

/**
 * Purchase a specific subscription package chosen on the multi-tier paywall and
 * report whether the `premium` entitlement is active afterwards. Mirrors
 * {@link purchasePremium} but for a caller-selected package. Resolves
 * `outcome: 'cancelled'` for a user cancellation or when disabled; rethrows real
 * store errors so the UI can show a failure.
 */
export async function purchasePremiumPackage(
  pkg: PurchasesPackage,
): Promise<PremiumPurchaseResult> {
  if (!purchases) return { outcome: 'cancelled', premiumActive: false };
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
