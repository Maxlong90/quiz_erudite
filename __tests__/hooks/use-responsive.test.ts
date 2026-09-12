/**
 * The phone-identity contract for hooks/use-responsive.ts.
 *
 * Coat of Arms was rejected under App Review Guideline 4 for its layout on an
 * iPad Air 11-inch, where an iPhone-only binary runs in a RESIZABLE window. The
 * fix makes the screens adaptive, under one hard constraint: on phone-sized
 * windows the layout must stay VISUALLY IDENTICAL to the shipped build.
 *
 * `computeResponsive` is shaped to make that constraint checkable rather than
 * argued: it gates on a phone-sized window and returns literal identity values
 * before any arithmetic runs. So the whole promise reduces to the table below —
 * every real iPhone size, asserted to produce the neutral result. If someone
 * later "improves" the scaling curve and it starts touching phones, this fails.
 *
 * Pure maths, no renderer: this is the cheapest test in the suite and the one
 * that has to stay green.
 */
import { computeResponsive, CONTENT_MAX_W } from '@/hooks/use-responsive';

// Every logical width an iPhone reports, SE (320) through 16/17 Pro Max (440).
const PHONE_WIDTHS = [320, 360, 375, 390, 393, 402, 414, 428, 430, 440];
// Every logical height across those same devices, portrait.
const PHONE_HEIGHTS = [568, 667, 736, 812, 844, 852, 874, 896, 926, 932, 956];

describe('computeResponsive — phone identity', () => {
  const cases = PHONE_WIDTHS.flatMap((width) => PHONE_HEIGHTS.map((height) => [width, height]));

  it.each(cases)('%i x %i is the neutral, shipped layout', (width, height) => {
    expect(computeResponsive(width, height)).toEqual({
      width,
      height,
      isCompact: true,
      isWide: false,
      isTall: false,
      contentWidth: width,
      scale: 1,
      column: null,
    });
  });

  it('never produces a column on a phone, so nothing is centred or capped', () => {
    for (const [width, height] of cases) {
      expect(computeResponsive(width, height).column).toBeNull();
    }
  });
});

describe('computeResponsive — the phone/adaptive boundary', () => {
  it('treats the gate corner itself as a phone', () => {
    expect(computeResponsive(480, 960).isCompact).toBe(true);
  });

  it('leaves the phone branch one point past the gate, in either axis', () => {
    expect(computeResponsive(481, 960).isCompact).toBe(false);
    expect(computeResponsive(480, 961).isCompact).toBe(false);
  });

  it('keeps headroom over the widest real phone (440 x 956)', () => {
    expect(computeResponsive(440, 956).isCompact).toBe(true);
  });
});

describe('computeResponsive — invariants at any size', () => {
  const sizes = [
    [320, 568], [393, 852], [440, 956], [481, 961], [540, 720],
    [700, 900], [820, 1180], [1024, 768], [1366, 1024], [2048, 2732],
  ];

  it.each(sizes)('%i x %i keeps scale inside the clamp band', (width, height) => {
    const { scale } = computeResponsive(width, height);
    expect(scale).toBeGreaterThanOrEqual(0.8);
    expect(scale).toBeLessThanOrEqual(1.45);
  });

  it.each(sizes)('%i x %i caps the content column at CONTENT_MAX_W', (width, height) => {
    expect(computeResponsive(width, height).contentWidth).toBe(Math.min(width, CONTENT_MAX_W));
  });

  it('never shrinks scale as the window gets taller', () => {
    let previous = 0;
    for (const height of [561, 600, 700, 860, 1000, 1180, 1400, 2000]) {
      const { scale } = computeResponsive(1024, height);
      expect(scale).toBeGreaterThanOrEqual(previous);
      previous = scale;
    }
  });

  it('only offers a centred column once the window is wider than the cap', () => {
    expect(computeResponsive(500, 1000).column).toBeNull();
    expect(computeResponsive(500, 1000).isWide).toBe(false);
    expect(computeResponsive(600, 1000).column).toEqual({
      width: CONTENT_MAX_W,
      alignSelf: 'center',
    });
  });

  it('gives the column a DEFINITE width, not a maxWidth', () => {
    // alignSelf:'center' drops the default `stretch`, so a maxWidth-only column
    // would shrink to its content and the `width: '48%'` option cells inside it
    // would stop resolving. This is a real bug that renders as a collapsed grid.
    const { column } = computeResponsive(1024, 1366);
    expect(typeof column?.width).toBe('number');
  });
});

describe('computeResponsive — the rejected device', () => {
  it('iPad Air 11-inch portrait (820 x 1180) centres a column and grows rhythm', () => {
    const r = computeResponsive(820, 1180);
    expect(r.isCompact).toBe(false);
    expect(r.isWide).toBe(true);
    expect(r.isTall).toBe(true);
    expect(r.contentWidth).toBe(CONTENT_MAX_W);
    expect(r.scale).toBeCloseTo(1180 / 860, 5);
  });

  it('landscape (1180 x 820) centres a column but does NOT grow rhythm', () => {
    const r = computeResponsive(1180, 820);
    expect(r.isWide).toBe(true);
    expect(r.isTall).toBe(false);
    expect(r.scale).toBeLessThan(1);
  });

  it('a short, wide window shrinks rhythm so fixed stacks still fit', () => {
    // 1024 x 568 is the case that overflows the result screen's fixed stack.
    expect(computeResponsive(1024, 568).scale).toBeLessThan(1);
  });
});
