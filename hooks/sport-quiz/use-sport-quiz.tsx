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

import { STARTING_COINS, type WheelPrize } from '@/lib/sport-quiz/economy';

/**
 * Local-state store for the Sport Quiz economy: coins only (NO lives, NO premium).
 * Persisted to AsyncStorage so a returning player keeps their balance and the
 * wheel's 24h cooldown. The whole economy (earn/spend coins, spin the wheel)
 * mutates through here and every screen reads from it. Modelled on
 * hooks/logo-quiz/use-logo-quiz.tsx.
 */

// Separate keys per field (per spec) so each concern persists independently.
const COINS_KEY = 'sportquiz.coins.v1';
const WHEEL_KEY = 'sportquiz.wheelLastSpinAt.v1';
// Quiz-level progress: the set of solved question ids (persisted as a JSON array
// of ids) and the last level opened.
const SOLVED_KEY = 'sportquiz.solvedIds.v1';
const LASTLEVEL_KEY = 'sportquiz.lastLevel.v1';
// Sports Legends: plates the player PAID to uncover, per question id, so a face
// keeps everything already revealed when the question is re-opened.
const PLATES_KEY = 'sportquiz.revealedPlates.v1';

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
  /** Solved question ids (reactive) — drives level counts + unlocking. */
  solvedIds: Record<number, true>;
  /** Whether a question id has been solved. */
  isSolved: (id: number) => boolean;
  /** Mark a question solved (persisted). Idempotent. */
  markSolved: (id: number) => void;
  /** Last level opened — the level-select list scrolls back to it. */
  lastLevel: number;
  /** Remember the level being played. */
  setLastLevel: (level: number) => void;
  /** Plate indices already uncovered for a Legends question (persisted). */
  revealedPlatesFor: (questionId: number) => number[];
  /** Persist one more uncovered plate for a Legends question. Idempotent. */
  revealPlate: (questionId: number, plateIndex: number) => void;
}

interface PersistedState {
  coins: number;
  wheelLastSpinAt: number;
  solvedIds: Record<number, true>;
  lastLevel: number;
  revealedPlates: Record<number, number[]>;
}

const DEFAULT_STATE: PersistedState = {
  coins: STARTING_COINS,
  wheelLastSpinAt: 0,
  solvedIds: {},
  lastLevel: 0,
  revealedPlates: {},
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
    if (next.solvedIds !== prev.solvedIds || !ready) {
      AsyncStorage.setItem(SOLVED_KEY, JSON.stringify(Object.keys(next.solvedIds).map(Number))).catch(() => {});
    }
    if (next.lastLevel !== prev.lastLevel || !ready) {
      AsyncStorage.setItem(LASTLEVEL_KEY, String(next.lastLevel)).catch(() => {});
    }
    if (next.revealedPlates !== prev.revealedPlates || !ready) {
      AsyncStorage.setItem(PLATES_KEY, JSON.stringify(next.revealedPlates)).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hydrate once from the persisted keys, sanitizing a clock-back wheel anchor.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let loaded = DEFAULT_STATE;
      try {
        const [rawCoins, rawWheel, rawSolved, rawLastLevel, rawPlates] = await AsyncStorage.multiGet([
          COINS_KEY,
          WHEEL_KEY,
          SOLVED_KEY,
          LASTLEVEL_KEY,
          PLATES_KEY,
        ]).then((pairs) => pairs.map(([, v]) => v));
        const coins = rawCoins != null && !Number.isNaN(Number(rawCoins)) ? Number(rawCoins) : STARTING_COINS;
        const wheelLastSpinAt =
          rawWheel != null && !Number.isNaN(Number(rawWheel)) ? Number(rawWheel) : 0;
        const solvedIds: Record<number, true> = {};
        if (rawSolved) {
          try {
            const ids = JSON.parse(rawSolved) as unknown;
            if (Array.isArray(ids)) for (const id of ids) if (typeof id === 'number') solvedIds[id] = true;
          } catch {
            // corrupt store — start from an empty solved set
          }
        }
        const lastLevel =
          rawLastLevel != null && !Number.isNaN(Number(rawLastLevel)) ? Number(rawLastLevel) : 0;
        const revealedPlates: Record<number, number[]> = {};
        if (rawPlates) {
          try {
            const parsed = JSON.parse(rawPlates) as unknown;
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
              for (const [qid, list] of Object.entries(parsed as Record<string, unknown>)) {
                const id = Number(qid);
                if (Number.isNaN(id) || !Array.isArray(list)) continue;
                revealedPlates[id] = list.filter((n): n is number => typeof n === 'number');
              }
            }
          } catch {
            // corrupt store — start with no uncovered plates
          }
        }
        loaded = {
          coins: Math.max(0, coins),
          wheelLastSpinAt,
          solvedIds,
          lastLevel,
          revealedPlates,
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

  // Mark a question solved (idempotent) and persist the grown set.
  const markSolved = useCallback(
    (id: number) => {
      const s = stateRef.current;
      if (s.solvedIds[id]) return;
      persist({ ...s, solvedIds: { ...s.solvedIds, [id]: true } });
    },
    [persist],
  );

  // Non-reactive read for quiz logic frozen at mount; screens that must re-render
  // on a solve read the reactive `solvedIds` map instead.
  const isSolved = useCallback((id: number) => !!stateRef.current.solvedIds[id], []);

  const setLastLevel = useCallback(
    (level: number) => {
      const s = stateRef.current;
      if (s.lastLevel === level) return;
      persist({ ...s, lastLevel: level });
    },
    [persist],
  );

  // Legends plates: read the uncovered set for a face, and grow it on each paid tap
  // so re-opening the question keeps everything already revealed.
  const revealedPlatesFor = useCallback((questionId: number) => stateRef.current.revealedPlates[questionId] ?? [], []);

  const revealPlate = useCallback(
    (questionId: number, plateIndex: number) => {
      const s = stateRef.current;
      const current = s.revealedPlates[questionId] ?? [];
      if (current.includes(plateIndex)) return;
      persist({
        ...s,
        revealedPlates: { ...s.revealedPlates, [questionId]: [...current, plateIndex] },
      });
    },
    [persist],
  );

  const value = useMemo<SportQuizValue>(
    () => ({
      ready,
      coins: state.coins,
      addCoins,
      spendCoins,
      wheelLastSpinAt: state.wheelLastSpinAt,
      spinWheel,
      solvedIds: state.solvedIds,
      isSolved,
      markSolved,
      lastLevel: state.lastLevel,
      setLastLevel,
      revealedPlatesFor,
      revealPlate,
    }),
    [
      ready,
      state,
      addCoins,
      spendCoins,
      spinWheel,
      isSolved,
      markSolved,
      setLastLevel,
      revealedPlatesFor,
      revealPlate,
    ],
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
