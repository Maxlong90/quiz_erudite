/**
 * Layout metrics for the two Coat of Arms gameplay screens.
 *
 * These used to be module-level constants computed from
 * `Dimensions.get('window').width` at import time. That is fine on a phone, where
 * the window never changes, and wrong on iPadOS 26, where an iPhone-only binary
 * runs in a window the user can drag: every derived size stayed frozen at whatever
 * the window happened to be when the JS bundle loaded. App Review saw the result
 * and rejected the build under Guideline 4.
 *
 * They live here, as pure functions of (width, height), for three reasons:
 *  - they can be unit-tested with no renderer, which is how "phone layout is
 *    unchanged" is proven rather than asserted (see __tests__/lib/coat-of-arms-
 *    layout.test.ts);
 *  - both screens derive from the same `computeResponsive` gate, so the phone
 *    identity argument is made once;
 *  - expo-router route files in this repo export only their screen component.
 *
 * Every size is ROUNDED. Fractional widths make expo-image re-rasterise on each
 * sub-pixel change, and a resize drag produces a lot of those.
 */
import { computeResponsive, type Responsive } from '@/hooks/use-responsive';

// --- "All countries" (quiz.tsx) ---------------------------------------------

/** The shipped square coat plate. The phone value, and the base the plate grows from. */
const COAT_SIZE_BASE = 190;
/** The shipped answer-button height. */
const OPTION_H_BASE = 68;
/** The shipped prompt size. */
const PROMPT_FONT_BASE = 26;
/** imageFrame's borderWidth (3) + padding (10), both sides — chrome around the plate. */
const FRAME_CHROME = (3 + 10) * 2;
/** Beyond this the coat stops reading as a coat and starts reading as wallpaper. */
const COAT_SIZE_MAX = 320;
/** Breathing room between the coat frame and the edge of the content column. */
const COAT_COLUMN_MARGIN = 32;

export interface CoatQuizMetrics extends Responsive {
  /** Side of the square coat plate. Feeds the base image, its box AND the reveal overlay. */
  coatSize: number;
  /** Answer-button height. */
  optionH: number;
  /** Text width inside one answer button — what the label font is fitted to. */
  optionTextW: number;
  /** Question prompt font size. */
  promptFont: number;
  /** Fixed gap between the coat block and the answer grid when rhythm can't flex. */
  gapHeight: number;
}

/**
 * Metrics for the "All countries" screen. On any phone this returns exactly the
 * constants that shipped: `{coatSize: 190, optionH: 68, promptFont: 26,
 * gapHeight: 68}` and the original `optionTextW` formula.
 */
export function coatQuizMetrics(width: number, height: number): CoatQuizMetrics {
  const r = computeResponsive(width, height);
  return {
    ...r,
    coatSize: Math.round(
      Math.min(
        COAT_SIZE_BASE * r.scale,
        // Never let the plate push its frame past the content column.
        r.contentWidth - FRAME_CHROME - COAT_COLUMN_MARGIN,
        COAT_SIZE_MAX,
      ),
    ),
    optionH: Math.round(OPTION_H_BASE * r.scale),
    optionTextW: 0.48 * (r.contentWidth - 40) - 24,
    promptFont: Math.round(PROMPT_FONT_BASE * r.scale),
    gapHeight: OPTION_H_BASE,
  };
}

// --- "By continent" (continent-quiz.tsx) ------------------------------------

const GRID_PAD = 20;
/**
 * Per-option chrome that eats horizontal space: the wrapper's 4px reveal ring (8)
 * + 3px padding (6), plus the frame's 3px navy border (6) + 6px white-plate
 * padding (12) = 32 per option. Subtract both, plus an inter-column gutter, so two
 * squares fit one row — a smaller value made each option >50% wide and wrapped the
 * grid into a single column.
 */
const WRAP_EXTRA = 32;
const GRID_GUTTER = 8;
/** The shipped gap between the country name and the coat grid. */
const CONTINENT_GAP_BASE = 40;
/** styles.country's paddingHorizontal (24), both sides. */
const TITLE_PAD = 24 * 2;

export interface CoatContinentMetrics extends Responsive {
  /** Side of one square coat option. Feeds the plate, the image AND the reveal overlay. */
  optW: number;
  /** Text width available to the country-name title — what its font is fitted to. */
  titleTextW: number;
  /** Fixed gap between the title block and the coat grid when rhythm can't flex. */
  gapHeight: number;
}

/**
 * Metrics for the "By continent" screen. On any phone this returns exactly the
 * constants that shipped.
 *
 * NOTE `optW` is deliberately NOT multiplied by `scale`. It is a PACKING value:
 * two cells plus their chrome and a gutter have to fit the content box exactly.
 * Scaling it overflows the row and Yoga collapses the 2x2 grid into one column.
 * On this screen `scale` governs vertical rhythm only.
 */
export function coatContinentMetrics(width: number, height: number): CoatContinentMetrics {
  const r = computeResponsive(width, height);
  return {
    ...r,
    optW: Math.floor((r.contentWidth - GRID_PAD * 2 - WRAP_EXTRA * 2 - GRID_GUTTER) / 2),
    titleTextW: r.contentWidth - TITLE_PAD,
    gapHeight: CONTINENT_GAP_BASE,
  };
}
