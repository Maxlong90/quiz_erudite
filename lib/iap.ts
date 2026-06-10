import { addLives } from '@/lib/lives';
import { addHintsBundle, type HintKind } from '@/lib/hints';

/**
 * In-app purchases are not wired to a real provider yet. This module
 * stubs the flow: each "buy" simulates a 1-second processing delay
 * and then grants the bundle locally. Swap implementations for
 * expo-in-app-purchases (or RevenueCat) later — keep these IDs.
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

export async function purchaseBundle(bundle: ShopBundle): Promise<void> {
  // Pretend we hit the App Store / Play Store. Replace with the real
  // SDK call when payments are wired.
  await new Promise((r) => setTimeout(r, 900));

  if (bundle.grants.lives) {
    await addLives(bundle.grants.lives);
  }
  if (bundle.grants.hints) {
    await addHintsBundle(bundle.grants.hints);
  }
}
