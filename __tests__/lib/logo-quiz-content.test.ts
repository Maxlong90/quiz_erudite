/**
 * Tests for lib/logo-quiz/content.ts — the pure transforms that turn a backend
 * content snapshot into the Logo Quiz's LEVEL view-models. Covers level grouping
 * by the backend `order` (levels of 15), the derived fields (level /
 * positionInLevel / premium), dropping questions without a valid order, the
 * question mapping (brand = options[correct_option], option order, image
 * resolution), and the state-free progress selectors (solved counts + unlocking,
 * including a partial last level). The api client is mocked so importing the
 * content cache — which content.ts depends on for resolveLocalImage — touches no
 * network or env.
 */

import {
  buildLevels,
  questionsForLevel,
  totalLevels,
  levelSolvedCount,
  levelFreeSolvedCount,
  isLevelUnlocked,
  FREE_PER_LEVEL,
  LEVEL_SIZE,
} from '@/lib/logo-quiz/content';
import { resolveLocalImage, type ContentSnapshot } from '@/lib/content-cache';

jest.mock('@/api/client', () => ({
  APP_SLUG: 'erudite-quiz',
  apiClient: { get: jest.fn(), post: jest.fn() },
}));

type Q = ContentSnapshot['questions'][number];

function mkQ(
  id: number,
  order: number | null,
  opts: {
    options?: string[];
    correct_option?: number;
    explanation?: string | null;
    image_url?: string | null;
  } = {},
): Q {
  const base = {
    id,
    category_slug: 'logo-quiz',
    question: `q${id}`,
    options: opts.options ?? ['A', 'B', 'C', 'D'],
    correct_option: opts.correct_option ?? 0,
    explanation: opts.explanation ?? null,
    image_url: opts.image_url ?? null,
  } as Q;
  // `order` is an additive backend field the shared type doesn't declare — it
  // survives the cache round-trip and content.ts reads it defensively.
  if (order != null) (base as { order?: number }).order = order;
  return base;
}

function makeSnapshot(questions: Q[], imageMap?: Record<string, string>): ContentSnapshot {
  return {
    app: { slug: 'logo-quiz', name: 'Logo Quiz', supported_locales: ['en', 'ru', 'es'] },
    locale: 'ru',
    version: 1,
    generated_at: '2026-07-28T00:00:00Z',
    categories: [],
    questions,
    imageMap,
  };
}

/** N questions numbered `start..start+N-1`. */
function orderedQuestions(count: number, start = 1): Q[] {
  return Array.from({ length: count }, (_, i) => mkQ(1000 + start + i, start + i));
}

describe('buildLevels', () => {
  it('groups numbered questions into dense, ordered levels of 15', () => {
    const snap = makeSnapshot(orderedQuestions(32));
    const levels = buildLevels(snap);

    expect(levels.map((l) => l.level)).toEqual([1, 2, 3]);
    expect(levels[0].questions).toHaveLength(15);
    expect(levels[1].questions).toHaveLength(15);
    expect(levels[2].questions).toHaveLength(2); // partial last level
    expect(totalLevels(snap)).toBe(3);
  });

  it('sorts questions by order regardless of snapshot order', () => {
    const snap = makeSnapshot([mkQ(3, 3), mkQ(1, 1), mkQ(2, 2)]);
    expect(questionsForLevel(snap, 1).map((q) => q.order)).toEqual([1, 2, 3]);
  });

  it('derives level / positionInLevel / premium from order', () => {
    const snap = makeSnapshot(orderedQuestions(16));
    const all = buildLevels(snap).flatMap((l) => l.questions);

    const first = all.find((q) => q.order === 1)!;
    expect(first).toMatchObject({ level: 1, positionInLevel: 0, premium: false });

    const lastFree = all.find((q) => q.order === FREE_PER_LEVEL)!; // order 9 → position 8
    expect(lastFree).toMatchObject({ level: 1, positionInLevel: 8, premium: false });

    const firstPremium = all.find((q) => q.order === FREE_PER_LEVEL + 1)!; // order 10 → position 9
    expect(firstPremium).toMatchObject({ level: 1, positionInLevel: 9, premium: true });

    const lastOfLevel = all.find((q) => q.order === LEVEL_SIZE)!; // order 15 → position 14
    expect(lastOfLevel).toMatchObject({ level: 1, positionInLevel: 14, premium: true });

    const firstOfLevel2 = all.find((q) => q.order === LEVEL_SIZE + 1)!; // order 16 → level 2, position 0
    expect(firstOfLevel2).toMatchObject({ level: 2, positionInLevel: 0, premium: false });
  });

  it('drops questions with a missing or invalid order (degrades to empty when none)', () => {
    const snap = makeSnapshot([mkQ(1, 1), mkQ(2, null), mkQ(3, 0), mkQ(4, 2)]);
    expect(questionsForLevel(snap, 1).map((q) => q.order)).toEqual([1, 2]);

    const noOrders = makeSnapshot([mkQ(1, null), mkQ(2, null)]);
    expect(buildLevels(noOrders)).toEqual([]); // backend not emitting `order` yet
  });

  it('maps brand = options[correct_option] and preserves option order + explanation + image', () => {
    const remote = 'http://backend/questions/1/image';
    const options = ['Maserati', 'Ferrari', 'Alfa Romeo', 'Lamborghini'];
    const snap = makeSnapshot(
      [
        mkQ(2145, 1, { options, correct_option: 1, explanation: 'Prancing horse.', image_url: remote }),
        mkQ(2146, 2, { image_url: 'http://backend/questions/2/image' }),
        mkQ(2147, 3, { image_url: null }),
      ],
      { [remote]: 'file:///local/img-1.png' },
    );

    const [q1, q2, q3] = questionsForLevel(snap, 1);
    expect(q1.brand).toBe('Ferrari');
    expect(q1.correctIndex).toBe(1);
    expect(q1.options).toEqual(options);
    expect(q1.explanation).toBe('Prancing horse.');
    expect(q1.imageUri).toBe('file:///local/img-1.png'); // cached local file
    expect(q2.imageUri).toBe('http://backend/questions/2/image'); // remote fallback
    expect(q3.imageUri).toBeNull();
  });

  it('returns an empty array for a level that does not exist', () => {
    const snap = makeSnapshot(orderedQuestions(3));
    expect(questionsForLevel(snap, 5)).toEqual([]);
  });
});

