import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * A saved-in-progress Italy Quiz run: the shuffled question ORDER (backend
 * question IDs), the current POSITION in that order, and the IDs answered wrong
 * so far. IDs (not indices) are persisted so a run survives the question pool
 * growing or being re-ordered by a later content sync.
 *
 * The score is derived, never stored: every answered question is either right or
 * wrong, so `score = pos - wrong.length`.
 */
export interface RunProgress {
  ids: number[];
  pos: number;
  wrong: number[];
}

function shuffled(ids: number[], limit: number): number[] {
  const a = [...ids];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, limit);
}

/** A saved run is usable only while every ID still exists in the pool and the
 *  position sits inside the order; otherwise it is discarded for a fresh run. */
function isValid(p: unknown, pool: Set<number>): p is RunProgress {
  if (!p || typeof p !== 'object') return false;
  const r = p as RunProgress;
  if (!Array.isArray(r.ids) || r.ids.length === 0) return false;
  if (!r.ids.every((n) => Number.isInteger(n) && pool.has(n))) return false;
  if (typeof r.pos !== 'number' || r.pos < 0 || r.pos > r.ids.length) return false;
  if (!Array.isArray(r.wrong) || !r.wrong.every((n) => Number.isInteger(n))) return false;
  return true;
}

/**
 * Owns one gameplay run's order/position/mistakes with resume-or-fresh
 * behaviour, mirroring the Flags Quiz hook.
 *
 * On hydrate (once the pool is loaded): a `retry` run uses the passed IDs and is
 * never persisted; otherwise a saved run for this `key` resumes if still valid,
 * and if there is none a fresh shuffled run of up to `limit` questions starts.
 * Every change is written back, so leaving the app mid-run and coming back
 * resumes on the same question with the same score. Call `clear()` when the run
 * finishes so the next entry starts a brand-new run.
 */
export function useRunProgress(opts: {
  /** Storage key for this subcategory, or null to disable persistence. */
  key: string | null;
  /** Every question ID currently available in the subcategory. */
  poolIds: number[];
  /** How many questions a fresh run draws. */
  limit: number;
  /** Mistakes-only sub-run — used verbatim, never persisted. */
  retry: number[] | null;
  /** True once the content is loaded so `poolIds` is meaningful. */
  ready: boolean;
  /** Bumped to force a brand-new run (Play again / Review mistakes). */
  epoch: number;
}) {
  const { key, poolIds, limit, retry, ready, epoch } = opts;
  const [state, setState] = useState<RunProgress | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const hydratedEpoch = useRef<number | null>(null);

  // Hydrate once per epoch, as soon as the pool is ready. Deliberately NOT keyed
  // on the pool array identity: a background content re-sync must not reshuffle
  // (or otherwise disturb) a run the player is in the middle of.
  useEffect(() => {
    if (hydratedEpoch.current === epoch) return;
    if (!ready || poolIds.length === 0) return;
    hydratedEpoch.current = epoch;
    let cancelled = false;

    const finishWith = (p: RunProgress) => {
      if (cancelled) return;
      setState(p);
      setHydrated(true);
    };

    // A retry run: the passed IDs, in order, no persistence.
    if (retry && retry.length > 0) {
      const pool = new Set(poolIds);
      finishWith({ ids: retry.filter((n) => pool.has(n)), pos: 0, wrong: [] });
      return;
    }

    (async () => {
      let saved: RunProgress | null = null;
      if (key) {
        try {
          const raw = await AsyncStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (isValid(parsed, new Set(poolIds))) saved = parsed;
          }
        } catch {
          // ignore a corrupt/unreadable entry — fall back to a fresh run
        }
      }
      finishWith(saved ?? { ids: shuffled(poolIds, limit), pos: 0, wrong: [] });
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, epoch, poolIds.length]);

  // Persist every change (except retry runs, which are transient).
  const isRetry = !!(retry && retry.length > 0);
  useEffect(() => {
    if (!hydrated || !key || !state || isRetry) return;
    AsyncStorage.setItem(key, JSON.stringify(state)).catch(() => {});
  }, [state, hydrated, key, isRetry]);

  const setPos = useCallback((pos: number) => {
    setState((s) => (s ? { ...s, pos } : s));
  }, []);

  const addWrong = useCallback((questionId: number) => {
    setState((s) =>
      s && !s.wrong.includes(questionId) ? { ...s, wrong: [...s.wrong, questionId] } : s,
    );
  }, []);

  const clear = useCallback(() => {
    if (key) AsyncStorage.removeItem(key).catch(() => {});
  }, [key]);

  return {
    hydrated,
    ids: state?.ids ?? [],
    pos: state?.pos ?? 0,
    wrong: state?.wrong ?? [],
    setPos,
    addWrong,
    clear,
  };
}
