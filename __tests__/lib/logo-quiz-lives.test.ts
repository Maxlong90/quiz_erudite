/**
 * Tests for the lives-regeneration maths in lib/logo-quiz/economy.ts, focused on
 * the offline "clock moved back" defence: when `now < updatedAt` (the player
 * rewound the phone clock, or the stored anchor ended up in the future), the life
 * count must NEVER drop and regen must re-anchor to `now` — while the normal
 * forward-regen behaviour (30 min free / 10 min premium) stays intact.
 */

import {
  LIFE_REGEN_MS,
  MAX_LIVES,
  PREMIUM_REGEN_MULTIPLIER,
  msUntilNextLife,
  reconcileLives,
  spendLife,
} from '@/lib/logo-quiz/economy';

const PREMIUM_REGEN_MS = LIFE_REGEN_MS / PREMIUM_REGEN_MULTIPLIER;
const T = 1_700_000_000_000; // fixed "now" for deterministic assertions

describe('reconcileLives — clock moved back (now < updatedAt)', () => {
  it('never decreases the count and re-anchors updatedAt to now', () => {
    // Anchor is 1h in the future relative to now (clock rewound 1h).
    const state = { lives: 1, updatedAt: T + 60 * 60 * 1000 };
    const result = reconcileLives(state, T, false);
    expect(result.lives).toBe(1); // NOT decreased, not negative
    expect(result.updatedAt).toBe(T); // re-anchored to now
  });

  it('never produces a negative count even for a far-future anchor', () => {
    const state = { lives: 0, updatedAt: T + 10 * 24 * 60 * 60 * 1000 }; // +10 days
    const result = reconcileLives(state, T, false);
    expect(result.lives).toBe(0);
    expect(result.updatedAt).toBe(T);
  });

  it('after re-anchoring, forward regen resumes from now', () => {
    // Rewound state → reconcile re-anchors to T.
    const reAnchored = reconcileLives({ lives: 1, updatedAt: T + 5 * 60 * 1000 }, T, false);
    expect(reAnchored.updatedAt).toBe(T);
    // One full interval after the re-anchor grants exactly one life.
    const later = reconcileLives(reAnchored, T + LIFE_REGEN_MS, false);
    expect(later.lives).toBe(2);
    expect(later.updatedAt).toBe(T + LIFE_REGEN_MS);
  });

  it('full/over-full bar with a future anchor keeps the count and anchors to now', () => {
    const result = reconcileLives({ lives: MAX_LIVES + 5, updatedAt: T + 3600_000 }, T, false);
    expect(result.lives).toBe(MAX_LIVES + 5); // purchased reserve untouched
    expect(result.updatedAt).toBe(T);
  });
});

describe('reconcileLives — normal forward regen is unchanged', () => {
  it('grants one life per 30-min interval for free players', () => {
    const result = reconcileLives({ lives: 0, updatedAt: T }, T + 2 * LIFE_REGEN_MS, false);
    expect(result.lives).toBe(2);
    expect(result.updatedAt).toBe(T + 2 * LIFE_REGEN_MS);
  });

  it('premium regenerates 3× faster (one life per 10 min)', () => {
    const result = reconcileLives({ lives: 0, updatedAt: T }, T + 3 * PREMIUM_REGEN_MS, true);
    expect(result.lives).toBe(3);
  });

  it('keeps a sub-interval partial bar and its anchor (no lost progress)', () => {
    const state = { lives: 1, updatedAt: T - 5 * 60 * 1000 }; // 5 min into a 30-min regen
    const result = reconcileLives(state, T, false);
    expect(result.lives).toBe(1);
    expect(result.updatedAt).toBe(T - 5 * 60 * 1000); // anchor preserved
  });

  it('caps a partial bar at MAX_LIVES and stops the timer', () => {
    const result = reconcileLives({ lives: 1, updatedAt: T }, T + 10 * LIFE_REGEN_MS, false);
    expect(result.lives).toBe(MAX_LIVES);
    expect(result.updatedAt).toBe(T + 10 * LIFE_REGEN_MS);
  });
});

describe('msUntilNextLife — clock-back safety', () => {
  it('returns a full interval (not negative or huge) when the anchor is in the future', () => {
    const ms = msUntilNextLife({ lives: 1, updatedAt: T + 60 * 60 * 1000 }, T, false);
    expect(ms).toBe(LIFE_REGEN_MS); // re-anchored → full interval remaining
  });

  it('returns null when the bar is already full', () => {
    expect(msUntilNextLife({ lives: MAX_LIVES, updatedAt: T }, T, false)).toBeNull();
  });

  it('counts down normally on a forward clock', () => {
    const ms = msUntilNextLife({ lives: 1, updatedAt: T }, T + 10 * 60 * 1000, false);
    expect(ms).toBe(LIFE_REGEN_MS - 10 * 60 * 1000);
  });
});

describe('spendLife — clock-back safety', () => {
  it('never drops below zero and re-anchors when the clock is rewound', () => {
    const result = spendLife({ lives: 0, updatedAt: T + 60 * 60 * 1000 }, T, false);
    expect(result.lives).toBe(0); // floors at 0, no negative
    expect(result.updatedAt).toBe(T); // re-anchored
  });

  it('spends one life and starts the regen clock when leaving a full bar', () => {
    const result = spendLife({ lives: MAX_LIVES, updatedAt: 0 }, T, false);
    expect(result.lives).toBe(MAX_LIVES - 1);
    expect(result.updatedAt).toBe(T);
  });
});
