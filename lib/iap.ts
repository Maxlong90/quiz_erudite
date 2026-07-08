import { Platform } from 'react-native';

import { addLives } from '@/lib/lives';
import { addHintsBundle, type HintKind } from '@/lib/hints';
import {
  fetchProductPrices,
  isExpoGo,
  purchaseConsumable,
  revenueCatEnabled,
  type PurchaseOutcome,
} from '@/lib/revenuecat';

/**
 * In-app consumable purchases (lives / hints). On real store builds (Android /
 * iOS) these run through RevenueCat / Google Play (see lib/revenuecat.ts); the
 * bundle ids below are the store product ids and must not change.
 *
 * Grant policy (mirrors the paywall #568 free-unlock guard): a consumable is
 * credited ONLY after a resolved real store purchase. The local-grant stub is
 * permitted exclusively in genuinely non-store dev environments (Expo Go or
 * web) — never on a real iOS/Android device, where an unavailable store fails
 * closed with an error and grants nothing.
 */

export interface ShopBundle {
  id: string;
  category: 'lives' | 'hints' | 'combo';
  titleKey: ShopStringKey;
  subtitleKey: ShopStringKey;
  emoji: string;
  /** Display price; real prices come from the store metadata later. */
  price: string;
  grants: BundleGrants;
}

export type ShopStringKey =
  | 'shop.lives.small.title' | 'shop.lives.small.subtitle'
  | 'shop.lives.medium.title' | 'shop.lives.medium.subtitle'
  | 'shop.lives.large.title' | 'shop.lives.large.subtitle'
  | 'shop.hints.small.title' | 'shop.hints.small.subtitle'
  | 'shop.hints.medium.title' | 'shop.hints.medium.subtitle'
  | 'shop.hints.large.title' | 'shop.hints.large.subtitle'
  | 'shop.combo.small.title' | 'shop.combo.small.subtitle'
  | 'shop.combo.medium.title' | 'shop.combo.medium.subtitle'
  | 'shop.combo.large.title' | 'shop.combo.large.subtitle';

export interface BundleGrants {
  lives?: number;
  hints?: Partial<Record<HintKind, number>>;
}

export const BUNDLES: ShopBundle[] = [
  {
    id: 'lives.10',
    category: 'lives',
    titleKey: 'shop.lives.small.title',
    subtitleKey: 'shop.lives.small.subtitle',
    emoji: '❤️',
    price: '$0.99',
    grants: { lives: 10 },
  },
  {
    id: 'lives.30',
    category: 'lives',
    titleKey: 'shop.lives.medium.title',
    subtitleKey: 'shop.lives.medium.subtitle',
    emoji: '💖',
    price: '$1.99',
    grants: { lives: 30 },
  },
  {
    id: 'lives.100',
    category: 'lives',
    titleKey: 'shop.lives.large.title',
    subtitleKey: 'shop.lives.large.subtitle',
    emoji: '💝',
    price: '$4.99',
    grants: { lives: 100 },
  },
  {
    id: 'hints.5',
    category: 'hints',
    titleKey: 'shop.hints.small.title',
    subtitleKey: 'shop.hints.small.subtitle',
    emoji: '💡',
    price: '$0.99',
    grants: { hints: { fiftyFifty: 5, statistics: 5, replaceQuestion: 5 } },
  },
  {
    id: 'hints.10',
    category: 'hints',
    titleKey: 'shop.hints.medium.title',
    subtitleKey: 'shop.hints.medium.subtitle',
    emoji: '✨',
    price: '$1.99',
    grants: { hints: { fiftyFifty: 10, statistics: 10, replaceQuestion: 10 } },
  },
  {
    id: 'hints.20',
    category: 'hints',
    titleKey: 'shop.hints.large.title',
    subtitleKey: 'shop.hints.large.subtitle',
    emoji: '🌟',
    price: '$2.99',
    grants: { hints: { fiftyFifty: 20, statistics: 20, replaceQuestion: 20 } },
  },
  {
    id: 'combo.10.5',
    category: 'combo',
    titleKey: 'shop.combo.small.title',
    subtitleKey: 'shop.combo.small.subtitle',
    emoji: '🎁',
    price: '$1.99',
    grants: {
      lives: 10,
      hints: { fiftyFifty: 5, statistics: 5, replaceQuestion: 5 },
    },
  },
  {
    id: 'combo.30.10',
    category: 'combo',
    titleKey: 'shop.combo.medium.title',
    subtitleKey: 'shop.combo.medium.subtitle',
    emoji: '🎉',
    price: '$2.99',
    grants: {
      lives: 30,
      hints: { fiftyFifty: 10, statistics: 10, replaceQuestion: 10 },
    },
  },
  {
    id: 'combo.100.20',
    category: 'combo',
    titleKey: 'shop.combo.large.title',
    subtitleKey: 'shop.combo.large.subtitle',
    emoji: '🏆',
    price: '$5.99',
    grants: {
      lives: 100,
      hints: { fiftyFifty: 20, statistics: 20, replaceQuestion: 20 },
    },
  },
];

async function grantBundle(bundle: ShopBundle): Promise<void> {
  if (bundle.grants.lives) {
    await addLives(bundle.grants.lives);
  }
  if (bundle.grants.hints) {
    await addHintsBundle(bundle.grants.hints);
  }
}

/**
 * Buy a bundle. When RevenueCat is enabled, runs the real store purchase and
 * only credits the bundle locally on a successful (non-cancelled) purchase; a
 * user cancellation is a no-op and real store errors propagate so the shop UI
 * can show a failure.
 *
 * When RevenueCat is disabled, the local-grant stub runs ONLY in genuine dev
 * environments (Expo Go or web). On a real store platform (Android / iOS) with
 * the store unavailable we fail closed: throw so the UI surfaces an error and
 * NOTHING is granted — a consumable must never be handed out for free on a
 * device that can actually be charged.
 *
 * Returns the {@link PurchaseOutcome} so the caller can tell a real purchase
 * (`'purchased'`) apart from a user cancellation (`'cancelled'`) and only then
 * confirm success — otherwise dismissing the native sheet would still show a
 * "purchase added" message even though nothing was granted.
 */
export async function purchaseBundle(bundle: ShopBundle): Promise<PurchaseOutcome> {
  if (revenueCatEnabled) {
    const outcome = await purchaseConsumable(bundle.id);
    if (outcome === 'purchased') {
      await grantBundle(bundle);
    }
    // 'cancelled' → no grant, no error.
    return outcome;
  }

  // RevenueCat is off. Only Expo Go / web may local-grant (no real store).
  if (isExpoGo || Platform.OS === 'web') {
    // Stub path: pretend we hit the store, then grant locally.
    await new Promise((r) => setTimeout(r, 900));
    await grantBundle(bundle);
    return 'purchased';
  }

  // Real store platform (android / ios) but the store is unavailable — fail
  // closed. Grant nothing and let the caller show a purchase error.
  throw new Error('Store unavailable');
}

/**
 * Resolve live store prices for the catalog, keyed by bundle id. Returns an
 * empty map when RevenueCat is disabled (callers keep the hardcoded `price`).
 */
export function getBundleStorePrices(): Promise<Record<string, string>> {
  return fetchProductPrices(BUNDLES.map((b) => b.id));
}
