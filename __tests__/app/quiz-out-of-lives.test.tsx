/**
 * Integration tests for the out-of-lives gate rework in app/quiz.tsx.
 *
 * Behaviour under test (the fix that this change introduces):
 *  - PRE-QUIZ gate with 0 lives: the run is blocked WITHOUT dispatching an
 *    error, so the generic "Something went wrong" error screen must NOT render.
 *    The OutOfLivesModal floats over the neutral loading background instead.
 *  - "Later" (OutOfLivesModal onClose) in the lives gate routes to the main
 *    categories home '/' (not the shop '/shop'), for both the pre-quiz and the
 *    mid-quiz gate.
 *  - onWatchAd granted reloads lives and retries loadQuestions (getLives is
 *    consulted a second time).
 *  - A GENUINE load error (daily mode, cache not ready) still renders the
 *    error screen — and does NOT show the lives modal, proving the modals were
 *    correctly removed from the error branch.
 *
 * The real quiz reducer + useTranslation (locale pinned to `en`) run; native /
 * visual-only siblings are stubbed at their import boundary. useThemeColors is
 * mocked to a real palette so the screen renders without a ThemePrefProvider.
 * Math.random is pinned so the option shuffle is deterministic (correct last).
 */
import React from 'react';
import { Pressable } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

// --- controllable mock state -------------------------------------------------

let mockPremium: boolean | null = false;
let mockLivesCount = 0;
let mockSnapshot: unknown = null;
let mockParams: Record<string, string> = {};

const mockSpendLife = jest.fn().mockResolvedValue(0);
const mockGetLives = jest.fn().mockResolvedValue(0);
const mockAddLives = jest.fn().mockResolvedValue(1);
const mockReloadLives = jest.fn();
const mockReloadHints = jest.fn();
const mockWatchAd = jest.fn().mockResolvedValue('granted');

// --- module boundaries -------------------------------------------------------

jest.mock('@/hooks/use-premium', () => ({
  usePremium: () => ({ isPremium: mockPremium, setPremium: jest.fn(), resetPremium: jest.fn() }),
}));
jest.mock('@/hooks/use-lives', () => ({
  useLives: () => ({ count: mockLivesCount, canClaim: false, reload: mockReloadLives }),
}));
jest.mock('@/hooks/use-hints', () => ({
  useHintsState: () => ({ state: { fiftyFifty: 3, statistics: 2, replaceQuestion: 1 }, reload: mockReloadHints }),
}));
jest.mock('@/hooks/use-content-cache', () => ({
  useContentCache: () => ({ snapshot: mockSnapshot }),
}));
jest.mock('@/hooks/use-locale', () => ({ useLocale: () => ({ locale: 'en' }) }));
// Real palette, no ThemePrefProvider needed.
jest.mock('@/hooks/use-theme-colors', () => {
  const { EruditeColors } = require('@/constants/theme');
  return { useThemeColors: () => EruditeColors.dark };
});

