/**
 * Coat of Arms splash gating (app/coat-of-arms/splash.tsx).
 *
 * On a FRESH INSTALL the content sync is still downloading coat artwork when the
 * 3s splash would normally hand off, so the player used to walk into the game and
 * watch the coats appear in front of them. The splash now holds past its floor
 * until the sync reports the first PRIORITY_COUNT coats are on disk — but never
 * past a hard cap, because being stuck on a splash is worse than a partly-stocked
 * game. These tests lock both ends of that window, plus the fail-open behaviour.
 *
 * The content provider is mocked so `priorityReady` is driven by the test.
 */
import React from 'react';
import { act, render } from '@testing-library/react-native';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  router: { replace: (...args: unknown[]) => mockReplace(...args) },
}));

const mockPrefetch = jest.fn();
jest.mock('expo-image', () => ({
  Image: { prefetch: (...args: unknown[]) => mockPrefetch(...args) },
}));

// The gate under test. Mutated per test, then re-rendered to simulate the flip.
let mockCtx: {
  countryQuestions: { imageUri: string | null; originalImageUri: string | null }[];
  priorityReady: boolean;
} = {
  countryQuestions: [],
  priorityReady: false,
};
jest.mock('@/hooks/coat-of-arms/use-coat-content', () => ({
  useCoatContent: () => mockCtx,
}));

jest.mock('@/constants/flags-quiz/labels', () => ({
  useFQLabels: () => ({ tagline: 'Play the game!' }),
}));

// Stub the content lib so the splash never pulls the real content-cache → axios
// chain. PRIORITY_COUNT is the only export the splash needs from here.
const PRIORITY_COUNT = 15;
jest.mock('@/lib/coat-of-arms/content', () => ({ PRIORITY_COUNT: 15 }));

// eslint-disable-next-line import/first -- screen under test loads AFTER its mocks
import CoatOfArmsSplash from '@/app/coat-of-arms/splash';

const SPLASH_MS = 3000;
const CAP_MS = 7000;

function advance(ms: number) {
  act(() => {
    jest.advanceTimersByTime(ms);
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  mockReplace.mockReset();
  mockPrefetch.mockReset();
  mockPrefetch.mockResolvedValue(undefined);
  mockCtx = { countryQuestions: [], priorityReady: false };
});

afterEach(() => {
  jest.useRealTimers();
});

describe('Coat of Arms splash — priority image gate', () => {
  it('still honours the 3s floor when the coats are already ready', () => {
    // A returning player: cached snapshot, gate open from the first render.
    mockCtx = { countryQuestions: [], priorityReady: true };
    render(<CoatOfArmsSplash />);

    advance(SPLASH_MS - 1);
    expect(mockReplace).not.toHaveBeenCalled();

    advance(1);
    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith('/coat-of-arms');
  });

  it('holds past the floor while the coats are still downloading', () => {
    const { rerender } = render(<CoatOfArmsSplash />);

    // Fresh install: 3s is up but the priority batch has not landed.
    advance(SPLASH_MS);
    expect(mockReplace).not.toHaveBeenCalled();

    // The sync finishes batch 0 a second later.
    advance(1000);
    mockCtx = { countryQuestions: [], priorityReady: true };
    act(() => {
      rerender(<CoatOfArmsSplash />);
    });

    expect(mockReplace).toHaveBeenCalledTimes(1);
  });

  it('gives up at the hard cap and lets the player in anyway', () => {
    render(<CoatOfArmsSplash />);

    advance(CAP_MS - 1);
    expect(mockReplace).not.toHaveBeenCalled();

    // Slow network, coats never arrived — a partly-stocked game still beats
    // being trapped on a splash.
    advance(1);
    expect(mockReplace).toHaveBeenCalledTimes(1);
  });

  it('navigates exactly once even after the gate opens post-cap', () => {
    const { rerender } = render(<CoatOfArmsSplash />);

    advance(CAP_MS);
    expect(mockReplace).toHaveBeenCalledTimes(1);

    mockCtx = { countryQuestions: [], priorityReady: true };
    act(() => {
      rerender(<CoatOfArmsSplash />);
    });
    advance(2000);

    expect(mockReplace).toHaveBeenCalledTimes(1);
  });

  it('does not navigate after being unmounted', () => {
    const { unmount } = render(<CoatOfArmsSplash />);

    unmount();
    advance(CAP_MS + 1000);

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('hands the first porción to the decode cache on the way out', () => {
    const coat = 'file:///docs/snapshot-images-coat-of-arms/1_image';
    const original = 'file:///docs/snapshot-images-coat-of-arms/1_original';
    // More questions than PRIORITY_COUNT: only the first porción must be warmed.
    const questions = Array.from({ length: PRIORITY_COUNT + 5 }, (_, i) => ({
      imageUri: i === 0 ? coat : `remote://coat/${i}`,
      originalImageUri: i === 0 ? original : null,
    }));
    mockCtx = { countryQuestions: questions, priorityReady: true };

    render(<CoatOfArmsSplash />);
    advance(SPLASH_MS);

    expect(mockReplace).toHaveBeenCalledTimes(1);
    // Local first-porción files are warmed; remote uris are skipped by
    // prefetchLocalImages, so exactly the two local ones land.
    expect(mockPrefetch).toHaveBeenCalledWith([coat, original], { cachePolicy: 'memory-disk' });
  });
});
