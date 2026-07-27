/**
 * Tests for the DEV/QA reset helpers in hooks/logo-quiz/use-logo-quiz.tsx as they
 * relate to the Wheel of Fortune cooldown. Two paths must reopen the free spin:
 *   - resetProgress() — the Settings "Сброс прогресса (DEV)" button — now clears
 *     wheelLastSpinAt IN ADDITION to wiping progress/completed (so a tester who
 *     resets progress immediately gets the wheel back), and
 *   - resetWheelCooldown() — the wheel screen's own DEV button — clears ONLY the
 *     wheel timer, leaving coins / lives / progress / completed untouched.
 * After either, canSpinWheel() must be true and the cleared wheelLastSpinAt (0)
 * must be persisted to AsyncStorage.
 */
import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { LogoQuizProvider, useLogoQuiz } from '@/hooks/logo-quiz/use-logo-quiz';
import { RATE_APP_REWARD_COINS, STARTING_COINS, wheelPrizeById } from '@/lib/logo-quiz/economy';

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

describe('resetProgress — also clears the wheel cooldown', () => {
  it('after a spin (cooldown active), resetProgress reopens the spin and persists wheelLastSpinAt=0', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(T);
    const { result } = await renderReady();

    // Spin to arm the 24h cooldown.
    await act(async () => {
      result.current.spinWheel(wheelPrizeById('coins100'));
    });
    expect(result.current.wheelLastSpinAt).toBe(T);
    expect(result.current.canSpinWheel()).toBe(false);

    // DEV "Сброс прогресса" — must also drop the wheel timer.
    await act(async () => {
      result.current.resetProgress();
    });

    expect(result.current.wheelLastSpinAt).toBe(0);
    expect(result.current.canSpinWheel()).toBe(true);
    const saved = await readPersisted();
    expect(saved.wheelLastSpinAt).toBe(0);
  });

  it('still wipes progress and completed maps in addition to the wheel cooldown', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(T);
    const { result } = await renderReady();

    await act(async () => {
      result.current.setProgress('geography', 5);
      result.current.markCompleted('history');
      result.current.spinWheel(wheelPrizeById('coins100'));
    });
    // Preconditions: progress recorded, a category completed, cooldown armed.
    expect(result.current.progressMap.geography).toBe(5);
    expect(result.current.completedMap.history).toBe(true);
    expect(result.current.canSpinWheel()).toBe(false);

    await act(async () => {
      result.current.resetProgress();
    });

    expect(result.current.progressMap).toEqual({});
    expect(result.current.completedMap).toEqual({});
    expect(result.current.wheelLastSpinAt).toBe(0);
    expect(result.current.canSpinWheel()).toBe(true);
    const saved = await readPersisted();
    expect(saved.progress).toEqual({});
    expect(saved.completed).toEqual({});
    expect(saved.wheelLastSpinAt).toBe(0);
  });
});

describe('resetWheelCooldown — clears ONLY the wheel timer', () => {
  it('reopens the spin without touching coins, lives, progress or completed', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(T);
    const { result } = await renderReady();

    // Build up some state, then arm the cooldown.
    await act(async () => {
      result.current.buyCoins({ id: 'coins_500', coins: 500, price: '$3.99' });
      result.current.setProgress('science', 3);
      result.current.markCompleted('sports');
      result.current.spinWheel(wheelPrizeById('coins100')); // +100 coins, arms cooldown
    });

    const coinsBefore = result.current.coins; // STARTING + 500 + 100
    const livesBefore = result.current.livesState;
    expect(coinsBefore).toBe(STARTING_COINS + 500 + 100);
    expect(result.current.canSpinWheel()).toBe(false);

    await act(async () => {
      result.current.resetWheelCooldown();
    });

    // Wheel reopened...
    expect(result.current.wheelLastSpinAt).toBe(0);
    expect(result.current.canSpinWheel()).toBe(true);
    // ...but economy and progress are untouched.
    expect(result.current.coins).toBe(coinsBefore);
    expect(result.current.livesState).toEqual(livesBefore);
    expect(result.current.progressMap.science).toBe(3);
    expect(result.current.completedMap.sports).toBe(true);

    const saved = await readPersisted();
    expect(saved.wheelLastSpinAt).toBe(0);
    expect(saved.coins).toBe(coinsBefore);
    expect((saved.progress as Record<string, number>).science).toBe(3);
  });
});

describe('resetProgress — also re-arms the one-time rate-app reward', () => {
  it('after claiming the rate reward, resetProgress clears rateRewarded and persists it as false', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(T);
    const { result } = await renderReady();

    // Claim the one-time "+coins for rating the app" reward → flag is now set.
    await act(async () => {
      result.current.claimRateReward();
    });
    expect(result.current.rateRewarded).toBe(true);
    expect((await readPersisted()).rateRewarded).toBe(true);

    // DEV "Сброс прогресса" must make the reward (and its Home badge) available again.
    await act(async () => {
      result.current.resetProgress();
    });

    expect(result.current.rateRewarded).toBe(false);
    expect((await readPersisted()).rateRewarded).toBe(false);
  });

  it('re-arms the reward WITHOUT wiping coins, lives or premium', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(T);
    const { result } = await renderReady();

    // Build up economy/account state, then claim the rate reward.
    await act(async () => {
      result.current.buyPremium();
      result.current.buyCoins({ id: 'coins_500', coins: 500, price: '$3.99' });
      result.current.claimRateReward(); // +RATE_APP_REWARD_COINS, sets the flag
    });

    const coinsBefore = result.current.coins; // STARTING + 500 + rate reward
    const livesBefore = result.current.livesState;
    expect(coinsBefore).toBe(STARTING_COINS + 500 + RATE_APP_REWARD_COINS);
    expect(result.current.isPremium).toBe(true);
    expect(result.current.rateRewarded).toBe(true);

    await act(async () => {
      result.current.resetProgress();
    });

    // Reward re-armed...
    expect(result.current.rateRewarded).toBe(false);
    // ...but coins / lives / premium are left intact.
    expect(result.current.coins).toBe(coinsBefore);
    expect(result.current.livesState).toEqual(livesBefore);
    expect(result.current.isPremium).toBe(true);

    const saved = await readPersisted();
    expect(saved.rateRewarded).toBe(false);
    expect(saved.coins).toBe(coinsBefore);
    expect(saved.isPremium).toBe(true);
  });
});
