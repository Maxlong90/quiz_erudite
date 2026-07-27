/**
 * Tests for the Wheel of Fortune economy in hooks/logo-quiz/use-logo-quiz.tsx:
 * spinWheel() must credit coins to the balance and stock lives ON TOP of the bar
 * (like buyLives, so it may exceed MAX_LIVES) while leaving a partial bar's regen
 * anchor untouched for coins-only prizes; and it must stamp wheelLastSpinAt so the
 * 24h cooldown (canSpinWheel) opens exactly 24h later. wheelLastSpinAt is hydrated
 * from persisted state (survives restart) and defaults to 0 for legacy payloads.
 */
import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { LogoQuizProvider, useLogoQuiz } from '@/hooks/logo-quiz/use-logo-quiz';
import {
  MAX_LIVES,
  STARTING_COINS,
  WHEEL_COOLDOWN_MS,
  wheelPrizeById,
} from '@/lib/logo-quiz/economy';

const STORAGE_KEY = 'logoquiz.state.v1';
const T = 1_700_000_000_000; // fixed "now" for deterministic time assertions

function wrapper({ children }: { children: React.ReactNode }) {
  return <LogoQuizProvider>{children}</LogoQuizProvider>;
}

async function renderReady() {
  const view = renderHook(() => useLogoQuiz(), { wrapper });
  await waitFor(() => expect(view.result.current.ready).toBe(true));
  return view;
}

async function readPersisted(): Promise<Record<string, unknown>> {
  return JSON.parse((await AsyncStorage.getItem(STORAGE_KEY)) ?? '{}');
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.restoreAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('spinWheel — reward crediting & persistence', () => {
  it('adds a coin prize to the balance and persists it to AsyncStorage', async () => {
    const { result } = await renderReady();
    expect(result.current.coins).toBe(STARTING_COINS);

    const prize = wheelPrizeById('coins500'); // { coins: 500 }
    await act(async () => {
      result.current.spinWheel(prize);
    });

    expect(result.current.coins).toBe(STARTING_COINS + 500);
    const saved = await readPersisted();
    expect(saved.coins).toBe(STARTING_COINS + 500);
  });

  it('stocks a lives prize ON TOP of a full bar so the count exceeds MAX_LIVES', async () => {
    const { result } = await renderReady();
    // Fresh state starts with a full bar.
    expect(result.current.getLives()).toBe(MAX_LIVES);

    const prize = wheelPrizeById('lives10'); // { lives: 10 }
    await act(async () => {
      result.current.spinWheel(prize);
    });

    // 3 (full bar) + 10 stocked = 13, well above MAX_LIVES.
    expect(result.current.livesState.lives).toBe(MAX_LIVES + 10);
    expect(result.current.getLives()).toBe(MAX_LIVES + 10);
    const saved = await readPersisted();
    expect((saved.lives as { lives: number }).lives).toBe(MAX_LIVES + 10);
  });

  it('a coins-only prize leaves the partial bar regen anchor untouched (no timer reset)', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(T);
    const anchor = T - 5 * 60 * 1000; // 5 min into the 30-min regen, no life gained yet
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        coins: STARTING_COINS,
        isPremium: false,
        lives: { lives: 1, updatedAt: anchor },
        progress: {},
        completed: {},
        rateRewarded: false,
        wheelLastSpinAt: 0,
      }),
    );

    const { result } = await renderReady();
    // Hydration reconciles but does not advance a sub-interval partial bar.
    expect(result.current.livesState.lives).toBe(1);
    expect(result.current.livesState.updatedAt).toBe(anchor);

    await act(async () => {
      result.current.spinWheel(wheelPrizeById('coins100')); // coins only
    });

    // Lives + its regen anchor are untouched; only coins changed.
    expect(result.current.livesState.lives).toBe(1);
    expect(result.current.livesState.updatedAt).toBe(anchor);
    expect(result.current.livesState.updatedAt).not.toBe(T);
    expect(result.current.coins).toBe(STARTING_COINS + 100);
  });
});

describe('canSpinWheel — 24h cooldown', () => {
  it('is available on a fresh account and blocked for exactly 24h after a spin', async () => {
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(T);
    const { result } = await renderReady();

    // Fresh account: wheelLastSpinAt defaults to 0 → spin available.
    expect(result.current.canSpinWheel()).toBe(true);

    await act(async () => {
      result.current.spinWheel(wheelPrizeById('coins100'));
    });

    // Cooldown starts from the moment of the spin.
    expect(result.current.wheelLastSpinAt).toBe(T);
    expect(result.current.canSpinWheel()).toBe(false);

    // One millisecond before 24h have elapsed: still blocked.
    nowSpy.mockReturnValue(T + WHEEL_COOLDOWN_MS - 1);
    expect(result.current.canSpinWheel()).toBe(false);

    // Exactly 24h later: available again.
    nowSpy.mockReturnValue(T + WHEEL_COOLDOWN_MS);
    expect(result.current.canSpinWheel()).toBe(true);
  });
});

describe('wheelLastSpinAt — hydration across restart', () => {
  it('restores a persisted wheelLastSpinAt (spin stays on cooldown after restart)', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(T + 60 * 60 * 1000); // 1h after the stored spin
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        coins: STARTING_COINS,
        isPremium: false,
        lives: { lives: MAX_LIVES, updatedAt: T },
        progress: {},
        completed: {},
        rateRewarded: false,
        wheelLastSpinAt: T,
      }),
    );

    const { result } = await renderReady();

    expect(result.current.wheelLastSpinAt).toBe(T);
    // Only 1h passed since the stored spin → still on cooldown.
    expect(result.current.canSpinWheel()).toBe(false);
  });

  it('defaults a legacy payload without wheelLastSpinAt to 0 (spin available)', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(T);
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        coins: STARTING_COINS,
        isPremium: false,
        lives: { lives: MAX_LIVES, updatedAt: T },
        progress: {},
        completed: {},
        rateRewarded: false,
        // no wheelLastSpinAt (older app version)
      }),
    );

    const { result } = await renderReady();

    expect(result.current.wheelLastSpinAt).toBe(0);
    expect(result.current.canSpinWheel()).toBe(true);
  });
});
