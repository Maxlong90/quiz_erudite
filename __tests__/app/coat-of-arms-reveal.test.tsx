/**
 * Integration tests for the ORIGINAL-coat reveal on app/coat-of-arms/quiz.tsx.
 *
 * In "All countries" mode the player sees a CLEANED coat of arms (the country
 * name erased from its banner). After a CORRECT answer the ORIGINAL coat — the
 * one that still shows the name — fades in ON TOP of the cleaned one. The
 * behaviours that only exist at the composed-component level and matter most:
 *
 *  - a WRONG answer NEVER reveals the original (it would spoil the answer);
 *  - a correct answer stacks the original OVER the clean coat (both render), so
 *    a failed original download degrades to "no visible change", not a blank;
 *  - the 131 coats with no original simply never reveal;
 *  - the Share card keeps the CLEAN coat, so sharing a question can't spoil it.
 *
 * The run order is pinned via the `retry` param, which makes useRunProgress
 * replay the given indices verbatim with no shuffle and no persistence.
 */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

const CLEAN_URI = 'file:///local/angola-clean.png';
const ORIGINAL_URI = 'file:///local/angola-original.webp';
const PLAIN_URI = 'file:///local/mali-clean.png';

// Question 0 = Angola, a hand-cleaned coat WITH an original (reveals).
// Question 1 = Mali, one of the 131 coats with NO original (never reveals).
const mockCountryQuestions = [
  {
    id: 3604,
    prompt: 'Which country does this coat of arms belong to?',
    imageUri: CLEAN_URI,
    originalImageUri: ORIGINAL_URI,
    options: ['Angola', 'Mali', 'Chad', 'Gabon'],
    correctIndex: 0,
    explanation: 'Angolan note',
    continent: 'africa',
  },
  {
    id: 3700,
    prompt: 'Which country does this coat of arms belong to?',
    imageUri: PLAIN_URI,
    originalImageUri: null,
    options: ['Mali', 'Angola', 'Chad', 'Gabon'],
    correctIndex: 0,
    explanation: null,
    continent: 'africa',
  },
];

// --- module boundaries -------------------------------------------------------

jest.mock('@/hooks/coat-of-arms/use-coat-content', () => ({
  useCoatContent: () => ({
    snapshot: null,
    countryQuestions: mockCountryQuestions,
    pictureByContinent: {},
    countsByContinent: {},
    status: 'ready',
    error: null,
  }),
}));
jest.mock('@/hooks/use-locale', () => ({ useLocale: () => ({ locale: 'en' }) }));
jest.mock('@/api/client', () => ({
  APP_SLUG: 'coat-of-arms',
  apiClient: { get: jest.fn(), post: jest.fn() },
}));

// Replay both questions in a fixed order: no shuffle, no AsyncStorage writes.
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  router: { replace: (...a: unknown[]) => mockReplace(...a), back: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => ({ retry: '0,1' }),
}));

// expo / native / visual-only siblings
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
}));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return { LinearGradient: View };
});
// Forward every prop (including `source`) onto a plain View so the test can read
// `props.source.uri` and the testIDs the screen sets on each layer.
jest.mock('expo-image', () => {
  const React2 = require('react');
  const { View } = require('react-native');
  return {
    Image: (props: Record<string, unknown>) => React2.createElement(View, props),
  };
});
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('@/components/flags-quiz/app-background', () => ({ GradientBackground: () => null }));
jest.mock('@/lib/flags-quiz/share-image', () => ({ shareQuestionImage: jest.fn() }));
jest.mock('@/components/logo-quiz/quiz-menu-modal', () => ({ QuizMenuModal: () => null }));
jest.mock('@/components/coat-of-arms/help-modal', () => ({
  CoatHelpModal: () => null,
  useCoatHelp: () => ({ helpOpen: false, setHelpOpen: jest.fn() }),
}));
// Record which coat the Share composition was handed — it must stay the CLEAN one.
jest.mock('@/components/coat-of-arms/share-card', () => {
  const React2 = require('react');
  const { View } = require('react-native');
  return {
    CoatShareCard: (props: { coatUri: string | null }) =>
      React2.createElement(View, { testID: 'share-card', accessibilityLabel: props.coatUri ?? '' }),
  };
});

import CoatOfArmsGame from '@/app/coat-of-arms/quiz';

/** Render and wait for the first question's options to appear. */
async function renderQuiz() {
  const screen = render(<CoatOfArmsGame />);
  await waitFor(() => expect(screen.getByText('Angola')).toBeTruthy());
  return screen;
}

beforeEach(() => {
  jest.useFakeTimers();
  mockReplace.mockClear();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('coat reveal — before answering', () => {
  it('shows only the CLEAN coat', async () => {
    const screen = await renderQuiz();

    expect(screen.getByTestId('coat-image').props.source.uri).toBe(CLEAN_URI);
    expect(screen.queryByTestId('coat-image-original')).toBeNull();
  });
});

describe('coat reveal — wrong answer', () => {
  it('NEVER reveals the original (it would spoil the answer)', async () => {
    const screen = await renderQuiz();

    fireEvent.press(screen.getByText('Chad')); // wrong

    // Assert before the REVEAL_MS auto-advance fires.
    expect(screen.queryByTestId('coat-image-original')).toBeNull();
    expect(screen.getByTestId('coat-image').props.source.uri).toBe(CLEAN_URI);
  });
});

describe('coat reveal — correct answer', () => {
  it('stacks the ORIGINAL over the clean coat, keeping both mounted', async () => {
    const screen = await renderQuiz();

    fireEvent.press(screen.getByText('Angola')); // correct

    const original = await waitFor(() => screen.getByTestId('coat-image-original'));
    expect(original.props.source.uri).toBe(ORIGINAL_URI);
    // The clean coat stays underneath — this is an overlay, not a source swap,
    // so a missing/failed original degrades to "no visible change".
    expect(screen.getByTestId('coat-image').props.source.uri).toBe(CLEAN_URI);
  });

  it('hands the Share card the CLEAN coat even while revealing', async () => {
    const screen = await renderQuiz();

    fireEvent.press(screen.getByText('Angola'));
    await waitFor(() => screen.getByTestId('coat-image-original'));

    expect(screen.getByTestId('share-card').props.accessibilityLabel).toBe(CLEAN_URI);
  });
});

describe('coat reveal — a coat with no original (131 of 195)', () => {
  it('advances to the next question and never reveals', async () => {
    const screen = await renderQuiz();

    // Finish question 0 (which does reveal) and move on.
    fireEvent.press(screen.getByText('Angola'));
    await waitFor(() => screen.getByTestId('coat-image-original'));
    fireEvent.press(screen.getByText('Next'));

    // Question 1: the overlay unmounted on advance...
    await waitFor(() => expect(screen.getByTestId('coat-image').props.source.uri).toBe(PLAIN_URI));
    expect(screen.queryByTestId('coat-image-original')).toBeNull();

    // ...and answering it correctly still reveals nothing, because it has no original.
    fireEvent.press(screen.getByText('Mali'));
    expect(screen.queryByTestId('coat-image-original')).toBeNull();
  });
});
