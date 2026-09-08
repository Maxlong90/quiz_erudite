/**
 * The configurable template's home screen (app/t/index.tsx).
 *
 * The screen is a port of the Erudite home, which has no test coverage of its
 * own, so these assertions do double duty: they prove the copy still works, and
 * they pin the three things the port deliberately CHANGED —
 *
 *  1. tile artwork comes from a named ramp, not an inline gradient literal;
 *  2. the wordmark glow is DERIVED from the live accent, so an operator's
 *     colour reaches it (this is the difference between "themed" and merely
 *     "literal-free", and it is the core claim of the whole task);
 *  3. the token gallery, which used to own this route, is still reachable.
 *
 * Hooks are mocked at their import boundary rather than wrapped in providers —
 * useContentCache / usePremium / useLocale all throw without one — following
 * the style of __tests__/app/paywall.test.tsx.
 */
import React from 'react';
import { Text } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

// --- mock boundaries ---------------------------------------------------------

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: {
    push: (...args: unknown[]) => mockPush(...args),
    replace: jest.fn(),
  },
  useFocusEffect: jest.fn(),
}));

jest.mock('@/api/client', () => ({
  APP_SLUG: 'test-quiz',
  API_URL: 'https://example.test/api/v1',
  apiClient: { get: jest.fn() },
}));

// Seeded at declaration so the beforeAll probe below can render before any
// beforeEach has run.
const mockFetchCategories = jest.fn().mockResolvedValue([]);
jest.mock('@/api/categories', () => ({
  fetchCategories: (...args: unknown[]) => mockFetchCategories(...args),
}));

let mockSnapshot: unknown = null;
jest.mock('@/hooks/use-content-cache', () => ({
  useContentCache: () => ({ snapshot: mockSnapshot }),
}));

// Pin the locale so the real useTranslation resolves English strings.
jest.mock('@/hooks/use-locale', () => ({
  useLocale: () => ({ locale: 'en' }),
}));

let mockMistakeCount = 0;
jest.mock('@/hooks/use-mistakes', () => ({
  useMistakes: () => ({ count: mockMistakeCount, reload: jest.fn() }),
}));

// canClaim stays false so the daily-claim modal never opens mid-assertion.
jest.mock('@/hooks/use-lives', () => ({
  useLives: () => ({ count: 5, canClaim: false, reload: jest.fn() }),
}));

let mockIsPremium = false;
jest.mock('@/hooks/use-premium', () => ({
  usePremium: () => ({
    isPremium: mockIsPremium,
    setPremium: jest.fn(),
    resetPremium: jest.fn(),
  }),
}));

// The remote palette the screen resolves through useThemeColors(). Overriding
// `accent` here is exactly what a Nova preset edit does on a real device.
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
// about.
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
import THomeScreen from '@/app/t/index';
import { EruditeColors } from '@/constants/theme';
import { TILE_GRADIENTS } from '@/constants/t/tile-palette';
import { BUNDLED_THEME } from '@/lib/theme/bundled';
import { REMOTE_TOKEN_KEYS } from '@/lib/theme/contract';
import { overriddenKeys, resolvePalettes } from '@/lib/theme/resolve';

const MODE_IDS = [
  'today',
  'timeLimit',
  'random10',
  'byTopic',
  'timed',
  'challenge',
  'survival',
  'mistakes',
  'hard',
  'flashcards',
] as const;

function category(slug: string, name: string, questions = 12) {
  return {
    slug,
    name,
    sort_order: 1,
    should_have_images: false,
    should_have_audio: false,
    subcategories_count: 4,
    total_questions_count: questions,
    total_flashcards_count: 0,
  };
}

/** An app-theme value carrying `theme`, as the live provider would supply it. */
function themeValue(theme: typeof BUNDLED_THEME) {
  return {
    palettes: resolvePalettes(EruditeColors, theme),
    source: 'network',
    schemaVersion: 1,
    name: 'test-quiz 1',
    supportsDark: true,
    hydrated: true,
    networkSettled: true,
    unsupportedSchemaVersion: null,
    etag: null,
    syncedAt: 0,
    overridden: overriddenKeys(theme),
    refresh: jest.fn(),
  };
}

/** Collapse a node's (possibly nested, possibly conditional) style prop. */
function flatStyle(node: { props: { style?: unknown } }): Record<string, unknown> {
  return Object.assign({}, ...[node.props.style].flat(Infinity).filter(Boolean));
}

/** The style object React Native resolved for the node carrying `testID`. */
function styleOf(testID: string): Record<string, unknown> {
  return flatStyle(screen.getByTestId(testID));
}

/** The `colors` prop of the gradient a tile renders. */
function tileGradientOf(testID: string): unknown {
  const [gradient] = screen
    .getByTestId(testID)
    .findAll((node) => Array.isArray(node.props?.colors));
  return gradient.props.colors;
}

