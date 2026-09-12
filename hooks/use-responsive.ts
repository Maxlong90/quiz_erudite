import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

/**
 * Window-size metrics for laying screens out at ANY window size.
 *
 * Why this exists: an iPhone-only binary still runs on iPad, and on iPadOS 26 it
 * runs in a window the user can RESIZE. A layout built from
 * `Dimensions.get('window')` captured once at module import is stale for the
 * whole life of the JS process the moment that window changes — which is exactly
 * what App Review saw (Guideline 4) on an iPad Air 11-inch.
 *
 * The hard constraint on the fix is that PHONE-SIZED windows must stay pixel-for-
 * pixel identical to what already shipped. That is why this is not a smooth
 * scaling curve: `computeResponsive` GATES on a phone-sized window and returns
 * literal identity values (`scale: 1`, `column: null`, `contentWidth: width`)
 * BEFORE any arithmetic runs. Phone identity is therefore a single machine-checked
 * assertion (see __tests__/hooks/use-responsive.test.ts) rather than a claim about
 * five separate formulas.
 *
 * Deliberately NOT exported: any `isTablet` flag. This is not an iPad layout — it
 * is one layout that survives any window size.
 */

/**
 * One content-column cap for EVERY Coat of Arms screen. Shared so the column does
 * not visibly jump width when navigating (play -> quiz). 520 is comfortably above
 * the widest phone (440), which keeps `min(width, cap) === width` on every phone.
 */
export const CONTENT_MAX_W = 520;

// The widest/tallest phone is the iPhone 16/17 Pro Max at 440 x 956 pt. These
// gates carry headroom over that so no real phone can fall out of the identity
// branch — including a future slightly-larger one.
const PHONE_MAX_W = 480;
const PHONE_MAX_H = 960;

// Vertical-rhythm reference. `scale` is a HEIGHT ratio, so it grows the layout on
// a tall iPad window and SHRINKS it on a short, wide one (e.g. 1024 x 568, where
// the result screen's fixed stack would otherwise overflow the viewport).
const REF_H = 860;
const SCALE_MIN = 0.8;
const SCALE_MAX = 1.45;

export interface Responsive {
  width: number;
  height: number;
  /** Phone-sized window — every field below is the shipped identity value. */
  isCompact: boolean;
  /** Wider than the content cap, so the content is a centred column. */
  isWide: boolean;
  /** Taller than the reference, so flexible spacers may grow. */
  isTall: boolean;
  /** min(width, CONTENT_MAX_W) — the box screen content actually lives in. */
  contentWidth: number;
  /** Vertical-rhythm multiplier. Exactly 1 on every phone. */
  scale: number;
  /**
   * Style for the content-column wrapper, or null on a phone. Carries a DEFINITE
   * pixel width on purpose: `alignSelf: 'center'` removes the default `stretch`,
   * so a `maxWidth`-only child would shrink to its content and percentage-width
   * grandchildren (the `width: '48%'` option cells) would stop resolving.
   */
  column: { width: number; alignSelf: 'center' } | null;
}

/**
 * Pure metrics for a window size. Kept a top-level pure function (not a closure
 * inside the hook) so it is directly unit-testable without a renderer — the phone-
 * identity table test is the acceptance test for this whole feature.
 */
export function computeResponsive(width: number, height: number): Responsive {
  // Phone-sized window: return the shipped values verbatim, before any arithmetic.
  if (width <= PHONE_MAX_W && height <= PHONE_MAX_H) {
    return {
      width,
      height,
      isCompact: true,
      isWide: false,
      isTall: false,
      contentWidth: width,
      scale: 1,
      column: null,
    };
  }

  const contentWidth = Math.min(width, CONTENT_MAX_W);
  const scale = Math.max(SCALE_MIN, Math.min(SCALE_MAX, height / REF_H));
  const isWide = width > CONTENT_MAX_W;

  return {
    width,
    height,
    isCompact: false,
    isWide,
    isTall: scale > 1,
    contentWidth,
    scale,
    column: isWide ? { width: CONTENT_MAX_W, alignSelf: 'center' } : null,
  };
}

/**
 * Live window metrics. `useWindowDimensions` subscribes to `Dimensions.change`, so
 * this re-renders as the user drags the iPad split-view divider — which is the
 * whole point. Memoised so the returned object identity is stable between renders
 * at the same size even where the React Compiler is not applied (it is on in
 * Metro, off under Jest).
 */
export function useResponsive(): Responsive {
  const { width, height } = useWindowDimensions();
  return useMemo(() => computeResponsive(width, height), [width, height]);
}
