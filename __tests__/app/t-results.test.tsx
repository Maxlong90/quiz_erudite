/**
 * app/t/results.tsx — the configurable template's results screen.
 *
 * The shipped app/results.tsx has NO test coverage at all, so this is the first
 * time this screen's seams are pinned anywhere. It covers exactly the three
 * things the port changed, and nothing the copy inherited unchanged:
 *
 *  1. THE SCORE SCALE IS THEMED, not merely literal-free. The shipped screen
 *     paints the ring, the score and the percentage with three hardcoded hexes.
 *     A port that swapped them for `colors.tierMid` and stopped there would pass
 *     the literals guard while still rendering the bundled purple on every
 *     operator preset. So the interesting assertion is the one under an
 *     OVERRIDDEN palette, driven through the real funnel — this suite mocks
 *     use-app-theme and use-theme-pref, never hooks/t/use-template-theme, since
 *     mocking the funnel is mocking the thing under test.
 *  2. "Play again" relaunches /t/quiz with every param round-tripped. Losing one
 *     silently downgrades a survival run to a ten-question quick round.
 *  3. "Home" lands on /t. The shipped screen goes to '/', and on a template
 *     build app/index.tsx redirects '/' to '/t/splash' — so every finished run
 *     used to bounce the player through the splash screen. That is the headline
 *     bug this port fixes, and it is invisible to a mocked-router suite that
 *     only checks "replace was called".
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render, type RenderAPI } from '@testing-library/react-native';

// --- controllable mock state -------------------------------------------------

let mockParams: Record<string, string> = {};
/** null = no operator preset, so useThemeColors falls back to the bundled palette. */
let mockThemeValue: unknown = null;
let mockAppearance: 'dark' | 'light' = 'dark';

const mockReplace = jest.fn();

// --- module boundaries -------------------------------------------------------

jest.mock('expo-router', () => ({
  router: { replace: (...a: unknown[]) => mockReplace(...a), push: jest.fn() },
  useLocalSearchParams: () => mockParams,
  useFocusEffect: () => {},
}));

// The remote-theme seam. Mocking useAppTheme (rather than the funnel) leaves the
// real useThemeColors -> deriveTemplateTheme chain running, which is the only
// way this suite can prove the tier roles actually track a preset.
jest.mock('@/hooks/use-app-theme', () => ({
  ...jest.requireActual('@/hooks/use-app-theme'),
  useAppTheme: () => mockThemeValue,
}));
jest.mock('@/hooks/use-theme-pref', () => ({
  useThemePref: () => ({ theme: mockAppearance, ready: true, setTheme: jest.fn() }),
}));
jest.mock('@/hooks/use-locale', () => ({ useLocale: () => ({ locale: 'en' }) }));
jest.mock('@/hooks/use-content-cache', () => ({ useContentCache: () => ({ snapshot: null }) }));

jest.mock('@/lib/achievements', () => ({
  ACHIEVEMENTS: [],
  computeProgress: jest.fn(() => []),
  gatherMetrics: jest.fn().mockResolvedValue({}),
}));

// reanimated is mocked globally — see __mocks__/react-native-reanimated.js
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('react-native-safe-area-context', () => {
  const ReactModule = require('react');
  const { View: RNView } = require('react-native');
  return {
    SafeAreaView: ({ children, ...props }: { children: React.ReactNode }) =>
      ReactModule.createElement(RNView, props, children),
  };
});
jest.mock('@/components/achievements/achievement-unlock-modal', () => ({
  AchievementUnlockModal: () => null,
}));

/* eslint-disable import/first -- the screen must load AFTER its mocks */
import ResultsScreen from '@/app/t/results';
import { EruditeColors } from '@/constants/theme';
import { deriveTemplateTheme } from '@/hooks/t/use-template-theme';
import { BUNDLED_THEME } from '@/lib/theme/bundled';
import { resolvePalette } from '@/lib/theme/resolve';
/* eslint-enable import/first */

// --- fixtures ---------------------------------------------------------------

/**
 * An operator preset that moves the whole tier scale — accent, success and
 * danger — built through the real overlay. The three are all on the wire since
 * Э1 widened REMOTE_TOKEN_KEYS, so one preset now moves every band.
 */
const PRESET_ACCENT = '#ff0055';
const PRESET_SUCCESS = '#00aa00';
const PRESET_DANGER = '#aa0000';
const OVERRIDDEN_DARK = resolvePalette(EruditeColors.dark, {
  ...BUNDLED_THEME.dark,
  accent: PRESET_ACCENT,
  success: PRESET_SUCCESS,
  danger: PRESET_DANGER,
});

/** score/total pairs that land in each band: >=80, 40..79, <40. */
const BANDS = [
  { tier: 'excellent', score: '9', total: '10', percentage: '90%' },
  { tier: 'good', score: '5', total: '10', percentage: '50%' },
  { tier: 'keepGoing', score: '2', total: '10', percentage: '20%' },
] as const;

