/**
 * Integration tests for the quiz screen (app/quiz.tsx) — the behaviors that
 * only exist at the composed component level and can't be reached by a pure
 * unit test:
 *
 *  - PART B premium bypass: an active-premium player NEVER spends a life
 *    (spendLife not called, out-of-lives modal never opens, LivesBar shows ∞)
 *    and NEVER spends a hint (consumeHint not called, HintBar shows ∞ and stays
 *    enabled at a zero count).
 *  - PART D fiftyFifty: using 50/50 leaves EXACTLY two options (the correct one
 *    + one wrong), robust across a 4-option and a 3-option question.
 *  - PART D replaceQuestion: with no eligible candidate the hint flashes the
 *    "unavailable" notice and consumes nothing.
 *  - PART D hard mode: only the replaceQuestion hint is offered (50/50 and
 *    statistics assume multiple-choice options).
 *
 * The real HintBar / LivesBar / QuestionCard / OptionButton and the real quiz
 * reducer + useTranslation (locale pinned to `en`) are exercised; native /
 * visual-only siblings are stubbed at their import boundary. Math.random is
 * pinned so the option shuffle is deterministic (correct answer lands last).
 */
import React from 'react';
import { fireEvent, render, waitFor, within } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- controllable mock state -------------------------------------------------

let mockPremium: boolean | null = false;
let mockLivesCount = 5;
let mockHints: Record<string, number> = { fiftyFifty: 3, statistics: 2, replaceQuestion: 1 };
let mockSnapshot: unknown = null;
let mockParams: Record<string, string> = {};

const mockSpendLife = jest.fn().mockResolvedValue(4);
const mockGetLives = jest.fn().mockResolvedValue(5);
const mockAddLives = jest.fn().mockResolvedValue(6);
const mockConsumeHint = jest.fn().mockResolvedValue(0);
const mockReloadHints = jest.fn();
const mockReloadLives = jest.fn();

// --- module boundaries -------------------------------------------------------

jest.mock('@/hooks/use-premium', () => ({
  usePremium: () => ({ isPremium: mockPremium, setPremium: jest.fn(), resetPremium: jest.fn() }),
}));
jest.mock('@/hooks/use-lives', () => ({
  useLives: () => ({ count: mockLivesCount, canClaim: false, reload: mockReloadLives }),
}));
jest.mock('@/hooks/use-hints', () => ({
  useHintsState: () => ({ state: mockHints, reload: mockReloadHints }),
}));
jest.mock('@/hooks/use-content-cache', () => ({
  useContentCache: () => ({ snapshot: mockSnapshot }),
}));
jest.mock('@/hooks/use-locale', () => ({ useLocale: () => ({ locale: 'en' }) }));
// Pin the theme so useThemeColors and ScreenBackground resolve without a
// ThemePrefProvider wrapping the render.
jest.mock('@/hooks/use-theme-pref', () => ({
  useThemePref: () => ({ theme: 'dark', ready: true, setTheme: jest.fn() }),
}));

jest.mock('@/lib/lives', () => ({
  spendLife: (...a: unknown[]) => mockSpendLife(...a),
  getLives: (...a: unknown[]) => mockGetLives(...a),
  addLives: (...a: unknown[]) => mockAddLives(...a),
}));
jest.mock('@/lib/hints', () => ({
  consumeHint: (...a: unknown[]) => mockConsumeHint(...a),
}));
jest.mock('@/lib/content-cache', () => ({
  resolveLocalImage: (_s: unknown, url: string | null) => url ?? null,
}));
jest.mock('@/lib/mistakes', () => ({
  recordMistake: jest.fn().mockResolvedValue(undefined),
  getMistakeIds: jest.fn().mockResolvedValue([]),
}));
jest.mock('@/lib/quiz-stats', () => ({ recordQuizCompletion: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/lib/achievements', () => ({
  computeProgress: jest.fn(() => []),
  detectUnlocks: jest.fn().mockResolvedValue({ newlyUnlocked: [], pendingLevels: [] }),
  gatherMetrics: jest.fn().mockResolvedValue({}),
  markUnlocksSeen: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/lib/today-question', () => ({ getTodayQuestionId: jest.fn().mockResolvedValue(null) }));
jest.mock('@/api/questions', () => ({ fetchRandomQuestions: jest.fn().mockResolvedValue([]) }));
jest.mock('@/api/client', () => ({ APP_SLUG: 'erudite-quiz' }));

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
jest.mock('@/components/ui/icon-symbol', () => ({ IconSymbol: () => null }));
jest.mock('@/components/quiz/progress-bar', () => ({ ProgressBar: () => null }));
jest.mock('@/components/quiz/quiz-timer', () => ({ QuizTimer: () => null }));
jest.mock('@/components/quiz/report-button', () => ({ ReportButton: () => null }));
jest.mock('@/components/quiz/report-modal', () => ({ ReportModal: () => null }));
jest.mock('@/components/quiz/share-question-button', () => ({ ShareQuestionButton: () => null }));
jest.mock('@/components/lives/buy-lives-modal', () => ({ BuyLivesModal: () => null }));
jest.mock('@/components/quiz/hard-question-card', () => ({ HardQuestionCard: () => null }));
// Keep ThemedText light so QuestionCard/OptionButton render as plain Text.
jest.mock('@/components/themed-text', () => {
  const { Text: RNText } = require('react-native');
  return { ThemedText: (props: Record<string, unknown>) => <RNText {...props} /> };
});
// Surface the out-of-lives modal's visibility so we can assert it never opens.
jest.mock('@/components/quiz/out-of-lives-modal', () => {
  const { View: RNView } = require('react-native');
  return {
    OutOfLivesModal: ({ visible }: { visible: boolean }) =>
      visible ? <RNView testID="out-of-lives-open" /> : null,
  };
});

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  router: { replace: (...a: unknown[]) => mockReplace(...a), push: jest.fn() },
  useLocalSearchParams: () => mockParams,
  useFocusEffect: () => {},
}));

