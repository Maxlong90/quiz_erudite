/**
 * Integration tests for the real-player-statistics wiring in the quiz screen
 * (app/quiz.tsx + lib/answer-stats.ts, task #590). These cover behaviors that
 * only exist at the composed screen level:
 *
 *  - Answering a question ENQUEUES an anonymous {question_id, option_index}
 *    into the persisted queue ('answers.queue.v1'), reported in the backend's
 *    CANONICAL option order even though options are shuffled per session.
 *  - The statistics hint renders REAL percentages when the question is cached
 *    ('question.stats.v1'), mapped back onto the shuffled display order and
 *    kept honest (no 40–60% shaping of the correct option).
 *  - The statistics hint FALLS BACK to the generated distribution when the
 *    question isn't cached.
 *
 * The REAL lib/answer-stats module and the in-memory AsyncStorage mock are
 * exercised end-to-end (no network — apiClient is mocked). The quiz option
 * shuffle is pinned via Math.random so the display order is deterministic.
 */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- controllable mock state -------------------------------------------------

let mockSnapshot: unknown = null;
let mockParams: Record<string, string> = {};

// --- module boundaries (mirror quiz-screen.test.tsx) -------------------------

jest.mock('@/hooks/use-premium', () => ({
  usePremium: () => ({ isPremium: false, setPremium: jest.fn(), resetPremium: jest.fn() }),
}));
jest.mock('@/hooks/use-lives', () => ({
  useLives: () => ({ count: 5, canClaim: false, reload: jest.fn() }),
}));
jest.mock('@/hooks/use-hints', () => ({
  useHintsState: () => ({ state: { fiftyFifty: 3, statistics: 2, replaceQuestion: 1 }, reload: jest.fn() }),
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
  spendLife: jest.fn().mockResolvedValue(4),
  getLives: jest.fn().mockResolvedValue(5),
  addLives: jest.fn().mockResolvedValue(6),
}));
jest.mock('@/lib/hints', () => ({ consumeHint: jest.fn().mockResolvedValue(0) }));
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
// The real lib/answer-stats runs; only the network client is stubbed.
jest.mock('@/api/client', () => ({
  APP_SLUG: 'erudite-quiz',
  apiClient: { post: jest.fn().mockResolvedValue({ data: { accepted: 1 } }), get: jest.fn() },
}));

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
jest.mock('@/components/themed-text', () => {
  const { Text: RNText } = require('react-native');
  return { ThemedText: (props: Record<string, unknown>) => <RNText {...props} /> };
});
jest.mock('@/components/quiz/out-of-lives-modal', () => ({ OutOfLivesModal: () => null }));

jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => mockParams,
  useFocusEffect: () => {},
}));

// eslint-disable-next-line import/first -- screen under test must load AFTER its mocks
import QuizScreen from '@/app/quiz';

// --- fixtures ---------------------------------------------------------------

const FOUR_OPT = {
  id: 1,
  category_slug: 'geo',
  question: 'Capital of France?',
  options: ['Paris', 'Rome', 'Berlin', 'Madrid'],
  correct_option: 0,
  explanation: null,
  image_url: null,
};

function snapshotWith(question: Record<string, unknown>) {
  return { locale: 'en', categories: [], questions: [question], imageMap: {} };
}

const QUEUE_KEY = 'answers.queue.v1';
const CACHE_KEY = 'question.stats.v1';

async function readQueue(): Promise<{ question_id: number; option_index: number }[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? JSON.parse(raw).events : [];
}

beforeEach(async () => {
  await AsyncStorage.clear();
  mockSnapshot = snapshotWith(FOUR_OPT);
  mockParams = { count: '1', locale: 'en', mode: 'quick' };
  // Math.random=0 → Fisher–Yates always picks j=0, giving order [1,2,3,0].
  // So the display order is [Rome, Berlin, Madrid, Paris], optionOrder =
  // [1,2,3,0], and "Paris" (canonical index 0, the correct answer) is shown
  // last at display index 3.
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

// --- reporting ---------------------------------------------------------------

describe('answer reporting enqueues in canonical option order', () => {
  it('translates the tapped display index back to the backend option index', async () => {
    const screen = await renderQuiz();
    // Tap display index 3 — under optionOrder [1,2,3,0] that is "Paris", the
    // CANONICAL option 0. The queue must store option_index 0, not 3.
    fireEvent.press(screen.getByTestId('option-button-3'));

    await waitFor(async () => {
      const queue = await readQueue();
      expect(queue).toEqual([{ question_id: 1, option_index: 0 }]);
    });
  });

  it('reports a wrong pick with its canonical index too', async () => {
    const screen = await renderQuiz();
    // Display index 0 is "Rome" = canonical option 1 (optionOrder[0] = 1).
    fireEvent.press(screen.getByTestId('option-button-0'));

    await waitFor(async () => {
      const queue = await readQueue();
      expect(queue).toEqual([{ question_id: 1, option_index: 1 }]);
    });
  });
});

// --- statistics hint: real vs generated -------------------------------------

describe('statistics hint uses REAL cached data', () => {
  it('renders honest real percentages mapped onto the shuffled display order', async () => {
    // Canonical counts for question 1: Paris(0)=10, Rome(1)=70, Berlin(2)=20,
    // Madrid(3)=0. Display order is [Rome, Berlin, Madrid, Paris], so the
    // bars must read [70, 20, 0, 10]. Note Paris (the CORRECT option) shows
    // its honest 10% — NOT a 40–60% generated share.
    await AsyncStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        locale: 'en',
        fetchedAt: 0,
        threshold: 30,
        stats: { 1: { total: 100, counts: [10, 70, 20, 0] } },
      }),
    );
    const screen = await renderQuiz();

    fireEvent.press(screen.getByTestId('hint-statistics'));

    // Percentages render as "N%" text; assert the honest real values appear
    // and the correct option (Paris) is not forced into 40–60%.
    await waitFor(() => expect(screen.getByText('70%')).toBeTruthy());
    expect(screen.getByText('20%')).toBeTruthy();
    expect(screen.getByText('10%')).toBeTruthy();
    expect(screen.queryByText('45%')).toBeNull(); // the generated correct-share
  });
});

describe('statistics hint FALLS BACK to generated data', () => {
  it('shows the deterministic generated distribution when uncached', async () => {
    // No cache seeded → generateStatsForQuestion(id=1) runs. Seeded by id=1
    // it yields a correct-option share of 45% (deterministic).
    const screen = await renderQuiz();

    fireEvent.press(screen.getByTestId('hint-statistics'));

    await waitFor(() => expect(screen.getByText('45%')).toBeTruthy());
  });
});
