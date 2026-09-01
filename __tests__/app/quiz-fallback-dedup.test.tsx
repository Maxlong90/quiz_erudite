/**
 * Integration tests for the API-fallback path in the quiz screen
 * (app/quiz.tsx, loadQuestions). The fallback runs when the local snapshot
 * isn't usable (missing / locale mismatch / empty pool) and pulls questions
 * straight from fetchRandomQuestions. It must give the SAME no-repeat
 * guarantees as the cache path (pickQuestionsFromCache):
 *
 *  - dedupe by id within the fetched batch (never hand a session two
 *    questions with the same id),
 *  - honour the cross-session `seen` set for the same seenKey,
 *  - never come up empty: when fewer than `wanted` fresh questions remain,
 *    reset the bucket and reuse the full deduped pool,
 *  - record the questions it hands out into `seen`.
 *
 * snapshot is pinned to null so loadQuestions always takes the fallback, and
 * fetchRandomQuestions is mocked per-test. The persisted `seen` store
 * ('quiz.seen.v1.<seenKey>') is asserted directly — it reflects exactly the
 * ids dispatched into the session. Math.random is pinned so the shuffle is
 * deterministic.
 */
import React from 'react';
import { cleanup, render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- controllable mock state -------------------------------------------------

let mockParams: Record<string, string> = {};

// --- module boundaries (mirror quiz-screen.test.tsx) -------------------------

jest.mock('@/hooks/use-premium', () => ({
  usePremium: () => ({ isPremium: false, setPremium: jest.fn(), resetPremium: jest.fn() }),
}));
jest.mock('@/hooks/use-lives', () => ({
  useLives: () => ({ count: 5, canClaim: false, reload: jest.fn() }),
}));
jest.mock('@/hooks/use-hints', () => ({
  useHintsState: () => ({ state: { fiftyFifty: 3, statistics: 2, replaceQuestion: 1 }, reload: jest.fn() }),
}));
// The fallback path only runs when there is no usable snapshot.
jest.mock('@/hooks/use-content-cache', () => ({
  useContentCache: () => ({ snapshot: null }),
}));
jest.mock('@/hooks/use-locale', () => ({ useLocale: () => ({ locale: 'en' }) }));
jest.mock('@/hooks/use-theme-pref', () => ({
  useThemePref: () => ({ theme: 'dark', ready: true, setTheme: jest.fn() }),
}));

jest.mock('@/lib/lives', () => ({
  spendLife: jest.fn().mockResolvedValue(4),
  getLives: jest.fn().mockResolvedValue(5),
  addLives: jest.fn().mockResolvedValue(6),
}));
jest.mock('@/lib/hints', () => ({ consumeHint: jest.fn().mockResolvedValue(0) }));
jest.mock('@/lib/content-cache', () => ({
  resolveLocalImage: (_s: unknown, url: string | null) => url ?? null,
}));
jest.mock('@/lib/mistakes', () => ({
  recordMistake: jest.fn().mockResolvedValue(undefined),
  getMistakeIds: jest.fn().mockResolvedValue([]),
}));
jest.mock('@/lib/quiz-stats', () => ({ recordQuizCompletion: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/lib/achievements', () => ({
  computeProgress: jest.fn(() => []),
  detectUnlocks: jest.fn().mockResolvedValue({ newlyUnlocked: [], pendingLevels: [] }),
  gatherMetrics: jest.fn().mockResolvedValue({}),
  markUnlocksSeen: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/lib/today-question', () => ({ getTodayQuestionId: jest.fn().mockResolvedValue(null) }));
jest.mock('@/api/questions', () => ({ fetchRandomQuestions: jest.fn().mockResolvedValue([]) }));
jest.mock('@/api/client', () => ({ APP_SLUG: 'erudite-quiz' }));

// expo / native / visual-only siblings
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
}));
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('react-native-safe-area-context', () => {
  const ReactModule = require('react');
  const { View: RNView } = require('react-native');
  return {
    SafeAreaView: ({ children, ...props }: { children: React.ReactNode }) =>
      ReactModule.createElement(RNView, props, children),
  };
});
jest.mock('@/components/ui/icon-symbol', () => ({ IconSymbol: () => null }));
jest.mock('@/components/quiz/progress-bar', () => ({ ProgressBar: () => null }));
jest.mock('@/components/quiz/quiz-timer', () => ({ QuizTimer: () => null }));
jest.mock('@/components/quiz/report-button', () => ({ ReportButton: () => null }));
jest.mock('@/components/quiz/report-modal', () => ({ ReportModal: () => null }));
jest.mock('@/components/quiz/share-question-button', () => ({ ShareQuestionButton: () => null }));
jest.mock('@/components/lives/buy-lives-modal', () => ({ BuyLivesModal: () => null }));
jest.mock('@/components/quiz/hard-question-card', () => ({ HardQuestionCard: () => null }));
jest.mock('@/components/themed-text', () => {
  const { Text: RNText } = require('react-native');
  return { ThemedText: (props: Record<string, unknown>) => <RNText {...props} /> };
});
jest.mock('@/components/quiz/out-of-lives-modal', () => ({ OutOfLivesModal: () => null }));

jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => mockParams,
  useFocusEffect: () => {},
}));

