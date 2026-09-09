/**
 * constants/t/tile-palette.ts — the lift-and-shift proof for the tile artwork.
 *
 * The port of the home screen into app/t/ was supposed to change zero pixels
 * while removing every colour literal from the screen. This file is what makes
 * that claim checkable: it re-derives each ramp from the spectrum and compares
 * it to the colours the Erudite build actually ships.
 *
 * In the spirit of __tests__/lib/theme-bundled-parity.test.ts — the point is not
 * that the numbers are pretty, it is that two files which must agree cannot
 * drift apart silently.
 */
import {
  CATEGORY_RAMPS,
  FALLBACK_RAMP,
  MODE_RAMPS,
  TILE_GRADIENTS,
  TILE_RAMPS,
  TILE_SPECTRUM,
  resolveTileGradients,
  type TileHue,
  type TileRamp,
} from '@/constants/t/tile-palette';
import { CATEGORY_VISUALS, FALLBACK_VISUAL } from '@/constants/category-visuals';

/**
 * The ten mode gradients as they appear inline in app/index.tsx (the `modes`
 * useMemo, lines ~259-346). They are inline array literals inside a component,
 * so unlike CATEGORY_VISUALS they cannot be imported and have to be transcribed.
 *
 * IF THIS BLOCK FAILS: app/index.tsx and constants/t/tile-palette.ts have
 * diverged. They are meant to change in the same PR — update both, do not
 * "fix" the expectation on its own.
 */
const ERUDITE_MODE_GRADIENTS: Record<string, readonly [string, string]> = {
  today: ['#ffd23a', '#f59f3a'],
  timeLimit: ['#3aa6ff', '#4f6df5'],
  random10: ['#7c5cff', '#3aa6ff'],
  byTopic: ['#3aa37a', '#1f6f55'],
  timed: ['#f59f3a', '#d6533a'],
  challenge: ['#ffd23a', '#f59f3a'],
  survival: ['#c97a3f', '#8a4a2a'],
  mistakes: ['#e0529c', '#a23ad6'],
  hard: ['#d6533a', '#7a1f1f'],
  flashcards: ['#3aa6ff', '#4f6df5'],
};

/** WCAG 2.x relative luminance of a #rrggbb colour. */
function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5].map((offset) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/** WCAG contrast ratio of a colour against pure white (the `onAccent` value). */
function contrastAgainstWhite(hex: string): number {
  return 1.05 / (relativeLuminance(hex) + 0.05);
}

describe('tile ramps reproduce the shipped Erudite gradients', () => {
  it.each(Object.keys(CATEGORY_VISUALS))(
    'resolves the %s category tile to its live CATEGORY_VISUALS gradient',
    (slug) => {
      // Imported live, not transcribed: a redesign of an Erudite category tile
      // fails here loudly instead of letting the two builds drift. It matters
      // because a /t category tile pushes into app/category/[slug].tsx, which
      // still reads CATEGORY_VISUALS — a colour change mid-navigation would
      // read as a rendering bug.
      const ramp = CATEGORY_RAMPS[slug];
      expect(ramp).toBeDefined();
      expect(TILE_GRADIENTS[ramp]).toEqual(CATEGORY_VISUALS[slug].gradient);
    },
  );

  it('resolves the fallback ramp to the live FALLBACK_VISUAL gradient', () => {
    expect(TILE_GRADIENTS[FALLBACK_RAMP]).toEqual(FALLBACK_VISUAL.gradient);
  });

  it.each(Object.keys(ERUDITE_MODE_GRADIENTS))(
    'resolves the %s mode tile to its app/index.tsx gradient',
    (id) => {
      const ramp = MODE_RAMPS[id as keyof typeof MODE_RAMPS];
      expect(ramp).toBeDefined();
      expect(TILE_GRADIENTS[ramp]).toEqual(ERUDITE_MODE_GRADIENTS[id]);
    },
  );

  it('covers every mode the Modes tab renders and no others', () => {
    expect(Object.keys(MODE_RAMPS).sort()).toEqual(Object.keys(ERUDITE_MODE_GRADIENTS).sort());
  });

  it('covers every category the Erudite build has artwork for', () => {
    expect(Object.keys(CATEGORY_RAMPS).sort()).toEqual(Object.keys(CATEGORY_VISUALS).sort());
  });
});

describe('the spectrum seam', () => {
  it('exposes TILE_GRADIENTS as resolveTileGradients(TILE_SPECTRUM)', () => {
    // The exported map is not hand-written — it is the seam's own output, so a
    // later remote spectrum flows through the identical code path.
    expect(resolveTileGradients(TILE_SPECTRUM)).toEqual(TILE_GRADIENTS);
  });

  it('rebuilds every ramp when handed a different spectrum', () => {
    const swapped = { ...TILE_SPECTRUM, sun: '#ff0055' };
    expect(resolveTileGradients(swapped).sunrise).toEqual(['#ff0055', TILE_SPECTRUM.amber]);
  });

  it('hands out the same tuple by reference on every read', () => {
    // Gradients go straight to a LinearGradient prop; a fresh array per render
    // would defeat the reference-identity guarantee the resolver relies on.
    expect(TILE_GRADIENTS.sunrise).toBe(TILE_GRADIENTS.sunrise);
  });

  it('is frozen, so no consumer can mutate the shared artwork', () => {
    expect(Object.isFrozen(TILE_GRADIENTS)).toBe(true);
    expect(Object.isFrozen(TILE_SPECTRUM)).toBe(true);
  });
});

describe('the spectrum has no dead weight', () => {
  it('uses every hue in at least one ramp', () => {
    const used = new Set(Object.values(TILE_RAMPS).flat() as TileHue[]);
    expect([...Object.keys(TILE_SPECTRUM)].filter((hue) => !used.has(hue as TileHue))).toEqual([]);
  });

  it('assigns every ramp to at least one tile', () => {
    const used = new Set<TileRamp>([
      ...Object.values(MODE_RAMPS),
      ...Object.values(CATEGORY_RAMPS),
      FALLBACK_RAMP,
    ]);
    expect(Object.keys(TILE_RAMPS).filter((ramp) => !used.has(ramp as TileRamp))).toEqual([]);
  });
});

describe('contrast ratchet', () => {
  // Tile labels are `onAccent` — white in BOTH appearances. `onAccent` is on
  // the wire since Э1 widened REMOTE_TOKEN_KEYS, so an operator CAN move the
  // label colour now — a deliberate edit through the colour form, not a quiet
  // regression. The ratchet below still guards the SHIPPED worst case: `sun`
  // (#ffd23a) at ~1.44:1 under white. This test does not claim that is good;
  // it claims the bundled palette stays no worse than shipped.
  const WORST_SHIPPED_RATIO = 1.44;

  it.each(Object.entries(TILE_SPECTRUM))(
    'keeps %s at least as readable under white text as the shipped worst case',
    (_hue, hex) => {
      expect(contrastAgainstWhite(hex)).toBeGreaterThanOrEqual(WORST_SHIPPED_RATIO);
    },
  );

  it('still identifies `sun` as that worst case', () => {
    const ratios = Object.entries(TILE_SPECTRUM).map(
      ([hue, hex]) => [hue, contrastAgainstWhite(hex)] as const,
    );
    const worst = ratios.reduce((a, b) => (a[1] <= b[1] ? a : b));
    expect(worst[0]).toBe('sun');
  });
});
