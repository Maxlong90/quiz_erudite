/**
 * The configurable template's splash and its NETWORK WINDOW (app/t/splash.tsx).
 *
 * The window exists for exactly one launch: the FIRST EVER one, where holding a
 * beat for the theme means the first painted screen already carries the
 * operator's colours instead of flashing the bundled palette and flipping. On
 * every later launch a 304 resolves well inside the floor and the wait is free.
 *
 * Both ends of that window are locked below, plus the fail-open behaviour: the
 * splash leaves on ANY settlement — including a failure — and the cap fires on a
 * timer nothing can cancel.
 */
import React from 'react';
import { act, render } from '@testing-library/react-native';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  router: { replace: (...args: unknown[]) => mockReplace(...args) },
}));

jest.mock('@/api/client', () => ({
  APP_SLUG: 'configurable-quiz',
  API_URL: 'https://example.test/api/v1',
  apiClient: { get: jest.fn() },
}));

// The two gates under test, driven directly rather than through the real engine:
// this test is about the TIMING contract, not about how the tiers resolve.
let mockThemeValue: { hydrated: boolean; networkSettled: boolean } | null = {
  hydrated: false,
  networkSettled: false,
};
jest.mock('@/hooks/use-app-theme', () => ({
  useAppTheme: () => mockThemeValue,
}));

/* eslint-disable import/first -- screen under test loads AFTER its mocks */
import TTemplateSplash from '@/app/t/splash';
import { ThemePrefProvider } from '@/hooks/use-theme-pref';

const FLOOR_MS = 1500;
const CAP_MS = 3500;

/** The splash paints through ScreenBackground, which needs the appearance pref. */
function Splash() {
  return (
    <ThemePrefProvider>
      <TTemplateSplash />
    </ThemePrefProvider>
  );
}

function advance(ms: number) {
  act(() => {
    jest.advanceTimersByTime(ms);
  });
}

/** Flip the engine gates and re-render, the way a real state update would. */
function settle(rerender: (ui: React.ReactElement) => void) {
  mockThemeValue = { hydrated: true, networkSettled: true };
  act(() => {
    rerender(<Splash />);
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  mockReplace.mockClear();
  mockThemeValue = { hydrated: false, networkSettled: false };
});

afterEach(() => {
  jest.useRealTimers();
});

describe('t splash', () => {
  it('honours the brand floor even when the theme is already settled', () => {
    mockThemeValue = { hydrated: true, networkSettled: true };
    render(<Splash />);

    advance(FLOOR_MS - 1);
    expect(mockReplace).not.toHaveBeenCalled();

    advance(1);
    expect(mockReplace).toHaveBeenCalledWith('/t');
  });

  it('holds past the floor while the theme is still in flight', () => {
    const { rerender } = render(<Splash />);

    advance(FLOOR_MS + 500);
    // This hold is the whole point: leaving now would paint the bundled palette
    // and then flip to the operator's a moment later.
    expect(mockReplace).not.toHaveBeenCalled();

    settle(rerender);
    expect(mockReplace).toHaveBeenCalledWith('/t');
  });

  it('waits for the cache read as well as the network', () => {
    const { rerender } = render(<Splash />);
    advance(FLOOR_MS + 100);

    mockThemeValue = { hydrated: false, networkSettled: true };
    act(() => rerender(<Splash />));
    expect(mockReplace).not.toHaveBeenCalled();

    settle(rerender);
    expect(mockReplace).toHaveBeenCalledWith('/t');
  });

  it('leaves at the hard cap when the theme never settles', () => {
    render(<Splash />);

    advance(CAP_MS - 1);
    expect(mockReplace).not.toHaveBeenCalled();

    // Being stuck on a splash is worse than a bundled palette.
    advance(1);
    expect(mockReplace).toHaveBeenCalledWith('/t');
  });

  it('navigates exactly once, even if the gate opens after the cap fired', () => {
    const { rerender } = render(<Splash />);

    advance(CAP_MS + 10);
    expect(mockReplace).toHaveBeenCalledTimes(1);

    settle(rerender);
    advance(1000);
    expect(mockReplace).toHaveBeenCalledTimes(1);
  });

  it('never navigates after unmount', () => {
    const { unmount } = render(<Splash />);
    unmount();

    advance(CAP_MS * 2);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('leaves at the floor when the fetch failed (settled, not successful)', () => {
    // fetchAppTheme never throws and networkSettled flips on ANY settlement, so
    // an offline launch exits at the floor rather than waiting for the cap.
    const { rerender } = render(<Splash />);
    settle(rerender);

    advance(FLOOR_MS);
    expect(mockReplace).toHaveBeenCalledWith('/t');
  });

  it('exits at the floor when there is no theme provider at all', () => {
    mockThemeValue = null;
    render(<Splash />);

    advance(FLOOR_MS);
    expect(mockReplace).toHaveBeenCalledWith('/t');
  });

  it('keeps the fetch timeout strictly inside the cap', () => {
    // Otherwise the cap, not the fetch timeout, becomes the normal exit path on a
    // black-hole network — and every such launch would cost the full 3.5s.
    const { THEME_FETCH_TIMEOUT_MS } = require('@/lib/theme/theme-api');
    expect(THEME_FETCH_TIMEOUT_MS).toBeLessThan(CAP_MS);
    expect(FLOOR_MS).toBeLessThan(CAP_MS);
  });
});
