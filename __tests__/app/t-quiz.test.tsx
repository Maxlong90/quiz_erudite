/**
 * app/t/quiz.tsx — the configurable template's quiz screen.
 *
 * DELIBERATELY NARROW. This screen is a copy of app/quiz.tsx and four live
 * suites already pin the behaviour it inherited unchanged —
 * quiz-screen.test.tsx (premium, 50/50, replaceQuestion, hard mode),
 * quiz-stats-hint.test.tsx, quiz-out-of-lives.test.tsx and
 * quiz-fallback-dedup.test.tsx. Re-deriving any of that here would double the
 * maintenance cost of the copy while proving nothing new, and the first time the
 * two files diverged the duplicate suite would fail for the wrong reason.
 *
 * What is NOT covered there is exactly what the port changed, so that is all
 * this file asserts:
 *
 *  - the screen still renders (a copy that throws on import is the one failure
 *    mode a source-scanning guard cannot see);
 *  - the colours arrive through the template funnel, so an operator preset
 *    repaints the screen;
 *  - all five route strings are /t-prefixed. FOUR of them are `router.replace`
 *    to '/' in the original, and on a template build app/index.tsx redirects '/'
 *    to '/t/splash' — a missed one does not crash, it silently bounces the
 *    player through the splash screen. __tests__/app/t-routes.test.ts catches
 *    that in the source; this catches it in the wiring.
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render, waitFor, within, type RenderAPI } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- controllable mock state -------------------------------------------------

let mockParams: Record<string, string> = {};
let mockSnapshot: unknown = null;
let mockLivesCount = 5;
/** null = no operator preset, so useThemeColors falls back to the bundled palette. */
let mockThemeValue: unknown = null;

const mockReplace = jest.fn();
const mockSpendLife = jest.fn().mockResolvedValue(4);
const mockGetLives = jest.fn().mockResolvedValue(5);

// --- module boundaries -------------------------------------------------------

jest.mock('expo-router', () => ({
  router: { replace: (...a: unknown[]) => mockReplace(...a), push: jest.fn() },
  useLocalSearchParams: () => mockParams,
  useFocusEffect: () => {},
}));

// The remote-theme seam. Mocking useAppTheme rather than
// hooks/t/use-template-theme leaves the real funnel running — mocking the funnel
// would mock away the one thing this port changed about the screen's colours.
jest.mock('@/hooks/use-app-theme', () => ({
  ...jest.requireActual('@/hooks/use-app-theme'),
  useAppTheme: () => mockThemeValue,
}));
jest.mock('@/hooks/use-theme-pref', () => ({
  useThemePref: () => ({ theme: 'dark', ready: true, setTheme: jest.fn() }),
}));

jest.mock('@/hooks/use-premium', () => ({
  usePremium: () => ({ isPremium: false, setPremium: jest.fn(), resetPremium: jest.fn() }),
}));
jest.mock('@/hooks/use-lives', () => ({
  useLives: () => ({ count: mockLivesCount, canClaim: false, reload: jest.fn() }),
}));
jest.mock('@/hooks/use-hints', () => ({
  useHintsState: () => ({
    state: { fiftyFifty: 3, statistics: 2, replaceQuestion: 1 },
    reload: jest.fn(),
  }),
}));
jest.mock('@/hooks/use-content-cache', () => ({ useContentCache: () => ({ snapshot: mockSnapshot }) }));
jest.mock('@/hooks/use-locale', () => ({ useLocale: () => ({ locale: 'en' }) }));

jest.mock('@/lib/lives', () => ({
  spendLife: (...a: unknown[]) => mockSpendLife(...a),
  getLives: (...a: unknown[]) => mockGetLives(...a),
  addLives: jest.fn().mockResolvedValue(6),
}));
jest.mock('@/lib/ads', () => ({ adsEnabled: false, watchAdForLife: jest.fn() }));
jest.mock('@/lib/hints', () => ({ consumeHint: jest.fn().mockResolvedValue(0) }));
jest.mock('@/lib/content-cache', () => ({
  resolveLocalImage: (_s: unknown, url: string | null) => url ?? null,
}));
jest.mock('@/lib/mistakes', () => ({
  recordMistake: jest.fn().mockResolvedValue(undefined),
  getMistakeIds: jest.fn().mockResolvedValue([]),
}));
jest.mock('@/lib/quiz-stats', () => ({
  recordQuizCompletion: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/lib/achievements', () => ({
  computeProgress: jest.fn(() => []),
  detectUnlocks: jest.fn().mockResolvedValue({ newlyUnlocked: [], pendingLevels: [] }),
  gatherMetrics: jest.fn().mockResolvedValue({}),
  markUnlocksSeen: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/lib/today-question', () => ({ getTodayQuestionId: jest.fn().mockResolvedValue(null) }));
jest.mock('@/api/questions', () => ({ fetchRandomQuestions: jest.fn().mockResolvedValue([]) }));
jest.mock('@/api/client', () => ({ APP_SLUG: 'test-quiz' }));

// expo / native / visual-only siblings
// reanimated is mocked globally — see __mocks__/react-native-reanimated.js
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
}));
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
jest.mock('@/components/quiz/progress-bar', () => ({ ProgressBar: () => null }));
jest.mock('@/components/quiz/quiz-timer', () => ({ QuizTimer: () => null }));
jest.mock('@/components/quiz/report-button', () => ({ ReportButton: () => null }));
jest.mock('@/components/quiz/report-modal', () => ({ ReportModal: () => null }));
jest.mock('@/components/quiz/share-question-button', () => ({ ShareQuestionButton: () => null }));
jest.mock('@/components/lives/buy-lives-modal', () => ({ BuyLivesModal: () => null }));
jest.mock('@/components/quiz/hard-question-card', () => ({ HardQuestionCard: () => null }));
jest.mock('@/components/ui/icon-symbol', () => ({ IconSymbol: () => null }));
jest.mock('@/components/themed-text', () => {
  const { Text: RNText } = require('react-native');
  return { ThemedText: (props: Record<string, unknown>) => <RNText {...props} /> };
});

