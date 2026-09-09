import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'italy.progress.v1';

/** A tour scoring this share of its questions earns the matching star count. */
const STAR_BANDS: { pct: number; stars: number }[] = [
  { pct: 100, stars: 3 },
  { pct: 80, stars: 2 },
  { pct: 50, stars: 1 },
];

export function starsFor(score: number, total: number): number {
  if (total <= 0) return 0;
  const pct = (score / total) * 100;
  return STAR_BANDS.find((b) => pct >= b.pct)?.stars ?? 0;
}

export const MAX_STARS = 3;

export interface PlaceRecord {
  /** Best star count ever earned here — a worse replay never takes stars away. */
  stars: number;
  /** Best percentage, so the card can show how close three stars are. */
  bestPct: number;
  plays: number;
  /** Question ids already served here, so a replay can prefer fresh ones. */
  seen: number[];
}

export type ProgressMap = Record<string, PlaceRecord>;

const EMPTY: PlaceRecord = { stars: 0, bestPct: 0, plays: 0, seen: [] };

/**
 * Per-place progress: stars earned, and which questions have already been asked.
 *
 * These two are what make a place worth entering twice, and they solve different
 * halves of the problem. **Stars** give a reason to replay at all — finishing is
 * not the goal, finishing clean is — and they are kept at their BEST, so a lazy
 * second run can never cost the player what they already earned. **The seen set**
 * makes that replay worth playing: the draw prefers questions this place has not
 * asked yet, so a second tour of Rome is genuinely different rather than the same
 * twenty in a new order.
 *
 * Both live under one key so a single read hydrates the whole map screen.
 *
 * Nothing here resets when the seen set fills up. Once every question has been
 * served the draw simply falls back to shuffling them all, which is the correct
 * behaviour: the player has seen the place, and repetition is now the point.
 */
export function usePlaceProgress() {
  const [progress, setProgress] = useState<ProgressMap>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let loaded: ProgressMap = {};
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') loaded = parsed as ProgressMap;
        }
      } catch {
        // a corrupt entry just means starting over
      }
      if (!cancelled) {
        setProgress(loaded);
        setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Record a finished tour: keep the better star count, remember what was asked. */
  const recordTour = useCallback(
    (placeId: string, servedIds: number[], score: number, total: number) => {
      setProgress((prev) => {
        const before = prev[placeId] ?? EMPTY;
        const pct = total > 0 ? Math.round((score / total) * 100) : 0;
        const next: PlaceRecord = {
          stars: Math.max(before.stars, starsFor(score, total)),
          bestPct: Math.max(before.bestPct, pct),
          plays: before.plays + 1,
          seen: Array.from(new Set([...before.seen, ...servedIds])),
        };
        const merged = { ...prev, [placeId]: next };
        AsyncStorage.setItem(KEY, JSON.stringify(merged)).catch(() => {});
        return merged;
      });
    },
    [],
  );

  const recordFor = useCallback(
    (placeId: string | undefined): PlaceRecord => (placeId && progress[placeId]) || EMPTY,
    [progress],
  );

  return { progress, hydrated, recordTour, recordFor };
}

/** Read one place's record straight from storage, outside React. */
export async function readProgress(): Promise<ProgressMap> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as ProgressMap) : {};
  } catch {
    return {};
  }
}
