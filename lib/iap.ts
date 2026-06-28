import { addLives } from '@/lib/lives';
import { addHintsBundle, type HintKind } from '@/lib/hints';
import { fetchProductPrices, purchaseConsumable, revenueCatEnabled } from '@/lib/revenuecat';

/**
 * In-app consumable purchases (lives / hints). On Android device builds these
 * run through RevenueCat / Google Play (see lib/revenuecat.ts); the bundle ids
 * below are the Google Play product ids and must not change. In Expo Go, on web
 * and on iOS (no key yet) RevenueCat is disabled, so the flow falls back to a
 * local-grant stub — a short delay followed by crediting the bundle locally —
 * so the dev experience is unchanged.
 */

export interface ShopBundle {
  id: string;
  category: 'lives' | 'hints';
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
  | 'shop.hints.large.title' | 'shop.hints.large.subtitle'
  | 'shop.hints.power.title' | 'shop.hints.power.subtitle';

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
    price: '$1.99',
    grants: { hints: { fiftyFifty: 5, statistics: 5, ai: 5, letter: 5 } },
  },
  {
    id: 'hints.20',
    category: 'hints',
    titleKey: 'shop.hints.large.title',
    subtitleKey: 'shop.hints.large.subtitle',
    emoji: '✨',
    price: '$4.99',
    grants: { hints: { fiftyFifty: 20, statistics: 20, ai: 20, letter: 20 } },
  },
  {
    id: 'hints.power',
    category: 'hints',
    titleKey: 'shop.hints.power.title',
    subtitleKey: 'shop.hints.power.subtitle',
    emoji: '⚡',
    price: '$9.99',
    grants: {
      lives: 50,
      hints: { fiftyFifty: 30, statistics: 30, ai: 30, letter: 30 },
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
 * Buy a bundle. When RevenueCat is enabled, runs the real Google Play purchase
 * and only credits the bundle locally on a successful (non-cancelled) purchase;
 * a user cancellation is a no-op and real store errors propagate so the shop UI
 * can show a failure. When disabled (Expo Go / web / iOS), keeps the stubbed
 * delay-then-grant behavior.
 */
export async function purchaseBundle(bundle: ShopBundle): Promise<void> {
  if (revenueCatEnabled) {
    const outcome = await purchaseConsumable(bundle.id);
    if (outcome === 'purchased') {
      await grantBundle(bundle);
    }
    // 'cancelled' → no grant, no error.
    return;
  }

  // Stub path: pretend we hit the Play Store, then grant locally.
  await new Promise((r) => setTimeout(r, 900));
  await grantBundle(bundle);
}

/**
 * Resolve live store prices for the catalog, keyed by bundle id. Returns an
 * empty map when RevenueCat is disabled (callers keep the hardcoded `price`).
 */
export function getBundleStorePrices(): Promise<Record<string, string>> {
  return fetchProductPrices(BUNDLES.map((b) => b.id));
}
