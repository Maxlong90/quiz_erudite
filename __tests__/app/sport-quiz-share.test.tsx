/**
 * Integration tests for sharing a Sport Quiz question as a PICTURE
 * (app/sport-quiz/quiz.tsx and app/sport-quiz/legends-quiz.tsx).
 *
 * Both screens keep an off-screen SportShareCard mounted and hand it to
 * shareQuestionImage, which captures it to a PNG. What matters — and what these
 * tests lock in — is WHAT THE CARD IS HANDED, because the card is the thing the
 * recipient sees:
 *
 *  - the invite text is unchanged (shareInvite with the store url);
 *  - Classic hands the card ALL FOUR options even after the answer is revealed —
 *    the on-screen board unmounts the wrong ones, and following it would leak
 *    the answer into the shared picture;
 *  - the card is never told which option is correct (neutrality is structural,
 *    not a styling choice that could be undone);
 *  - Legends shares the photo in its CURRENT plate state — an unsolved face goes
 *    out still covered, a solved one goes out open.
 */
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

// --- controllable mock state -------------------------------------------------

const CLASSIC_IMG = 'file:///local/sport-question.png';
const LEGEND_IMG = 'file:///local/legend-face.png';

const mockClassicQuestion = {
  id: 501,
  question: 'Which country won the 2018 FIFA World Cup?',
  options: ['France', 'Croatia', 'Belgium', 'England'],
  correctIndex: 0,
  correctAnswer: 'France',
  imageUri: CLASSIC_IMG,
  explanation: 'France beat Croatia 4-2 in Moscow.',
};

const mockLegendQuestion = {
  id: 902,
  question: 'Who is this?',
  options: ['Pelé', 'Maradona', 'Cruyff', 'Zidane'],
  correctIndex: 1,
  correctAnswer: 'Maradona',
  imageUri: LEGEND_IMG,
  explanation: 'Argentine forward, 1986 World Cup winner.',
};

let mockSolved: Record<number, boolean> = {};
let mockRevealedPlates: Record<number, number[]> = {};
let mockParams: Record<string, string> = {};

const mockShareQuestionImage = jest.fn();
const mockIsSolved = jest.fn((id: number) => !!mockSolved[id]);
const mockMarkSolved = jest.fn((id: number) => {
  mockSolved[id] = true;
});

// --- module boundaries -------------------------------------------------------

// useSportQuiz throws outside its provider, so the hook is mocked rather than wrapped.
jest.mock('@/hooks/sport-quiz/use-sport-quiz', () => ({
  useSportQuiz: () => ({
    coins: 9999,
    addCoins: jest.fn(),
    spendCoins: jest.fn(() => true),
    isSolved: mockIsSolved,
    markSolved: mockMarkSolved,
    setLastLevel: jest.fn(),
    revealedPlatesFor: (id: number) => mockRevealedPlates[id] ?? [],
    revealPlate: jest.fn(),
  }),
}));
jest.mock('@/hooks/sport-quiz/use-sport-quiz-content', () => ({
  useSportQuizContent: () => ({ snapshot: { app: null } }),
}));
// Both screens freeze their run list at mount from these helpers.
jest.mock('@/lib/sport-quiz/content', () => ({
  questionsForLevel: () => [mockClassicQuestion],
}));
jest.mock('@/lib/sport-quiz/legends', () => ({
  legendsQuestionsForLevel: () => [mockLegendQuestion],
}));
jest.mock('@/hooks/use-locale', () => ({ useLocale: () => ({ locale: 'en' }) }));
jest.mock('@/lib/store-links', () => ({
  getStoreLinks: () => ({ storeUrl: 'https://store.example/sport-quiz' }),
}));
jest.mock('@/lib/flags-quiz/share-image', () => ({
  shareQuestionImage: (...a: unknown[]) => mockShareQuestionImage(...a),
}));

// native / visual-only siblings
// reanimated is mocked globally — see __mocks__/react-native-reanimated.js
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
}));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return { LinearGradient: View };
});
jest.mock('expo-image', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');
  return { Image: (props: Record<string, unknown>) => ReactModule.createElement(View, props) };
});
jest.mock('react-native-safe-area-context', () => {
  const ReactModule = require('react');
  const { View: RNView } = require('react-native');
  return {
    SafeAreaView: ({ children, ...props }: { children: React.ReactNode }) =>
      ReactModule.createElement(RNView, props, children),
  };
});
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('@/components/sport-quiz/app-background', () => ({ AppBackground: () => null }));
// Pulls the axios-backed reports client into the graph otherwise.
jest.mock('@/components/sport-quiz/report-sheet', () => ({ ReportSheet: () => null }));
// The icon buttons carry no label; expose each glyph as a testID so the test can
// press exactly the share button.
jest.mock('@/components/sport-quiz/ui', () => {
  const ReactModule = require('react');
  const { Pressable, View } = require('react-native');
  return {
    neonGlow: () => ({}),
    CoinIcon: () => null,
    CoinPill: () => null,
    GlassIconButton: ({ glyph, onPress }: { glyph: string; onPress: () => void }) =>
      ReactModule.createElement(Pressable, { testID: `icon-${glyph}`, onPress }, ReactModule.createElement(View)),
  };
});

