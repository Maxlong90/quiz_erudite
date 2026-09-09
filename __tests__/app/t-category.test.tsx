/**
 * The configurable template's category screen (app/t/category/[slug].tsx).
 *
 * The screen is a port of app/category/[slug].tsx, which has no test coverage of
 * its own, so these assertions do double duty: they prove the copy still works,
 * and they pin the three things the port deliberately CHANGED —
 *
 *  1. tile artwork comes from a named ramp (hooks/t/use-tile-gradients.ts), not
 *     from constants/category-visuals.ts. The ramp must be IDENTICAL to the one
 *     the home painted, or a tile visibly changes colour mid-navigation — the
 *     exact property constants/t/tile-palette.ts exists to hold;
 *  2. the palette arrives through the template funnel, so an operator's preset
 *     repaints this screen;
 *  3. a subcategory tile pushes '/t/quiz-mode/…', keeping the browse path inside
 *     the template subtree.
 *
 * Hooks are mocked at their import boundary rather than wrapped in providers —
 * useLocale throws without one — following __tests__/app/t-home.test.tsx.
 *
 * NEITHER hooks/t/use-template-theme.ts NOR hooks/t/use-tile-gradients.ts is
 * mocked: both are the thing under test, and a mocked ramp would make every
 * assertion below self-fulfilling. The mock boundary is use-app-theme, which
 * leaves the real useThemeColors -> deriveTemplateTheme chain running.
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

// --- mock boundaries ---------------------------------------------------------

const mockPush = jest.fn();
const mockBack = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  router: {
    push: (...args: unknown[]) => mockPush(...args),
    back: (...args: unknown[]) => mockBack(...args),
    replace: jest.fn(),
  },
  useLocalSearchParams: () => mockParams,
  useFocusEffect: jest.fn(),
}));

jest.mock('@/api/client', () => ({
  APP_SLUG: 'test-quiz',
  API_URL: 'https://example.test/api/v1',
  apiClient: { get: jest.fn() },
}));

const mockFetchCategories = jest.fn().mockResolvedValue([]);
jest.mock('@/api/categories', () => ({
  fetchCategories: (...args: unknown[]) => mockFetchCategories(...args),
}));

// Pin the locale so the real useTranslation resolves English strings.
jest.mock('@/hooks/use-locale', () => ({
  useLocale: () => ({ locale: 'en' }),
}));

// The remote palette the screen resolves through useThemeColors(). Overriding a
// token here is exactly what an operator's preset edit does on a real device.
let mockThemeValue: unknown = null;
jest.mock('@/hooks/use-app-theme', () => ({
  ...jest.requireActual('@/hooks/use-app-theme'),
  useAppTheme: () => mockThemeValue,
}));

jest.mock('@/hooks/use-theme-pref', () => ({
  useThemePref: () => ({ theme: 'dark', ready: true, setTheme: jest.fn() }),
}));

jest.mock('@/components/ui/icon-symbol', () => ({ IconSymbol: () => null }));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
// A plain View rather than a pass-through, so the `colors` prop each tile hands
// its gradient stays readable in the tree — that prop IS what these tests are
// about. (t-quiz.test.tsx's `({children}) => children` form DROPS it, which
// would make every gradient assertion below pass vacuously.)
jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return { LinearGradient: View };
});
jest.mock('react-native-safe-area-context', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaView: ({ children, ...props }: { children: React.ReactNode }) =>
      ReactModule.createElement(View, props, children),
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

/* eslint-disable import/first -- screen under test loads AFTER its mocks */
import TCategoryScreen from '@/app/t/category/[slug]';
import { CATEGORY_VISUALS, FALLBACK_VISUAL } from '@/constants/category-visuals';
import { EruditeColors } from '@/constants/theme';
import { TILE_GRADIENTS } from '@/constants/t/tile-palette';
import { BUNDLED_THEME } from '@/lib/theme/bundled';
import { resolvePalette } from '@/lib/theme/resolve';

