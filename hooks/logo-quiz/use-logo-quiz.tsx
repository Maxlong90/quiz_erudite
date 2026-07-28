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

import {
  LIVES_FOR_COINS_AMOUNT,
  LIVES_FOR_COINS_COST,
  MAX_LIVES,
  RATE_APP_REWARD_COINS,
  STARTING_COINS,
  coinsForCorrect,
  reconcileLives,
  spendLife,
  wheelSpinAvailable,
  type LivesState,
} from '@/lib/logo-quiz/economy';
import type { CoinPack, LifePack, WheelPrize } from '@/lib/logo-quiz/economy';

/**
 * Local-state store for the Logo Quiz economy: coins, premium status, and the
 * regenerating lives bar. Persisted to AsyncStorage so a returning player keeps
 * their balance. This is the "State Management" layer the spec asks for — the
 * whole economy (earn/spend coins, lose/regen lives, unlock premium) mutates
 * through here and every screen reads from it.
 */

const STORAGE_KEY = 'logoquiz.state.v1';

interface PersistedState {
  coins: number;
  isPremium: boolean;
  lives: LivesState;
  /** Next-question index per category id — the sequential level the player is on. */
  progress: Record<string, number>;
  /** Categories finished at least once — replayed as a free, no-economy practice. */
  completed: Record<string, boolean>;
  /** Whether the one-time "rate the app" coin reward has been claimed. */
  rateRewarded: boolean;
  /** Epoch ms of the last free wheel spin (0 = never). Drives the 24h cooldown. */
  wheelLastSpinAt: number;
}

interface LogoQuizValue {
  ready: boolean;
  coins: number;
  isPremium: boolean;
  /** Raw lives anchor — UI reconciles it against a live clock for display. */
  livesState: LivesState;
  /** Reconciled life count at call time (premium regenerates 3× faster). */
  getLives: () => number;
  addCoins: (n: number) => void;
  /** Spend coins; returns false (and changes nothing) if the balance is short. */
  spendCoins: (n: number) => boolean;
  /** Award coins for a correct answer (2× for premium); returns the amount. */
  awardCorrect: () => number;
  /** Consume one life on a wrong answer (premium loses lives too now). */
  loseLife: () => void;
  buyPremium: () => void;
  /** Cancel the premium subscription (drops the account back to free). No-op if not premium. */
  cancelSubscription: () => void;
  buyCoins: (pack: CoinPack) => void;
  /** Add purchased lives on top of the bar (can exceed MAX_LIVES). */
  buyLives: (pack: LifePack) => void;
  /** Spend coins for a fixed batch of lives. Returns false (no change) if short on coins. */
  buyLivesForCoins: () => boolean;
  /** Current sequential level index for a category (0 when not started). */
  getProgress: (category: string) => number;
  /** Persist the sequential level index reached in a category. */
  setProgress: (category: string, index: number) => void;
  /** Whether a category was already finished once (replays run economy-free). */
  isCompleted: (category: string) => boolean;
  /** Mark a category finished and rewind it to the first level for replaying. */
  markCompleted: (category: string) => void;
  /** Reactive per-category level index — for progress labels on the grid. */
  progressMap: Record<string, number>;
  /** Reactive per-category completion flags — for the grid's done checkmarks. */
  completedMap: Record<string, boolean>;
  /** Test/QA helper — wipe progress back to a fresh start. */
  reset: () => void;
  /** Dev/QA helper — send every category back to level 1 (clears progress + completed + wheel cooldown). */
  resetProgress: () => void;
  /** Dev/QA helper — clear the wheel's 24h cooldown so a free spin is available now. */
  resetWheelCooldown: () => void;
  /** Whether the one-time rate-the-app coin reward is still available. */
  rateRewarded: boolean;
  /** Grant the one-time rate-the-app coin reward (no-op once already claimed). */
  claimRateReward: () => void;
  /** Epoch ms of the last free wheel spin (reactive) — UI reconciles it live. */
  wheelLastSpinAt: number;
  /** Whether the free wheel spin is available now (>= 24h since the last spin). */
  canSpinWheel: () => boolean;
  /** Credit a wheel prize (coins and/or stocked lives) and start the 24h cooldown. */
  spinWheel: (prize: WheelPrize) => void;
}

const DEFAULT_STATE: PersistedState = {
  coins: STARTING_COINS,
  isPremium: false,
  lives: { lives: MAX_LIVES, updatedAt: 0 },
  progress: {},
  completed: {},
  rateRewarded: false,
  wheelLastSpinAt: 0,
};

