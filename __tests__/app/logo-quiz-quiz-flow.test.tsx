/**
 * Integration tests for the reworked Logo Quiz answer flow (app/logo-quiz/quiz.tsx).
 *
 * The Victory/result screen is no longer an interstitial between questions: a
 * correct answer now reveals in place (wrong options fade, the green answer glides
 * up, then an Explanation panel + a "Next" button appear) and only the LAST
 * question — or a game over — navigates to /logo-quiz/result. These tests lock in
 * the branch logic that lives at the composed-component level:
 *
 *  - a correct pick runs the economy (awardCorrect / setProgress / markCompleted)
 *    and shows the reveal WITHOUT navigating away;
 *  - "Next" on a non-last question advances in place (no navigation);
 *  - "Next" on a real-run last question opens Victory (outcome 'complete',
 *    score === total);
 *  - "Next" on a practice replay's last question wraps to the first level (no
 *    Victory, no coin award);
 *  - a wrong pick at zero lives goes to Victory in the 'gameover' state and shows
 *    no reveal;
 *  - the skip hint drives the same in-place reveal instead of auto-navigating.
 *
 * The reveal animation itself is verified visually via Maestro; under the
 * reanimated mock (onLayout never fires in RNTL) `startReveal` settles
 * synchronously, so the "Next"/Explanation UI is available to drive.
 */
import React from 'react';
import { fireEvent, render, act } from '@testing-library/react-native';

// --- controllable mock state -------------------------------------------------

let mockPractice = false; // isCompleted(cat) → practice replay when true
let mockProgress = 0; // getProgress(cat) → initial level index
let mockLives = 5; // getLives() → remaining lives
let mockCoins = 999;
let mockSnapshot: unknown = null;
let mockParams: Record<string, string> = {};

const mockAwardCorrect = jest.fn();
const mockSpendCoins = jest.fn(() => true);
const mockLoseLife = jest.fn();
const mockSetProgress = jest.fn();
const mockMarkCompleted = jest.fn();
const mockGetLives = jest.fn(() => mockLives);
const mockGetProgress = jest.fn(() => mockProgress);
const mockIsCompleted = jest.fn(() => mockPractice);

// --- module boundaries -------------------------------------------------------

jest.mock('@/hooks/logo-quiz/use-logo-quiz', () => ({
  useLogoQuiz: () => ({
    coins: mockCoins,
    isPremium: false,
    livesState: { lives: mockLives, updatedAt: 0 },
    awardCorrect: mockAwardCorrect,
    spendCoins: mockSpendCoins,
    loseLife: mockLoseLife,
    getLives: mockGetLives,
    getProgress: mockGetProgress,
    setProgress: mockSetProgress,
    isCompleted: mockIsCompleted,
    markCompleted: mockMarkCompleted,
  }),
}));
jest.mock('@/hooks/logo-quiz/use-logo-quiz-content', () => ({
  useLogoQuizContent: () => ({ snapshot: mockSnapshot }),
}));
jest.mock('@/hooks/use-locale', () => ({ useLocale: () => ({ locale: 'en' }) }));
jest.mock('@/lib/content-cache', () => ({
  resolveLocalImage: (_s: unknown, url: string | null) => url ?? null,
}));

// native / visual-only siblings
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
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
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('@/components/logo-quiz/app-background', () => ({ AppBackground: () => null }));
jest.mock('@/components/logo-quiz/logo-display', () => ({ LogoDisplay: () => null }));
jest.mock('@/components/logo-quiz/coin-icon', () => ({ CoinIcon: () => null }));
jest.mock('@/components/logo-quiz/hud', () => ({ CoinPill: () => null, LivesPill: () => null }));

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockDismissTo = jest.fn();
jest.mock('expo-router', () => ({
  router: {
    replace: (...a: unknown[]) => mockReplace(...a),
    push: (...a: unknown[]) => mockPush(...a),
    dismissTo: (...a: unknown[]) => mockDismissTo(...a),
  },
  useLocalSearchParams: () => mockParams,
}));

// eslint-disable-next-line import/first -- screen under test must load AFTER its mocks
import LogoQuizQuiz from '@/app/logo-quiz/quiz';

// --- fixtures ---------------------------------------------------------------

// Two-question category. Brand is options[correct_option]: Q0 → "Paris",
// Q1 (last) → "Nike". Only Q0 carries an explanation.
const SNAPSHOT = {
  locale: 'en',
  categories: [],
  imageMap: {},
  questions: [
    {
      id: 1,
      category_slug: 'logos',
      options: ['Paris', 'Rome'],
      correct_option: 0,
      explanation: 'City of light.',
      image_url: null,
    },
    {
      id: 2,
      category_slug: 'logos',
      options: ['Nike', 'Puma'],
      correct_option: 0,
      explanation: null,
      image_url: null,
    },
  ],
};

beforeEach(() => {
  mockPractice = false;
  mockProgress = 0;
  mockLives = 5;
  mockCoins = 999;
  mockSnapshot = SNAPSHOT;
  mockParams = { category: 'logos' };
  mockAwardCorrect.mockClear();
  mockSpendCoins.mockClear().mockReturnValue(true);
  mockLoseLife.mockClear();
  mockSetProgress.mockClear();
  mockMarkCompleted.mockClear();
  mockGetLives.mockClear();
  mockGetProgress.mockClear();
  mockIsCompleted.mockClear();
  mockReplace.mockClear();
  mockPush.mockClear();
  mockDismissTo.mockClear();
});

