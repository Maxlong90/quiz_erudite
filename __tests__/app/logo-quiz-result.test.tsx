/**
 * Integration tests for the Logo Quiz Victory/result screen (app/logo-quiz/result.tsx)
 * AFTER the history panel moved into the quiz screen. The result screen must now
 * show ONLY the title + primary action (+ confetti on a win), never a history
 * block, and no bottom "Home" button, for both the level-cleared ('complete') and
 * 'gameover' outcomes.
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

describe('result screen shows title + primary action only, no history or Home', () => {
  it('level cleared (complete): "Level Complete" + "Back to levels", no history, no Home', () => {
    mockParams = { score: '2', total: '2', outcome: 'complete' };
    const screen = render(<LogoQuizResult />);

    // Win title (the outlined title stacks several offset copies of the text).
    expect(screen.getAllByText('Level Complete').length).toBeGreaterThan(0);
    // Primary action returns to the level list.
    expect(screen.getByText('Back to levels')).toBeTruthy();

    // The history block never lives on the result screen…
    expect(screen.queryByText('History')).toBeNull();
    // …and the bottom "Home" button was removed.
    expect(screen.queryByText('Home')).toBeNull();
  });

  it('game over: "Try later" + "Go to Shop", no history, no Home, no Next', () => {
    mockParams = { score: '1', total: '2', outcome: 'gameover' };
    const screen = render(<LogoQuizResult />);

    expect(screen.getAllByText('Try later').length).toBeGreaterThan(0);
    expect(screen.getByText('Go to Shop')).toBeTruthy();

    expect(screen.queryByText('History')).toBeNull();
    // The bottom "Home" button was removed on the game-over outcome too.
    expect(screen.queryByText('Home')).toBeNull();
    // And the mid-round "Next" continuation button no longer exists here.
    expect(screen.queryByText('Next')).toBeNull();
  });
});
