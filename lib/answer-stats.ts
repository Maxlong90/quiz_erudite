import AsyncStorage from '@react-native-async-storage/async-storage';

import { apiClient, APP_SLUG } from '@/api/client';

// Anonymous, aggregate-only answer telemetry for the "statistics" hint.
//
// Two independent concerns live here:
//   1. A local, persisted OUTBOUND queue of answer picks that is flushed to
//      the backend opportunistically in batches (fire-and-forget, offline-safe).
//   2. A local CACHE of the backend's aggregated per-question distributions,
//      read synchronously at hint time so the hint works with no live network.
//
// Nothing here is ever allowed to throw into gameplay — every path is
// best-effort and swallows its errors, mirroring lib/hints.ts / lib/mistakes.ts.

const QUEUE_KEY = 'answers.queue.v1';
const CACHE_KEY = 'question.stats.v1';

// Cap the outbound queue so a long offline streak can't grow it unbounded;
// when over the cap we keep the most recent events and drop the oldest.
const QUEUE_MAX = 500;
// The backend rejects a batch larger than 200 rows (422), so never send more
// than this per POST.
const FLUSH_BATCH_SIZE = 200;
// The backend only accepts an integer option_index in [0, 15]; anything else
// is dropped server-side, so we don't bother queuing it.
const MAX_OPTION_INDEX = 15;

export interface AnswerEvent {
  question_id: number;
  option_index: number;
}

interface QueueStore {
  events: AnswerEvent[];
}

export interface QuestionStat {
  total: number;
  counts: number[];
}

export interface QuestionStatsCache {
  /** Content locale the cache was fetched for. */
  locale: string;
  /** Wall-clock time (ms) the cache was persisted. */
  fetchedAt: number;
  /** Minimum sample count the server used to gate a question in. */
  threshold: number;
  /** Per-question distributions, keyed by question id. */
  stats: Record<number, QuestionStat>;
}

// ── Outbound queue ────────────────────────────────────────────────────────

async function readQueue(): Promise<AnswerEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QueueStore;
    return Array.isArray(parsed.events) ? parsed.events : [];
  } catch {
    return [];
  }
}

async function writeQueue(events: AnswerEvent[]): Promise<void> {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify({ events }));
  } catch {
    // best-effort
  }
}

/**
 * Append one anonymous answer pick to the local queue. Validates the shape
 * up front so we never persist rows the backend would only drop, and trims
 * the queue to its cap (keeping the most recent events). Fire-and-forget.
 */
export async function enqueueAnswer(questionId: number, optionIndex: number): Promise<void> {
  if (!Number.isInteger(questionId) || questionId <= 0) return;
  if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex > MAX_OPTION_INDEX) return;
  const events = await readQueue();
  events.push({ question_id: questionId, option_index: optionIndex });
  const trimmed = events.length > QUEUE_MAX ? events.slice(events.length - QUEUE_MAX) : events;
  await writeQueue(trimmed);
}

/**
 * Flush the queued answer picks to the backend in batches of at most 200.
 * Each accepted batch is removed and the shrunk queue persisted immediately,
 * so a mid-flush failure never re-sends what already landed and never loses
 * what hasn't. On any network/server error the remaining events stay queued
 * for the next opportunity. Strictly fire-and-forget — safe to call offline.
 */
export async function flushAnswers(): Promise<void> {
  let events = await readQueue();
  if (events.length === 0) return;
  try {
    while (events.length > 0) {
      const batch = events.slice(0, FLUSH_BATCH_SIZE);
      await apiClient.post(`/apps/${APP_SLUG}/answers`, { answers: batch });
      events = events.slice(batch.length);
      await writeQueue(events);
    }
  } catch {
    // Offline or server error — leave the remaining events queued. Batches
    // already accepted were persisted above, so nothing is double-counted
    // on the next flush.
  }
}

// ── Real-stats cache ──────────────────────────────────────────────────────

interface StatsResponse {
  threshold: number;
  stats: Record<string, { total: number; counts: number[] }>;
}