// eslint-disable-next-line import/first -- screen under test must load AFTER its mocks
import QuizScreen from '@/app/quiz';

// --- fixtures ---------------------------------------------------------------

function snapshotWith(question: Record<string, unknown>) {
  return {
    locale: 'en',
    categories: [],
    questions: [question],
    imageMap: {},
  };
}
const FOUR_OPT = {
  id: 1,
  category_slug: 'geo',
  question: 'Capital of France?',
  options: ['Paris', 'Rome', 'Berlin', 'Madrid'],
  correct_option: 0,
  explanation: null,
  image_url: null,
};

/** How many option-<i> buttons are currently enabled (not hidden by 50/50). */
function enabledOptionCount(screen: ReturnType<typeof render>, n: number): number {
  let count = 0;
  for (let i = 0; i < n; i++) {
    const btn = screen.getByTestId(`option-button-${i}`);
    if (!btn.props.accessibilityState?.disabled) count += 1;
  }
  return count;
}

beforeEach(async () => {
  // Cross-session `seen` now persists in tests (babel rewrites the lazy
  // AsyncStorage import), so wipe it between tests or a leaked bucket would
  // filter out questions the pick/replace assertions expect.
  await AsyncStorage.clear();
  mockPremium = false;
  mockLivesCount = 5;
  mockHints = { fiftyFifty: 3, statistics: 2, replaceQuestion: 1 };
  mockSnapshot = snapshotWith(FOUR_OPT);
  mockParams = { count: '1', locale: 'en', mode: 'quick' };
  mockSpendLife.mockClear().mockResolvedValue(4);
  mockGetLives.mockClear().mockResolvedValue(5);
  mockConsumeHint.mockClear().mockResolvedValue(0);
  mockReloadHints.mockClear();
  mockReloadLives.mockClear();
  mockReplace.mockClear();
  // Deterministic shuffles: Math.random === 0 → correct answer lands last.
  jest.spyOn(Math, 'random').mockReturnValue(0);
});

afterEach(() => {
  (Math.random as jest.Mock).mockRestore?.();
});

async function renderQuiz() {
  const screen = render(<QuizScreen />);
  // Wait for loadQuestions to resolve into the playing state.
  await waitFor(() => expect(screen.getByText('Capital of France?')).toBeTruthy());
  return screen;
}

// --- PART B: premium = unlimited --------------------------------------------

describe('premium = unlimited lives (Part B)', () => {
  it('shows ∞ lives and never spends a life on a wrong answer', async () => {
    mockPremium = true;
    const screen = await renderQuiz();

    // LivesBar renders the infinity glyph, not a number.
    expect(within(screen.getByTestId('lives-bar')).getByText('∞')).toBeTruthy();

    // With Math.random=0 the correct option is index 3, so index 0 is wrong.
    fireEvent.press(screen.getByTestId('option-button-0'));

    await waitFor(() => expect(screen.getByTestId('next-button')).toBeTruthy());
    expect(mockSpendLife).not.toHaveBeenCalled();
    expect(screen.queryByTestId('out-of-lives-open')).toBeNull();
  });
});

describe('premium = unlimited hints (Part B)', () => {
  it('keeps hint buttons enabled at a zero count and never consumes', async () => {
    mockPremium = true;
    mockHints = { fiftyFifty: 0, statistics: 0, replaceQuestion: 0 };
    const screen = await renderQuiz();

    const fifty = screen.getByTestId('hint-fiftyFifty');
    // Enabled despite 0 remaining, and the badge shows ∞.
    expect(fifty.props.accessibilityState?.disabled).toBeFalsy();
    expect(within(fifty).getByText('∞')).toBeTruthy();

    fireEvent.press(fifty);
    // Premium spends nothing.
    expect(mockConsumeHint).not.toHaveBeenCalled();
  });
});

