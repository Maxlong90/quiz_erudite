/**
 * Tests for lib/answer-stats.ts — the anonymous answer-reporting queue, the
 * real-stats cache, and the largest-remainder percentage math that backs the
 * statistics hint's real-data path (with generated fallback handled in the
 * quiz screen). The axios client is mocked so no network is touched.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  enqueueAnswer,
  flushAnswers,
  fetchQuestionStats,
  loadCachedStats,
  realStatsForQuestion,
  toPercentages,
  clearAnswerStats,
  type QuestionStatsCache,
} from '@/lib/answer-stats';
import { apiClient } from '@/api/client';

jest.mock('@/api/client', () => ({
  APP_SLUG: 'test-app',
  apiClient: { post: jest.fn(), get: jest.fn() },
}));

const post = apiClient.post as jest.Mock;
const get = apiClient.get as jest.Mock;

const QUEUE_KEY = 'answers.queue.v1';
const CACHE_KEY = 'question.stats.v1';

async function readQueue(): Promise<{ question_id: number; option_index: number }[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? JSON.parse(raw).events : [];
}

beforeEach(async () => {
  await AsyncStorage.clear();
  post.mockReset();
  get.mockReset();
});

describe('enqueueAnswer', () => {
  it('appends valid picks to the queue', async () => {
    await enqueueAnswer(42, 1);
    await enqueueAnswer(7, 0);
    expect(await readQueue()).toEqual([
      { question_id: 42, option_index: 1 },
      { question_id: 7, option_index: 0 },
    ]);
  });

  it('drops malformed / out-of-range picks without persisting them', async () => {
    await enqueueAnswer(0, 1); // question id must be > 0
    await enqueueAnswer(5, -1); // negative option index
    await enqueueAnswer(5, 16); // above the [0,15] range
    await enqueueAnswer(5, 1.5); // non-integer option index
    await enqueueAnswer(1.2, 1); // non-integer question id
    expect(await readQueue()).toEqual([]);
  });

  it('trims the queue to its cap, keeping the most recent events', async () => {
    for (let i = 1; i <= 520; i++) {
      await enqueueAnswer(i, 0);
    }
    const queue = await readQueue();
    expect(queue.length).toBe(500);
    // Oldest (ids 1..20) dropped; newest retained.
    expect(queue[0].question_id).toBe(21);
    expect(queue[queue.length - 1].question_id).toBe(520);
  });
});

describe('flushAnswers', () => {
  it('is a no-op with an empty queue', async () => {
    await flushAnswers();
    expect(post).not.toHaveBeenCalled();
  });

  it('flushes in batches of at most 200 and empties the queue on success', async () => {
    post.mockResolvedValue({ data: { accepted: 200 } });
    for (let i = 1; i <= 450; i++) {
      await enqueueAnswer(i, i % 4);
    }
    await flushAnswers();
    expect(post).toHaveBeenCalledTimes(3); // 200 + 200 + 50
    for (const call of post.mock.calls) {
      expect(call[0]).toBe('/apps/test-app/answers');
      expect(call[1].answers.length).toBeLessThanOrEqual(200);
    }
    expect(await readQueue()).toEqual([]);
  });

  it('retains unsent events for retry when the POST fails (offline)', async () => {
    post.mockRejectedValue(new Error('offline'));
    await enqueueAnswer(1, 0);
    await enqueueAnswer(2, 1);
    await flushAnswers();
    expect(await readQueue()).toEqual([
      { question_id: 1, option_index: 0 },
      { question_id: 2, option_index: 1 },
    ]);
  });

  it('keeps only the unsent remainder when a later batch fails', async () => {
    // First batch (200) succeeds, second rejects — the 200 must not re-send.
    post
      .mockResolvedValueOnce({ data: { accepted: 200 } })
      .mockRejectedValueOnce(new Error('offline'));
    for (let i = 1; i <= 250; i++) {
      await enqueueAnswer(i, 0);
    }
    await flushAnswers();
    const queue = await readQueue();
    expect(queue.length).toBe(50);
    expect(queue[0].question_id).toBe(201);
  });
});

describe('toPercentages (largest remainder)', () => {
  it('returns integer percentages that sum to exactly 100, index-aligned', async () => {
    const pct = toPercentages([1, 1, 1], 3);
    expect(pct).not.toBeNull();
    expect(pct!.reduce((a, b) => a + b, 0)).toBe(100);
    expect(pct!.length).toBe(3);
    // 33.33.. each → 34/33/33 (largest remainders get the +1).
    expect(pct).toEqual([34, 33, 33]);
  });

  it('keeps the correct option honest (no 40-60 shaping) and zero-fills un-picked', async () => {
    // counts index-aligned; option 1 dominates, option 3 never picked.
    const pct = toPercentages([10, 70, 20, 0], 4);
    expect(pct).toEqual([10, 70, 20, 0]);
    expect(pct!.reduce((a, b) => a + b, 0)).toBe(100);
  });

  it('returns null when there is no data (zero total)', async () => {
    expect(toPercentages([0, 0, 0, 0], 4)).toBeNull();
    expect(toPercentages([], 4)).toBeNull();
  });
});

describe('fetchQuestionStats + loadCachedStats', () => {
  it('parses the object-keyed payload, indexes by number, and caches it', async () => {
    get.mockResolvedValue({
      data: { threshold: 30, stats: { '42': { total: 100, counts: [10, 70, 20, 0] } } },
    });
    await fetchQuestionStats('en');
    expect(get).toHaveBeenCalledWith('/apps/test-app/question-stats', { params: {} });
    const cache = await loadCachedStats();
    expect(cache).not.toBeNull();
    expect(cache!.locale).toBe('en');
    expect(cache!.threshold).toBe(30);
    expect(cache!.stats[42]).toEqual({ total: 100, counts: [10, 70, 20, 0] });
  });

  it('handles an empty stats object without error', async () => {
    get.mockResolvedValue({ data: { threshold: 30, stats: {} } });
    await fetchQuestionStats('en');
    const cache = await loadCachedStats();
    expect(cache!.stats).toEqual({});
  });

  it('forwards a since timestamp for incremental refresh', async () => {
    get.mockResolvedValue({ data: { threshold: 30, stats: {} } });
    await fetchQuestionStats('en', 1700000000);
    expect(get).toHaveBeenCalledWith('/apps/test-app/question-stats', {
      params: { since: 1700000000 },
    });
  });

  it('keeps the previous cache when the fetch fails', async () => {
    get.mockResolvedValue({ data: { threshold: 30, stats: { '1': { total: 50, counts: [50] } } } });
    await fetchQuestionStats('en');
    get.mockRejectedValue(new Error('offline'));
    await fetchQuestionStats('en');
    const cache = await loadCachedStats();
    expect(cache!.stats[1]).toEqual({ total: 50, counts: [50] });
  });
});

describe('realStatsForQuestion', () => {
  const cache: QuestionStatsCache = {
    locale: 'en',
    fetchedAt: 0,
    threshold: 30,
    stats: { 42: { total: 100, counts: [10, 70, 20, 0] } },
  };

  it('returns honest real percentages when the question is cached', () => {
    expect(realStatsForQuestion(cache, 42, 4)).toEqual([10, 70, 20, 0]);
  });

  it('returns null (→ generated fallback) when the question is absent or no cache', () => {
    expect(realStatsForQuestion(cache, 999, 4)).toBeNull();
    expect(realStatsForQuestion(null, 42, 4)).toBeNull();
  });

  it('permutes canonical counts into the shuffled display order', () => {
    // Display order reverses the backend order: display index d shows
    // canonical option optionOrder[d]. Canonical counts [10,70,20,0] must
    // therefore render as [0,20,70,10] in display order.
    const optionOrder = [3, 2, 1, 0];
    expect(realStatsForQuestion(cache, 42, 4, optionOrder)).toEqual([0, 20, 70, 10]);
  });

  it('is identity when optionOrder is absent or the wrong length', () => {
    expect(realStatsForQuestion(cache, 42, 4, undefined)).toEqual([10, 70, 20, 0]);
    // A mismatched-length mapping is ignored (defensive) → canonical order.
    expect(realStatsForQuestion(cache, 42, 4, [0, 1])).toEqual([10, 70, 20, 0]);
  });
});

describe('clearAnswerStats', () => {
  it('removes both the queue and the cache', async () => {
    await enqueueAnswer(1, 0);
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ stats: {} }));
    await clearAnswerStats();
    expect(await AsyncStorage.getItem(QUEUE_KEY)).toBeNull();
    expect(await AsyncStorage.getItem(CACHE_KEY)).toBeNull();
  });
});
