/**
 * Sport Quiz splash gating (app/sport-quiz/splash.tsx).
 *
 * On a FRESH INSTALL the content sync is still downloading question artwork when
 * the 3s splash would normally hand off, so the player used to walk into Classic
 * and watch the pictures appear in front of them. The splash now holds past its
 * floor until the sync reports the first levels' images are on disk — but never
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

const mockLoadAsync = jest.fn();
jest.mock('expo-asset', () => ({
  Asset: { loadAsync: (...args: unknown[]) => mockLoadAsync(...args) },
}));

const mockPrefetch = jest.fn();
jest.mock('expo-image', () => ({
  Image: { prefetch: (...args: unknown[]) => mockPrefetch(...args) },
}));

// The gate under test. Mutated per test, then re-rendered to simulate the flip.
let mockCtx: { snapshot: unknown; priorityReady: boolean } = {
  snapshot: null,
  priorityReady: false,
};
jest.mock('@/hooks/sport-quiz/use-sport-quiz-content', () => ({
  useSportQuizContent: () => mockCtx,
}));

const mockQuestionsForLevel = jest.fn();
jest.mock('@/lib/sport-quiz/content', () => ({
  questionsForLevel: (...args: unknown[]) => mockQuestionsForLevel(...args),
}));

jest.mock('@/constants/sport-quiz/labels', () => ({
  useSQLabels: () => ({ splashTagline: 'Play the game!' }),
}));

// eslint-disable-next-line import/first -- screen under test loads AFTER its mocks
import SportQuizSplash from '@/app/sport-quiz/splash';

const SPLASH_MS = 3000;
const CAP_MS = 6000;

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
  mockLoadAsync.mockReset();
  mockLoadAsync.mockResolvedValue(undefined);
  mockQuestionsForLevel.mockReset();
  mockQuestionsForLevel.mockReturnValue([]);
  mockCtx = { snapshot: null, priorityReady: false };
});

afterEach(() => {
  jest.useRealTimers();
});

describe('Sport Quiz splash — priority image gate', () => {
  it('still honours the 3s floor when the images are already ready', () => {
    // A returning player: cached snapshot, gate open from the first render.
    mockCtx = { snapshot: null, priorityReady: true };
    render(<SportQuizSplash />);

    advance(SPLASH_MS - 1);
    expect(mockReplace).not.toHaveBeenCalled();

    advance(1);
    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith('/sport-quiz');
  });

  it('holds past the floor while the images are still downloading', () => {
    const { rerender } = render(<SportQuizSplash />);

    // Fresh install: 3s is up but the priority batch has not landed.
    advance(SPLASH_MS);
    expect(mockReplace).not.toHaveBeenCalled();

    // The sync finishes batch 0 a second later.
    advance(1000);
    mockCtx = { snapshot: null, priorityReady: true };
    act(() => {
      rerender(<SportQuizSplash />);
    });

    expect(mockReplace).toHaveBeenCalledTimes(1);
  });

  it('gives up at the hard cap and lets the player in anyway', () => {
    render(<SportQuizSplash />);

    advance(CAP_MS - 1);
    expect(mockReplace).not.toHaveBeenCalled();

    // Slow network, images never arrived — a partly-stocked game still beats
    // being trapped on a splash.
    advance(1);
    expect(mockReplace).toHaveBeenCalledTimes(1);
  });

  it('navigates exactly once even after the gate opens post-cap', () => {
    const { rerender } = render(<SportQuizSplash />);

    advance(CAP_MS);
    expect(mockReplace).toHaveBeenCalledTimes(1);

    mockCtx = { snapshot: null, priorityReady: true };
    act(() => {
      rerender(<SportQuizSplash />);
    });
    advance(2000);

    expect(mockReplace).toHaveBeenCalledTimes(1);
  });

  it('is never delayed by a bundled-asset preload that never settles', () => {
    // The regression guard on the old Promise.all([preload, wait]): a hanging
    // Asset.loadAsync (not a REJECTING one — .catch already covered that) used
    // to hold the splash forever.
    mockLoadAsync.mockReturnValue(new Promise(() => {}));
    mockCtx = { snapshot: null, priorityReady: true };

    render(<SportQuizSplash />);
    advance(SPLASH_MS);

    expect(mockReplace).toHaveBeenCalledTimes(1);
  });

  it('does not navigate after being unmounted', () => {
    const { unmount } = render(<SportQuizSplash />);

    unmount();
    advance(CAP_MS + 1000);

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('hands level 1 to the decode cache on the way out', () => {
    const local = 'file:///docs/snapshot-images-sport-quiz/1_image';
    mockQuestionsForLevel.mockReturnValue([{ id: 1, imageUri: local }]);
    mockCtx = { snapshot: { questions: [] }, priorityReady: true };

    render(<SportQuizSplash />);
    advance(SPLASH_MS);

    // Bytes on disk still cost a decode frame — warm it before the first render.
    expect(mockPrefetch).toHaveBeenCalledWith([local], { cachePolicy: 'memory-disk' });
  });
});