const LogoQuizContext = createContext<LogoQuizValue | null>(null);

export function LogoQuizProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedState>(DEFAULT_STATE);
  const [ready, setReady] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Persist every change (best-effort; UI never blocks on storage).
  const persist = useCallback((next: PersistedState) => {
    stateRef.current = next;
    setState(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  // Hydrate once, folding elapsed time into the lives bar.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let loaded = DEFAULT_STATE;
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<PersistedState>;
          loaded = {
            coins: typeof parsed.coins === 'number' ? parsed.coins : STARTING_COINS,
            isPremium: !!parsed.isPremium,
            lives: {
              lives:
                typeof parsed.lives?.lives === 'number' ? parsed.lives.lives : MAX_LIVES,
              updatedAt:
                typeof parsed.lives?.updatedAt === 'number' ? parsed.lives.updatedAt : Date.now(),
            },
            progress:
              parsed.progress && typeof parsed.progress === 'object' ? parsed.progress : {},
            completed:
              parsed.completed && typeof parsed.completed === 'object' ? parsed.completed : {},
            rateRewarded: !!parsed.rateRewarded,
            wheelLastSpinAt:
              typeof parsed.wheelLastSpinAt === 'number' ? parsed.wheelLastSpinAt : 0,
          };
        } else {
          loaded = { ...DEFAULT_STATE, lives: { lives: MAX_LIVES, updatedAt: Date.now() } };
        }
      } catch {
        loaded = { ...DEFAULT_STATE, lives: { lives: MAX_LIVES, updatedAt: Date.now() } };
      }
      if (cancelled) return;
      const nowMs = Date.now();
      const reconciled: PersistedState = {
        ...loaded,
        // reconcileLives re-anchors a future `updatedAt` (clock moved back) to now.
        lives: reconcileLives(loaded.lives, nowMs, loaded.isPremium),
        // Same guard for the wheel: a future anchor is clamped to now so the
        // cooldown counts down at most 24h from load (0 = never spun stays 0).
        wheelLastSpinAt: Math.min(loaded.wheelLastSpinAt, nowMs),
      };
      // Persist the sanitized state so a clock-back re-anchor (future lives/wheel
      // anchor clamped to now) survives on disk, not just in memory this session.
      persist(reconciled);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [persist]);

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

  const awardCorrect = useCallback(() => {
    const s = stateRef.current;
    const gain = coinsForCorrect(s.isPremium);
    persist({ ...s, coins: s.coins + gain });
    return gain;
  }, [persist]);

  const loseLife = useCallback(() => {
    const s = stateRef.current;
    persist({ ...s, lives: spendLife(s.lives, Date.now(), s.isPremium) });
  }, [persist]);

  const getLives = useCallback(() => {
    const s = stateRef.current;
    return reconcileLives(s.lives, Date.now(), s.isPremium).lives;
  }, []);

  const buyPremium = useCallback(() => {
    const s = stateRef.current;
    persist({ ...s, isPremium: true });
  }, [persist]);

  const cancelSubscription = useCallback(() => {
    const s = stateRef.current;
    if (!s.isPremium) return; // nothing to cancel on a free account
    persist({ ...s, isPremium: false });
  }, [persist]);

  const buyCoins = useCallback(
    (pack: CoinPack) => {
      const s = stateRef.current;
      persist({ ...s, coins: s.coins + pack.coins });
    },
    [persist],
  );

  const buyLives = useCallback(
    (pack: LifePack) => {
      const s = stateRef.current;
      const cur = reconcileLives(s.lives, Date.now(), s.isPremium);
      // Stack on top of the current bar; adding ≥ MAX means no running timer.
      persist({ ...s, lives: { lives: cur.lives + pack.lives, updatedAt: Date.now() } });
    },
    [persist],
  );

  const buyLivesForCoins = useCallback(() => {
    const s = stateRef.current;
    if (s.coins < LIVES_FOR_COINS_COST) return false; // not enough coins
    const cur = reconcileLives(s.lives, Date.now(), s.isPremium);
    persist({
      ...s,
      coins: s.coins - LIVES_FOR_COINS_COST,
      lives: { lives: cur.lives + LIVES_FOR_COINS_AMOUNT, updatedAt: Date.now() },
    });
    return true;
  }, [persist]);

  const getProgress = useCallback((category: string) => {
    return stateRef.current.progress[category] ?? 0;
  }, []);

  const setProgress = useCallback(
    (category: string, index: number) => {
      const s = stateRef.current;
      persist({ ...s, progress: { ...s.progress, [category]: index } });
    },
    [persist],
  );

  const isCompleted = useCallback((category: string) => {
    return !!stateRef.current.completed[category];
  }, []);

  const markCompleted = useCallback(
    (category: string) => {
      const s = stateRef.current;
      persist({
        ...s,
        completed: { ...s.completed, [category]: true },
        // Rewind to the first level so the next open replays from the start.
        progress: { ...s.progress, [category]: 0 },
      });
    },
    [persist],
  );

  const reset = useCallback(() => {
    persist({ ...DEFAULT_STATE, lives: { lives: MAX_LIVES, updatedAt: Date.now() } });
  }, [persist]);

  const resetProgress = useCallback(() => {
    const s = stateRef.current;
    // Level index back to 0 everywhere + drop completion flags, so every category
    // plays from the first level again. Also clear the wheel's cooldown so a free
    // spin is immediately testable, and re-arm the one-time "rate the app" reward
    // so its Home badge reappears. Coins / lives / premium are left intact.
    persist({ ...s, progress: {}, completed: {}, wheelLastSpinAt: 0, rateRewarded: false });
  }, [persist]);

  // Dev/QA only — reopen the free wheel spin without touching progress or economy.
  const resetWheelCooldown = useCallback(() => {
    persist({ ...stateRef.current, wheelLastSpinAt: 0 });
  }, [persist]);

  const claimRateReward = useCallback(() => {
    const s = stateRef.current;
    if (s.rateRewarded) return; // one-time only
    persist({ ...s, coins: s.coins + RATE_APP_REWARD_COINS, rateRewarded: true });
  }, [persist]);

  const canSpinWheel = useCallback(() => {
    return wheelSpinAvailable(stateRef.current.wheelLastSpinAt, Date.now());
  }, []);

  // Credit the wheel prize free of charge and stamp the 24h cooldown. Coins add
  // to the balance (like buyCoins); lives stock ON TOP of the reconciled bar
  // (like buyLives — may exceed MAX_LIVES). A prize with no lives leaves the
  // regen anchor untouched so it never resets a partial bar's timer.
  const spinWheel = useCallback(
    (prize: WheelPrize) => {
      const s = stateRef.current;
      const now = Date.now();
      const addLives = prize.reward.lives ?? 0;
      const lives =
        addLives > 0
          ? { lives: reconcileLives(s.lives, now, s.isPremium).lives + addLives, updatedAt: now }
          : s.lives;
      persist({
        ...s,
        coins: s.coins + (prize.reward.coins ?? 0),
        lives,
        wheelLastSpinAt: now,
      });
    },
    [persist],
  );

  const value = useMemo<LogoQuizValue>(
    () => ({
      ready,
      coins: state.coins,
      isPremium: state.isPremium,
      livesState: state.lives,
      getLives,
      addCoins,
      spendCoins,
      awardCorrect,
      loseLife,
      buyPremium,
      cancelSubscription,
      buyCoins,
      buyLives,
      buyLivesForCoins,
      getProgress,
      setProgress,
      isCompleted,
      markCompleted,
      progressMap: state.progress,
      completedMap: state.completed,
      reset,
      resetProgress,
      resetWheelCooldown,
      rateRewarded: state.rateRewarded,
      claimRateReward,
      wheelLastSpinAt: state.wheelLastSpinAt,
      canSpinWheel,
      spinWheel,
    }),
    [ready, state, getLives, addCoins, spendCoins, awardCorrect, loseLife, buyPremium, cancelSubscription, buyCoins, buyLives, buyLivesForCoins, getProgress, setProgress, isCompleted, markCompleted, reset, resetProgress, resetWheelCooldown, claimRateReward, canSpinWheel, spinWheel],
  );

  return <LogoQuizContext.Provider value={value}>{children}</LogoQuizContext.Provider>;
}

export function useLogoQuiz(): LogoQuizValue {
  const ctx = useContext(LogoQuizContext);
  if (!ctx) throw new Error('useLogoQuiz must be used within a LogoQuizProvider');
  return ctx;
}

/** Re-render on an interval so lives-regen countdowns tick. Returns `Date.now()`. */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