// Record every prop the share composition is handed.
let shareCardProps: Record<string, unknown> | null = null;
jest.mock('@/components/sport-quiz/share-card', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');
  return {
    SportShareCard: ReactModule.forwardRef((props: Record<string, unknown>, _ref: unknown) => {
      shareCardProps = props;
      return ReactModule.createElement(View, { testID: 'share-card' });
    }),
  };
});

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), push: (...a: unknown[]) => mockPush(...a), back: jest.fn() },
  useLocalSearchParams: () => mockParams,
}));

/* eslint-disable import/first -- screens under test must load AFTER their mocks */
import SportQuizQuiz from '@/app/sport-quiz/quiz';
import SportLegendsQuiz from '@/app/sport-quiz/legends-quiz';
/* eslint-enable import/first */

const INVITE = 'Play Sport Quiz! https://store.example/sport-quiz';

beforeEach(() => {
  mockSolved = {};
  mockRevealedPlates = {};
  shareCardProps = null;
  mockShareQuestionImage.mockClear();
});

describe('Classic — sharing a question', () => {
  beforeEach(() => {
    mockParams = { level: '1' };
  });

  it('sends the picture with the unchanged invite text', () => {
    const screen = render(<SportQuizQuiz />);

    fireEvent.press(screen.getByTestId('icon-share-social'));

    expect(mockShareQuestionImage).toHaveBeenCalledTimes(1);
    const [ref, message] = mockShareQuestionImage.mock.calls[0];
    expect(message).toBe(INVITE);
    // A ref object for the card — this is what gets captured to a PNG.
    expect(ref).toHaveProperty('current');
  });

  it('hands the card the question, its picture and all four options', () => {
    render(<SportQuizQuiz />);

    expect(shareCardProps).toMatchObject({
      variant: 'classic',
      prompt: mockClassicQuestion.question,
      imageUri: CLASSIC_IMG,
      options: mockClassicQuestion.options,
    });
  });

  it('never tells the card which option is correct', () => {
    render(<SportQuizQuiz />);

    const props = shareCardProps ?? {};
    expect(props).not.toHaveProperty('correctAnswer');
    expect(props).not.toHaveProperty('correctIndex');
    expect(props).not.toHaveProperty('solved');
    expect(props).not.toHaveProperty('wrongPicked');
  });

  it('still shares ALL FOUR options after the answer is revealed', () => {
    const screen = render(<SportQuizQuiz />);

    // Answering unmounts the wrong options ON SCREEN...
    fireEvent.press(screen.getByText('France'));
    expect(screen.queryByText('Croatia')).toBeNull();

    // ...but the shared card must stay a complete, unspoiled quiz.
    expect(shareCardProps).toMatchObject({ options: mockClassicQuestion.options });
  });

  it('shares a text-only question with no picture', () => {
    const textOnly = { ...mockClassicQuestion, imageUri: null };
    jest.spyOn(require('@/lib/sport-quiz/content'), 'questionsForLevel').mockReturnValue([textOnly]);

    render(<SportQuizQuiz />);

    expect(shareCardProps).toMatchObject({ prompt: textOnly.question, imageUri: null });
  });
});

describe('Legends — sharing a face', () => {
  beforeEach(() => {
    mockParams = { level: '1', q: String(mockLegendQuestion.id) };
  });

  it('sends the picture with the unchanged invite text', () => {
    const screen = render(<SportLegendsQuiz />);

    fireEvent.press(screen.getByTestId('icon-share-social'));

    expect(mockShareQuestionImage).toHaveBeenCalledTimes(1);
    expect(mockShareQuestionImage.mock.calls[0][1]).toBe(INVITE);
  });

  it('shares an unsolved face STILL UNDER the plates the player has not bought', () => {
    mockRevealedPlates = { [mockLegendQuestion.id]: [0, 3] };

    render(<SportLegendsQuiz />);

    expect(shareCardProps).toMatchObject({
      variant: 'legends',
      imageUri: LEGEND_IMG,
      options: mockLegendQuestion.options,
      revealAll: false,
    });
    // Only the two plates the player paid for are open.
    expect([...(shareCardProps?.revealedPlates as Set<number>)]).toEqual([0, 3]);
  });

  it('shares the open photo once the face is guessed', () => {
    const screen = render(<SportLegendsQuiz />);

    expect(shareCardProps).toMatchObject({ revealAll: false });

    fireEvent.press(screen.getByText('Maradona'));

    expect(shareCardProps).toMatchObject({ revealAll: true });
  });

  it('keeps the name options neutral even after solving', () => {
    const screen = render(<SportLegendsQuiz />);

    fireEvent.press(screen.getByText('Maradona'));

    // All four names still go out, with no marker for the right one.
    expect(shareCardProps).toMatchObject({ options: mockLegendQuestion.options });
    expect(shareCardProps ?? {}).not.toHaveProperty('correctAnswer');
  });
});