// --- 1. correct pick reveals in place, runs economy, no navigation -----------

describe('correct answer → in-place reveal (no interstitial Victory)', () => {
  it('awards, advances progress, shows Explanation + Next, and does NOT navigate', () => {
    const screen = render(<LogoQuizQuiz />);
    // The grid is showing the prompt + both options.
    expect(screen.getByText('Which brand is this?')).toBeTruthy();

    fireEvent.press(screen.getByText('Paris')); // correct brand of Q0

    // Economy ran: coins awarded (real run) and progress advanced to next level.
    expect(mockAwardCorrect).toHaveBeenCalledTimes(1);
    expect(mockSetProgress).toHaveBeenCalledWith('logos', 1);
    expect(mockMarkCompleted).not.toHaveBeenCalled();

    // Reveal is shown: Explanation text + a "Next" button appeared in place.
    expect(screen.getByText('Explanations')).toBeTruthy();
    expect(screen.getByText('City of light.')).toBeTruthy();
    expect(screen.getByText('Next')).toBeTruthy();

    // Crucially: no navigation to the result screen happened.
    expect(mockReplace).not.toHaveBeenCalled();
  });
});

// --- 2. Next on a non-last question advances in place ------------------------

describe('Next on a non-last question advances in place', () => {
  it('shows the following question without navigating to /logo-quiz/result', () => {
    const screen = render(<LogoQuizQuiz />);
    fireEvent.press(screen.getByText('Paris')); // solve Q0
    fireEvent.press(screen.getByText('Next')); // advance

    // Q1 is now on screen (its options render); no navigation occurred.
    expect(screen.getByText('Nike')).toBeTruthy();
    expect(screen.getByText('Puma')).toBeTruthy();
    // The reveal was reset — the Explanation/Next are gone until the next solve.
    expect(screen.queryByText('Next')).toBeNull();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});

// --- 3. Next on the real-run last question opens Victory ---------------------

describe('Next on the last question opens Victory (category cleared)', () => {
  it('router.replace to result with outcome complete and score === total', () => {
    mockProgress = 1; // start on the last question (index 1)
    const screen = render(<LogoQuizQuiz />);

    fireEvent.press(screen.getByText('Nike')); // correct brand of the last question
    expect(mockMarkCompleted).toHaveBeenCalledWith('logos'); // last level marks completion
    expect(mockReplace).not.toHaveBeenCalled(); // still no nav — reveal is shown

    fireEvent.press(screen.getByText('Next'));

    expect(mockReplace).toHaveBeenCalledTimes(1);
    const arg = mockReplace.mock.calls[0][0];
    expect(arg.pathname).toBe('/logo-quiz/result');
    expect(arg.params.outcome).toBe('complete');
    expect(arg.params.score).toBe('2'); // score === total (both questions cleared)
    expect(arg.params.total).toBe('2');
  });
});

// --- 4. Practice replay: last-question Next wraps, no Victory, no award ------

describe('practice replay last question wraps to the first level', () => {
  it('does NOT navigate to Victory and does NOT award coins', () => {
    mockPractice = true; // completed category → free practice replay
    mockProgress = 1; // start on the last question
    const screen = render(<LogoQuizQuiz />);

    fireEvent.press(screen.getByText('Nike')); // correct
    expect(mockAwardCorrect).not.toHaveBeenCalled(); // practice earns nothing

    fireEvent.press(screen.getByText('Next'));

    // Wrapped back to the first level (Q0 options visible), no navigation.
    expect(screen.getByText('Paris')).toBeTruthy();
    expect(screen.getByText('Rome')).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});

// --- 5. Wrong pick at zero lives → Victory (gameover), no reveal -------------

describe('wrong answer at zero lives → game over', () => {
  it('navigates to result with outcome gameover and shows no reveal', () => {
    jest.useFakeTimers();
    try {
      mockLives = 0; // getLives() returns 0 after the mistake → game over
      const screen = render(<LogoQuizQuiz />);

      fireEvent.press(screen.getByText('Rome')); // wrong brand for Q0

      expect(mockLoseLife).toHaveBeenCalledTimes(1);
      // No reveal on a loss.
      expect(screen.queryByText('Next')).toBeNull();
      expect(screen.queryByText('Explanations')).toBeNull();

      // The board locks, then navigates to the game-over result after the delay.
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(mockReplace).toHaveBeenCalledTimes(1);
      expect(mockReplace.mock.calls[0][0].params.outcome).toBe('gameover');
    } finally {
      jest.useRealTimers();
    }
  });
});

// --- 6. Skip hint drives the same reveal (no 3s auto-navigation) -------------

describe('skip hint reveals in place instead of auto-navigating', () => {
  it('shows Explanation + Next and does not navigate until Next is pressed', () => {
    const screen = render(<LogoQuizQuiz />);

    // The skip HintButton is labelled "Next level" (t.skip) during a real run.
    fireEvent.press(screen.getByText('Next level'));

    expect(mockSpendCoins).toHaveBeenCalledTimes(1);
    expect(mockSetProgress).toHaveBeenCalledWith('logos', 1);
    // Reveal shown, still on the quiz screen (no auto-nav to result).
    expect(screen.getByText('Explanations')).toBeTruthy();
    expect(screen.getByText('Next')).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();

    fireEvent.press(screen.getByText('Next')); // advance to Q1 in place
    expect(screen.getByText('Nike')).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
