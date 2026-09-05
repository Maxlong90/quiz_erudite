/**
 * Integration tests for the ORIGINAL-coat reveal on
 * app/coat-of-arms/continent-quiz.tsx ("By continent").
 *
 * Here the prompt is a country NAME and the four answers are coat PICTURES. On a
 * correct pick the three wrong coats unmount, the surviving one glides to the
 * centre, and the ORIGINAL artwork — the coat that still shows the country name
 * on its banner — dissolves in ON TOP of it. The behaviours worth pinning:
 *
 *  - a WRONG pick NEVER reveals an original (it would spoil the answer);
 *  - a correct pick stacks the original OVER the played coat (both stay
 *    mounted), so an original that 404s degrades to "no visible change";
 *  - the ~68% of coats with no original simply never reveal — not an error,
 *    not a loading state;
 *  - a wrong option's original is never rendered, even when the payload has one;
 *  - the Share card keeps the CLEAN options, so sharing can't leak the answer.
 *
 * The run order is pinned via the `retry` param, which makes useRunProgress
 * replay the given indices verbatim with no shuffle and no persistence.
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

const EGYPT_PLAYED = 'file:///local/egypt-played.png';
const EGYPT_ORIGINAL = 'file:///local/egypt-original.webp';
const MALI_PLAYED = 'file:///local/mali-played.png';

// Question 0 = Egypt, correct option 3, WITH an original (reveals).
// Question 1 = Mali, correct option 0, NO original (never reveals) — the common
// case, since only 64 of 195 countries have archived master artwork.
const mockPictureQuestions = [
  {
    id: 3551,
    title: 'Egypt',
    optionImageUris: [
      'file:///local/egypt-0.png',
      'file:///local/egypt-1.png',
      'file:///local/egypt-2.png',
      EGYPT_PLAYED,
    ],
    correctIndex: 3,
    correctOriginalImageUri: EGYPT_ORIGINAL,
    explanation: 'Egyptian note',
    continent: 'africa',
  },
  {
    id: 3700,
    title: 'Mali',
    optionImageUris: [
      MALI_PLAYED,
      'file:///local/mali-1.png',
      'file:///local/mali-2.png',
      'file:///local/mali-3.png',
    ],
    correctIndex: 0,
    correctOriginalImageUri: null,
    explanation: null,
    continent: 'africa',
  },
];

// --- module boundaries -------------------------------------------------------

jest.mock('@/hooks/coat-of-arms/use-coat-content', () => ({
  useCoatContent: () => ({
    snapshot: null,
    countryQuestions: [],
    pictureByContinent: { africa: mockPictureQuestions },
    countsByContinent: { africa: mockPictureQuestions.length },
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
  useLocalSearchParams: () => ({ continent: 'africa', retry: '0,1' }),
}));

// expo / native / visual-only siblings
// reanimated is mocked globally — see __mocks__/react-native-reanimated.js
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
// Record which coats the Share composition was handed — they must stay CLEAN.
jest.mock('@/components/coat-of-arms/share-card', () => {
  const React2 = require('react');
  const { View } = require('react-native');
  return {
    CoatShareCard: (props: { imageOptions: (string | null)[] }) =>
      React2.createElement(View, {
        testID: 'share-card',
        accessibilityLabel: (props.imageOptions ?? []).join('|'),
      }),
  };
});

import CoatOfArmsContinentGame from '@/app/coat-of-arms/continent-quiz';

/** Render and wait for the first question (Egypt) to appear. */
async function renderGame() {
  const screen = render(<CoatOfArmsContinentGame />);
  await waitFor(() => expect(screen.getByText('Egypt')).toBeTruthy());
  return screen;
}

