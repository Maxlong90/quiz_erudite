import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';

import { ITALY_PLACES, getPlace } from '@/constants/italy-quiz/places';
import { getTourQuestions } from '@/constants/italy-quiz/tour-content';
import {
  CIRCLES_PER_PLACE,
  applyResult,
  canDrawCircle,
  drawCircle,
  isCircleOpen,
  isCirclePassed,
  isPlaceUnlocked,
  migrateV1,
  sanitize,
  starsFor,
  unlocksNext,
  upsertCircle,
  usedIds,
  type CircleRecord,
  type LegacyProgressMap,
  type PlaceRecordV2,
  type ProgressMapV2,
} from '@/lib/italy-quiz/circles';

// Re-exported so the screens have one import for "progress", pure or persisted.
export {
  CIRCLES_PER_PLACE,
  MAX_STARS,
  circleSlots,
  isPlaceUnlocked,
  nextCircleIndex,
  placeStars,
  starsFor,
  type CircleRecord,
  type CircleSlot,
  type PlaceRecordV2,
  type ProgressMapV2,
} from '@/lib/italy-quiz/circles';

const KEY_V2 = 'italy.progress.v2';
/** Read once at migration and then LEFT ALONE, so a rollback still finds it. */
const KEY_V1 = 'italy.progress.v1';

const EMPTY: PlaceRecordV2 = { circles: [] };

export type EnsureResult =
  | { ok: true; ids: number[]; fresh: boolean }
  | { ok: false; reason: 'soon' | 'locked' | 'no-content' };

export interface CircleOutcome {
  earned: number;
  passed: boolean;
  unlocked: { kind: 'city'; placeId: string } | { kind: 'circle'; n: number } | null;
}

// --- storage ----------------------------------------------------------------