function category(slug: string, name: string, questions = 12, flashcards = 0) {
  return {
    slug,
    name,
    sort_order: 1,
    should_have_images: false,
    should_have_audio: false,
    subcategories_count: 4,
    total_questions_count: questions,
    total_flashcards_count: flashcards,
  };
}

const PARENTS = [category('geography', 'Geography'), category('history', 'History')];
const SUBS = [
  category('geography-capitals', 'Capitals'),
  category('geography-flags', 'Flags'),
  category('geography-landmarks', 'Landmarks'),
];

/** A preset bgGradient, built through the real overlay rather than by hand. */
const PRESET_BG = ['#ff0055', '#aa0033', '#110011'] as const;
const OVERRIDDEN_DARK = resolvePalette(EruditeColors.dark, {
  ...BUNDLED_THEME.dark,
  bgGradient: PRESET_BG,
});

/** Collapse a node's (possibly nested, possibly conditional) style prop. */
function flatStyle(node: { props: { style?: unknown } }): Record<string, unknown> {
  return Object.assign({}, ...[node.props.style].flat(Infinity).filter(Boolean));
}

/** The `colors` prop of the gradient a tile renders. */
function tileGradientOf(testID: string): unknown {
  const [gradient] = screen
    .getByTestId(testID)
    .findAll((node) => Array.isArray(node.props?.colors));
  return gradient.props.colors;
}

/** The ScreenBackground gradient — the only remote-token surface this screen paints. */
function backdropColors(): unknown {
  const [backdrop] = screen.UNSAFE_root.findAll(
    (node) => Array.isArray(node.props?.colors) && Array.isArray(node.props?.locations),
  );
  return backdrop.props.colors;
}

/** Render and wait for the two-request load to settle. */
async function renderReady() {
  render(<TCategoryScreen />);
  await waitFor(() => expect(screen.getByTestId('subcategory-geography-capitals')).toBeTruthy());
}

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { slug: 'geography' };
  mockThemeValue = null;
  mockFetchCategories.mockImplementation((_slug: string, options?: { parent?: string }) =>
    Promise.resolve(options?.parent ? SUBS : PARENTS),
  );
});

describe('t category — the ported screen still works', () => {
  it('shows the parent name and its emoji once loaded', async () => {
    await renderReady();

    expect(screen.getByText('Geography')).toBeTruthy();
    expect(screen.getByText(CATEGORY_VISUALS.geography.emoji)).toBeTruthy();
  });

  it('renders one tile per subcategory', async () => {
    await renderReady();

    expect(screen.getByTestId('subcategory-geography-flags')).toBeTruthy();
    expect(screen.getByTestId('subcategory-geography-landmarks')).toBeTruthy();
    expect(screen.getByText('Capitals')).toBeTruthy();
  });

  it('shows the error branch when the fetch rejects', async () => {
    mockFetchCategories.mockRejectedValue(new Error('offline'));
    render(<TCategoryScreen />);

    // The 😕 branch is this screen's own; the mode picker has no counterpart.
    await waitFor(() => expect(screen.getByText('😕')).toBeTruthy());
  });

  it('does not start a run from a subcategory with no content', async () => {
    mockFetchCategories.mockImplementation((_slug: string, options?: { parent?: string }) =>
      Promise.resolve(options?.parent ? [category('geography-capitals', 'Capitals', 0, 0)] : PARENTS),
    );
    await renderReady();

    const tile = screen.getByTestId('subcategory-geography-capitals');
    expect(tile.props.accessibilityState?.disabled ?? tile.props.onClick === undefined).toBeTruthy();
    fireEvent.press(tile);
    expect(mockPush).not.toHaveBeenCalled();
  });
});

