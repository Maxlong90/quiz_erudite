import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { QUESTIONS_PER_ACT, type ItalyPlace } from '@/constants/italy-quiz/places';
import type { ItalyQuestion } from '@/constants/italy-quiz/question';
import { readProgress } from '@/hooks/italy-quiz/use-place-progress';

/**
 * A tour in progress: the order it drew, how far the player has walked through
 * it, and which questions they missed.
 *
 * The ORDER is persisted rather than recomputed, because the draw is now random:
 * recomputing it on any re-render would reshuffle a tour under a player halfway
 * through one.
 *
 * The score is derived, never stored: every answered question is either right or
 * wrong, so `score = pos - wrong.length`.
 */
export interface TourProgress {
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
 * Draw one tour: `QUESTIONS_PER_ACT` questions from each act, acts in order.
 *
 * Three rules shape the draw, and each exists to protect something the tour would
 * otherwise lose to randomness:
 *
 * 1. **Callback pairs are always included, both halves.** A question that refers
 *    back to an earlier one is the best moment in a tour, and half a pair is
 *    worse than none — the ribbon would point at a question the player never saw.
 *    They are pulled in first, before any random pick, and a pair whose halves
 *    are not in that order (earlier act first) is ignored rather than shown broken.
 * 2. **Questions this place has not asked yet come before ones it has.** This is
 *    what makes a second tour of Rome worth playing. When the unseen ones run out
 *    the seen ones fill in, so a tour is never short.
 * 3. **The warm-up opens the tour.** Marked rather than written first, because
 *    everything else inside an act is shuffled.
 */
export function orderTour(
  place: ItalyPlace,
  questions: ItalyQuestion[],
  seen: Set<number>,
): number[] {
  const actIndex = new Map(place.acts.map((a, i) => [a.id, i]));
  const byId = new Map(questions.map((q) => [q.id, q]));

  // Rule 1 — every honourable callback pair, taken whole.
  const forced = new Set<number>();
  for (const q of questions) {
    if (q.callback == null) continue;
    const partner = byId.get(q.callback);
    if (!partner) continue;
    const here = actIndex.get(q.act);
    const there = actIndex.get(partner.act);
    if (here == null || there == null || there >= here) continue;
    forced.add(q.id);
    forced.add(partner.id);
  }

  const picks = place.acts.map((act) => {
    const pool = questions.filter((q) => q.act === act.id);
    // Rule 3 — the warm-up is PINNED, not merely sorted to the front. Leaving it
    // to compete for a slot like any other question meant it was often not drawn
    // at all, and the tour opened on whatever the shuffle produced.
    const warm = pool.filter((q) => q.warmup);
    const rest = pool.filter((q) => !q.warmup);
    const free = rest.filter((q) => !forced.has(q.id));
    const ordered = [
      ...warm,
      ...rest.filter((q) => forced.has(q.id)),
      // Rule 2 — fresh questions first.
      ...shuffle(free.filter((q) => !seen.has(q.id))),
      ...shuffle(free.filter((q) => seen.has(q.id))),
    ].slice(0, QUESTIONS_PER_ACT);

    return ordered.map((q) => q.id);
  });

  return picks.flat();
}

function isValid(p: unknown, pool: Set<number>): p is TourProgress {
  if (!p || typeof p !== 'object') return false;
  const r = p as TourProgress;
  if (!Array.isArray(r.ids) || r.ids.length === 0) return false;
  if (!r.ids.every((n) => Number.isInteger(n) && pool.has(n))) return false;
  if (typeof r.pos !== 'number' || r.pos < 0 || r.pos > r.ids.length) return false;
  return Array.isArray(r.wrong) && r.wrong.every((n) => Number.isInteger(n));
}

/**
 * Owns one tour's order, position and mistakes, resuming where the player left
 * off.
 *
 * A `retry` tour replays only the ids handed to it and is never persisted, so
 * abandoning a mistakes review returns the player to a clean slate rather than to
 * a half-finished sub-tour. Hydration is keyed on `epoch`, so only an explicit
 * restart (Play again / Review mistakes) draws a new tour.
 */
export function useTourProgress(opts: {
  placeId: string | undefined;
  /** Storage key, or null to disable persistence (retry tours). */
  key: string | null;
  place: ItalyPlace | null;
  questions: ItalyQuestion[];
  /** Mistakes-only sub-tour — used verbatim, never persisted. */
  retry: number[] | null;
  /** Bumped to force a brand-new tour. */
  epoch: number;
}) {
  const { placeId, key, place, questions, retry, epoch } = opts;
  const [state, setState] = useState<TourProgress | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const hydratedEpoch = useRef<number | null>(null);

  const isRetry = !!(retry && retry.length > 0);
  const ready = !!place && questions.length > 0;

  useEffect(() => {
    if (hydratedEpoch.current === epoch) return;
    if (!ready || !place) return;
    hydratedEpoch.current = epoch;
    let cancelled = false;

    const finish = (p: TourProgress) => {
      if (cancelled) return;
      setState(p);
      setHydrated(true);
    };

    (async () => {
      if (isRetry) {
        const known = new Set(questions.map((q) => q.id));
        finish({ ids: retry!.filter((id) => known.has(id)), pos: 0, wrong: [] });
        return;
      }

      // Resume a saved tour when it still matches the content…
      if (key) {
        try {
          const raw = await AsyncStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (isValid(parsed, new Set(questions.map((q) => q.id)))) {
              finish(parsed);
              return;
            }
          }
        } catch {
          // a corrupt entry just means a fresh tour
        }
      }

      // …otherwise draw a new one, preferring questions this place has not asked.
      const progress = await readProgress();
      const seen = new Set(placeId ? (progress[placeId]?.seen ?? []) : []);
      finish({ ids: orderTour(place, questions, seen), pos: 0, wrong: [] });
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
