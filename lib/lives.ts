import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'quiz.lives.v1';
export const DAILY_GRANT = 10;
// Earlier versions capped lives at 30 — that meant a player on 28
// who claimed +10 ended up at 30 (lost 8). Lives are pure currency
// now: nothing caps the total, daily/ad/purchase all grant in full.

interface LivesState {
  count: number;
  /**
   * Local YYYY-MM-DD the player last claimed their daily bonus, OR
   * an empty string if they've never claimed (first launch ever).
   */
  lastClaimDate: string;
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
 * True when the daily +10 claim is available — never claimed yet, or
 * last claim was on a previous local day.
 */
export async function isDailyClaimAvailable(): Promise<boolean> {
  const state = await read();
  return state.lastClaimDate !== todayKey();
}

/**
 * Add DAILY_GRANT lives and stamp today's date. No-op if already
 * claimed today. Returns the post-claim lives count.
 */
export async function claimDaily(): Promise<number> {
  const state = await read();
  const today = todayKey();
  if (state.lastClaimDate === today) return state.count;
  const next: LivesState = {
    count: safeCount(state.count + DAILY_GRANT),
    lastClaimDate: today,
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