jest.mock('@/lib/lives', () => ({
  spendLife: (...a: unknown[]) => mockSpendLife(...a),
  getLives: (...a: unknown[]) => mockGetLives(...a),
  addLives: (...a: unknown[]) => mockAddLives(...a),
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
jest.mock('@/lib/ads', () => ({
  adsEnabled: true,
  watchAdForLife: (...a: unknown[]) => mockWatchAd(...a),
}));
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
// Neutralize the themed background wrapper (it only paints; renders children).
jest.mock('@/components/screen-background', () => {
  const { View: RNView } = require('react-native');
  return { ScreenBackground: ({ children }: { children: React.ReactNode }) => <RNView>{children}</RNView> };
});
jest.mock('@/components/ui/icon-symbol', () => ({ IconSymbol: () => null }));
jest.mock('@/components/quiz/progress-bar', () => ({ ProgressBar: () => null }));
jest.mock('@/components/quiz/quiz-timer', () => ({ QuizTimer: () => null }));
jest.mock('@/components/quiz/report-button', () => ({ ReportButton: () => null }));
jest.mock('@/components/quiz/report-modal', () => ({ ReportModal: () => null }));
jest.mock('@/components/quiz/share-question-button', () => ({ ShareQuestionButton: () => null }));
jest.mock('@/components/quiz/hard-question-card', () => ({ HardQuestionCard: () => null }));
jest.mock('@/components/themed-text', () => {
  const { Text: RNText } = require('react-native');
  return { ThemedText: (props: Record<string, unknown>) => <RNText {...props} /> };
});

// Surface the OutOfLivesModal's visibility AND expose its callbacks so the
// "Later" / watch-ad / open-shop branches can be driven from the test.
jest.mock('@/components/quiz/out-of-lives-modal', () => {
  const { View: RNView, Pressable: RNPressable } = require('react-native');
  return {
    OutOfLivesModal: ({
      visible,
      onClose,
      onOpenShop,
      onWatchAd,
    }: {
      visible: boolean;
      onClose: () => void;
      onOpenShop: () => void;
      onWatchAd: () => void;
    }) =>
      visible ? (
        <RNView testID="out-of-lives-open">
          <RNPressable testID="oolm-later" onPress={onClose} />
          <RNPressable testID="oolm-shop" onPress={onOpenShop} />
          <RNPressable testID="oolm-watch" onPress={onWatchAd} />
        </RNView>
      ) : null,
  };
});
jest.mock('@/components/lives/buy-lives-modal', () => {
  const { View: RNView } = require('react-native');
  return { BuyLivesModal: ({ visible }: { visible: boolean }) => (visible ? <RNView testID="buy-lives-open" /> : null) };
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

function snapshotWith(...questions: Record<string, unknown>[]) {
  return { locale: 'en', categories: [], questions, imageMap: {} };
}
const Q1 = {
  id: 1,
  category_slug: 'geo',
  question: 'Capital of France?',
  options: ['Paris', 'Rome', 'Berlin', 'Madrid'],
  correct_option: 0,
  explanation: null,
  image_url: null,
};
const Q2 = {
  id: 2,
  category_slug: 'geo',
  question: 'Largest ocean?',
  options: ['Pacific', 'Atlantic', 'Indian', 'Arctic'],
  correct_option: 0,
  explanation: null,
  image_url: null,
};

beforeEach(() => {
  mockPremium = false;
  mockLivesCount = 0;
  mockSnapshot = snapshotWith(Q1);
  mockParams = { count: '1', locale: 'en', mode: 'quick' };
  mockSpendLife.mockClear().mockResolvedValue(0);
  mockGetLives.mockClear().mockResolvedValue(0);
  mockAddLives.mockClear().mockResolvedValue(1);
  mockReloadLives.mockClear();
  mockReloadHints.mockClear();
  mockWatchAd.mockClear().mockResolvedValue('granted');
  mockReplace.mockClear();
  // Deterministic shuffles: Math.random === 0 → correct answer lands last.
  jest.spyOn(Math, 'random').mockReturnValue(0);
});

afterEach(() => {
  (Math.random as jest.Mock).mockRestore?.();
});

// --- PRE-QUIZ lives gate -----------------------------------------------------

describe('pre-quiz lives gate (0 lives)', () => {
  it('opens the OutOfLivesModal WITHOUT rendering the error screen', async () => {
    const screen = render(<QuizScreen />);

    // Modal appears over the neutral loading background.
    await waitFor(() => expect(screen.getByTestId('out-of-lives-open')).toBeTruthy());
    // The generic error screen must NOT be shown for the no-lives case.
    expect(screen.queryByText('Something went wrong')).toBeNull();
    expect(screen.queryByText('No lives')).toBeNull();
  });

  it('"Later" routes to home, not the shop', async () => {
    const screen = render(<QuizScreen />);
    await waitFor(() => expect(screen.getByTestId('out-of-lives-open')).toBeTruthy());

    fireEvent.press(screen.getByTestId('oolm-later'));

    expect(mockReplace).toHaveBeenCalledWith('/');
    expect(mockReplace).not.toHaveBeenCalledWith('/shop');
  });

  it('"Buy" opens the BuyLivesModal (does not leave for an error screen)', async () => {
    const screen = render(<QuizScreen />);
    await waitFor(() => expect(screen.getByTestId('out-of-lives-open')).toBeTruthy());

    fireEvent.press(screen.getByTestId('oolm-shop'));

    await waitFor(() => expect(screen.getByTestId('buy-lives-open')).toBeTruthy());
    expect(screen.queryByText('Something went wrong')).toBeNull();
  });

  it('watch-ad granted reloads lives and retries loadQuestions', async () => {
    // First load: 0 lives → gated. After the ad: 5 lives → run proceeds.
    mockGetLives.mockReset();
    mockGetLives.mockResolvedValueOnce(0).mockResolvedValue(5);

    const screen = render(<QuizScreen />);
    await waitFor(() => expect(screen.getByTestId('out-of-lives-open')).toBeTruthy());

    fireEvent.press(screen.getByTestId('oolm-watch'));

    // Reward flow ran and the run was retried (question now renders).
    await waitFor(() => expect(mockWatchAd).toHaveBeenCalled());
    await waitFor(() => expect(mockReloadLives).toHaveBeenCalled());
    await waitFor(() => expect(mockGetLives.mock.calls.length).toBeGreaterThanOrEqual(2));
    await waitFor(() => expect(screen.getByText('Capital of France?')).toBeTruthy());
  });
});

// --- GENUINE error still renders the error screen (no lives modal) -----------

describe('genuine load error', () => {
  it('shows the error screen and NOT the lives modal', async () => {
    // Daily mode skips the lives gate; a missing snapshot is a real error.
    mockParams = { count: '1', locale: 'en', mode: 'daily' };
    mockSnapshot = null;

    const screen = render(<QuizScreen />);

    await waitFor(() => expect(screen.getByText('Something went wrong')).toBeTruthy());
    expect(screen.getByText('Cache not ready yet')).toBeTruthy();
    // The out-of-lives modal must not appear on a genuine error.
    expect(screen.queryByTestId('out-of-lives-open')).toBeNull();
  });
});

// --- MID-QUIZ lives gate -----------------------------------------------------

describe('mid-quiz lives gate', () => {
  it('"Later" routes to home, not the shop', async () => {
    // Two-question run so the first wrong answer is NOT the last question;
    // 5 lives clears the pre-quiz gate, then a wrong answer drains to 0.
    mockGetLives.mockReset().mockResolvedValue(5);
    mockSpendLife.mockReset().mockResolvedValue(0);
    mockParams = { count: '2', locale: 'en', mode: 'quick' };
    mockSnapshot = snapshotWith(Q1, Q2);

    const screen = render(<QuizScreen />);
    // With Math.random=0 the 2-item pool reverses → "Largest ocean?" first.
    await waitFor(() => expect(screen.getByText('Largest ocean?')).toBeTruthy());

    // Correct option lands last (index 3); index 0 is a wrong answer.
    fireEvent.press(screen.getByTestId('option-button-0'));

    // Wrong answer drains the last life → mid-quiz gate opens.
    await waitFor(() => expect(screen.getByTestId('out-of-lives-open')).toBeTruthy());

    fireEvent.press(screen.getByTestId('oolm-later'));

    expect(mockReplace).toHaveBeenCalledWith('/');
    expect(mockReplace).not.toHaveBeenCalledWith('/shop');
  });
});
