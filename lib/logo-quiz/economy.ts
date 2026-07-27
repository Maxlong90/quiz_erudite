/**
 * Logo Quiz economy — the single source of truth for currency and lives rules.
 * Pure constants + pure helpers (no I/O), so both the state provider and the UI
 * import the same numbers and the same lives-regeneration maths.
 */

// ---- Coins ----
export const STARTING_COINS = 150;
/** Coins for passing a level (a correct answer). Premium doubles this to 10. */
export const COINS_PER_CORRECT = 5;
/** Premium players earn double coins per correct answer (the Result upsell). */
export const PREMIUM_COIN_MULTIPLIER = 2;

// ---- Hint costs (shown on the buttons; disabled when the player can't pay) ----
export const HINT_5050_COST = 25;
export const HINT_SKIP_COST = 40;

// ---- Lives ----
export const MAX_LIVES = 3;
/** One life regenerates every 30 minutes for non-premium players. */
export const LIFE_REGEN_MS = 30 * 60 * 1000;
/**
 * Premium no longer grants infinite lives — instead lives regenerate 3× faster.
 * So a premium player's bar refills one life every LIFE_REGEN_MS / 3 (10 min).
 */
export const PREMIUM_REGEN_MULTIPLIER = 3;

/** Regeneration interval for this player (premium regenerates 3× faster). */
export function lifeRegenMs(isPremium: boolean): number {
  return isPremium ? LIFE_REGEN_MS / PREMIUM_REGEN_MULTIPLIER : LIFE_REGEN_MS;
}

/** One-time coin reward for rating the app (claimed on the Settings screen). */
export const RATE_APP_REWARD_COINS = 100;

// ---- Lives bought with in-game coins (a coin sink, not real money) ----
/** Lives granted per coin purchase in the shop. */
export const LIVES_FOR_COINS_AMOUNT = 3;
/** Coin price of one lives-for-coins purchase. */
export const LIVES_FOR_COINS_COST = 100;

// ---- Per-question round timer (seconds) ----
export const QUESTION_TIME_SEC = 30;

// ---- Coin packs sold for real money (mock IAP) ----
export interface CoinPack {
  id: string;
  coins: number;
  price: string;
  popular?: boolean;
}
export const COIN_PACKS: CoinPack[] = [
  { id: 'coins_100', coins: 100, price: '$0.99' },
  { id: 'coins_500', coins: 500, price: '$3.99', popular: true },
  { id: 'coins_1000', coins: 1000, price: '$6.99' },
];

// ---- Life packs sold for real money (mock IAP) ----
// Bought lives stock ABOVE the regenerating bar (MAX_LIVES); they are consumed
// first and never expire, so a pack of 10 is a real reserve, not clamped to 3.
export interface LifePack {
  id: string;
  lives: number;
  price: string;
  popular?: boolean;
}
export const LIFE_PACKS: LifePack[] = [
  { id: 'lives_3', lives: 3, price: '$0.99' },
  { id: 'lives_10', lives: 10, price: '$2.99', popular: true },
];

/** How many coins a correct answer is worth for this player. */
export function coinsForCorrect(isPremium: boolean): number {
  return COINS_PER_CORRECT * (isPremium ? PREMIUM_COIN_MULTIPLIER : 1);
}

export interface LivesState {
  /** Stored life count (0..MAX_LIVES; purchased packs can exceed MAX_LIVES). */
  lives: number;
  /** Epoch ms anchoring the regeneration clock for the current partial life. */
  updatedAt: number;
}

/**
 * Fold elapsed real time into the stored lives, returning the reconciled state.
 * A full bar carries no running timer (its anchor is simply "now"); a partial
 * bar accrues one life per regen interval and advances its anchor by exactly the
 * time it consumed, so leftover progress toward the next life is never lost.
 * Premium regenerates 3× faster (shorter interval) — pass `isPremium`.
 */
