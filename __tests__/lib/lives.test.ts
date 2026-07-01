/**
 * Tests for lib/lives.ts — the spend primitive and the daily +10 claim's
 * best-effort anti-clock-change protection (Part C): a claim needs BOTH a new
 * local calendar day AND ~20h of real elapsed time, refuses a backward clock
 * jump (keeping the greater timestamp), and treats legacy state with no
 * `lastClaimAt` as claimable.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { claimDaily, isDailyClaimAvailable, spendLife, getLives } from '@/lib/lives';

const KEY = 'quiz.lives.v1';

async function seed(state: Record<string, unknown>) {
  await AsyncStorage.setItem(KEY, JSON.stringify(state));
}
async function readRaw(): Promise<Record<string, unknown>> {
  return JSON.parse((await AsyncStorage.getItem(KEY)) ?? '{}');
}
/** Set the fake system clock to a specific local wall time. */
function setNow(y: number, m: number, d: number, h = 9) {
  jest.setSystemTime(new Date(y, m, d, h, 0, 0));
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
});

describe('spendLife', () => {
  it('decrements by one and never goes below zero', async () => {
    await seed({ count: 2, lastClaimDate: '' });
    expect(await spendLife()).toBe(1);
    expect(await spendLife()).toBe(0);
    expect(await spendLife()).toBe(0); // floors at 0
  });
});

describe('claimDaily anti-clock-change (Part C)', () => {
  it('grants +10 on the very first claim and stamps date + timestamp', async () => {
    setNow(2026, 5, 1, 9);
    await seed({ count: 5, lastClaimDate: '' }); // never claimed, no lastClaimAt
    const count = await claimDaily();
    expect(count).toBe(15);
    const raw = await readRaw();
    expect(raw.lastClaimDate).toBe('2026-06-01');
    expect(typeof raw.lastClaimAt).toBe('number');
    expect(raw.lastClaimAt).toBe(new Date(2026, 5, 1, 9, 0, 0).getTime());
  });

  it('refuses a second claim the same day', async () => {
    setNow(2026, 5, 1, 9);
    await claimDaily(); // 0 -> 10
    setNow(2026, 5, 1, 20); // later the same calendar day
    expect(await isDailyClaimAvailable()).toBe(false);
    expect(await claimDaily()).toBe(10); // no extra grant
  });

  it('refuses a new calendar day when <20h of real time has elapsed', async () => {
    setNow(2026, 5, 1, 23); // claim late on day 1
    await claimDaily();
    setNow(2026, 5, 2, 1); // ~2h later, but a new calendar day
    expect(await isDailyClaimAvailable()).toBe(false);
    expect(await claimDaily()).toBe(10);
  });

  it('allows a claim after a real new day AND >=20h', async () => {
    setNow(2026, 5, 1, 9);
    await claimDaily(); // -> 10
    setNow(2026, 5, 2, 10); // next day, ~25h later
    expect(await isDailyClaimAvailable()).toBe(true);
    expect(await claimDaily()).toBe(20);
  });

  it('refuses a backward clock jump and keeps the greater timestamp', async () => {
    setNow(2026, 5, 10, 9);
    await claimDaily();
    const forwardTs = (await readRaw()).lastClaimAt as number;

    // Player rewinds the clock to an earlier day.
    setNow(2026, 5, 1, 9);
    expect(await isDailyClaimAvailable()).toBe(false);
    expect(await claimDaily()).toBe(10); // no grant
    // Anti-rollback: the stored timestamp is NOT reduced.
    expect((await readRaw()).lastClaimAt).toBe(forwardTs);
  });

  it('treats legacy state without lastClaimAt as claimable', async () => {
    setNow(2026, 5, 5, 9);
    await seed({ count: 0, lastClaimDate: '2020-01-01' }); // old day, no lastClaimAt
    expect(await isDailyClaimAvailable()).toBe(true);
    expect(await claimDaily()).toBe(10);
    expect(typeof (await readRaw()).lastClaimAt).toBe('number');
  });
});

describe('getLives', () => {
  it('returns the stored count', async () => {
    await seed({ count: 7, lastClaimDate: '' });
    expect(await getLives()).toBe(7);
  });
});
