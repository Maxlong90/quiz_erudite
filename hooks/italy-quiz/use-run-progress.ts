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

function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Draw a run of `limit` questions.
 *
 * Without a `mix` the draw is a plain shuffle of the whole pool. With one, the
 * run is composed to a fixed text/photo ratio — e.g. Regions & capitals and
 * Ancient Rome are meant to play as "mostly text with a sprinkle of photos"
 * (80/20), even though their pools hold far more of each. Composing at DRAW time
 * (instead of trimming the pool) keeps every generated question available, so
 * successive runs still show different questions.
 *
 * Short buckets never shrink the run: whatever one side lacks is topped up from
 * the other.
 */
function drawRun(
  pool: { id: number; hasImage: boolean }[],
  limit: number,
  mix: number | null,
): number[] {
  if (mix == null) {
    return shuffle(pool.map((q) => q.id)).slice(0, limit);
  }
  const wantPhoto = Math.round(limit * mix);
  const photo = shuffle(pool.filter((q) => q.hasImage).map((q) => q.id));
  const text = shuffle(pool.filter((q) => !q.hasImage).map((q) => q.id));

  const takePhoto = photo.slice(0, wantPhoto);
  const takeText = text.slice(0, limit - takePhoto.length);
  // One bucket ran short — top the run up from the other so it still has `limit`.
  const rest = [
    ...photo.slice(takePhoto.length),
    ...text.slice(takeText.length),
  ];
  const filler = shuffle(rest).slice(0, limit - takePhoto.length - takeText.length);

  return shuffle([...takePhoto, ...takeText, ...filler]);
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
  /** Every question currently available in the subcategory, with whether it
   *  carries a photo (so a run can be composed to a fixed text/photo ratio). */
  pool: { id: number; hasImage: boolean }[];
  /** How many questions a fresh run draws. */
  limit: number;
  /** Share of the run that must be PHOTO questions (e.g. 0.2 = 20%), or null to
   *  draw from the whole pool without composing a ratio. */
  photoMix: number | null;
  /** Mistakes-only sub-run — used verbatim, never persisted. */
  retry: number[] | null;
  /** True once the content is loaded so `poolIds` is meaningful. */
  ready: boolean;
  /** Bumped to force a brand-new run (Play again / Review mistakes). */
  epoch: number;
}) {
  const { key, pool, limit, photoMix, retry, ready, epoch } = opts;
  const [state, setState] = useState<RunProgress | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const hydratedEpoch = useRef<number | null>(null);

  // Hydrate once per epoch, as soon as the pool is ready. Deliberately NOT keyed
  // on the pool array identity: a background content re-sync must not reshuffle
  // (or otherwise disturb) a run the player is in the middle of.
  useEffect(() => {
    if (hydratedEpoch.current === epoch) return;
    if (!ready || pool.length === 0) return;
    hydratedEpoch.current = epoch;
    let cancelled = false;

    const finishWith = (p: RunProgress) => {
      if (cancelled) return;
      setState(p);
      setHydrated(true);
    };

    // A retry run: the passed IDs, in order, no persistence.
    if (retry && retry.length > 0) {
      const known = new Set(pool.map((q) => q.id));
      finishWith({ ids: retry.filter((n) => known.has(n)), pos: 0, wrong: [] });
      return;
    }

    (async () => {
      let saved: RunProgress | null = null;
      if (key) {
        try {
          const raw = await AsyncStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (isValid(parsed, new Set(pool.map((q) => q.id)))) saved = parsed;
          }
        } catch {
          // ignore a corrupt/unreadable entry — fall back to a fresh run
        }
      }
      finishWith(saved ?? { ids: drawRun(pool, limit, photoMix), pos: 0, wrong: [] });
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, epoch, pool.length]);

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
