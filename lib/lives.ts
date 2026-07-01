import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'quiz.lives.v1';
export const DAILY_GRANT = 10;
// Earlier versions capped lives at 30 — that meant a player on 28
// who claimed +10 ended up at 30 (lost 8). Lives are pure currency
// now: nothing caps the total, daily/ad/purchase all grant in full.

// Best-effort anti-clock-cheat window. A player who moves the device
// clock forward flips todayKey() to a "new day" instantly; requiring a
// real wall-clock gap since the last claim as well means they'd have to
// also wait ~20h, so the exploit degrades to at most the normal cadence.
// This is intentionally offline/best-effort — there is no server to trust
// as the time source — which is acceptable for this fully on-device model.
const MIN_CLAIM_GAP_MS = 20 * 60 * 60 * 1000;

interface LivesState {
  count: number;
  /**
   * Local YYYY-MM-DD the player last claimed their daily bonus, OR
   * an empty string if they've never claimed (first launch ever).
   */
  lastClaimDate: string;
  /**
   * Epoch ms of the last claim, for the wall-clock gap / anti-rollback
   * check. Optional: legacy state (and never-claimed players) omit it and
   * are treated as claimable.
   */
  lastClaimAt?: number;
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function read(): Promise<LivesState> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { count: 0, lastClaimDate: '' };
    const parsed = JSON.parse(raw) as Partial<LivesState> & { lastRefillDate?: string };
    return {
      count: typeof parsed.count === 'number' ? parsed.count : 0,
      // Backwards-compat with the previous auto-refill schema that
      // used `lastRefillDate` — treat it as the prior claim date so
      // existing players aren't suddenly missing a stamp.
      lastClaimDate: parsed.lastClaimDate ?? parsed.lastRefillDate ?? '',
      lastClaimAt: typeof parsed.lastClaimAt === 'number' ? parsed.lastClaimAt : undefined,
    };
  } catch {
    return { count: 0, lastClaimDate: '' };
  }
}

function safeCount(n: number): number {
  return Math.max(0, Math.floor(n));
}

async function write(state: LivesState): Promise<void> {
  try { await AsyncStorage.setItem(KEY, JSON.stringify(state)); } catch {}
}

export async function getLives(): Promise<number> {
  return (await read()).count;
}

/**
 * Whether the daily +10 is claimable at `now`. Requires BOTH the local
 * calendar day to have changed AND ~20h of wall-clock to have elapsed
 * since the last claim — so nudging the clock forward alone isn't enough.
 * A backward clock jump (now < lastClaimAt) refuses. Legacy state with no
 * `lastClaimAt` is treated as claimable so existing players aren't blocked.
 */
function canClaim(state: LivesState, now: number): boolean {
  // Calendar day must have rolled over (respects the player's local midnight).
  if (state.lastClaimDate === todayKey()) return false;
  // Never timed (first claim / legacy) → allow.
  if (state.lastClaimAt == null) return true;
  // Clock moved backward → refuse (anti-rollback).
  if (now < state.lastClaimAt) return false;
  // AND enough real time has actually passed.
  return now - state.lastClaimAt >= MIN_CLAIM_GAP_MS;
}

/**
 * True when the daily +10 claim is available — never claimed yet, or a
 * new local day AND at least ~20h of wall-clock since the last claim.
 */
export async function isDailyClaimAvailable(): Promise<boolean> {
  return canClaim(await read(), Date.now());
}

/**
 * Add DAILY_GRANT lives and stamp today's date + timestamp. No-op if not
 * yet claimable. On a detected backward clock jump we keep the greater
 * (existing) timestamp so a rollback can't reset the anti-cheat window.
 * Returns the post-claim lives count.
 */
export async function claimDaily(): Promise<number> {
  const state = await read();
  const now = Date.now();
  if (!canClaim(state, now)) {
    // Anti-rollback: if the clock moved backward, persist the greater
    // timestamp so the player can't rewind their way to an earlier window.
    if (state.lastClaimAt != null && now < state.lastClaimAt) {
      await write(state);
    }
    return state.count;
  }
  const next: LivesState = {
    count: safeCount(state.count + DAILY_GRANT),
    lastClaimDate: todayKey(),
    lastClaimAt: now,
  };
  await write(next);
  return next.count;
}

export async function spendLife(): Promise<number> {
  const state = await read();
  if (state.count <= 0) return 0;
  const next = { ...state, count: state.count - 1 };
  await write(next);
  return next.count;
}

export async function addLives(amount: number): Promise<number> {
  const state = await read();
  const next = { ...state, count: safeCount(state.count + amount) };
  await write(next);
  return next.count;
}
