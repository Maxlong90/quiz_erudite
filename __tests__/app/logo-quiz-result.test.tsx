/**
 * Integration tests for the Logo Quiz Victory/result screen (app/logo-quiz/result.tsx)
 * AFTER explanations moved into the quiz screen. The result screen must now show
 * ONLY the score + actions (+ confetti on a win) and never render an explanations
 * block, for both the level-cleared ('complete') and 'gameover' outcomes.
 */
import React from 'react';
import { render } from '@testing-library/react-native';

let mockParams: Record<string, string> = {};

jest.mock('@/hooks/logo-quiz/use-logo-quiz', () => ({
  useLogoQuiz: () => ({
    coins: 100,
    isPremium: false,
    livesState: { lives: 3, updatedAt: 0 },
  }),
  useNow: () => 0,
}));
jest.mock('@/hooks/use-locale', () => ({ useLocale: () => ({ locale: 'en' }) }));
jest.mock('@/lib/logo-quiz/economy', () => ({
  formatCountdown: () => '00:30',
  msUntilNextLife: () => null, // full → the regen countdown row is skipped
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
jest.mock('@/components/logo-quiz/confetti', () => ({ Confetti: () => null }));
jest.mock('@/components/logo-quiz/hud', () => ({ CoinPill: () => null, LivesPill: () => null }));
jest.mock('@/components/logo-quiz/gold-gradient', () => {
  const { View: RNView } = require('react-native');
  return { GoldButton: ({ children }: { children: React.ReactNode }) => <RNView>{children}</RNView> };
});

jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), push: jest.fn(), dismissTo: jest.fn() },
  useLocalSearchParams: () => mockParams,
}));

// eslint-disable-next-line import/first -- screen under test must load AFTER its mocks
import LogoQuizResult from '@/app/logo-quiz/result';

describe('result screen shows score + actions only, never explanations', () => {
  it('level cleared (complete): score + "Back to levels", no explanations', () => {
    mockParams = { score: '2', total: '2', outcome: 'complete' };
    const screen = render(<LogoQuizResult />);

    expect(screen.getByText('Round complete!')).toBeTruthy();
    expect(screen.getByText('Score')).toBeTruthy();
    expect(screen.getByText('Back to levels')).toBeTruthy();

    // The explanations block is gone from the result screen.
    expect(screen.queryByText('Explanations')).toBeNull();
  });

  it('game over: score + "Go to Shop", no explanations', () => {
    mockParams = { score: '1', total: '2', outcome: 'gameover' };
    const screen = render(<LogoQuizResult />);

    expect(screen.getByText('Game over')).toBeTruthy();
    expect(screen.getByText('Score')).toBeTruthy();
    expect(screen.getByText('Go to Shop')).toBeTruthy();

    expect(screen.queryByText('Explanations')).toBeNull();
    // And the mid-round "Next" continuation button no longer exists here.
    expect(screen.queryByText('Next')).toBeNull();
  });
});