function parseMap(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/**
 * The v1 model kept ONE mid-tour blob per place, holding a position into an
 * order that no longer exists. Dropped once, at migration; the circle-era keys
 * live in a different namespace (`italy.tour.{id}.c{n}`) so this cannot eat one.
 */
async function purgeLegacyTourKeys(): Promise<void> {
  await AsyncStorage.multiRemove(ITALY_PLACES.map((p) => `italy.tour.${p.id}`)).catch(() => {});
}

/** The stored map, migrating the v1 record into circle 1 the first time. */
async function readMigrated(): Promise<ProgressMapV2> {
  const v2 = parseMap(await AsyncStorage.getItem(KEY_V2).catch(() => null));
  if (v2) return sanitize(v2 as ProgressMapV2);

  const legacy = parseMap(await AsyncStorage.getItem(KEY_V1).catch(() => null));
  const migrated = sanitize(migrateV1((legacy ?? {}) as LegacyProgressMap));
  if (Object.keys(migrated).length > 0) {
    await AsyncStorage.setItem(KEY_V2, JSON.stringify(migrated)).catch(() => {});
    await purgeLegacyTourKeys();
  }
  return migrated;
}

/**
 * Every write goes through one promise chain, and every mutation re-reads
 * storage INSIDE its own link.
 *
 * Fixing a circle's set is a read-modify-write, so the old fire-and-forget
 * `setItem` would lose whichever of two overlapping writes committed first — a
 * player finishing a circle while its ids are being fixed would silently lose a
 * star. Serialising also makes a double-tap harmless: the second ensure sees the
 * first one's commit and hands back the same twenty.
 */
let chain: Promise<unknown> = Promise.resolve();

function mutate<T>(
  fn: (map: ProgressMapV2) => [ProgressMapV2, T],
): Promise<{ map: ProgressMapV2; value: T }> {
  const run = chain.then(async () => {
    const current = await readMigrated();
    const [next, value] = fn(current);
    if (next !== current) await AsyncStorage.setItem(KEY_V2, JSON.stringify(next)).catch(() => {});
    return { map: next, value };
  });
  // A failed link must not poison every write that comes after it.
  chain = run.catch(() => {});
  return run;
}

// --- hook -------------------------------------------------------------------

/**
 * Per-place progress in the circle model: which twenty questions each circle is,
 * and the best stars ever earned on it.
 *
 * A circle's `ids` are written exactly once — by `ensureCircle`, while still
 * empty — and that single-writer rule IS the promise the player is given: the
 * same circle always asks the same twenty in the same order, and new material is
 * what the next circle is for. Stars are per circle and kept at their best, so
 * going back for a third star can only ever add.
 *
 * The map screen stays mounted underneath the tour, so the hook reloads on focus
 * rather than only on mount — otherwise the strip the player just changed would
 * still show the state they left.
 */
export function usePlaceProgress() {
  const [progress, setProgress] = useState<ProgressMapV2>({});
  const [hydrated, setHydrated] = useState(false);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  /** Run a mutation on the serialised chain and publish the result to React. */
  const apply = useCallback(async <T,>(fn: (map: ProgressMapV2) => [ProgressMapV2, T]) => {
    const { map, value } = await mutate(fn);
    if (alive.current) {
      setProgress(map);
      setHydrated(true);
    }
    return value;
  }, []);

  // A read is a link in the chain too, so it can never observe a torn write.
  const reload = useCallback(async () => {
    await apply((m) => [m, null]);
  }, [apply]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  /**
   * Resolve the twenty questions of one circle, drawing and freezing them the
   * first time. Content is looked up here rather than passed in, so there is one
   * answer to "what pool is circle N drawn from" and no caller able to disagree.
   */
  const ensureCircle = useCallback(
    async (placeId: string, index: number): Promise<EnsureResult> => {
      const place = getPlace(placeId);
      const questions = getTourQuestions(placeId);
      if (!place || questions.length === 0) return { ok: false, reason: 'no-content' };

      return apply<EnsureResult>((map) => {
        if (!isPlaceUnlocked(placeId, map)) return [map, { ok: false, reason: 'locked' }];

        const rec = map[placeId];
        if (!isCircleOpen(rec, index)) return [map, { ok: false, reason: 'locked' }];

        const existing = rec?.circles.find((c) => c.index === index);
        if (existing && existing.ids.length > 0) {
          return [map, { ok: true, ids: existing.ids, fresh: false }];
        }

        const ids = drawCircle(
          place,
          questions,
          usedIds(rec, index),
          new Set(rec?.seen ?? []),
        );
        if (!ids) return [map, { ok: false, reason: 'soon' }];

        return [upsertCircle(map, placeId, index, ids), { ok: true, ids, fresh: true }];
      });
    },
    [apply],
  );

  /**
   * Bank a finished circle and report what it opened.
   *
   * A circle unlock is only announced when the next circle can ACTUALLY be
   * drawn — with today's content Rome's circle 2 is still being written, and
   * promising it would be a lie. When a circle and a city open together the city
   * wins the line: the circle is visible on the strip anyway.
   */
  const recordCircle = useCallback(
    async (
      placeId: string,
      index: number,
      score: number,
      total: number,
    ): Promise<CircleOutcome> => {
      const place = getPlace(placeId);
      const questions = getTourQuestions(placeId);

      return apply<CircleOutcome>((map) => {
        const circle = map[placeId]?.circles.find((c) => c.index === index);
        const earned = starsFor(score, total);
        if (!circle || !place) return [map, { earned, passed: earned >= 1, unlocked: null }];

        const wasPassed = isCirclePassed(circle);
        const next = applyResult(map, placeId, index, score, total);
        const passed = isCirclePassed(next[placeId]?.circles.find((c) => c.index === index));

        let unlocked: CircleOutcome['unlocked'] = null;
        if (!wasPassed && passed) {
          const city = index === 1 ? unlocksNext(placeId) : null;
          if (city) {
            unlocked = { kind: 'city', placeId: city };
          } else if (
            index < CIRCLES_PER_PLACE &&
            canDrawCircle(place, questions, usedIds(next[placeId]))
          ) {
            unlocked = { kind: 'circle', n: index + 1 };
          }
        }
        return [next, { earned, passed, unlocked }];
      });
    },
    [apply],
  );

  const recordFor = useCallback(
    (placeId: string | undefined): PlaceRecordV2 => (placeId && progress[placeId]) || EMPTY,
    [progress],
  );

  const circleFor = useCallback(
    (placeId: string | undefined, index: number): CircleRecord | null =>
      (placeId && progress[placeId]?.circles.find((c) => c.index === index)) || null,
    [progress],
  );

  return { progress, hydrated, reload, ensureCircle, recordCircle, recordFor, circleFor };
}