beforeEach(() => {
  jest.useFakeTimers();
  mockReplace.mockClear();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('continent reveal — before answering', () => {
  it('shows all four played coats and no original', async () => {
    const screen = await renderGame();

    expect(screen.getByTestId('coat-option-0')).toBeTruthy();
    expect(screen.getByTestId('coat-option-3').props.source.uri).toBe(EGYPT_PLAYED);
    expect(screen.queryByTestId('coat-image-original')).toBeNull();
  });
});

describe('continent reveal — wrong answer', () => {
  it('NEVER reveals the original (it would spoil the answer)', async () => {
    const screen = await renderGame();

    fireEvent.press(screen.getByTestId('coat-option-0')); // wrong: correct is 3

    // Assert before the REVEAL_MS auto-advance fires.
    expect(screen.queryByTestId('coat-image-original')).toBeNull();
  });
});

describe('continent reveal — correct answer', () => {
  it('stacks the ORIGINAL over the played coat, keeping both mounted', async () => {
    const screen = await renderGame();

    fireEvent.press(screen.getByTestId('coat-option-3')); // correct

    const original = await waitFor(() => screen.getByTestId('coat-image-original'));
    expect(original.props.source.uri).toBe(EGYPT_ORIGINAL);
    // The played coat stays underneath — this is an overlay, not a source swap,
    // so a missing/404 original degrades to "no visible change", never a blank.
    expect(screen.getByTestId('coat-option-3').props.source.uri).toBe(EGYPT_PLAYED);
  });

  it('drops the three wrong coats but keeps the correct one', async () => {
    const screen = await renderGame();

    fireEvent.press(screen.getByTestId('coat-option-3'));

    await waitFor(() => screen.getByTestId('coat-image-original'));
    expect(screen.queryByTestId('coat-option-0')).toBeNull();
    expect(screen.queryByTestId('coat-option-1')).toBeNull();
    expect(screen.queryByTestId('coat-option-2')).toBeNull();
    expect(screen.getByTestId('coat-option-3')).toBeTruthy();
  });

  it('renders the original at EXACTLY the played coat geometry', async () => {
    // The failure this guards against is silent: an overlay pinned to the padded
    // frame instead of the picture-box plate still "works", it just renders ~9%
    // larger (an absolutely positioned child resolves against the padding box
    // and skips the parent's padding), so the banner text drifts outward as it
    // develops in. Nothing about the reveal *breaks* — it just stops registering.
    const screen = await renderGame();

    fireEvent.press(screen.getByTestId('coat-option-3'));
    const original = await waitFor(() => screen.getByTestId('coat-image-original'));

    const played = StyleSheet.flatten(screen.getByTestId('coat-option-3').props.style);
    const overlay = StyleSheet.flatten(original.props.style);
    expect(overlay.width).toBe(played.width);
    expect(overlay.height).toBe(played.height);
  });

  it('hands the Share card the CLEAN options even while revealing', async () => {
    const screen = await renderGame();

    fireEvent.press(screen.getByTestId('coat-option-3'));
    await waitFor(() => screen.getByTestId('coat-image-original'));

    const shared = screen.getByTestId('share-card').props.accessibilityLabel;
    expect(shared).toBe(mockPictureQuestions[0].optionImageUris.join('|'));
    expect(shared).not.toContain(EGYPT_ORIGINAL);
  });
});

describe('continent reveal — a coat with no original (~68% of them)', () => {
  it('answers correctly and never reveals, leaving the played coat visible', async () => {
    const screen = await renderGame();

    // Finish Egypt (which does reveal) and move on to Mali.
    fireEvent.press(screen.getByTestId('coat-option-3'));
    await waitFor(() => screen.getByTestId('coat-image-original'));
    fireEvent.press(screen.getByText('Next'));

    await waitFor(() => expect(screen.getByText('Mali')).toBeTruthy());
    expect(screen.queryByTestId('coat-image-original')).toBeNull();

    // Answering it correctly still reveals nothing — it has no original.
    fireEvent.press(screen.getByTestId('coat-option-0'));
    expect(screen.queryByTestId('coat-image-original')).toBeNull();
    expect(screen.getByTestId('coat-option-0').props.source.uri).toBe(MALI_PLAYED);
  });
});
