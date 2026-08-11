/**
 * Integration tests for the level-based Logo Quiz answer flow (app/logo-quiz/quiz.tsx).
 *
 * Navigation is unified around per-question answered state (isSolved): an
 * ANSWERED logo opens revealed (green answer + Explanation) with ◀/▶ paging
 * across the level and no economy; an UNANSWERED logo plays normally (hints,
 * lives). Paging is clamped to the level's first/last question — it never wraps
 * and never rolls into a Result "complete" screen. Only a game over navigates to
 * /logo-quiz/result. A premium question the current (non-subscriber) user can't
 * play is never part of the run. These tests lock in that branch logic:
 *
 *  - a correct pick runs the economy (awardCorrect) + markSolved and shows the
 *    reveal + ◀/▶ nav WITHOUT navigating away;
 *  - Next on a non-last question pages in place (no navigation);
 *  - Next on the LAST question is clamped — no navigation, no Result;
 *  - an already-solved logo opens revealed with prev/next and never touches the economy;
 *  - a wrong pick at zero lives goes to Result in the 'gameover' state, no reveal;
 *  - the skip hint drives the same in-place reveal + markSolved.
 *
 * The reveal animation itself is verified visually via Maestro; under the
 * reanimated mock (onLayout never fires in RNTL) `startReveal` settles
 * synchronously, so the "Next"/Explanation UI is available to drive.
 */
import React from 'react';
import { fireEvent, render, act } from '@testing-library/react-native';

// --- controllable mock state -------------------------------------------------

let mockLives = 5; // getLives() → remaining lives
let mockCoins = 999;
let mockIsPremium = false;
let mockSolved: Record<number, boolean> = {};
let mockSnapshot: unknown = null;
let mockParams: Record<string, string> = {};

const mockAwardCorrect = jest.fn();
const mockSpendCoins = jest.fn(() => true);
const mockLoseLife = jest.fn();
const mockMarkSolved = jest.fn((id: number) => {
  mockSolved[id] = true;
});
const mockGetLives = jest.fn(() => mockLives);
const mockIsSolved = jest.fn((id: number) => !!mockSolved[id]);

// --- module boundaries -------------------------------------------------------