function colorOf(screen: RenderAPI, text: string): string | undefined {
  return StyleSheet.flatten(screen.getByText(text).props.style)?.color;
}

beforeEach(() => {
  mockParams = { score: '9', total: '10', count: '10', locale: 'en' };
  mockThemeValue = null;
  mockAppearance = 'dark';
  mockReplace.mockClear();
});

describe('the score scale reads the template tier roles', () => {
  it.each(BANDS)(
    'paints a $tier score with the matching bundled tier',
    ({ score, total, percentage, tier }) => {
      mockParams = { ...mockParams, score, total };
      const screen = render(<ResultsScreen />);

      const bundled = deriveTemplateTheme(EruditeColors.dark);
      const expected =
        tier === 'excellent'
          ? bundled.tierHigh
          : tier === 'good'
            ? bundled.tierMid
            : bundled.tierLow;

      expect(colorOf(screen, percentage)).toBe(expected);
      expect(colorOf(screen, score)).toBe(expected);
    },
  );

  it('moves the middle band with an operator preset', () => {
    // THE assertion of this file. Literal-free is not the goal; repainting is.
    mockThemeValue = { palettes: { dark: OVERRIDDEN_DARK, light: EruditeColors.light } };
    mockParams = { ...mockParams, score: '5', total: '10' };

    const screen = render(<ResultsScreen />);
    expect(colorOf(screen, '50%')).toBe(PRESET_ACCENT);
    expect(colorOf(screen, '5')).toBe(PRESET_ACCENT);
  });

  it('moves the outer bands with an operator preset', () => {
    // Since Э1 widened REMOTE_TOKEN_KEYS, success and danger are on the wire and
    // a preset moves the whole traffic-light scale — this used to be pinned as
    // "the outer bands stay bundled", and the widening turned that pin into this
    // repaint assertion.
    mockThemeValue = { palettes: { dark: OVERRIDDEN_DARK, light: EruditeColors.light } };

    const high = render(<ResultsScreen />);
    expect(colorOf(high, '90%')).toBe(PRESET_SUCCESS);

    mockParams = { ...mockParams, score: '2' };
    const low = render(<ResultsScreen />);
    expect(colorOf(low, '20%')).toBe(PRESET_DANGER);
  });

  it('follows the appearance preference', () => {
    // success differs between appearances (#22c55e vs #16a34a), so this proves
    // the scale is read per-render from the palette rather than captured once.
    mockAppearance = 'light';
    const screen = render(<ResultsScreen />);
    expect(colorOf(screen, '90%')).toBe(EruditeColors.light.success);
  });

  it('never paints one of the three hexes it replaced', () => {
    // The shipped scale, for the record: #22c55e / #f59e0b / #ef4444. The amber
    // has no palette equivalent and is deliberately gone (see the funnel hook's
    // docblock); this pins that it did not creep back in as a fallback.
    mockThemeValue = { palettes: { dark: OVERRIDDEN_DARK, light: EruditeColors.light } };
    mockParams = { ...mockParams, score: '5' };
    expect(colorOf(render(<ResultsScreen />), '50%')).not.toBe('#f59e0b');
  });
});

describe('the results screen stays inside /t', () => {
  it('sends Home to /t rather than /', () => {
    // '/' would redirect to /t/splash on a template build, so the player would
    // watch the splash animation on the way back from every finished run.
    fireEvent.press(render(<ResultsScreen />).getByTestId('results-home'));
    expect(mockReplace).toHaveBeenCalledWith('/t');
  });

  it('replays into /t/quiz rather than the erudite quiz', () => {
    fireEvent.press(render(<ResultsScreen />).getByTestId('results-play-again'));
    expect(mockReplace).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: '/t/quiz' }),
    );
  });

  it('round-trips every param needed to relaunch the same run', () => {
    // Dropping one does not fail loudly — it silently downgrades a timed
    // survival run into a plain ten-question quick quiz.
    mockParams = {
      score: '7',
      total: '10',
      count: '10',
      locale: 'fr',
      category: 'geography',
      categorySlugs: 'geography,history',
      mode: 'survival',
      timer: '30',
      totalSeconds: '600',
      source: 'mistakes',
      hardVariant: 'letters',
    };

    fireEvent.press(render(<ResultsScreen />).getByTestId('results-play-again'));

    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/t/quiz',
      params: {
        count: '10',
        locale: 'fr',
        category: 'geography',
        categorySlugs: 'geography,history',
        mode: 'survival',
        timer: '30',
        totalSeconds: '600',
        source: 'mistakes',
        hardVariant: 'letters',
      },
    });
  });

  it('omits the optional params it was not given', () => {
    // The spread is conditional; passing `undefined` through would turn a quick
    // quiz into one with a `mode=undefined` string param on the next screen.
    fireEvent.press(render(<ResultsScreen />).getByTestId('results-play-again'));
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/t/quiz',
      params: { count: '10', locale: 'en' },
    });
  });
});
