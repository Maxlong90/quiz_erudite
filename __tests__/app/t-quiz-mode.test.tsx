/**
 * The configurable template's mode picker (app/t/quiz-mode/[slug].tsx).
 *
 * The screen is a port of app/quiz-mode/[slug].tsx, which has no test coverage
 * of its own, so these assertions do double duty: they prove the copy still
 * works, and they pin the four things the port deliberately CHANGED —
 *
 *  1. card artwork comes from a named ramp, closing the home -> category ->
 *     mode-picker chain on ONE colour. A tile that changes colour across those
 *     three screens is the bug constants/t/tile-palette.ts exists to prevent;
 *  2. the crown reads `colors.gold` rather than the `#ffd23a` it replaced, and
 *     the badge pill reads the named TILE_BADGE_SCRIM rather than `#00000066`;
 *  3. starting a run pushes '/t/quiz' — without it the template's mode picker
 *     would launch the ERUDITE quiz loop, which is the whole point of the port;
 *  4. the premium gate routes to /t/paywall. The Erudite '/paywall' is a real
 *     screen, so the un-ported route would not have failed — it would have
 *     pitched the wrong app's paywall and then exited through the wrong home.
 *
 * NEITHER hooks/t/use-template-theme.ts NOR hooks/t/use-tile-gradients.ts is
 * mocked: both are the thing under test, and a mocked ramp would make every
 * assertion below self-fulfilling. The mock boundary is use-app-theme, which
 * leaves the real useThemeColors -> deriveTemplateTheme chain running.
 */
import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';

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

