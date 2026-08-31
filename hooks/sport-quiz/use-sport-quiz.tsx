import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { RATE_APP_REWARD_COINS, STARTING_COINS, type WheelPrize } from '@/lib/sport-quiz/economy';

/**
 * Local-state store for the Sport Quiz economy: coins only (NO lives, NO premium).
 * Persisted to AsyncStorage so a returning player keeps their balance, the wheel's
 * 24h cooldown, and the one-time rate reward. The whole economy (earn/spend coins,
 * spin the wheel, claim the rate reward) mutates through here and every screen
 * reads from it. Modelled on hooks/logo-quiz/use-logo-quiz.tsx.
 */

// Separate keys per field (per spec) so each concern persists independently.
const COINS_KEY = 'sportquiz.coins.v1';
const WHEEL_KEY = 'sportquiz.wheelLastSpinAt.v1';
const RATE_KEY = 'sportquiz.rateRewarded.v1';

interface SportQuizValue {
  ready: boolean;
  coins: number;
  /** Add coins to the balance (clamped at 0). */
  addCoins: (n: number) => void;
  /** Spend coins; returns false (and changes nothing) if the balance is short. */
  spendCoins: (n: number) => boolean;
  /** Epoch ms of the last free wheel spin (reactive) — UI reconciles it live. */
  wheelLastSpinAt: number;
  /** Credit a wheel prize (coins) and stamp the 24h cooldown (persisted). */
  spinWheel: (prize: WheelPrize) => void;
  /** Whether the one-time rate-the-app coin reward is still available. */
  rateRewarded: boolean;
  /** Grant the one-time rate-the-app coin reward (no-op once already claimed). */
  markRateRewarded: () => void;
}

interface PersistedState {
  coins: number;
  wheelLastSpinAt: number;
  rateRewarded: boolean;
}

const DEFAULT_STATE: PersistedState = {
  coins: STARTING_COINS,
  wheelLastSpinAt: 0,
  rateRewarded: false,
};

const SportQuizContext = createContext<SportQuizValue | null>(null);

export function SportQuizProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedState>(DEFAULT_STATE);
  const [ready, setReady] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Persist each field to its own key (best-effort; UI never blocks on storage).
  const persist = useCallback((next: PersistedState) => {
    const prev = stateRef.current;
    stateRef.current = next;
    setState(next);
    if (next.coins !== prev.coins || !ready) {
      AsyncStorage.setItem(COINS_KEY, String(next.coins)).catch(() => {});
    }
    if (next.wheelLastSpinAt !== prev.wheelLastSpinAt || !ready) {
      AsyncStorage.setItem(WHEEL_KEY, String(next.wheelLastSpinAt)).catch(() => {});
    }
    if (next.rateRewarded !== prev.rateRewarded || !ready) {
      AsyncStorage.setItem(RATE_KEY, next.rateRewarded ? '1' : '0').catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hydrate once from the three keys, sanitizing a clock-back wheel anchor.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let loaded = DEFAULT_STATE;
      try {
        const [rawCoins, rawWheel, rawRate] = await AsyncStorage.multiGet([
          COINS_KEY,
          WHEEL_KEY,
          RATE_KEY,
        ]).then((pairs) => pairs.map(([, v]) => v));
        const coins = rawCoins != null && !Number.isNaN(Number(rawCoins)) ? Number(rawCoins) : STARTING_COINS;
        const wheelLastSpinAt =
          rawWheel != null && !Number.isNaN(Number(rawWheel)) ? Number(rawWheel) : 0;
        loaded = {
          coins: Math.max(0, coins),
          wheelLastSpinAt,
          rateRewarded: rawRate === '1',
        };
      } catch {
        loaded = DEFAULT_STATE;
      }
      if (cancelled) return;
      const now = Date.now();
      // Clamp a future wheel anchor (clock moved back) to now so the cooldown
      // counts down at most 24h from load (0 = never spun stays 0).
      const sanitized: PersistedState = {
        ...loaded,
        wheelLastSpinAt: Math.min(loaded.wheelLastSpinAt, now),
      };
      stateRef.current = sanitized;
      setState(sanitized);
      // Persist the sanitized wheel anchor so a clock-back re-anchor survives.
      AsyncStorage.setItem(WHEEL_KEY, String(sanitized.wheelLastSpinAt)).catch(() => {});
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const addCoins = useCallback(
    (n: number) => {
      const s = stateRef.current;
      persist({ ...s, coins: Math.max(0, s.coins + n) });
    },
    [persist],
  );

  const spendCoins = useCallback(
    (n: number) => {
      const s = stateRef.current;
      if (s.coins < n) return false;
      persist({ ...s, coins: s.coins - n });
      return true;
    },
    [persist],
  );

  // Credit the wheel prize free of charge and stamp the 24h cooldown.
  const spinWheel = useCallback(
    (prize: WheelPrize) => {
      const s = stateRef.current;
      persist({ ...s, coins: s.coins + prize.reward.coins, wheelLastSpinAt: Date.now() });
    },
    [persist],
  );

  const markRateRewarded = useCallback(() => {
    const s = stateRef.current;
    if (s.rateRewarded) return; // one-time only
    persist({ ...s, coins: s.coins + RATE_APP_REWARD_COINS, rateRewarded: true });
  }, [persist]);

  const value = useMemo<SportQuizValue>(
    () => ({
      ready,
      coins: state.coins,
      addCoins,
      spendCoins,
      wheelLastSpinAt: state.wheelLastSpinAt,
      spinWheel,
      rateRewarded: state.rateRewarded,
      markRateRewarded,
    }),
    [ready, state, addCoins, spendCoins, spinWheel, markRateRewarded],
  );

  return <SportQuizContext.Provider value={value}>{children}</SportQuizContext.Provider>;
}

export function useSportQuiz(): SportQuizValue {
  const ctx = useContext(SportQuizContext);
  if (!ctx) throw new Error('useSportQuiz must be used within a SportQuizProvider');
  return ctx;
}

/** Re-render on an interval so wheel-cooldown countdowns tick. Returns `Date.now()`. */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
