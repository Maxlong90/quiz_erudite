/**
 * Sport Quiz economy — the single source of truth for the coins-only currency.
 * Pure constants + pure helpers (no I/O), so both the state provider and the UI
 * import the same numbers and the same wheel maths. Unlike Logo Quiz, Sport Quiz
 * has NO lives and NO premium — coins are the only currency, earned/spent locally.
 */

// ---- Coins ----
export const STARTING_COINS = 150;

// ---- Classic quiz ----
/** Coins awarded for each correct answer in the Classic quiz. */
export const CORRECT_REWARD_COINS = 10;
/** Coins a Skip hint costs — it reveals the answer (marked passed), no reward. */
export const HINT_SKIP_COST = 30;

// ---- Sports Legends mode ----
/** Coins charged for tapping one puzzle plate to uncover a piece of the photo. */
export const LEGEND_REVEAL_COST = 5;

// ---- Coin packs sold for real money (real IAP via RevenueCat) ----
// `id` is the stable local token (React key, "bought" flash, persisted nowhere).
// `storeProductId` is the App Store / Google Play / RevenueCat product id — it
// must match the backend per-app catalog (`sportquiz_coins_*`) and must not change.
export interface CoinPack {
  id: string;
  storeProductId: string;
  coins: number;
  price: string;
  popular?: boolean;
}
export const COIN_PACKS: CoinPack[] = [
  { id: 'coins_100', storeProductId: 'sportquiz_coins_100', coins: 100, price: '$0.99' },
  { id: 'coins_500', storeProductId: 'sportquiz_coins_500', coins: 500, price: '$3.99', popular: true },
  { id: 'coins_1000', storeProductId: 'sportquiz_coins_1000', coins: 1000, price: '$6.99' },
];

/** Format a millisecond duration as `HH:MM:SS` — used for the 24h wheel cooldown. */
export function formatCountdownHMS(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

// ---- Wheel of Fortune (one free spin per rolling 24h) ----

/** Cooldown between free spins: exactly 24 hours from the moment of the last spin. */
export const WHEEL_COOLDOWN_MS = 24 * 60 * 60 * 1000;

/**
 * Milliseconds left on the 24h wheel cooldown, given the last-spin anchor and the
 * current clock. Offline-safe: if the clock was moved back (or the stored anchor is
 * in the future, `lastSpinAt > now`), the anchor is treated as `now`, so the wait
 * is capped at exactly `WHEEL_COOLDOWN_MS` — the wheel never sticks longer than 24h
 * and a backward jump never gifts an instant free spin. `lastSpinAt === 0` (never
 * spun / dev-reset) returns 0 → available now.
 */
export function wheelCooldownRemaining(lastSpinAt: number, now: number): number {
  const anchor = lastSpinAt > now ? now : lastSpinAt;
  return Math.max(0, WHEEL_COOLDOWN_MS - (now - anchor));
}

/** Whether the free wheel spin is available now (>= 24h since the last spin). */
export function wheelSpinAvailable(lastSpinAt: number, now: number): boolean {
  return wheelCooldownRemaining(lastSpinAt, now) <= 0;
}

/** Visual prominence tier — drives the segment highlight colour on the wheel. */
export type WheelTier = 'base' | 'rare' | 'legendary';

/** What a wheel prize grants (coins only, added to the local economy). */
export interface WheelReward {
  coins: number;
}

export interface WheelPrize {
  id: string;
  reward: WheelReward;
  /** Selection weight — the odds table, in whole percent (sums to 100). */
  weight: number;
  tier: WheelTier;
}

/**
 * Prize / weight / tier table — the single source of truth for the wheel. The
 * selection is WEIGHTED by `weight` (NOT uniform over wedges): 100 coins dominate
 * at 90%, 500 coins are 8%, and the 1000-coin jackpot is a rare 2%. Weights are
 * whole percent so `weight` doubles as the odds label.
 */
export const WHEEL_PRIZES: WheelPrize[] = [
  { id: 'coins100', reward: { coins: 100 }, weight: 90, tier: 'base' },
  { id: 'coins500', reward: { coins: 500 }, weight: 8, tier: 'rare' },
  { id: 'coins1000', reward: { coins: 1000 }, weight: 2, tier: 'legendary' },
];

/**
 * The 8 physical wedges around the ring, referencing prize ids. Arranged so that
 * identical prizes are never all adjacent and the rare/legendary wedges are spread
 * out. Counts: 100 coins ×5, 500 coins ×2, 1000 coins ×1. The wheel stops on a
 * wedge chosen from the WEIGHTED prize (see pickWheelPrizeIndex).
 */
export const WHEEL_SEGMENTS: string[] = [
  'coins100',
  'coins500',
  'coins100',
  'coins1000',
  'coins100',
  'coins500',
  'coins100',
  'coins100',
];

/** Look up a prize by id (throws in dev if the id is unknown). */
export function wheelPrizeById(id: string): WheelPrize {
  const prize = WHEEL_PRIZES.find((p) => p.id === id);
  if (!prize) throw new Error(`Unknown wheel prize id: ${id}`);
  return prize;
}

/**
 * Pick a prize by WEIGHTED random — each prize's chance equals its `weight`
 * share of the total (NOT one-in-eight per wedge). `rand` is a value in [0, 1)
 * (injectable, so the distribution is unit-testable with a mock RNG). Returns
 * the index into WHEEL_PRIZES.
 */
export function pickWheelPrizeIndex(rand: number): number {
  const total = WHEEL_PRIZES.reduce((sum, p) => sum + p.weight, 0);
  let threshold = rand * total;
  for (let i = 0; i < WHEEL_PRIZES.length; i++) {
    threshold -= WHEEL_PRIZES[i].weight;
    if (threshold < 0) return i;
  }
  return WHEEL_PRIZES.length - 1; // guards rand === 1 / float rounding
}

/** All wedge indices (into WHEEL_SEGMENTS) that award the given prize id. */
export function segmentsForPrize(prizeId: string): number[] {
  const out: number[] = [];
  WHEEL_SEGMENTS.forEach((id, i) => {
    if (id === prizeId) out.push(i);
  });
  return out;
}
