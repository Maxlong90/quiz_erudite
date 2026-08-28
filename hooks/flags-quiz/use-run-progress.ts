import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * A saved-in-progress Flags Quiz run: the shuffled question ORDER (indices into
 * the mode's question list), the current POSITION within that order, and the
 * indices of the questions answered WRONG so far. Persisting the order (not just
 * the position) means a resumed run continues with the exact same sequence.
 */
export interface RunProgress {
  order: number[];
  pos: number;
  wrong: number[];
}

function shuffle(count: number): number[] {
  const a = Array.from({ length: count }, (_, i) => i);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** A saved run is only usable if every index still points at a real question and
 *  the position sits inside the order. Otherwise (e.g. the content changed) it is
 *  discarded and a fresh shuffled run is started. */
function isValid(p: unknown, count: number): p is RunProgress {
  if (!p || typeof p !== 'object') return false;
  const r = p as RunProgress;
  if (!Array.isArray(r.order) || r.order.length === 0) return false;
  if (!r.order.every((n) => Number.isInteger(n) && n >= 0 && n < count)) return false;
  if (typeof r.pos !== 'number' || r.pos < 0 || r.pos >= r.order.length) return false;
  if (!Array.isArray(r.wrong) || !r.wrong.every((n) => Number.isInteger(n))) return false;
  return true;
}

/**
 * Owns one gameplay run's order/position/mistakes with resume-or-fresh behaviour.
 *
 * On hydrate (once the content is `ready`): a `retry` run uses the passed indices
 * and is never persisted; otherwise a saved run for this `key` is resumed if
 * still valid, and if there is none a fresh SHUFFLED run is started. Every change
 * to the run is written back to `key`, so exiting mid-run and returning resumes at
 * the same question with the same score. Call `clear()` when the run finishes so
 * the next entry starts a brand-new shuffled run.
 */
export function useRunProgress(opts: {
  /** Storage key for this mode, or null to disable persistence entirely. */
  key: string | null;
  /** Number of questions available in the mode (fresh-shuffle size + validation). */
  count: number;
  /** Retry indices (a mistakes-only sub-run) — used verbatim, never persisted. */
  retry: number[] | null;
  /** True once the content is loaded so `count` is meaningful. */
  ready: boolean;
}) {
  const { key, count, retry, ready } = opts;
  const [state, setState] = useState<RunProgress | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const hydratedRef = useRef(false);

  // Hydrate exactly once, as soon as the content is ready.
  useEffect(() => {
    if (hydratedRef.current) return;
    if (!ready || count <= 0) return;
    hydratedRef.current = true;
    let cancelled = false;

    const finishWith = (p: RunProgress) => {
      if (cancelled) return;
      setState(p);
      setHydrated(true);
    };

    // A retry run: the passed indices, in order, no persistence.
    if (retry && retry.length > 0) {
      finishWith({ order: retry.filter((n) => n >= 0 && n < count), pos: 0, wrong: [] });
      return;
    }

    (async () => {
      let saved: RunProgress | null = null;
      if (key) {
        try {
          const raw = await AsyncStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (isValid(parsed, count)) saved = parsed;
          }
        } catch {
          // ignore a corrupt/unreadable entry — fall back to a fresh run
        }
      }
      finishWith(saved ?? { order: shuffle(count), pos: 0, wrong: [] });
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, count]);

  // Persist every change (except retry runs, which are transient).
  const isRetry = !!(retry && retry.length > 0);
  useEffect(() => {
    if (!hydrated || !key || !state || isRetry) return;
    AsyncStorage.setItem(key, JSON.stringify(state)).catch(() => {});
  }, [state, hydrated, key, isRetry]);

  const setPos = useCallback((pos: number) => {
    setState((s) => (s ? { ...s, pos } : s));
  }, []);

  const addWrong = useCallback((questionIdx: number) => {
    setState((s) => (s ? { ...s, wrong: [...s.wrong, questionIdx] } : s));
  }, []);

  const clear = useCallback(() => {
    if (key) AsyncStorage.removeItem(key).catch(() => {});
  }, [key]);

  return {
    hydrated,
    order: state?.order ?? [],
    pos: state?.pos ?? 0,
    wrong: state?.wrong ?? [],
    setPos,
    addWrong,
    clear,
  };
}
