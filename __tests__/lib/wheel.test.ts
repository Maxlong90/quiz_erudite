import {
  WHEEL_PRIZES,
  WHEEL_SEGMENTS,
  formatCountdownHMS,
  pickWheelPrizeIndex,
  segmentsForPrize,
  wheelPrizeById,
} from '@/lib/logo-quiz/economy';

describe('wheel prize table', () => {
  it('weights sum to 100 (so each weight doubles as a percent)', () => {
    const total = WHEEL_PRIZES.reduce((sum, p) => sum + p.weight, 0);
    expect(total).toBe(100);
  });

  it('has 9 wedges with the required per-prize counts', () => {
    expect(WHEEL_SEGMENTS).toHaveLength(9);
    expect(segmentsForPrize('coins100')).toHaveLength(3);
    expect(segmentsForPrize('lives3')).toHaveLength(3);
    expect(segmentsForPrize('coins500')).toHaveLength(1);
    expect(segmentsForPrize('lives10')).toHaveLength(1);
    expect(segmentsForPrize('coins1000')).toHaveLength(1);
  });

  it('every wedge references a known prize', () => {
    for (const id of WHEEL_SEGMENTS) {
      expect(() => wheelPrizeById(id)).not.toThrow();
    }
  });
});

describe('pickWheelPrizeIndex — weighted selection (not per-wedge)', () => {
  it('maps cumulative-weight boundaries to the right prize', () => {
    // Cumulative weights: coins100 [0,45), lives3 [45,90), coins500 [90,94),
    // lives10 [94,98), coins1000 [98,100). rand ∈ [0,1) scaled by total (100).
    expect(WHEEL_PRIZES[pickWheelPrizeIndex(0)].id).toBe('coins100');
    expect(WHEEL_PRIZES[pickWheelPrizeIndex(0.44)].id).toBe('coins100');
    expect(WHEEL_PRIZES[pickWheelPrizeIndex(0.45)].id).toBe('lives3');
    expect(WHEEL_PRIZES[pickWheelPrizeIndex(0.89)].id).toBe('lives3');
    expect(WHEEL_PRIZES[pickWheelPrizeIndex(0.9)].id).toBe('coins500');
    expect(WHEEL_PRIZES[pickWheelPrizeIndex(0.939)].id).toBe('coins500');
    expect(WHEEL_PRIZES[pickWheelPrizeIndex(0.94)].id).toBe('lives10');
    expect(WHEEL_PRIZES[pickWheelPrizeIndex(0.979)].id).toBe('lives10');
    expect(WHEEL_PRIZES[pickWheelPrizeIndex(0.98)].id).toBe('coins1000');
    expect(WHEEL_PRIZES[pickWheelPrizeIndex(0.999)].id).toBe('coins1000');
  });

  it('never returns out of range, even at the rand === 1 edge', () => {
    const idx = pickWheelPrizeIndex(1);
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(idx).toBeLessThan(WHEEL_PRIZES.length);
  });

  it('empirical distribution matches 45/45/4/4/2 with a deterministic RNG', () => {
    // mulberry32 — a small, high-quality deterministic [0,1) generator (good
    // uniformity, so the empirical shares hug the true weights closely).
    let a = 0x9e3779b9;
    const rand = () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let tt = Math.imul(a ^ (a >>> 15), 1 | a);
      tt = (tt + Math.imul(tt ^ (tt >>> 7), 61 | tt)) ^ tt;
      return ((tt ^ (tt >>> 14)) >>> 0) / 4294967296;
    };

    const N = 200_000;
    const counts: Record<string, number> = {};
    for (let i = 0; i < N; i++) {
      const prize = WHEEL_PRIZES[pickWheelPrizeIndex(rand())];
      counts[prize.id] = (counts[prize.id] ?? 0) + 1;
    }

    const pct = (id: string) => (100 * (counts[id] ?? 0)) / N;
    // Bounds are tight enough to prove WEIGHTED (not per-wedge, which would put
    // 100 coins / 3 lives at 3/9 ≈ 33% and 500 coins at 1/9 ≈ 11%).
    expect(pct('coins100')).toBeGreaterThan(44);
    expect(pct('coins100')).toBeLessThan(46);
    expect(pct('lives3')).toBeGreaterThan(44);
    expect(pct('lives3')).toBeLessThan(46);
    expect(pct('coins500')).toBeGreaterThan(3.3);
    expect(pct('coins500')).toBeLessThan(4.7);
    expect(pct('lives10')).toBeGreaterThan(3.3);
    expect(pct('lives10')).toBeLessThan(4.7);
    expect(pct('coins1000')).toBeGreaterThan(1.5);
    expect(pct('coins1000')).toBeLessThan(2.5);
  });
});

describe('formatCountdownHMS', () => {
  it('formats as zero-padded HH:MM:SS', () => {
    expect(formatCountdownHMS(0)).toBe('00:00:00');
    expect(formatCountdownHMS(1000)).toBe('00:00:01');
    expect(formatCountdownHMS(61 * 1000)).toBe('00:01:01');
    expect(formatCountdownHMS(24 * 60 * 60 * 1000)).toBe('24:00:00');
    expect(formatCountdownHMS(23 * 3600 * 1000 + 59 * 60 * 1000 + 59 * 1000)).toBe('23:59:59');
  });

  it('clamps negatives to zero', () => {
    expect(formatCountdownHMS(-5000)).toBe('00:00:00');
  });
});