jest.mock('@/hooks/logo-quiz/use-logo-quiz', () => ({
  useLogoQuiz: () => ({
    coins: mockCoins,
    isPremium: mockIsPremium,
    livesState: { lives: mockLives, updatedAt: 0 },
    awardCorrect: mockAwardCorrect,
    spendCoins: mockSpendCoins,
    loseLife: mockLoseLife,
    getLives: mockGetLives,
    isSolved: mockIsSolved,
    markSolved: mockMarkSolved,
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
// The "…" menu is tested separately; mocking it keeps the axios-backed reports
// client (api/reports → api/client) out of this flow test's module graph.
jest.mock('@/components/logo-quiz/quiz-menu-modal', () => ({ QuizMenuModal: () => null }));

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockDismissTo = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  router: {
    replace: (...a: unknown[]) => mockReplace(...a),
    push: (...a: unknown[]) => mockPush(...a),
    dismissTo: (...a: unknown[]) => mockDismissTo(...a),
    back: (...a: unknown[]) => mockBack(...a),
  },
  useLocalSearchParams: () => mockParams,
}));

// eslint-disable-next-line import/first -- screen under test must load AFTER its mocks
import LogoQuizQuiz from '@/app/logo-quiz/quiz';

// --- fixtures ---------------------------------------------------------------

// Level 1 with two FREE questions (order 1 & 2). Brand is options[correct_option]:
// Q1 → "Paris" (carries an explanation), Q2 (last) → "Nike".
const SNAPSHOT = {
  locale: 'en',
  categories: [],
  imageMap: {},
  questions: [
    {
      id: 1,
      category_slug: 'logo-quiz',
      order: 1,
      options: ['Paris', 'Rome'],
      correct_option: 0,
      explanation: 'City of light.',
      image_url: null,
    },
    {
      id: 2,
      category_slug: 'logo-quiz',
      order: 2,
      options: ['Nike', 'Puma'],
      correct_option: 0,
      explanation: null,
      image_url: null,
    },
  ],
};

beforeEach(() => {
  mockLives = 5;
  mockCoins = 999;
  mockIsPremium = false;
  mockSolved = {};
  mockSnapshot = SNAPSHOT;
  mockParams = { level: '1' };
  mockAwardCorrect.mockClear();
  mockSpendCoins.mockClear().mockReturnValue(true);
  mockLoseLife.mockClear();
  mockMarkSolved.mockClear();
  mockGetLives.mockClear();
  mockIsSolved.mockClear();
  mockReplace.mockClear();
  mockPush.mockClear();
  mockDismissTo.mockClear();
  mockBack.mockClear();
});

// --- 1. correct pick reveals in place, runs economy, no navigation -----------

describe('correct answer → in-place reveal (no interstitial Result)', () => {
  it('awards, marks solved, shows Explanation + Next, and does NOT navigate', () => {
    const screen = render(<LogoQuizQuiz />);
    expect(screen.getByText('Which brand is this?')).toBeTruthy();

    fireEvent.press(screen.getByText('Paris')); // correct brand of Q1

    // Economy ran: coins awarded (real run) and the question marked solved.
    expect(mockAwardCorrect).toHaveBeenCalledTimes(1);
    expect(mockMarkSolved).toHaveBeenCalledWith(1);

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
    fireEvent.press(screen.getByText('Paris')); // solve Q1
    fireEvent.press(screen.getByText('Next')); // advance

    // Q2 is now on screen (its options render); no navigation occurred.
    expect(screen.getByText('Nike')).toBeTruthy();
    expect(screen.getByText('Puma')).toBeTruthy();
    // The reveal was reset — the Explanation/Next are gone until the next solve.
    expect(screen.queryByText('Explanations')).toBeNull();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});

// --- 3. Next on the last question is clamped (no Result "complete") ----------

describe('Next on the last question is clamped', () => {
  it('does not navigate to Result and stays on the last logo', () => {
    mockParams = { level: '1', q: '2' }; // start on the last question (id 2)
    const screen = render(<LogoQuizQuiz />);

    fireEvent.press(screen.getByText('Nike')); // correct brand of the last question
    expect(mockMarkSolved).toHaveBeenCalledWith(2);

    // The ◀/▶ nav is shown, but Next is clamped on the last question — pressing
    // it neither pages nor opens a Result screen (the "complete" flow is gone).
    fireEvent.press(screen.getByText('Next'));

    expect(mockReplace).not.toHaveBeenCalled();
    // Still on the last logo — its revealed green answer remains on screen.
    expect(screen.getByText('Nike')).toBeTruthy();
  });
});

// --- 4. Already-solved logo: Explanation + paging, no economy ----------------

describe('an already-solved logo pages with no economy', () => {
  it('shows the Explanation and prev/next, awards nothing, and never navigates to Result', () => {
    mockSolved = { 1: true, 2: true }; // both already solved
    mockParams = { level: '1', q: '1' }; // opens revealed, derived from isSolved
    const screen = render(<LogoQuizQuiz />);

    // Opens already revealed: the Explanation of the solved logo is shown.
    expect(screen.getByText('Explanations')).toBeTruthy();
    expect(screen.getByText('City of light.')).toBeTruthy();
    // Paging button present; no economy has run.
    expect(screen.getByText('Next')).toBeTruthy();
    expect(mockAwardCorrect).not.toHaveBeenCalled();
    expect(mockMarkSolved).not.toHaveBeenCalled();

    fireEvent.press(screen.getByText('Next')); // page to the next solved logo

    // Still reviewing (no Result navigation).
    expect(mockReplace).not.toHaveBeenCalled();
  });
});

// --- 5. Wrong pick at zero lives → Result (gameover), no reveal --------------

describe('wrong answer at zero lives → game over', () => {
  it('navigates to result with outcome gameover and shows no reveal', () => {
    jest.useFakeTimers();
    try {
      mockLives = 0; // getLives() returns 0 after the mistake → game over
      const screen = render(<LogoQuizQuiz />);

      fireEvent.press(screen.getByText('Rome')); // wrong brand for Q1

      expect(mockLoseLife).toHaveBeenCalledTimes(1);
      // No reveal on a loss.
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

// --- 6. Skip hint drives the same reveal + marks solved ----------------------

describe('skip hint reveals in place instead of auto-navigating', () => {
  it('spends coins, marks solved, shows Explanation + Next, advances on Next', () => {
    const screen = render(<LogoQuizQuiz />);

    // The skip HintButton is labelled "Skip" (t.skip) during a real run.
    fireEvent.press(screen.getByText('Skip'));

    expect(mockSpendCoins).toHaveBeenCalledTimes(1);
    expect(mockMarkSolved).toHaveBeenCalledWith(1);
    // Reveal shown, still on the quiz screen (no auto-nav to result).
    expect(screen.getByText('Explanations')).toBeTruthy();
    expect(screen.getByText('Next')).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();

    fireEvent.press(screen.getByText('Next')); // advance to Q2 in place
    expect(screen.getByText('Nike')).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
