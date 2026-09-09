/**
 * app/t/stats.tsx — the configurable template's stats screen.
 *
 * The shipped app/stats.tsx has no test coverage of its own, so this suite does
 * double duty: it proves the copy still renders, and it pins the ONE thing the
 * port deliberately changed —
 *
 *  THE ACCURACY SCALE IS THEMED, not merely literal-free. The shipped row paints
 *  its value with one of three hardcoded hexes. A port that swapped them for
 *  `colors.tierMid` and stopped there would satisfy the literals guard while
 *  still rendering the bundled purple under every operator preset. So the
 *  interesting assertion is the one under an OVERRIDDEN palette, driven through
 *  the real funnel: this suite mocks use-app-theme and use-theme-pref, NEVER
 *  hooks/t/use-template-theme, because mocking the funnel is mocking the thing
 *  under test.
 *
 * This is also the second consumer of the tier scale — app/t/results.tsx was the
 * first — which is what makes the funnel hook's "two or more screens" rule a fact
 * rather than an intention. t-results.test.tsx pins the other half.
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen, waitFor, type RenderAPI } from '@testing-library/react-native';

// --- controllable mock state -------------------------------------------------

/** null = no operator preset, so useThemeColors falls back to the bundled palette. */
let mockThemeValue: unknown = null;
let mockAppearance: 'dark' | 'light' = 'dark';

interface StatsFixture {
  quizzesTaken: number;
  totalSeconds: number;
  totalQuestions: number;
  totalCorrect: number;
  perfectQuizzes: number;
}
let mockStats: StatsFixture;
let mockStatsRejects = false;

// --- module boundaries -------------------------------------------------------

jest.mock('expo-router', () => {
  const ReactModule = require('react');
  return {
    router: { push: jest.fn(), replace: jest.fn() },
    // The REAL hook runs its callback on focus and on every change of the
    // callback's identity. app/t/stats.tsx does ALL of its loading in there, so
    // the bare `jest.fn()` stub the other /t suites use would render only the
    // empty state and every tier assertion below would have nothing to address.
    // The screen wraps its callback in useCallback(fn, [snapshot]), so with a
    // constant snapshot this fires exactly once.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useFocusEffect: (effect: () => undefined | (() => void)) =>
      // eslint-disable-next-line react-hooks/rules-of-hooks
      ReactModule.useEffect(effect, [effect]),
  };
});

// The remote-theme seam. Mocking useAppTheme (rather than the funnel) leaves the
// real useThemeColors -> deriveTemplateTheme chain running, which is the only way
// this suite can prove the tier roles actually track a preset.
jest.mock('@/hooks/use-app-theme', () => ({
  ...jest.requireActual('@/hooks/use-app-theme'),
  useAppTheme: () => mockThemeValue,
}));
jest.mock('@/hooks/use-theme-pref', () => ({
  useThemePref: () => ({ theme: mockAppearance, ready: true, setTheme: jest.fn() }),
}));
jest.mock('@/hooks/use-locale', () => ({ useLocale: () => ({ locale: 'en' }) }));

// A null snapshot keeps `subjects` empty, so the only thing holding `isEmpty`
// false is a non-zero quizzesTaken from the stats fixture below.
jest.mock('@/hooks/use-content-cache', () => ({ useContentCache: () => ({ snapshot: null }) }));

// The t-scoped BottomBar this screen renders calls usePremium(), and there is no
// PremiumProvider in the test tree — without this every render throws.
jest.mock('@/hooks/use-premium', () => ({
  usePremium: () => ({ isPremium: false, setPremium: jest.fn(), resetPremium: jest.fn() }),
}));

jest.mock('@/lib/quiz-stats', () => ({
  getStats: () =>
    mockStatsRejects ? Promise.reject(new Error('storage unavailable')) : Promise.resolve(mockStats),
  getAllSeenIds: () => Promise.resolve(new Set<number>()),
}));
jest.mock('@/lib/mistakes', () => ({ getMistakeIds: () => Promise.resolve([]) }));
jest.mock('@/lib/achievements', () => ({
  ACHIEVEMENTS: [],
  computeProgress: jest.fn(() => []),
  gatherMetrics: jest.fn().mockResolvedValue({}),
}));

jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
// A plain View rather than a `({children}) => children` pass-through: the latter
// DROPS props.colors, which would make any gradient assertion pass vacuously.
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
jest.mock('@/components/ui/icon-symbol', () => {
  const { View } = require('react-native');
  const ReactModule = require('react');
  return {
    IconSymbol: (props: { name: string }) =>
      ReactModule.createElement(View, { ...props, testID: `icon-${props.name}` }),
  };
});

/* eslint-disable import/first -- the screen must load AFTER its mocks */
import TStatsScreen from '@/app/t/stats';
import { EruditeColors } from '@/constants/theme';
import { deriveTemplateTheme } from '@/hooks/t/use-template-theme';
import { BUNDLED_THEME } from '@/lib/theme/bundled';
import { resolvePalette } from '@/lib/theme/resolve';
/* eslint-enable import/first */

// --- fixtures ---------------------------------------------------------------

/** An operator preset that moves the accent, built through the real overlay. */
const PRESET_ACCENT = '#ff0055';
const OVERRIDDEN_DARK = resolvePalette(EruditeColors.dark, {
  ...BUNDLED_THEME.dark,
  accent: PRESET_ACCENT,
});

