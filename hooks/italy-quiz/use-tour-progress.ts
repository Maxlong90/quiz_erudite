import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * A circle in progress: how far the player has walked through it, and which
 * questions they missed.
 *
 * The ORDER is no longer decided here. A circle's twenty are fixed once, in the
 * progress record (see `lib/italy-quiz/circles`), and handed to this hook — so
 * all it owns is the position. It still persists `ids` alongside, because that
 * is what lets a resume prove it belongs to the circle being entered.
 *
 * The score is derived, never stored: every answered question is either right or
 * wrong, so `score = pos - wrong.length`.
 */
export interface TourProgress {
  ids: number[];
  pos: number;
  wrong: number[];
}

const sameOrder = (a: number[], b: number[]) =>
  a.length === b.length && a.every((n, i) => n === b[i]);

/**
 * A saved blob resumes only when it is the SAME set in the SAME order.
 *
 * Under the old model the check could only ask "are these ids known to this
 * place", because the order was redrawn on every entry. Now the order is fixed
 * upstream, so the strict comparison is both possible and necessary: it is what
 * stops a blob left behind by another draw from resurrecting a half-finished
 * tour under a different twenty.
 */
function isResumable(p: unknown, ids: number[]): p is TourProgress {
  if (!p || typeof p !== 'object') return false;
  const r = p as TourProgress;
  if (!Array.isArray(r.ids) || !sameOrder(r.ids, ids)) return false;
  if (typeof r.pos !== 'number' || r.pos < 0 || r.pos > r.ids.length) return false;
  return Array.isArray(r.wrong) && r.wrong.every((n) => Number.isInteger(n));
}

/**
 * Owns one circle's position and mistakes, resuming where the player left off.
 *
 * A `retry` tour replays only the ids handed to it and is never persisted, so
 * abandoning a mistakes review returns the player to a clean slate rather than
 * to a half-finished sub-tour. Hydration is keyed on `epoch`, so only an
 * explicit restart (Review mistakes) starts a new one.
 */
export function useTourProgress(opts: {
  /** Storage key, or null to disable persistence (retry tours). */
  key: string | null;
  /** The circle's fixed set, or null while it is still being resolved. */
  ids: number[] | null;
  /** Mistakes-only sub-tour — used verbatim, never persisted. */
  retry: number[] | null;
  /** Bumped to force a brand-new tour. */
  epoch: number;
}) {
  const { key, ids: circleIds, retry, epoch } = opts;
  const [state, setState] = useState<TourProgress | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const hydratedEpoch = useRef<number | null>(null);

  const isRetry = !!(retry && retry.length > 0);
  const ready = isRetry || circleIds !== null;

  useEffect(() => {
    if (hydratedEpoch.current === epoch) return;
    if (!ready) return;
    hydratedEpoch.current = epoch;
    let cancelled = false;

    const finish = (p: TourProgress) => {
      if (cancelled) return;
      setState(p);
      setHydrated(true);
    };

    (async () => {
      if (isRetry) {
        finish({ ids: [...retry!], pos: 0, wrong: [] });
        return;
      }

      const ids = circleIds ?? [];

      // Resume a saved position when it belongs to exactly this circle…
      if (key) {
        try {
          const raw = await AsyncStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (isResumable(parsed, ids)) {
              finish(parsed);
              return;
            }
          }
        } catch {
          // a corrupt entry just means starting the circle over
        }
      }

      // …otherwise start it from the top. The order is NOT redrawn.
      finish({ ids, pos: 0, wrong: [] });
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [epoch, ready]);

  useEffect(() => {
    if (!hydrated || !key || !state || isRetry) return;
    AsyncStorage.setItem(key, JSON.stringify(state)).catch(() => {});
  }, [state, hydrated, key, isRetry]);

  const setPos = useCallback((pos: number) => {
    setState((s) => (s ? { ...s, pos } : s));
  }, []);

  const addWrong = useCallback((id: number) => {
    setState((s) => (s && !s.wrong.includes(id) ? { ...s, wrong: [...s.wrong, id] } : s));
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
