import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { QUESTIONS_PER_ACT, type ItalyPlace } from '@/constants/italy-quiz/places';
import type { ItalyQuestion } from '@/constants/italy-quiz/question';

/**
 * A tour in progress: how far the player has walked through the question order
 * and which questions they missed. Replaces the old `use-run-progress`, whose
 * fifty-question draw and photo-ratio composition belonged to the subcategory
 * taxonomy that no longer exists.
 *
 * The score is derived, never stored: every answered question is either right or
 * wrong, so `score = pos - wrong.length`.
 */
export interface TourProgress {
  pos: number;
  wrong: number[];
  /** Question count when the tour was saved — a changed set retires the save. */
  size: number;
}

/**
 * Order the questions of a tour: act by act, in the order the place declares its
 * acts, up to `QUESTIONS_PER_ACT` from each.
 *
 * The order inside an act is the AUTHORED order, deliberately not shuffled. Two
 * reasons while the content is hand-written: the first question is a warm-up that
 * has to land first, and a fixed order keeps callback pairs (question 16 refers
 * back to question 5) reading exactly as they were written. Once a place holds
 * more questions than a tour draws, this is where a within-act shuffle goes — the
 * acts themselves must stay in sequence so a callback's first half always plays
 * before its second.
 */
export function orderTour(place: ItalyPlace, questions: ItalyQuestion[]): number[] {
  return place.acts.flatMap((act) =>
    questions
      .filter((q) => q.act === act.id)
      .slice(0, QUESTIONS_PER_ACT)
      .map((q) => q.id),
  );
}

function isValid(p: unknown, size: number): p is TourProgress {
  if (!p || typeof p !== 'object') return false;
  const r = p as TourProgress;
  if (r.size !== size) return false;
  if (typeof r.pos !== 'number' || r.pos < 0 || r.pos > size) return false;
  return Array.isArray(r.wrong) && r.wrong.every((n) => Number.isInteger(n));
}

/**
 * Owns one tour's position and mistakes, resuming where the player left off.
 *
 * A `retry` tour replays only the ids handed to it and is never persisted, so
 * abandoning a mistakes review returns the player to a clean slate rather than to
 * a half-finished sub-tour. Hydration is keyed on `epoch`, so only an explicit
 * restart (Play again / Review mistakes) starts a new tour.
 */
export function useTourProgress(opts: {
  /** Storage key, or null to disable persistence (retry tours). */
  key: string | null;
  place: ItalyPlace | null;
  questions: ItalyQuestion[];
  /** Mistakes-only sub-tour — used verbatim, never persisted. */
  retry: number[] | null;
  /** Bumped to force a brand-new tour. */
  epoch: number;
}) {
  const { key, place, questions, retry, epoch } = opts;
  const [state, setState] = useState<TourProgress | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const hydratedEpoch = useRef<number | null>(null);

  const isRetry = !!(retry && retry.length > 0);

  const ids = useMemo(() => {
    if (!place || questions.length === 0) return [];
    const full = orderTour(place, questions);
    if (!isRetry) return full;
    // Keep the retry in tour order rather than in the order the misses happened.
    const wanted = new Set(retry);
    return full.filter((id) => wanted.has(id));
  }, [place, questions, isRetry, retry]);

  useEffect(() => {
    if (hydratedEpoch.current === epoch) return;
    if (ids.length === 0) return;
    hydratedEpoch.current = epoch;
    let cancelled = false;

    const finish = (p: TourProgress) => {
      if (cancelled) return;
      setState(p);
      setHydrated(true);
    };

    if (isRetry || !key) {
      finish({ pos: 0, wrong: [], size: ids.length });
      return;
    }

    (async () => {
      let saved: TourProgress | null = null;
      try {
        const raw = await AsyncStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (isValid(parsed, ids.length)) saved = parsed;
        }
      } catch {
        // a corrupt entry just means a fresh tour
      }
      finish(saved ?? { pos: 0, wrong: [], size: ids.length });
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [epoch, ids.length]);

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
    ids,
    pos: state?.pos ?? 0,
    wrong: state?.wrong ?? [],
    setPos,
    addWrong,
    clear,
  };
}
