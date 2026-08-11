/**
 * Tests for the v1→v2 storage migration and solved-question tracking in
 * hooks/logo-quiz/use-logo-quiz.tsx.
 *
 * The store bumped its persistence key to 'logoquiz.state.v2' when progress
 * changed from a per-category next-index counter to a set of solved question
 * ids. On first v2 hydrate (no v2 blob yet) the store performs a ONE-TIME
 * migration from the legacy v1 blob: it carries the economy forward
 * (coins / isPremium / lives / rateRewarded / wheelLastSpinAt) but drops the old
 * progress/completed maps (they never recorded WHICH questions were solved) and
 * starts solvedIds empty. These tests lock that data-integrity behaviour so a
 * future storage bump can't silently wipe a returning player's coins/premium,
 * and cover markSolved idempotency.
 */
import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { LogoQuizProvider, useLogoQuiz } from '@/hooks/logo-quiz/use-logo-quiz';
import { MAX_LIVES, STARTING_COINS } from '@/lib/logo-quiz/economy';

const V1_KEY = 'logoquiz.state.v1';
const V2_KEY = 'logoquiz.state.v2';
const T = 1_700_000_000_000; // fixed "now" for deterministic time assertions

function wrapper({ children }: { children: React.ReactNode }) {
  return <LogoQuizProvider>{children}</LogoQuizProvider>;
}

async function renderReady() {
  const view = renderHook(() => useLogoQuiz(), { wrapper });
  await waitFor(() => expect(view.result.current.ready).toBe(true));
  return view;
}

async function readV2(): Promise<Record<string, unknown>> {
  return JSON.parse((await AsyncStorage.getItem(V2_KEY)) ?? '{}');
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.restoreAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('v1 → v2 migration on first hydrate', () => {
  it('carries the economy forward and drops the old progress/completed maps', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(T);
    // A returning player's legacy v1 blob — full economy + the now-defunct
    // per-category progress/completed maps.
    await AsyncStorage.setItem(
      V1_KEY,
      JSON.stringify({
        coins: 640,
        isPremium: true,
        lives: { lives: 2, updatedAt: T },
        progress: { cars: 5, flags: 3 },
        completed: { cars: true },
        rateRewarded: true,
        wheelLastSpinAt: T - 1000,
      }),
    );

    const { result } = await renderReady();

    // Economy carried over verbatim.
    expect(result.current.coins).toBe(640);
    expect(result.current.isPremium).toBe(true);
    expect(result.current.livesState.lives).toBe(2);
    expect(result.current.rateRewarded).toBe(true);
    expect(result.current.wheelLastSpinAt).toBe(T - 1000);
    // Fresh level progress — the old maps cannot map onto solved question ids.
    expect(result.current.solvedIds).toEqual({});

    // The sanitized state is persisted under the v2 key, without the legacy maps.
    const saved = await readV2();
    expect(saved.coins).toBe(640);
    expect(saved.isPremium).toBe(true);
    expect((saved.lives as { lives: number }).lives).toBe(2);
    expect(saved.rateRewarded).toBe(true);
    expect(saved.solvedIds).toEqual({});
    expect(saved.progress).toBeUndefined();
    expect(saved.completed).toBeUndefined();
  });

  it('falls back to a fresh economy when there is no legacy v1 blob', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(T);
    // Neither v1 nor v2 present (a brand-new install).
    const { result } = await renderReady();

    expect(result.current.coins).toBe(STARTING_COINS);
    expect(result.current.livesState.lives).toBe(MAX_LIVES);
    expect(result.current.isPremium).toBe(false);
    expect(result.current.rateRewarded).toBe(false);
    expect(result.current.wheelLastSpinAt).toBe(0);
    expect(result.current.solvedIds).toEqual({});
  });

  it('uses an existing v2 blob and never re-runs the legacy migration', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(T);
    // A stale v1 blob is present, but v2 already exists — v2 must win and the
    // v1 economy must be ignored (migration is one-time only).
    await AsyncStorage.setItem(
      V1_KEY,
      JSON.stringify({
        coins: 999,
        isPremium: true,
        lives: { lives: 1, updatedAt: T },
        progress: {},
        completed: {},
        rateRewarded: true,
        wheelLastSpinAt: 0,
      }),
    );
    await AsyncStorage.setItem(
      V2_KEY,
      JSON.stringify({
        coins: 50,
        isPremium: false,
        lives: { lives: 3, updatedAt: T },
        solvedIds: { 7: true, 12: true },
        rateRewarded: false,
        wheelLastSpinAt: 0,
      }),
    );

    const { result } = await renderReady();

    expect(result.current.coins).toBe(50); // from v2, not the v1 999
    expect(result.current.isPremium).toBe(false);
    expect(result.current.solvedIds).toEqual({ 7: true, 12: true });
    expect(result.current.isSolved(7)).toBe(true);
  });
});

describe('markSolved', () => {
  it('records a solved question and persists it', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(T);
    const { result } = await renderReady();

    expect(result.current.isSolved(42)).toBe(false);

    await act(async () => {
      result.current.markSolved(42);
    });

    expect(result.current.isSolved(42)).toBe(true);
    expect(result.current.solvedIds).toEqual({ 42: true });
    const saved = await readV2();
    expect((saved.solvedIds as Record<number, true>)[42]).toBe(true);
  });

  it('is idempotent — a second call for the same id changes nothing and does not persist', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(T);
    const { result } = await renderReady();

    await act(async () => {
      result.current.markSolved(42);
    });
    expect(result.current.solvedIds).toEqual({ 42: true });

    // From here, a repeat solve must be a no-op: no state change, no write.
    (AsyncStorage.setItem as jest.Mock).mockClear();
    await act(async () => {
      result.current.markSolved(42);
    });

    expect(result.current.isSolved(42)).toBe(true);
    expect(result.current.solvedIds).toEqual({ 42: true }); // still exactly one entry
    expect(AsyncStorage.setItem).not.toHaveBeenCalled(); // early return, no persist
  });
});