let mockIsPremium = false;
jest.mock('@/hooks/use-premium', () => ({
  usePremium: () => ({
    isPremium: mockIsPremium,
    setPremium: jest.fn(),
    resetPremium: jest.fn(),
  }),
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

// Renders a View so the crown's `color` prop and the badge pill wrapping it are
// both readable in the tree.
jest.mock('@/components/ui/icon-symbol', () => {
  const { View } = require('react-native');
  const ReactModule = require('react');
  return {
    IconSymbol: (props: { name: string }) =>
      ReactModule.createElement(View, { ...props, testID: `icon-${props.name}` }),
  };
});

jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
// A plain View rather than a pass-through, so the `colors` prop each card hands
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
import TQuizModeScreen from '@/app/t/quiz-mode/[slug]';
import { CATEGORY_VISUALS, FALLBACK_VISUAL, SUBCATEGORY_EMOJI } from '@/constants/category-visuals';
import { EruditeColors } from '@/constants/theme';
import { TILE_BADGE_SCRIM, TILE_GRADIENTS } from '@/constants/t/tile-palette';
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

const MODE_IDS = ['mode-random', 'mode-quick', 'mode-timed', 'mode-survival'] as const;

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

/**
 * The style of the pill drawn behind a crown.
 *
 * Walks UP from the icon to the first ancestor carrying a background, rather
 * than hopping a fixed number of `.parent`s: between the two lies the IconSymbol
 * composite plus its host View, so a fixed count breaks the moment that mock or
 * the component's own wrapping changes. Searching for "has a backgroundColor"
 * rather than for the expected VALUE keeps the assertion honest.
 */
function badgePillBehind(crown: { parent: unknown }): Record<string, unknown> {
  let node = crown as { parent: unknown; props?: { style?: unknown } } | null;
  while (node) {
    const style = flatStyle({ props: { style: node.props?.style } });
    if (style.backgroundColor !== undefined) return style;
    node = node.parent as typeof node;
  }
  throw new Error('no ancestor of the crown carries a background colour');
}

/** The `colors` prop of the gradient a card renders. */
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

/** Point fetchCategories at a parent list and a child list. */
function serve(parents: ReturnType<typeof category>[], subs: ReturnType<typeof category>[]) {
  mockFetchCategories.mockImplementation((_slug: string, options?: { parent?: string }) =>
    Promise.resolve(options?.parent ? subs : parents),
  );
}

/** Render and wait for the two-request parent resolution to settle. */
async function renderReady() {
  render(<TQuizModeScreen />);
  await waitFor(() => expect(screen.getByTestId('mode-quick')).toBeTruthy());
}

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { slug: 'geography-capitals' };
  mockThemeValue = null;
  mockIsPremium = false;
  serve([category('geography', 'Geography')], [category('geography-capitals', 'Capitals', 40)]);
});

describe('t quiz-mode — the ported screen still works', () => {
  it('renders the four always-on mode cards', async () => {
    await renderReady();

    for (const id of MODE_IDS) {
      expect(screen.getByTestId(id)).toBeTruthy();
    }
    // Flashcards only appear when the subcategory actually has some.
    expect(screen.queryByTestId('mode-flashcards')).toBeNull();
  });

  it('adds the flashcards card when the subcategory has flashcards', async () => {
    serve(
      [category('geography', 'Geography')],
      [category('geography-capitals', 'Capitals', 40, 12)],
    );
    await renderReady();

    expect(screen.getByTestId('mode-flashcards')).toBeTruthy();
  });

  it('titles the header with the subcategory emoji and name', async () => {
    await renderReady();

    expect(screen.getByText(SUBCATEGORY_EMOJI['geography-capitals'])).toBeTruthy();
    expect(screen.getByText('Capitals')).toBeTruthy();
  });

  it('falls back to the parent emoji when the subcategory has none', async () => {
    mockParams = { slug: 'geography-unlisted' };
    serve([category('geography', 'Geography')], [category('geography-unlisted', 'Unlisted', 40)]);
    await renderReady();

    expect(screen.getByText(CATEGORY_VISUALS.geography.emoji)).toBeTruthy();
  });

  it('disables every card when the subcategory has no questions', async () => {
    serve([category('geography', 'Geography')], [category('geography-capitals', 'Capitals', 0)]);
    await renderReady();

    fireEvent.press(screen.getByTestId('mode-quick'));
    expect(mockPush).not.toHaveBeenCalled();
  });
});

describe('t quiz-mode — the tile does not change colour mid-navigation', () => {
  it('paints the same named ramp the home and category screens painted', async () => {
    await renderReady();

    expect(tileGradientOf('mode-quick')).toEqual(TILE_GRADIENTS.twilight);
    // The ZERO-PIXEL claim, asserted against the live Erudite source rather than
    // against a transcription of it. This closes the browse chain on one ramp.
    expect(tileGradientOf('mode-quick')).toEqual(CATEGORY_VISUALS.geography.gradient);
  });

  it('hands every card the very same tuple, by reference', async () => {
    await renderReady();

    // `toBe`, not `toEqual`: TILE_GRADIENTS is module-level and frozen, so
    // hooks/t/use-tile-gradients.ts promises referential stability with no memo
    // at all. One identity across all four cards is the cheap proof of it.
    const ramps = MODE_IDS.map(tileGradientOf);
    expect(new Set(ramps).size).toBe(1);
    expect(ramps[0]).toBe(TILE_GRADIENTS.twilight);
  });

  it('falls back to the neutral dusk ramp for a parent it has no ramp for', async () => {
    mockParams = { slug: 'cfg-demo-one' };
    serve([category('cfg-demo', 'Demo')], [category('cfg-demo-one', 'One', 40)]);
    await renderReady();

    expect(tileGradientOf('mode-quick')).toEqual(TILE_GRADIENTS.dusk);
    expect(tileGradientOf('mode-quick')).toEqual(FALLBACK_VISUAL.gradient);
  });

  it('paints no card, and a fallback header, while the parent is still unresolved', async () => {
    // The parentSlug === null window. Cards render only under phase 'ready', so
    // nothing takes a gradient here — only the header emoji shows, and it is 📚
    // exactly as the original's `if (!parentSlug) return FALLBACK_VISUAL` gave.
    mockFetchCategories.mockReturnValue(new Promise(() => {}));
    mockParams = { slug: 'unresolved-sub' };
    render(<TQuizModeScreen />);

    expect(screen.queryByTestId('mode-quick')).toBeNull();
    expect(screen.getByText(FALLBACK_VISUAL.emoji)).toBeTruthy();
  });
});

describe('t quiz-mode — the crown reads a token, not the hex it replaced', () => {
  it('draws the crown in the palette gold', async () => {
    await renderReady();

    const crown = within(screen.getByTestId('mode-timed')).getByTestId('icon-crown.fill');
    expect(crown.props.color).toBe(EruditeColors.dark.gold);
  });

  it('follows gold when the palette moves it', async () => {
    // `gold` is NOT in REMOTE_TOKEN_KEYS yet, so no wire payload can produce
    // this palette today — it is hand-built precisely because the bundled gold
    // (#ffd23a) is byte-identical to the literal that was deleted, and without
    // moving it this assertion could not tell a token from a hardcoded hex.
    // When Э1 widens the token set the crown follows for free.
    mockThemeValue = {
      palettes: { dark: { ...OVERRIDDEN_DARK, gold: '#00ff00' }, light: EruditeColors.light },
    };
    await renderReady();

    const crown = within(screen.getByTestId('mode-timed')).getByTestId('icon-crown.fill');
    expect(crown.props.color).toBe('#00ff00');
  });

  it('sits on the tile-artwork scrim, not on the modal-backdrop token', async () => {
    await renderReady();

    const crown = within(screen.getByTestId('mode-timed')).getByTestId('icon-crown.fill');
    const badge = badgePillBehind(crown);
    expect(badge.backgroundColor).toBe(TILE_BADGE_SCRIM);
    // The claim constants/t/tile-palette.ts:188-195 makes: `scrim` is a modal
    // backdrop, purple-tinted and far too weak, and reusing it here would couple
    // badge styling to modal dimming.
    expect(badge.backgroundColor).not.toBe(EruditeColors.dark.scrim);
    expect(badge.backgroundColor).not.toBe(EruditeColors.light.scrim);
  });

  it('shows no crown to a premium player', async () => {
    mockIsPremium = true;
    await renderReady();

    expect(screen.queryByTestId('icon-crown.fill')).toBeNull();
  });
});

describe('t quiz-mode — routes stay inside /t', () => {
  // Full-object equality throughout: the params are what separate a quick run
  // from a survival one, so asserting only the pathname would miss a swap.
  it('starts a quick run on the template quiz with ten questions', async () => {
    await renderReady();

    fireEvent.press(screen.getByTestId('mode-quick'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/t/quiz',
      params: {
        count: '10',
        locale: 'en',
        category: 'geography-capitals',
        mode: 'quick',
        timer: '0',
      },
    });
  });

  it('starts a random run with a single question', async () => {
    await renderReady();

    fireEvent.press(screen.getByTestId('mode-random'));
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: '/t/quiz',
        params: expect.objectContaining({ count: '1', mode: 'quick' }),
      }),
    );
  });

  it('pulls a capped buffer for a survival run', async () => {
    mockIsPremium = true;
    await renderReady();

    fireEvent.press(screen.getByTestId('mode-survival'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/t/quiz',
      params: {
        // min(50, max(20, 40)) — the buffer the original pulled.
        count: '40',
        locale: 'en',
        category: 'geography-capitals',
        mode: 'survival',
        timer: '0',
      },
    });
  });

  it('sends a locked player to the paywall instead of opening the sheet', async () => {
    await renderReady();

    fireEvent.press(screen.getByTestId('mode-timed'));
    // Pins BOTH that the premium gate survived the copy AND that it pitches the
    // TEMPLATE's paywall. '/paywall' would still have "worked" — it is a real
    // screen — by showing the player the Erudite one.
    expect(mockPush).toHaveBeenCalledWith('/t/paywall');
    expect(screen.queryByTestId('timed-count-10')).toBeNull();
  });

  it('opens the sheet for a premium player and starts the picked timed run', async () => {
    mockIsPremium = true;
    await renderReady();

    fireEvent.press(screen.getByTestId('mode-timed'));
    expect(mockPush).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId('timed-count-20'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/t/quiz',
      params: {
        count: '20',
        locale: 'en',
        category: 'geography-capitals',
        mode: 'timed',
        timer: '30',
      },
    });
  });

  it('never pushes the Erudite quiz route', async () => {
    mockIsPremium = true;
    await renderReady();

    for (const id of MODE_IDS) {
      fireEvent.press(screen.getByTestId(id));
    }
    const pathnames = mockPush.mock.calls
      .flat()
      .map((call) => (typeof call === 'string' ? call : (call as { pathname: string }).pathname));
    expect(pathnames.filter((route) => route === '/quiz')).toEqual([]);
  });

  it('goes back rather than navigating home', async () => {
    await renderReady();

    fireEvent.press(screen.getByLabelText('Back'));
    expect(mockBack).toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });
});

describe('t quiz-mode — the backdrop follows the operator palette', () => {
  // ScreenBackground's bgGradient is the ONLY repaint this screen can be asserted
  // on today: every other token it reads (text, textFaint, onAccent) is outside
  // REMOTE_TOKEN_KEYS, so no wire payload can move them yet.
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
