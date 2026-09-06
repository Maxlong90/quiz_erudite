/**
 * Sport Quiz — wheel anchor persistence and the clock-back re-anchor.
 *
 * The pure cooldown maths is covered by __tests__/lib/sport-quiz-wheel.test.ts.
 * What lives here is the other half of the defence, inside
 * hooks/sport-quiz/use-sport-quiz.tsx: on load a wheelLastSpinAt that sits in the
 * FUTURE (device clock wound back after a spin) is clamped to now AND written
 * back, so the correction survives the next restart instead of re-triggering on
 * every launch. Mirrors __tests__/hooks/use-logo-quiz-wheel.test.tsx.
 */
import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { SportQuizProvider, useSportQuiz } from '@/hooks/sport-quiz/use-sport-quiz';
import {
  STARTING_COINS,
  WHEEL_COOLDOWN_MS,
  wheelCooldownRemaining,
  wheelSpinAvailable,
} from '@/lib/sport-quiz/economy';

const COINS_KEY = 'sportquiz.coins.v1';
const WHEEL_KEY = 'sportquiz.wheelLastSpinAt.v1';
const T = 1_700_000_000_000;
const HOUR = 60 * 60 * 1000;

function wrapper({ children }: { children: React.ReactNode }) {
  return <SportQuizProvider>{children}</SportQuizProvider>;
}

async function renderReady() {
  const view = renderHook(() => useSportQuiz(), { wrapper });
  await waitFor(() => expect(view.result.current.ready).toBe(true));
  return view;
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.restoreAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('spinWheel — credits the prize and stamps the cooldown', () => {
  it('adds coins and persists both the balance and the anchor', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(T);
    const { result } = await renderReady();
    expect(result.current.coins).toBe(STARTING_COINS);

    await act(async () => {
      result.current.spinWheel({ id: 'coins100', reward: { coins: 100 } } as never);
    });

    expect(result.current.coins).toBe(STARTING_COINS + 100);
    expect(result.current.wheelLastSpinAt).toBe(T);
    expect(await AsyncStorage.getItem(COINS_KEY)).toBe(String(STARTING_COINS + 100));
    expect(await AsyncStorage.getItem(WHEEL_KEY)).toBe(String(T));
    // and the wheel is now shut for a full day
    expect(wheelSpinAvailable(result.current.wheelLastSpinAt, T)).toBe(false);
  });
});

describe('wheelLastSpinAt — hydration across a restart', () => {
  it('restores a persisted anchor, so a spin stays on cooldown after relaunch', async () => {
    await AsyncStorage.setItem(WHEEL_KEY, String(T - HOUR));
    jest.spyOn(Date, 'now').mockReturnValue(T);

    const { result } = await renderReady();

    expect(result.current.wheelLastSpinAt).toBe(T - HOUR);
    expect(wheelCooldownRemaining(result.current.wheelLastSpinAt, T)).toBe(
      WHEEL_COOLDOWN_MS - HOUR,
    );
  });

  it('defaults a missing key to 0 → spin available', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(T);
    const { result } = await renderReady();

    expect(result.current.wheelLastSpinAt).toBe(0);
    expect(wheelSpinAvailable(result.current.wheelLastSpinAt, T)).toBe(true);
  });
});

describe('clock wound BACK — future anchor is re-anchored to now on load', () => {
  it('clamps a future anchor to now instead of locking the wheel for >24h', async () => {
    // Spun, then the device clock was wound back 6h: the stored anchor is ahead of now.
    await AsyncStorage.setItem(WHEEL_KEY, String(T + 6 * HOUR));
    jest.spyOn(Date, 'now').mockReturnValue(T);

    const { result } = await renderReady();

    expect(result.current.wheelLastSpinAt).toBe(T);
    expect(wheelCooldownRemaining(result.current.wheelLastSpinAt, T)).toBe(WHEEL_COOLDOWN_MS);
  });

  it('persists the correction, so it is not re-applied on every launch', async () => {
    await AsyncStorage.setItem(WHEEL_KEY, String(T + 6 * HOUR));
    jest.spyOn(Date, 'now').mockReturnValue(T);

    await renderReady();

    await waitFor(async () => {
      expect(await AsyncStorage.getItem(WHEEL_KEY)).toBe(String(T));
    });
  });

  it('still does not gift a spin — the wheel stays shut right after the rewind', async () => {
    await AsyncStorage.setItem(WHEEL_KEY, String(T + 6 * HOUR));
    jest.spyOn(Date, 'now').mockReturnValue(T);

    const { result } = await renderReady();

    expect(wheelSpinAvailable(result.current.wheelLastSpinAt, T)).toBe(false);
  });
});
