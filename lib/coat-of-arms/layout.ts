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

/**
 * Safe-area insets the height fit has to subtract. Defaulted to zero so the pure
 * unit tests (and web, where there are no insets) can call the metric functions
 * with two arguments exactly as before.
 */
export interface LayoutInsets {
  top: number;
  bottom: number;
}
const NO_INSETS: LayoutInsets = { top: 0, bottom: 0 };

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

// --- Height-fit reserves (shared shape, both screens) -----------------------
//
// The answer grid is the ANCHOR: it must always be fully visible with no page
// scroll, and the coat/pictures give up height to it. So the coat is capped not
// only by width (as before) but by the free height LEFT once everything below
// and around it has been reserved. These constants are the heights of those
// fixed regions, measured from the two screens' stylesheets; they are estimates
// tuned so a tall iPhone (393x852 / 430x932) still yields the shipped coat while
// a short/narrow window (360x610) shrinks the coat instead of clipping the grid.
//
// The coat is NEVER allowed below COAT_MIN — a coat smaller than that stops being
// recognisable — which on the very tightest windows is the floor that binds.

/** Coat never shrinks below this, even when free height runs out. */
const COAT_MIN = 110;
/** Continent cell never shrinks below this (a coat picture has to stay legible). */
const OPT_MIN = 96;
/** styles.options.rowGap on the "All countries" grid. */
const ROW_GAP_QUIZ = 14;
/** styles.options.rowGap on the "By continent" grid. */
const ROW_GAP_CONT = 16;
/** styles.hud: paddingVertical 10 both sides + the 44pt icon button. */
const HUD_H = 64;
/** styles.page.paddingBottom. */
const PAGE_PAD_BOTTOM = 16;
/** styles.imageArea.marginTop (quiz) / styles.head.marginTop (continent). */
const IMAGE_AREA_MT = 16;
/** quiz progress: fontSize 22 line (~26) + marginBottom 22. */
const PROGRESS_H_QUIZ = 48;
/**
 * Room kept for the prompt. The screen caps the prompt at TWO lines
 * (adjustsFontSizeToFit), so this is a HARD upper bound: 2 lines of the 26pt
 * font (~33 each) + marginTop 16, with a few points of slack. Because the prompt
 * can never exceed two lines, this reserve is guaranteed >= the real prompt
 * height in every locale — which is what makes the answer grid provably visible.
 */
const PROMPT_RESERVE_H = 96;
/** continent progress: fontSize 22 line (~26) + marginBottom 40. */
const PROGRESS_H_CONT = 66;
/** Room kept for the (up-to-two-line) country title. */
const TITLE_RESERVE_H = 80;
/** Per-cell vertical chrome on the continent grid: optionWrap (4+3)*2 + optionFrame (3+6)*2. */
const CELL_CHROME = 32;
/** The shipped coat->grid gap, kept until the coat would drop below its floor. */
const GAP_MAX_QUIZ = OPTION_H_BASE; // 68
/** Minimum coat->grid gap on a window too short to keep the full gap. */
const GAP_MIN_QUIZ = 24;

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
 * Metrics for the "All countries" screen.
 *
 * On a tall phone (393x852, 430x932, ...) this still returns exactly the
 * constants that shipped: `{coatSize: 190, optionH: 68, promptFont: 26,
 * gapHeight: 68}` and the original `optionTextW` formula — there the free height
 * is ample, so the new height cap never binds. On a SHORT or NARROW window (an
 * iPhone-only binary in a resized iPad window, e.g. 360x610) the coat gives up
 * height so the 2x2 answer grid stays fully on screen: `coatSize` is capped by
 * the height left over once the HUD, progress, prompt, gap and the grid itself
 * are reserved, and never falls below `COAT_MIN`.
 *
 * The order matters: `optionH` depends only on `scale`, so the grid height is
 * known first; the leftover height then feeds `coatSize`.
 */