/**
 * Fetch the backend's aggregated per-question distributions for the current
 * app and persist them locally. The server already gates to questions whose
 * total sample count meets the threshold, so any question present is real
 * data. Best-effort — a failure keeps whatever was cached before.
 *
 * @param since Optional unix-seconds timestamp for an incremental refresh
 *   (only questions whose counters changed at/after it). Omit for a full fetch.
 */
export async function fetchQuestionStats(locale: string, since?: number): Promise<void> {
  try {
    const params: Record<string, string | number> = {};
    if (typeof since === 'number' && Number.isFinite(since)) {
      params.since = Math.floor(since);
    }
    const { data } = await apiClient.get<StatsResponse>(
      `/apps/${APP_SLUG}/question-stats`,
      { params },
    );
    const stats: Record<number, QuestionStat> = {};
    // `stats` is a JSON object keyed by stringified question id, and is `{}`
    // when nothing has reached threshold — parse defensively.
    for (const [key, value] of Object.entries(data?.stats ?? {})) {
      const id = Number(key);
      if (!Number.isInteger(id)) continue;
      if (!value || !Array.isArray(value.counts)) continue;
      stats[id] = {
        total: Number.isFinite(value.total) ? value.total : 0,
        counts: value.counts,
      };
    }
    const cache: QuestionStatsCache = {
      locale,
      fetchedAt: Date.now(),
      threshold: Number.isFinite(data?.threshold) ? data.threshold : 0,
      stats,
    };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // best-effort — keep the previous cache
  }
}

/** Load the cached real-stats blob for synchronous in-memory use at hint time. */
export async function loadCachedStats(): Promise<QuestionStatsCache | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as QuestionStatsCache;
    if (!parsed || typeof parsed.stats !== 'object' || parsed.stats === null) return null;
    return parsed;
  } catch {
    return null;
  }
}

// ── Distribution math ─────────────────────────────────────────────────────

/**
 * Convert raw per-option counts into integer percentages that sum to exactly
 * 100 using the largest-remainder method, index-aligned to `optionCount`
 * (un-picked slots stay 0 unless they earn a remainder bump). Returns null
 * when there is no real data to base percentages on (zero total), so callers
 * can fall back to the generated distribution.
 */
export function toPercentages(counts: number[], optionCount: number): number[] | null {
  const safeCounts: number[] = [];
  for (let i = 0; i < optionCount; i++) {
    const c = counts[i];
    safeCounts[i] = Number.isFinite(c) && c > 0 ? Math.floor(c) : 0;
  }
  const total = safeCounts.reduce((a, b) => a + b, 0);
  if (total <= 0) return null;

  const exact = safeCounts.map((c) => (c / total) * 100);
  const floored = exact.map((v) => Math.floor(v));
  let remainder = 100 - floored.reduce((a, b) => a + b, 0);

  // Hand the leftover points to the largest fractional parts, biggest first.
  const byFraction = exact
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);
  const result = [...floored];
  for (let k = 0; k < byFraction.length && remainder > 0; k++) {
    result[byFraction[k].i] += 1;
    remainder -= 1;
  }
  return result;
}

/**
 * Real per-option percentages for a question from the cached stats, or null
 * when the question isn't cached (below threshold / not fetched yet) so the
 * caller falls back to the generated distribution. Percentages stay honest —
 * no shaping of the correct option.
 *
 * The cached `counts` are in the backend's canonical option order. When the
 * caller passes `optionOrder` (display index → canonical index, because the
 * options were shuffled for this session), the counts are permuted into the
 * display order first, so each bar lines up with the option shown.
 */
export function realStatsForQuestion(
  cache: QuestionStatsCache | null,
  questionId: number,
  optionCount: number,
  optionOrder?: number[],
): number[] | null {
  if (!cache) return null;
  const stat = cache.stats[questionId];
  if (!stat || !Array.isArray(stat.counts)) return null;
  const counts =
    optionOrder && optionOrder.length === optionCount
      ? optionOrder.map((canonical) => {
          const c = stat.counts[canonical];
          return Number.isFinite(c) ? c : 0;
        })
      : stat.counts;
  return toPercentages(counts, optionCount);
}

/** Remove both the outbound queue and the cached stats (e.g. on data reset). */
export async function clearAnswerStats(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([QUEUE_KEY, CACHE_KEY]);
  } catch {
    // best-effort
  }
}