function preset() {
  return { palettes: { dark: OVERRIDDEN_DARK, light: EruditeColors.light } };
}

/**
 * correct/total pairs landing in each band: >=70, 40..69, <40.
 *
 * Every total is 100 so the rendered percentage never collides with another Row's
 * value — quizzesTaken is 12 and the mistake count is 0, so `85%` / `50%` / `20%`
 * are each a single node. getByText throws on a duplicate.
 */
const BANDS = [
  { band: 'high', totalCorrect: 85, percentage: '85%' },
  { band: 'mid', totalCorrect: 50, percentage: '50%' },
  { band: 'low', totalCorrect: 20, percentage: '20%' },
] as const;

function statsWith(totalCorrect: number): StatsFixture {
  return {
    quizzesTaken: 12,
    totalSeconds: 600,
    totalQuestions: 100,
    totalCorrect,
    perfectQuizzes: 0,
  };
}

function colorOf(api: RenderAPI, text: string): string | undefined {
  return StyleSheet.flatten(api.getByText(text).props.style)?.color;
}

/** Render and wait for the focus effect's Promise.all to land. */
async function renderReady(percentage: string): Promise<RenderAPI> {
  const api = render(<TStatsScreen />);
  await waitFor(() => expect(api.getByText(percentage)).toBeTruthy());
  return api;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockThemeValue = null;
  mockAppearance = 'dark';
  mockStatsRejects = false;
  mockStats = statsWith(85);
});

describe('the accuracy scale reads the template tier roles', () => {
  it.each(BANDS)('paints a $band accuracy with the matching bundled tier', async ({
    band,
    totalCorrect,
    percentage,
  }) => {
    mockStats = statsWith(totalCorrect);
    const api = await renderReady(percentage);

    const bundled = deriveTemplateTheme(EruditeColors.dark);
    const expected =
      band === 'high' ? bundled.tierHigh : band === 'mid' ? bundled.tierMid : bundled.tierLow;

    expect(colorOf(api, percentage)).toBe(expected);
  });

  it('moves the middle band with an operator preset', async () => {
    // THE assertion of this file. Literal-free is not the goal; repainting is.
    mockThemeValue = preset();
    mockStats = statsWith(50);

    expect(colorOf(await renderReady('50%'), '50%')).toBe(PRESET_ACCENT);
  });

  it('leaves the outer bands bundled, because success and danger are not settable yet', async () => {
    // Only ten tokens are in REMOTE_TOKEN_KEYS today and success/danger are not
    // among them, so a preset moves the middle band alone. The asymmetry is
    // expected until Э1 widens the token set — pinned here so that widening shows
    // up as a deliberate change to this test rather than a surprise.
    mockThemeValue = preset();

    expect(colorOf(await renderReady('85%'), '85%')).toBe(EruditeColors.dark.success);

    mockStats = statsWith(20);
    expect(colorOf(await renderReady('20%'), '20%')).toBe(EruditeColors.dark.danger);
  });

  it('follows the appearance preference', async () => {
    // success differs between appearances (#22c55e vs #16a34a), so this proves
    // the scale is read per-render from the palette rather than captured once.
    mockAppearance = 'light';

    expect(colorOf(await renderReady('85%'), '85%')).toBe(EruditeColors.light.success);
  });

  it('never paints one of the three hexes it replaced', async () => {
    // The shipped scale, for the record: #22c55e / #f59e0b / #ef4444. The amber
    // has no palette equivalent and is deliberately gone (see the funnel hook's
    // docblock); this pins that it did not creep back in as a fallback.
    mockThemeValue = preset();
    mockStats = statsWith(50);

    expect(colorOf(await renderReady('50%'), '50%')).not.toBe('#f59e0b');
  });
});

describe('the ported screen still renders both of its states', () => {
  it('shows the loaded totals rather than the empty state', async () => {
    // Guards against the useFocusEffect mock above being the only thing this file
    // really tests: if the callback stopped firing, every tier assertion would
    // fail on a missing node and this would explain why.
    const api = await renderReady('85%');

    expect(api.getByText('Quiz stats')).toBeTruthy();
    expect(api.getByText('12')).toBeTruthy();
    expect(api.getByText('10:00')).toBeTruthy();
    expect(api.getByText('6s')).toBeTruthy();
    expect(api.getByText('85 / 100')).toBeTruthy();
    expect(api.queryByText('No stats yet')).toBeNull();
  });

  it('falls back to the empty state when nothing has been played', async () => {
    mockStats = { ...statsWith(0), quizzesTaken: 0, totalQuestions: 0, totalSeconds: 0 };

    render(<TStatsScreen />);
    await waitFor(() => expect(screen.getByText('No stats yet')).toBeTruthy());
    expect(screen.queryByText('Accuracy')).toBeNull();
  });

  it('renders the empty state when the load rejects', async () => {
    // The screen's .catch is a documented "empty state will render" path, not a
    // crash — an unreadable AsyncStorage must not take the screen down.
    mockStatsRejects = true;

    render(<TStatsScreen />);
    await waitFor(() => expect(screen.getByText('No stats yet')).toBeTruthy());
  });
});