describe('level progress selectors', () => {
  it('levelSolvedCount counts every solved question (premium included)', () => {
    const questions = buildLevels(makeSnapshot(orderedQuestions(15)))[0].questions;
    const solved = { [questions[0].id]: true, [questions[9].id]: true } as Record<number, true>; // 1 free + 1 premium
    expect(levelSolvedCount(questions, solved)).toBe(2);
  });

  it('levelFreeSolvedCount counts only free (position < 9) solves', () => {
    const questions = buildLevels(makeSnapshot(orderedQuestions(15)))[0].questions;
    const solved = { [questions[0].id]: true, [questions[9].id]: true } as Record<number, true>;
    expect(levelFreeSolvedCount(questions, solved)).toBe(1); // premium solve ignored
  });

  it('isLevelUnlocked: level 1 always open; level 2 opens on all 9 free of level 1', () => {
    const levels = buildLevels(makeSnapshot(orderedQuestions(30)));
    const freeIds = levels[0].questions.filter((q) => !q.premium).map((q) => q.id);

    expect(isLevelUnlocked(levels, 1, {})).toBe(true);
    expect(isLevelUnlocked(levels, 2, {})).toBe(false);

    // Solve 8 of 9 free — still locked.
    const partial = Object.fromEntries(freeIds.slice(0, 8).map((id) => [id, true])) as Record<number, true>;
    expect(isLevelUnlocked(levels, 2, partial)).toBe(false);

    // Solve all 9 free (premium irrelevant) — unlocked.
    const allFree = Object.fromEntries(freeIds.map((id) => [id, true])) as Record<number, true>;
    expect(isLevelUnlocked(levels, 2, allFree)).toBe(true);
  });

  it('isLevelUnlocked: any 9 solved unlock the next level — a free/premium mix counts', () => {
    const levels = buildLevels(makeSnapshot(orderedQuestions(30)));
    const l1 = levels[0].questions;
    const free = l1.filter((q) => !q.premium).map((q) => q.id);
    const premium = l1.filter((q) => q.premium).map((q) => q.id);
    expect(free).toHaveLength(9);
    expect(premium).toHaveLength(6);

    // A premium player who solves a 7-free + 2-premium mix (9 total, but only 7
    // of the 9 free) unlocks level 2 — premium solves now count toward unlock.
    const mix = Object.fromEntries(
      [...free.slice(0, 7), ...premium.slice(0, 2)].map((id) => [id, true]),
    ) as Record<number, true>;
    expect(mix[free[7]]).toBeUndefined(); // two free questions left unsolved
    expect(isLevelUnlocked(levels, 2, mix)).toBe(true);

    // Only 8 total solved (6 free + 2 premium) — still locked.
    const eight = Object.fromEntries(
      [...free.slice(0, 6), ...premium.slice(0, 2)].map((id) => [id, true]),
    ) as Record<number, true>;
    expect(isLevelUnlocked(levels, 2, eight)).toBe(false);
  });

  it('isLevelUnlocked clamps the threshold to a partial previous level', () => {
    // Level 1 full (15), level 2 partial with only 5 questions (all free).
    const levels = buildLevels(makeSnapshot(orderedQuestions(20)));
    expect(levels[1].questions).toHaveLength(5);

    const l1Free = levels[0].questions.filter((q) => !q.premium).map((q) => q.id);
    const l2Free = levels[1].questions.filter((q) => !q.premium).map((q) => q.id);
    expect(l2Free).toHaveLength(5);

    const solved = Object.fromEntries(
      [...l1Free, ...l2Free].map((id) => [id, true]),
    ) as Record<number, true>;

    // A hypothetical level 3 would unlock once level 2's 5 free (< 9) are solved.
    expect(isLevelUnlocked(levels, 3, solved)).toBe(true);
  });
});

describe('resolveLocalImage (used by the level builder)', () => {
  it('returns null for a null url, the local file when mapped, and the remote url otherwise', () => {
    const snap = makeSnapshot([], { 'http://remote/a.png': 'file:///a.png' });

    expect(resolveLocalImage(snap, null)).toBeNull();
    expect(resolveLocalImage(snap, 'http://remote/a.png')).toBe('file:///a.png');
    expect(resolveLocalImage(snap, 'http://remote/b.png')).toBe('http://remote/b.png');
    expect(resolveLocalImage(null, 'http://remote/a.png')).toBe('http://remote/a.png');
  });
});