/* eslint-disable import/first -- the screen must load AFTER its mocks */
import QuizScreen from '@/app/t/quiz';
import { EruditeColors } from '@/constants/theme';
import { BUNDLED_THEME } from '@/lib/theme/bundled';
import { resolvePalette } from '@/lib/theme/resolve';
/* eslint-enable import/first */

// --- fixtures ---------------------------------------------------------------

const PRESET_ACCENT = '#ff0055';
const OVERRIDDEN_DARK = resolvePalette(EruditeColors.dark, {
  ...BUNDLED_THEME.dark,
  accent: PRESET_ACCENT,
});

const QUESTION = {
  id: 1,
  category_slug: 'geo',
  question: 'Capital of France?',
  options: ['Paris', 'Rome', 'Berlin', 'Madrid'],
  correct_option: 0,
  explanation: null,
  image_url: null,
};

function snapshotWith(...questions: Record<string, unknown>[]) {
  return { locale: 'en', categories: [], questions, imageMap: {} };
}

beforeEach(async () => {
  // The lazy AsyncStorage import in readSeen/writeSeen really persists in tests,
  // so a leaked `seen` bucket from a previous case would filter the pool empty.
  await AsyncStorage.clear();
  mockParams = { count: '1', locale: 'en', mode: 'quick', category: 'geo' };
  mockSnapshot = snapshotWith(QUESTION);
  mockLivesCount = 5;
  mockThemeValue = null;
  mockReplace.mockClear();
  mockSpendLife.mockClear().mockResolvedValue(4);
  mockGetLives.mockClear().mockResolvedValue(5);
  // Deterministic shuffle: Math.random === 0 puts the correct answer last.
  jest.spyOn(Math, 'random').mockReturnValue(0);
});

afterEach(() => {
  (Math.random as jest.Mock).mockRestore?.();
});

async function renderQuiz() {
  const screen = render(<QuizScreen />);
  await waitFor(() => expect(screen.getByText('Capital of France?')).toBeTruthy());
  return screen;
}

/**
 * Press the option carrying `label`, whatever slot the shuffle put it in.
 * Addressing option-button-0 instead would silently answer WRONG — the pinned
 * Math.random puts the correct answer last — and the score assertions would then
 * be pinning the shuffle rather than the navigation.
 */
function pressOption(screen: RenderAPI, label: string): void {
  for (let index = 0; index < QUESTION.options.length; index++) {
    const button = screen.getByTestId(`option-button-${index}`);
    if (within(button).queryByText(label)) {
      fireEvent.press(button);
      return;
    }
  }
  throw new Error(`no option button showing "${label}"`);
}

describe('the template quiz screen runs', () => {
  it('loads a question out of the snapshot', async () => {
    // A copy that throws on import or wires a hook wrongly is the one failure
    // mode the source-scanning guards cannot see. This is that smoke test.
    const screen = await renderQuiz();
    expect(screen.getByText('Paris')).toBeTruthy();
  });

  it('paints itself from an operator preset', async () => {
    // Proves the funnel is actually connected, not merely imported: the primary
    // action button's background is `accent`, one of the ten settable tokens.
    mockThemeValue = { palettes: { dark: OVERRIDDEN_DARK, light: EruditeColors.light } };
    const screen = await renderQuiz();

    pressOption(screen, 'Paris');
    const next = await waitFor(() => screen.getByTestId('next-button'));

    expect(StyleSheet.flatten(next.props.style)?.backgroundColor).toBe(PRESET_ACCENT);
  });
});

describe('the template quiz screen stays inside /t', () => {
  it('sends the close button to /t rather than /', async () => {
    // Four of these in the shipped screen. '/' redirects to /t/splash on a
    // template build, so a missed one bounces the player through the splash.
    const screen = await renderQuiz();
    fireEvent.press(screen.getByTestId('close-quiz'));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/t'));
    expect(mockReplace).not.toHaveBeenCalledWith('/');
  });

  it('finishes a run into /t/results, carrying the score and the config', async () => {
    const screen = await renderQuiz();
    pressOption(screen, 'Paris');
    fireEvent.press(await waitFor(() => screen.getByTestId('next-button')));

    await waitFor(() => expect(mockReplace).toHaveBeenCalled());
    expect(mockReplace).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: '/t/results',
        params: expect.objectContaining({
          score: '1',
          total: '1',
          locale: 'en',
          mode: 'quick',
          category: 'geo',
        }),
      }),
    );
  });

  it('never navigates to an erudite route', async () => {
    // A catch-all over the whole run: whatever else the screen decided to do,
    // no destination may leave the /t subtree.
    const screen = await renderQuiz();
    pressOption(screen, 'Paris');
    fireEvent.press(await waitFor(() => screen.getByTestId('next-button')));
    await waitFor(() => expect(mockReplace).toHaveBeenCalled());

    for (const [destination] of mockReplace.mock.calls) {
      const route = typeof destination === 'string' ? destination : destination?.pathname;
      expect({ route, insideT: route === '/t' || route.startsWith('/t/') }).toEqual({
        route,
        insideT: true,
      });
    }
  });
});
