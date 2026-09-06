/**
 * Sport Quiz — Wheel of Fortune cooldown vs. a tampered device clock.
 *
 * The 24h cooldown is anchored on the DEVICE clock (there is no server), so the
 * only defence is `wheelCooldownRemaining` treating a future anchor as "now".
 * Logo Quiz has had this covered by __tests__/lib/wheel.test.ts since it shipped;
 * Sport Quiz carried the identical implementation with NO test at all, so a
 * refactor could silently drop the guard. These lock the behaviour down and
 * assert both apps stay in lockstep.
 */
import {
  WHEEL_COOLDOWN_MS,
  wheelCooldownRemaining,
  wheelSpinAvailable,
} from '@/lib/sport-quiz/economy';
import {
  WHEEL_COOLDOWN_MS as LQ_COOLDOWN_MS,
  wheelCooldownRemaining as lqRemaining,
} from '@/lib/logo-quiz/economy';

const T = 1_700_000_000_000; // fixed "now"
const HOUR = 60 * 60 * 1000;

describe('wheelCooldownRemaining — normal clock', () => {
  it('is available on a fresh account / dev-reset (anchor 0)', () => {
    expect(wheelCooldownRemaining(0, T)).toBe(0);
    expect(wheelSpinAvailable(0, T)).toBe(true);
  });

  it('blocks for exactly 24h after a spin', () => {
    expect(wheelCooldownRemaining(T, T)).toBe(WHEEL_COOLDOWN_MS);
    expect(wheelSpinAvailable(T, T)).toBe(false);
  });

  it('counts down as real time passes', () => {
    expect(wheelCooldownRemaining(T, T + HOUR)).toBe(WHEEL_COOLDOWN_MS - HOUR);
    expect(wheelCooldownRemaining(T, T + 23 * HOUR)).toBe(HOUR);
  });

  it('opens exactly at the 24h boundary, not a millisecond earlier', () => {
    expect(wheelSpinAvailable(T, T + WHEEL_COOLDOWN_MS - 1)).toBe(false);
    expect(wheelSpinAvailable(T, T + WHEEL_COOLDOWN_MS)).toBe(true);
  });
});

describe('wheelCooldownRemaining — clock moved BACKWARD (anchor lands in the future)', () => {
  it('never demands more than 24h, so the wheel cannot be bricked', () => {
    // Player spun, then wound the clock back 5h: anchor is now 5h in the future.
    const remaining = wheelCooldownRemaining(T + 5 * HOUR, T);
    expect(remaining).toBe(WHEEL_COOLDOWN_MS);
    expect(remaining).toBeLessThanOrEqual(WHEEL_COOLDOWN_MS);
  });

  it('caps at 24h even for an absurd far-future anchor (clock rewound years)', () => {
    expect(wheelCooldownRemaining(T + 365 * 24 * HOUR, T)).toBe(WHEEL_COOLDOWN_MS);
  });

  it('does NOT hand out a free spin for winding the clock back', () => {
    expect(wheelSpinAvailable(T + 12 * HOUR, T)).toBe(false);
  });
});

describe('parity with Logo Quiz', () => {
  it('uses the same 24h constant', () => {
    expect(WHEEL_COOLDOWN_MS).toBe(LQ_COOLDOWN_MS);
  });

  it('agrees on every clock scenario, including tampered ones', () => {
    const cases: Array<[number, number]> = [
      [0, T],                       // fresh
      [T, T],                       // just spun
      [T, T + HOUR],                // partway
      [T, T + WHEEL_COOLDOWN_MS],   // boundary
      [T + 5 * HOUR, T],            // clock wound back
      [T + 365 * 24 * HOUR, T],     // clock wound back a year
      [T, T + 48 * HOUR],           // clock jumped forward
    ];
    for (const [anchor, now] of cases) {
      expect(wheelCooldownRemaining(anchor, now)).toBe(lqRemaining(anchor, now));
    }
  });
});

describe('known limitation — clock moved FORWARD', () => {
  it('a forward jump past 24h does open the wheel (documented, not defended)', () => {
    // Nothing local can distinguish this from a day genuinely passing. Closing it
    // needs a server timestamp; recorded here so the gap is deliberate, not a
    // silent regression.
    expect(wheelSpinAvailable(T, T + 25 * HOUR)).toBe(true);
  });
});