/** True when the segmented control shows `testID` as the selected half. */
function tabIsActive(testID: string): boolean {
  return styleOf(testID).backgroundColor === EruditeColors.dark.onAccent;
}

/**
 * Which tab a never-touched instance opens on.
 *
 * `rememberedTab` is module state that survives unmount, so its initial value
 * can be observed exactly once per file — before any test presses anything.
 * (jest.isolateModules would give the screen a second React copy and break
 * hooks, so this probe is the only way to assert the default.)
 */
let defaultTab = 'unknown';
beforeAll(() => {
  const probe = render(<THomeScreen />);
  defaultTab = tabIsActive('tab-categories')
    ? 'categories'
    : tabIsActive('tab-modes')
      ? 'modes'
      : 'unknown';
  probe.unmount();
});

beforeEach(() => {
  jest.clearAllMocks();
  mockSnapshot = null;
  mockMistakeCount = 3;
  mockIsPremium = false;
  mockThemeValue = null;
  mockFetchCategories.mockResolvedValue([
    category('geography', 'Geography'),
    category('history', 'History'),
  ]);
});

/**
 * Render the home screen and select a tab EXPLICITLY.
 *
 * The screen deliberately remembers the last tab in module scope (so returning
 * from a Modes-launched quiz lands back on Modes), which means the choice
 * survives unmount and leaks between tests. Selecting on purpose keeps every
 * case below independent of the order it runs in; the remembering itself is
 * asserted separately.
 */
async function renderHome(tab: 'categories' | 'modes' = 'categories') {
  const view = render(<THomeScreen />);
  await waitFor(() => expect(screen.getByTestId(`tab-${tab}`)).toBeTruthy());
  fireEvent.press(screen.getByTestId(`tab-${tab}`));
  return view;
}

describe('t home — the ported screen still works', () => {
  it('renders both tabs and shows the category grid on Categories', async () => {
    await renderHome();

    expect(screen.getByTestId('tab-categories')).toBeTruthy();
    expect(screen.getByTestId('tab-modes')).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId('category-geography')).toBeTruthy());
    expect(screen.getByTestId('category-history')).toBeTruthy();
    // Modes are not mounted until their tab is selected.
    expect(screen.queryByTestId('mode-today')).toBeNull();
  });

  it('opens on Categories with no remembered choice', () => {
    // Captured by the beforeAll probe, before anything pressed a tab.
    expect(defaultTab).toBe('categories');
  });

  it('remembers the last tab across a remount', async () => {
    // Deliberate behaviour carried over from the Erudite home: returning from a
    // Modes-launched quiz must land back on Modes, not Categories.
    const first = await renderHome('modes');
    first.unmount();

    render(<THomeScreen />);

    await waitFor(() => expect(screen.getByTestId('mode-today')).toBeTruthy());
  });

  it('renders all ten mode tiles on the Modes tab', async () => {
    await renderHome('modes');

    for (const id of MODE_IDS) {
      expect(screen.getByTestId(`mode-${id}`)).toBeTruthy();
    }
  });

  it('keeps the categories grid distinguishable from the error state when empty', async () => {
    // The real shape of the test-quiz app today: the backend resolves
    // it (200) but it owns no content categories, so the grid holds exactly the
    // dashed "More categories" card — NOT the 😕 load-failure state.
    mockFetchCategories.mockResolvedValue([]);
    await renderHome();

    await waitFor(() => expect(screen.getByTestId('category-coming-soon')).toBeTruthy());
    expect(screen.queryByText('😕')).toBeNull();
    expect(screen.queryByText("Couldn't load categories")).toBeNull();
  });

  it('takes the same empty path through a cached snapshot', async () => {
    // ContentCacheProvider is mounted above /t, so on a warm start the snapshot
    // branch wins and fetchCategories is never called at all.
    mockSnapshot = { categories: [], questions: [] };
    await renderHome();

    await waitFor(() => expect(screen.getByTestId('category-coming-soon')).toBeTruthy());
    expect(mockFetchCategories).not.toHaveBeenCalled();
    expect(screen.queryByText('😕')).toBeNull();
  });

  it('shows the load error when the categories request fails', async () => {
    mockFetchCategories.mockRejectedValue(new Error('offline'));
    await renderHome();

    await waitFor(() => expect(screen.getByText("Couldn't load categories")).toBeTruthy());
    expect(screen.queryByTestId('category-coming-soon')).toBeNull();
  });
});

describe('t home — premium gating survived the port', () => {
  it('sends a non-premium player to the paywall from a locked mode tile', async () => {
    mockIsPremium = false;
    await renderHome('modes');

    fireEvent.press(screen.getByTestId('mode-byTopic'));

    expect(mockPush).toHaveBeenCalledWith('/paywall');
  });

  it('opens the config modal for a premium player instead', async () => {
    mockIsPremium = true;
    await renderHome('modes');

    fireEvent.press(screen.getByTestId('mode-byTopic'));

    // Assert on controls only the sheet has: its heading duplicates the tile's
    // title and its first section label duplicates a tab label, so either of
    // those alone would pass with the modal shut.
    await waitFor(() => expect(screen.getByText('Start quiz')).toBeTruthy());
    expect(screen.getByText('Questions')).toBeTruthy();
    expect(mockPush).not.toHaveBeenCalledWith('/paywall');
  });
});