describe('non-premium still spends (predicate flips correctly)', () => {
  it('spends a life on a wrong answer and consumes a hint when used', async () => {
    mockPremium = false;
    const screen = await renderQuiz();

    // LivesBar shows the numeric balance, not ∞.
    expect(within(screen.getByTestId('lives-bar')).getByText('5')).toBeTruthy();

    fireEvent.press(screen.getByTestId('hint-fiftyFifty'));
    expect(mockConsumeHint).toHaveBeenCalledWith('fiftyFifty');

    // 50/50 hides indices 0 and 2; option 1 is the surviving WRONG option
    // (correct is index 3 under Math.random=0). A wrong answer spends a life.
    fireEvent.press(screen.getByTestId('option-button-1'));
    await waitFor(() => expect(mockSpendLife).toHaveBeenCalledTimes(1));
  });
});

// --- PART D: fiftyFifty leaves exactly two -----------------------------------

describe('fiftyFifty leaves exactly two options (Part D)', () => {
  it('leaves 2 of 4 options enabled', async () => {
    const screen = await renderQuiz();
    expect(enabledOptionCount(screen, 4)).toBe(4);

    fireEvent.press(screen.getByTestId('hint-fiftyFifty'));

    expect(enabledOptionCount(screen, 4)).toBe(2);
    // The correct option (index 3 under Math.random=0) is one of the survivors.
    expect(screen.getByTestId('option-button-3').props.accessibilityState?.disabled).toBeFalsy();
  });

  it('leaves 2 of 3 options enabled (robust to option count)', async () => {
    mockSnapshot = snapshotWith({
      ...FOUR_OPT,
      options: ['Paris', 'Rome', 'Berlin'],
      correct_option: 0,
    });
    const screen = await renderQuiz();
    expect(enabledOptionCount(screen, 3)).toBe(3);

    fireEvent.press(screen.getByTestId('hint-fiftyFifty'));

    expect(enabledOptionCount(screen, 3)).toBe(2);
  });
});

// --- PART D: replaceQuestion none-available ----------------------------------

describe('replaceQuestion with no candidate (Part D)', () => {
  it('flashes the unavailable notice and consumes nothing', async () => {
    // Snapshot holds ONLY the current question → nothing to swap in.
    const screen = await renderQuiz();

    fireEvent.press(screen.getByTestId('hint-replaceQuestion'));

    await waitFor(() =>
      expect(screen.getByText('No other question to swap in right now.')).toBeTruthy(),
    );
    expect(mockConsumeHint).not.toHaveBeenCalledWith('replaceQuestion');
  });

  it('swaps in a fresh same-topic question and consumes the hint when available', async () => {
    mockSnapshot = {
      locale: 'en',
      categories: [],
      imageMap: {},
      questions: [
        FOUR_OPT,
        {
          id: 2,
          category_slug: 'geo',
          question: 'Largest ocean?',
          options: ['Pacific', 'Atlantic', 'Indian', 'Arctic'],
          correct_option: 0,
          explanation: null,
          image_url: null,
        },
      ],
    };
    // count:1 → the session holds one question. With Math.random=0 the 2-item
    // pool reverses, so "Largest ocean?" is picked first.
    const screen = render(<QuizScreen />);
    await waitFor(() => expect(screen.getByText('Largest ocean?')).toBeTruthy());

    fireEvent.press(screen.getByTestId('hint-replaceQuestion'));

    // Swaps in the other same-topic ('geo') unused question.
    await waitFor(() => expect(screen.getByText('Capital of France?')).toBeTruthy());
    expect(mockConsumeHint).toHaveBeenCalledWith('replaceQuestion');
    // Session integrity: the replaced question is gone (swapped in place).
    expect(screen.queryByText('Largest ocean?')).toBeNull();
  });
});

// --- PART D: hard mode only shows replaceQuestion ----------------------------

describe('hard mode hint bar (Part D)', () => {
  it('offers only the replaceQuestion hint', async () => {
    mockParams = { count: '1', locale: 'en', mode: 'hard', hardVariant: 'typing' };
    mockSnapshot = snapshotWith(FOUR_OPT); // "Paris" is hard-eligible for typing
    const screen = render(<QuizScreen />);

    await waitFor(() => expect(screen.getByTestId('hint-replaceQuestion')).toBeTruthy());
    expect(screen.queryByTestId('hint-fiftyFifty')).toBeNull();
    expect(screen.queryByTestId('hint-statistics')).toBeNull();
  });
});
