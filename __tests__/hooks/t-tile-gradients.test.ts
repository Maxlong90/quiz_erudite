/**
 * hooks/t/use-tile-gradients.ts — the tile-artwork accessors for the
 * configurable template.
 *
 * These are the ONLY way a /t screen obtains a tile colour (the screens hold no
 * literals, and __tests__/app/t-no-color-literals.test.ts enforces that), so a
 * fault here is a fault in every tile at once. __tests__/app/t-home.test.tsx
 * exercises them indirectly through a render; this file pins the module itself,
 * including the inputs a render never produces.
 *
 * They are called through renderHook rather than invoked directly even though
 * they call no React hook today: when the spectrum becomes remote they become
 * context reads, and these tests should not have to be rewritten to notice.
 */
import { renderHook } from '@testing-library/react-native';

import {
  CATEGORY_RAMPS,
  FALLBACK_RAMP,
  MODE_RAMPS,
  TILE_GRADIENTS,
  type TModeId,
} from '@/constants/t/tile-palette';
import { CATEGORY_VISUALS, FALLBACK_VISUAL } from '@/constants/category-visuals';
import {
  useCategoryTileGradient,
  useModeTileGradient,
  useTileGradients,
} from '@/hooks/t/use-tile-gradients';

const MODE_IDS = Object.keys(MODE_RAMPS) as TModeId[];

/** A gradient LinearGradient can actually consume: exactly two real colours. */
function expectUsableGradient(value: unknown) {
  expect(Array.isArray(value)).toBe(true);
  const stops = value as unknown[];
  expect(stops).toHaveLength(2);
  for (const stop of stops) {
    // An undefined/null stop reaches a native LinearGradient and throws
    // "Unable to parse color" on Android — the failure this guards.
    expect(typeof stop).toBe('string');
    expect(stop).toMatch(/^#[0-9a-f]{6}$/);
  }
}

describe('useTileGradients', () => {
  it('exposes the whole frozen ramp map', () => {
    const { result } = renderHook(() => useTileGradients());
    expect(result.current).toBe(TILE_GRADIENTS);
    expect(Object.isFrozen(result.current)).toBe(true);
  });

  it('returns the same object across renders, so no consumer re-renders on it', () => {
    const { result, rerender } = renderHook(() => useTileGradients());
    const first = result.current;
    rerender({});
    expect(result.current).toBe(first);
  });
});

describe('useModeTileGradient', () => {
  it.each(MODE_IDS)('resolves %s through its named ramp', (id) => {
    const { result } = renderHook(() => useModeTileGradient(id));
    expect(result.current).toBe(TILE_GRADIENTS[MODE_RAMPS[id]]);
    expectUsableGradient(result.current);
  });

  it('covers all ten modes with no gaps', () => {
    expect(MODE_IDS).toHaveLength(10);
    for (const id of MODE_IDS) {
      const { result } = renderHook(() => useModeTileGradient(id));
      expect(result.current).toBeDefined();
    }
  });

  it('hands out a referentially stable tuple for the same mode', () => {
    // Gradients go straight to a LinearGradient `colors` prop; a fresh array per
    // call would defeat the reference-identity guarantee the resolver relies on.
    const a = renderHook(() => useModeTileGradient('today'));
    const b = renderHook(() => useModeTileGradient('today'));
    expect(a.result.current).toBe(b.result.current);
  });

  it('gives the two modes that share a ramp the identical tuple', () => {
    // today and challenge are both `sunrise` — a design statement, not a
    // coincidence, and the shared reference is what keeps it one decision.
    const today = renderHook(() => useModeTileGradient('today'));
    const challenge = renderHook(() => useModeTileGradient('challenge'));
    expect(today.result.current).toBe(challenge.result.current);
  });
});

describe('useCategoryTileGradient', () => {
  it.each(Object.keys(CATEGORY_VISUALS))(
    'resolves %s to the gradient the Erudite build ships',
    (slug) => {
      // Imported live from constants/category-visuals.ts: a /t category tile
      // pushes into app/category/[slug].tsx, an Erudite screen still reading
      // that map, so a mismatch would read as a colour change mid-navigation.
      const { result } = renderHook(() => useCategoryTileGradient(slug));
      expect(result.current).toEqual(CATEGORY_VISUALS[slug].gradient);
      expect(result.current).toBe(TILE_GRADIENTS[CATEGORY_RAMPS[slug]]);
    },
  );

  it('falls back to the neutral ramp for a slug it has no artwork for', () => {
    const { result } = renderHook(() => useCategoryTileGradient('cfg-demo'));
    expect(result.current).toBe(TILE_GRADIENTS[FALLBACK_RAMP]);
    expect(result.current).toEqual(FALLBACK_VISUAL.gradient);
  });

  /**
   * Category slugs are BACKEND DATA, so the lookup key is untrusted. A plain
   * `map[slug] ?? fallback` inherits from Object.prototype: for a slug like
   * 'constructor' the lookup yields a FUNCTION rather than undefined, `??`
   * never fires, and the tile ends up rendering `colors={undefined}` — an
   * "Unable to parse color" crash on Android rather than a grey tile.
   */
  it.each([
    'constructor',
    'toString',
    'valueOf',
    'hasOwnProperty',
    'isPrototypeOf',
    'propertyIsEnumerable',
    'toLocaleString',
    '__proto__',
    '__defineGetter__',
  ])('falls back safely for the inherited key %p', (slug) => {
    const { result } = renderHook(() => useCategoryTileGradient(slug));
    expectUsableGradient(result.current);
    expect(result.current).toBe(TILE_GRADIENTS[FALLBACK_RAMP]);
  });

  it.each(['', ' ', 'sunrise', 'dusk', 'GEOGRAPHY', 'geography ', '0', 'null', 'undefined'])(
    'falls back safely for the odd slug %p',
    (slug) => {
      // 'sunrise'/'dusk' are RAMP names, not slugs: a ramp name must not be
      // mistaken for a category. 'GEOGRAPHY' guards case-sensitivity.
      const { result } = renderHook(() => useCategoryTileGradient(slug));
      expectUsableGradient(result.current);
      expect(result.current).toBe(TILE_GRADIENTS[FALLBACK_RAMP]);
    },
  );

  it('never returns an unusable gradient for any slug it is given', () => {
    const slugs = [...Object.keys(CATEGORY_VISUALS), 'cfg-demo', 'constructor', '__proto__', ''];
    for (const slug of slugs) {
      const { result } = renderHook(() => useCategoryTileGradient(slug));
      expectUsableGradient(result.current);
    }
  });
});