// eslint-disable-next-line import/first -- screen under test must load AFTER its mocks
import QuizScreen from '@/app/quiz';
// eslint-disable-next-line import/first -- accessed as a jest mock, defined above
import { fetchRandomQuestions } from '@/api/questions';

const mockFetch = fetchRandomQuestions as jest.Mock;

// --- fixtures ---------------------------------------------------------------

// requestedSlugs is empty (no category param) + mode 'quick', so seenKey is
// the "all categories" bucket. Mirrors quiz.tsx's seenKey derivation.
const SEEN_KEY = 'quiz.seen.v1.__all__';

/** A minimal valid multiple-choice question with a unique id/text. */
function makeQ(id: number) {
  return {
    id,
    category_slug: 'geo',
    question: `Question #${id}?`,
    options: ['A', 'B', 'C', 'D'],
    correct_option: 0,
    explanation: null,
    image_url: null,
  };
}

async function seedSeen(ids: number[]): Promise<string> {
  const value = JSON.stringify({ ids });
  await AsyncStorage.setItem(SEEN_KEY, value);
  return value; // caller passes this back so we can detect loadQuestions' write
}

/**
 * Wait until loadQuestions has persisted the seen bucket — the SEEN_KEY value
 * changes away from `prev` (the seed, or null when unseeded). writeSeen runs
 * after the dispatch, so this reliably observes loadQuestions' own write rather
 * than the seed. Reading the store directly (no setItem spy) avoids corrupting
 * the AsyncStorage mock across tests.
 */
async function waitForSeenIds(prev: string | null): Promise<number[]> {
  let ids: number[] = [];
  await waitFor(async () => {
    const raw = await AsyncStorage.getItem(SEEN_KEY);
    expect(raw).toBeTruthy();
    expect(raw).not.toBe(prev);
    ids = JSON.parse(raw as string).ids;
  });
  return ids;
}

beforeEach(async () => {
  await AsyncStorage.clear();
  mockParams = { count: '2', locale: 'en', mode: 'quick' };
  // Persistent resolve (not Once): a stray re-render's fetch can't drain the
  // queue and leave a later call returning undefined.
  mockFetch.mockReset();
  jest.spyOn(Math, 'random').mockReturnValue(0);
});

afterEach(() => {
  // Unmount so a lingering component can't fire writes into the next test.
  cleanup();
  (Math.random as jest.Mock).mockRestore?.();
});

// --- tests ------------------------------------------------------------------

describe('API fallback path — dedupe by id + seen', () => {
  it('collapses duplicate ids from the API so a session never repeats a question', async () => {
    // API returns the same id twice; wanted=2 but only one distinct question
    // exists, so the deduped pool is [1]. The session must get exactly one
    // question — not two copies of id 1 — and must not be empty.
    mockFetch.mockResolvedValue([makeQ(1), makeQ(1)]);

    render(<QuizScreen />);

    const ids = await waitForSeenIds(null);
    // Exactly one id recorded → the duplicate collapsed, no within-session repeat.
    expect(ids).toEqual([1]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('skips ids already in `seen` and records the fresh picks', async () => {
    // Bucket already saw 2 and 3. API returns [1,1,2,3,4]; deduped pool is
    // {1,2,3,4}; two fresh unseen ({1,4}) satisfy wanted=2, so no reset.
    const seed = await seedSeen([2, 3]);
    mockFetch.mockResolvedValue([makeQ(1), makeQ(1), makeQ(2), makeQ(3), makeQ(4)]);

    render(<QuizScreen />);

    const stored = await waitForSeenIds(seed);
    // seen = previous [2,3] ∪ fresh picks. Fresh picks = stored − seeded.
    const picks = stored.filter((id) => id !== 2 && id !== 3);
    expect(picks).toHaveLength(2); // exactly `wanted`
    expect(new Set(picks).size).toBe(picks.length); // no duplicate id
    expect(picks).not.toContain(2); // already seen — excluded
    expect(picks).not.toContain(3);
    // The seen store grew to include both old and new ids.
    expect(new Set(stored)).toEqual(new Set([1, 2, 3, 4]));
  });

  it('resets the bucket and reuses the full pool when nothing fresh remains', async () => {
    // Everything the API returns has already been seen (1,2,3). The quiz must
    // NOT end up empty: reset the bucket and reuse the full deduped pool. Seed
    // an extra id (3) not present in the pool so the reset write differs from
    // the seed string and is unambiguously observable.
    const seed = await seedSeen([1, 2, 3]);
    mockFetch.mockResolvedValue([makeQ(1), makeQ(2)]);

    render(<QuizScreen />);

    const stored = await waitForSeenIds(seed);
    // resetSeen drops the old bucket (including the stale 3), so the store is
    // exactly the fresh picks from the full pool.
    expect(new Set(stored)).toEqual(new Set([1, 2]));
    expect(stored).toHaveLength(2); // not empty, no duplicate
    expect(new Set(stored).size).toBe(stored.length);
  });
});