describe('t category — the tile does not change colour mid-navigation', () => {
  it('paints the same named ramp the home painted for this category', async () => {
    await renderReady();

    // The same ramp __tests__/app/t-home.test.tsx asserts for `category-geography`.
    expect(tileGradientOf('subcategory-geography-capitals')).toEqual(TILE_GRADIENTS.twilight);
    // ...and the ZERO-PIXEL claim, asserted against the live Erudite source
    // rather than against a transcription of it.
    expect(tileGradientOf('subcategory-geography-capitals')).toEqual(
      CATEGORY_VISUALS.geography.gradient,
    );
  });

  it('gives every tile on the screen the parent ramp, never its own slug', async () => {
    await renderReady();

    // Subcategory slugs are absent from CATEGORY_RAMPS, so feeding one to
    // useCategoryTileGradient would silently grey out every tile. One distinct
    // tuple across the grid is the proof that never happened.
    const ramps = SUBS.map((sub) => tileGradientOf(`subcategory-${sub.slug}`));
    expect(new Set(ramps).size).toBe(1);
    expect(ramps[0]).toEqual(TILE_GRADIENTS.twilight);
  });

  it('falls back to the neutral dusk ramp for a category it has no ramp for', async () => {
    mockParams = { slug: 'cfg-demo' };
    mockFetchCategories.mockImplementation((_slug: string, options?: { parent?: string }) =>
      Promise.resolve(
        options?.parent ? [category('cfg-demo-one', 'One')] : [category('cfg-demo', 'Demo')],
      ),
    );
    render(<TCategoryScreen />);
    await waitFor(() => expect(screen.getByTestId('subcategory-cfg-demo-one')).toBeTruthy());

    expect(tileGradientOf('subcategory-cfg-demo-one')).toEqual(TILE_GRADIENTS.dusk);
    expect(tileGradientOf('subcategory-cfg-demo-one')).toEqual(FALLBACK_VISUAL.gradient);
    // Twice, and both are correct: the header takes `visual.emoji`, and the tile
    // takes `parentEmoji` because 'cfg-demo-one' is absent from SUBCATEGORY_EMOJI.
    expect(screen.getAllByText(FALLBACK_VISUAL.emoji)).toHaveLength(2);
  });

  it('does not move the tiles when the operator changes the accent', async () => {
    mockThemeValue = {
      palettes: {
        dark: resolvePalette(EruditeColors.dark, { ...BUNDLED_THEME.dark, accent: '#00ff00' }),
        light: EruditeColors.light,
      },
    };
    await renderReady();

    // Tile artwork is not a palette token, so a preset edit must leave it alone.
    expect(tileGradientOf('subcategory-geography-capitals')).toEqual(TILE_GRADIENTS.twilight);
  });
});

describe('t category — the backdrop follows the operator palette', () => {
  // ScreenBackground's bgGradient is the repaint this screen is asserted on:
  // it is the one place the screen reads the palette through a component whose
  // gradient the test can reach. The other tokens it reads (text, textMuted,
  // onAccent) are on the wire since Э1 too, so an operator preset moves them as
  // well — the backdrop assertion stays the single, cheapest proof.
  it('paints the bundled gradient by default', async () => {
    await renderReady();

    expect(backdropColors()).toEqual(EruditeColors.dark.bgGradient);
  });

  it('repaints when the operator sets bgGradient', async () => {
    mockThemeValue = { palettes: { dark: OVERRIDDEN_DARK, light: EruditeColors.light } };
    await renderReady();

    expect(backdropColors()).toEqual(PRESET_BG);
  });
});

describe('t category — routes stay inside /t', () => {
  it('sends a subcategory tap to the template mode picker', async () => {
    await renderReady();

    fireEvent.press(screen.getByTestId('subcategory-geography-capitals'));
    expect(mockPush).toHaveBeenCalledWith('/t/quiz-mode/geography-capitals');
  });

  it('never pushes an Erudite browse route', async () => {
    await renderReady();

    fireEvent.press(screen.getByTestId('subcategory-geography-flags'));
    const pushed = mockPush.mock.calls.flat();
    expect(pushed.filter((route) => String(route).startsWith('/category'))).toEqual([]);
    expect(pushed.filter((route) => String(route).startsWith('/quiz-mode'))).toEqual([]);
  });

  it('goes back rather than navigating home', async () => {
    await renderReady();

    fireEvent.press(screen.getByLabelText('Back'));
    expect(mockBack).toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
