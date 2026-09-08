import {
  CATEGORY_RAMPS,
  FALLBACK_RAMP,
  MODE_RAMPS,
  TILE_GRADIENTS,
  type TModeId,
  type TileGradient,
  type TileGradientMap,
} from '@/constants/t/tile-palette';

/**
 * Tile artwork accessors for the configurable template.
 *
 * Screens under app/t/ ask for a tile gradient by KEY — a mode id or a category
 * slug — and never see a colour. That is what lets
 * __tests__/app/t-no-color-literals.test.ts hold across the whole surface while
 * the artwork itself lives in one reviewable module.
 *
 * WHY THESE ARE NAMED AS HOOKS THOUGH THEY CALL NONE
 * --------------------------------------------------
 * Today the spectrum is bundled, so every one of these is a pure lookup in a
 * frozen module-level map — no React state is involved, and reading it during
 * render is trivially safe.
 *
 * They are hooks anyway because of where this is going. When the spectrum
 * becomes operator data these become `useAppTheme().tileGradients`, which IS a
 * context read. Naming them correctly now makes that a one-file change instead
 * of a rename across every call site — and a rename that would happen under a
 * rules-of-hooks lint that would, at that point, be right to complain about
 * conditional calls. The cost of the convention today is zero; the cost of
 * adopting it later is a diff through every tile.
 *
 * Because TILE_GRADIENTS is module-level and frozen, no memo is involved at all:
 * every tile receives the same tuple by reference on every render, so a
 * LinearGradient's `colors` prop is referentially stable for free.
 */

/** The whole ramp map. For consumers that need more than one ramp at a time. */
export function useTileGradients(): TileGradientMap {
  return TILE_GRADIENTS;
}

/**
 * The gradient for one of the ten mode tiles. `TModeId` is exhaustive, so an
 * unknown mode is a compile error rather than a runtime fallback.
 */
export function useModeTileGradient(id: TModeId): TileGradient {
  return TILE_GRADIENTS[MODE_RAMPS[id]];
}

/**
 * The gradient for a content category. Category slugs are backend data, so an
 * unknown one is an ordinary runtime case and gets the neutral fallback ramp —
 * the same one constants/category-visuals.ts gives the Erudite build.
 */
export function useCategoryTileGradient(slug: string): TileGradient {
  return TILE_GRADIENTS[CATEGORY_RAMPS[slug] ?? FALLBACK_RAMP];
}
