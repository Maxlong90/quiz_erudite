import { Linking, Platform } from 'react-native';
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
 * Android ships with a committed fallback key for the erudite build, so that
 * build is always on; every sibling app supplies its own key through its EAS
 * profile, because a key belongs to exactly one RevenueCat project. iOS has NO
 * fallback at all, so it stays DISABLED until EXPO_PUBLIC_REVENUECAT_IOS_KEY is
 * provided — at which point iOS lights up automatically with no code change.
 * On web, in Expo Go, or when the native module is missing it also stays
 * disabled and callers fall back to the existing local-grant behavior so dev
 * never breaks.
 *
 * All react-native-purchases usage is contained in this file. The native
 * module is only ever `require`d behind the availability guard, so importing
 * this module is safe everywhere.
 */

// Build-time app slug. Mirrors APP_SLUG in api/client.ts, read straight from
// env rather than imported so this module keeps zero dependencies beyond the
// store SDK (importing @/api/client would pull axios into every consumer).
const APP_SLUG_FOR_KEYS = process.env.EXPO_PUBLIC_APP_SLUG ?? 'erudite-quiz';

// Committed public Android keys, per app. These are public billing keys and are
// safe to commit, but each one belongs to exactly ONE RevenueCat project: a key
// from another app's project resolves an empty catalog AND points the SDK at a
// foreign project, polluting its install events. So a build only inherits a
// committed key when its own app has one; the app's own
// EXPO_PUBLIC_REVENUECAT_ANDROID_KEY (from its eas.json profile) always wins.
// Sport Quiz has no Google Play catalog yet, hence no entry — its Android builds
// stay disabled and fail closed rather than talking to Erudite's project.
const COMMITTED_ANDROID_KEYS: Record<string, string> = {
  'erudite-quiz': 'goog_hFgRbNrOlUHcMtKClkwWcYIBLvd',
};

/**
 * Accept a key only when it looks like a real RevenueCat public SDK key
 * (`goog_` for Google Play, `appl_` for the App Store); anything else counts as
 * unset. `eas.json` ships `REPLACE_WITH_…` placeholders for apps whose keys an
 * operator has not filled in yet, and a placeholder is truthy: without this
 * check the SDK would be configured with a garbage key, `revenueCatEnabled`
 * would be true, and every purchase would fail deep inside the store with an
 * opaque "product not found" instead of the clean fail-closed "Store
 * unavailable". Unfilled placeholder === no billing, by construction.
 */
function publicStoreKey(key: string | undefined, prefix: 'goog_' | 'appl_'): string {
  return key && key.startsWith(prefix) ? key : '';
}

// Android public key — env (EAS profile) first, then this app's committed key.
const ANDROID_KEY = publicStoreKey(
  process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || COMMITTED_ANDROID_KEYS[APP_SLUG_FOR_KEYS],
  'goog_',
);
// iOS public key — NO committed fallback for any app. Until the owner supplies
// an App Store RevenueCat key via EXPO_PUBLIC_REVENUECAT_IOS_KEY, iOS billing
// stays off (capability flag below is false), so no broken paywall ships.
const IOS_KEY = publicStoreKey(process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY, 'appl_');

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

/**
 * Whether a package is a genuine auto-renewing subscription (not a coin/consumable
 * one-off). RevenueCat marks consumables `NON_SUBSCRIPTION`; a `CUSTOM` package
 * type is likewise never a subscription. The check is tolerant of a missing
 * category (older/mocked packages) — only an EXPLICIT non-subscription is
 * excluded — so the primary paywall keeps working while a coin pack can never be
 * mistaken for the Premium offer. Uses string literals to avoid importing the
 * runtime enums (this module intentionally imports types only).
 */
function isSubscriptionPackage(pkg: PurchasesPackage): boolean {
  if ((pkg.product as { productCategory?: string })?.productCategory === 'NON_SUBSCRIPTION') {
    return false;
  }
  if ((pkg as { packageType?: string }).packageType === 'CUSTOM') return false;
  return true;
}

/**
 * Pick the headline subscription package. Preference order is annual → monthly →
 * weekly → any remaining subscription, so the erudite multi-tier paywall keeps
 * its annual-first behavior while the Logo Quiz weekly-only offering resolves to
 * `$rc_weekly`. Every candidate — including the final fallback — is restricted to
 * genuine subscriptions, so a coin consumable is NEVER returned (the old
 * `availablePackages[0]` fallback could sell the 1000-coins pack). Returns null
 * when the offering holds no subscription at all, so callers throw rather than
 * charging for the wrong product.
 */
function pickPremiumPackage(offering: PurchasesOffering): PurchasesPackage | null {
  const subs = offering.availablePackages.filter(isSubscriptionPackage);

  const annual =
    (offering.annual && isSubscriptionPackage(offering.annual) ? offering.annual : null) ??
    subs.find(
      (p) =>
        p.product.identifier.includes('yearly') || p.product.identifier.includes('annual'),
    );
  if (annual) return annual;

  if (offering.monthly && isSubscriptionPackage(offering.monthly)) return offering.monthly;

  const weekly =
    (offering.weekly && isSubscriptionPackage(offering.weekly) ? offering.weekly : null) ??
    subs.find((p) => p.identifier === '$rc_weekly');
  if (weekly) return weekly;

  return subs[0] ?? null;
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
 * Open the platform's native "manage subscriptions" screen so the user can
 * cancel or change their subscription. An app CANNOT cancel an auto-renewable
 * subscription programmatically (App Store Guideline 3.1.2 / Google policy) —
 * it must route the user to the system UI, and premium stays active until the
 * paid period actually ends (reflected later by the entitlement reconcile).
 *
 * Prefers RevenueCat's native helper; falls back to the store's subscription
 * management URL. Returns false only when nothing could be opened (web / Expo
 * Go / no handler), so the caller can degrade gracefully.
 */
export async function openManageSubscriptions(): Promise<boolean> {
  if (purchases) {
    try {
      await purchases.showManageSubscriptions();
      return true;
    } catch {
      // Fall through to the URL below.
    }
  }

  const url =
    Platform.OS === 'ios'
      ? 'https://apps.apple.com/account/subscriptions'
      : 'https://play.google.com/store/account/subscriptions';
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
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