export function reconcileLives(state: LivesState, now: number, isPremium = false): LivesState {
  // At or above a full bar (purchased lives can exceed MAX_LIVES): keep the
  // actual count and run no regen timer. Regen only tops up a partial bar below.
  if (state.lives >= MAX_LIVES) return { lives: state.lives, updatedAt: now };
  const regen = lifeRegenMs(isPremium);
  const elapsed = now - state.updatedAt;
  if (elapsed <= 0) return state;
  const gained = Math.floor(elapsed / regen);
  if (gained <= 0) return state;
  const lives = Math.min(MAX_LIVES, state.lives + gained);
  const updatedAt = lives >= MAX_LIVES ? now : state.updatedAt + gained * regen;
  return { lives, updatedAt };
}

/** Milliseconds until the next life regenerates, or null when the bar is full. */
export function msUntilNextLife(state: LivesState, now: number, isPremium = false): number | null {
  const reconciled = reconcileLives(state, now, isPremium);
  if (reconciled.lives >= MAX_LIVES) return null;
  const elapsed = now - reconciled.updatedAt;
  return Math.max(0, lifeRegenMs(isPremium) - elapsed);
}

/** Spend one life. Starts the regen clock when leaving a full bar. */
export function spendLife(state: LivesState, now: number, isPremium = false): LivesState {
  const reconciled = reconcileLives(state, now, isPremium);
  const wasFull = reconciled.lives >= MAX_LIVES;
  const lives = Math.max(0, reconciled.lives - 1);
  return { lives, updatedAt: wasFull ? now : reconciled.updatedAt };
}

/** Format a millisecond duration as `M:SS` for the regen countdown. */
export function formatCountdown(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

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

/** Visual prominence tier — drives the segment highlight colour on the wheel. */
export type WheelTier = 'base' | 'rare' | 'legendary';

/** What a wheel prize grants (coins and/or lives, added to the local economy). */
export interface WheelReward {
  coins?: number;
  lives?: number;
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
 * selection is WEIGHTED by `weight` (NOT uniform over wedges): 100 coins & 3
 * lives dominate at 45% each, the mid prizes are 4%, and the 1000-coin jackpot
 * is a rare 2%. Weights are whole percent so `weight` doubles as the odds label.
 */
export const WHEEL_PRIZES: WheelPrize[] = [
  { id: 'coins100', reward: { coins: 100 }, weight: 45, tier: 'base' },
  { id: 'lives3', reward: { lives: 3 }, weight: 45, tier: 'base' },
  { id: 'coins500', reward: { coins: 500 }, weight: 4, tier: 'rare' },
  { id: 'lives10', reward: { lives: 10 }, weight: 4, tier: 'rare' },
  { id: 'coins1000', reward: { coins: 1000 }, weight: 2, tier: 'legendary' },
];

/**
 * The 9 physical wedges around the ring, referencing prize ids. Arranged so that
 * identical prizes are never adjacent and the rare/legendary wedges are spread
 * out. Counts: 100 coins ×3, 3 lives ×3, 500 coins ×1, 10 lives ×1, 1000 ×1.
 * The wheel stops on a wedge chosen from the WEIGHTED prize (see pickWheelPrize).
 */
export const WHEEL_SEGMENTS: string[] = [
  'coins100',
  'lives3',
  'coins500',
  'coins100',
  'lives3',
  'coins1000',
  'coins100',
  'lives3',
  'lives10',
];

/** Look up a prize by id (throws in dev if the id is unknown). */
export function wheelPrizeById(id: string): WheelPrize {
  const prize = WHEEL_PRIZES.find((p) => p.id === id);
  if (!prize) throw new Error(`Unknown wheel prize id: ${id}`);
  return prize;
}

/**
 * Pick a prize by WEIGHTED random — each prize's chance equals its `weight`
 * share of the total (NOT one-in-nine per wedge). `rand` is a value in [0, 1)
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