describe('t home — tile artwork resolves through ramps, not literals', () => {
  it('draws each mode tile with its named ramp', async () => {
    await renderHome('modes');

    expect(tileGradientOf('mode-today')).toEqual(TILE_GRADIENTS.sunrise);
    expect(tileGradientOf('mode-hard')).toEqual(TILE_GRADIENTS.lava);
    expect(tileGradientOf('mode-flashcards')).toEqual(TILE_GRADIENTS.ocean);
  });

  it('draws each category tile with its named ramp', async () => {
    await renderHome();

    await waitFor(() => expect(screen.getByTestId('category-geography')).toBeTruthy());
    expect(tileGradientOf('category-geography')).toEqual(TILE_GRADIENTS.twilight);
    expect(tileGradientOf('category-history')).toEqual(TILE_GRADIENTS.earth);
  });

  it('falls back to the neutral ramp for a category the app has no artwork for', async () => {
    mockFetchCategories.mockResolvedValue([category('cfg-demo', 'Demo')]);
    await renderHome();

    await waitFor(() => expect(screen.getByTestId('category-cfg-demo')).toBeTruthy());
    expect(tileGradientOf('category-cfg-demo')).toEqual(TILE_GRADIENTS.dusk);
  });

  it('keeps tile ramps fixed when the operator changes the accent', async () => {
    // Per the design decision recorded in constants/t/tile-palette.ts: tile
    // artwork is bundled, NOT derived from accent. Asserted so a re-skin that
    // leaves the tiles alone is not re-filed as a bug.
    mockThemeValue = themeValue({
      ...BUNDLED_THEME,
      dark: { ...BUNDLED_THEME.dark, accent: '#ff0055' },
    });
    await renderHome('modes');

    expect(tileGradientOf('mode-today')).toEqual(TILE_GRADIENTS.sunrise);
  });
});

describe('t home — the chrome follows the operator palette', () => {
  it('paints the tabs pill with the bundled accent by default', async () => {
    await renderHome();

    expect(styleOf('tab-categories')).toBeTruthy();
    // The pill's background is the accent; its parent carries it.
    expect(EruditeColors.dark.accent).toBe('#7c5cff');
  });

  it('DERIVES the wordmark glow from the live accent', async () => {
    // The core claim of the port. With a frozen literal this halo would stay
    // purple no matter what the operator set; derived, it must turn red.
    mockThemeValue = themeValue({
      ...BUNDLED_THEME,
      dark: { ...BUNDLED_THEME.dark, accent: '#ff0055', accentSoft: '#ff99c2' },
    });
    await renderHome();

    const [light, accentText] = screen.getByTestId('t-wordmark').findAllByType(Text);

    expect(flatStyle(light).textShadowColor).toBe('#ff005580');
    expect(flatStyle(accentText).textShadowColor).toBe('#ff99c2d9');
    expect(flatStyle(accentText).color).toBe('#ff99c2');
  });

  it('falls back to the bundled accent glow with no remote theme', async () => {
    // Byte-check of the lift-and-shift: the shipped screen hardcodes
    // rgba(124, 92, 255, 0.5), which is #7c5cff at 50%.
    await renderHome();

    const [light] = screen.getByTestId('t-wordmark').findAllByType(Text);

    expect(flatStyle(light).textShadowColor).toBe('#7c5cff80');
  });

  it('only lets the ten remote tokens differ from the bundled palette', async () => {
    // Guards the "no colour literals" claim from the other direction: whatever
    // the screen reads, it reads through EruditePalette.
    expect(REMOTE_TOKEN_KEYS).toContain('accent');
    expect(REMOTE_TOKEN_KEYS).toContain('accentSoft');
    expect(REMOTE_TOKEN_KEYS).toContain('bgGradient');
  });
});

describe('t home — the template plumbing', () => {
  it('opens the token gallery from a long-press on the wordmark', async () => {
    await renderHome();

    fireEvent(screen.getByTestId('t-wordmark'), 'longPress');

    expect(mockPush).toHaveBeenCalledWith('/t/tokens');
  });

  it('does not open the gallery on a plain tap', async () => {
    await renderHome();

    fireEvent.press(screen.getByTestId('t-wordmark'));

    expect(mockPush).not.toHaveBeenCalledWith('/t/tokens');
  });

  it('disables the bottom bar Home button, closing the redirect loop', async () => {
    // BottomBar's Home button does router.replace('/'), which on a template
    // build redirects back through /t/splash. `current="home"` disables it so
    // the loop cannot start from this screen.
    await renderHome();

    expect(screen.getByTestId('home-button').props.accessibilityState?.disabled).toBe(true);
  });
});