export function coatQuizMetrics(
  width: number,
  height: number,
  insets: LayoutInsets = NO_INSETS,
): CoatQuizMetrics {
  const r = computeResponsive(width, height);
  const optionH = Math.round(OPTION_H_BASE * r.scale);
  const gridH = 2 * optionH + ROW_GAP_QUIZ;
  // Everything with a fixed height EXCEPT the coat plate and the coat->grid gap.
  // The coat block's own frame chrome is in here, so what is left over is shared
  // between the coat plate and the gap.
  const fixedReserve =
    insets.top +
    insets.bottom +
    HUD_H +
    IMAGE_AREA_MT +
    PROGRESS_H_QUIZ +
    PROMPT_RESERVE_H +
    gridH +
    PAGE_PAD_BOTTOM +
    FRAME_CHROME;
  const avail = height - fixedReserve; // budget for coat plate + gap
  const desiredCoat = Math.min(
    COAT_SIZE_BASE * r.scale,
    // Never let the plate push its frame past the content column.
    r.contentWidth - FRAME_CHROME - COAT_COLUMN_MARGIN,
    COAT_SIZE_MAX,
  );
  // The answer grid is the anchor. Keep the SHIPPED gap while the coat can still
  // meet its readable floor with it; on a shorter window let the gap give its
  // slack to the coat (down to GAP_MIN) so the coat stays as large as possible,
  // and only then does the coat itself shrink. On a tall phone `avail` is ample,
  // so this yields the shipped coat 190 / gap 68.
  let coatSize: number;
  let gapHeight: number;
  if (Math.min(desiredCoat, avail - GAP_MAX_QUIZ) >= COAT_MIN) {
    gapHeight = GAP_MAX_QUIZ;
    coatSize = Math.min(desiredCoat, avail - GAP_MAX_QUIZ);
  } else {
    coatSize = Math.max(COAT_MIN, Math.min(desiredCoat, avail - GAP_MIN_QUIZ));
    gapHeight = Math.max(GAP_MIN_QUIZ, Math.min(GAP_MAX_QUIZ, avail - coatSize));
  }
  return {
    ...r,
    coatSize: Math.round(coatSize),
    optionH,
    optionTextW: 0.48 * (r.contentWidth - 40) - 24,
    promptFont: Math.round(PROMPT_FONT_BASE * r.scale),
    gapHeight: Math.round(gapHeight),
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
 * Metrics for the "By continent" screen. On a tall phone this returns exactly the
 * constants that shipped (140pt cell at 393x852); on a short/narrow window the
 * cell shrinks so both rows of the coat grid stay on screen.
 *
 * `optW` has two independent caps. The WIDTH cap (`widthPack`) is the packing
 * value: two cells plus their chrome and a gutter have to fit the content box
 * exactly — it must NEVER be multiplied by `scale`, or the row overflows and Yoga
 * collapses the 2x2 grid into one column. The HEIGHT cap (`heightCap`) is the
 * largest cell that lets both rows fit the free height. Taking the MIN of the two
 * keeps `optW <= widthPack`, so two cells always still fit one row — the grid can
 * never collapse — while the coat pictures shrink on a short window.
 */
export function coatContinentMetrics(
  width: number,
  height: number,
  insets: LayoutInsets = NO_INSETS,
): CoatContinentMetrics {
  const r = computeResponsive(width, height);
  const gapHeight = CONTINENT_GAP_BASE;
  const widthPack = Math.floor(
    (r.contentWidth - GRID_PAD * 2 - WRAP_EXTRA * 2 - GRID_GUTTER) / 2,
  );
  // Height left for the whole 2xN coat grid once the fixed regions are reserved.
  const availGrid =
    height -
    insets.top -
    insets.bottom -
    HUD_H -
    IMAGE_AREA_MT -
    PROGRESS_H_CONT -
    TITLE_RESERVE_H -
    gapHeight -
    PAGE_PAD_BOTTOM;
  // Two rows of cells + one row-gap between them, each cell wearing CELL_CHROME.
  const heightCap = Math.floor((availGrid - ROW_GAP_CONT) / 2 - CELL_CHROME);
  const optW = Math.max(OPT_MIN, Math.min(widthPack, heightCap));
  return {
    ...r,
    optW,
    titleTextW: r.contentWidth - TITLE_PAD,
    gapHeight,
  };
}
