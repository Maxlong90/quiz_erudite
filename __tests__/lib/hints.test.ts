/**
 * Tests for lib/hints.ts — the canonical 3-kind hint set (Part D): defaults,
 * the consume primitive, the bundle grant crediting N of each of the three
 * kinds, and legacy migration that drops the removed 'ai' / 'letter' counts.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { getHints, consumeHint, addHintsBundle } from '@/lib/hints';

const KEY = 'quiz.hints.v1';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('defaults', () => {
  it('starts every player with exactly the three canonical kinds', async () => {
    const hints = await getHints();
    expect(hints).toEqual({ fiftyFifty: 3, statistics: 2, replaceQuestion: 1 });
    expect(Object.keys(hints).sort()).toEqual(['fiftyFifty', 'replaceQuestion', 'statistics']);
  });
});

describe('consumeHint', () => {
  it('decrements the named kind and floors at zero', async () => {
    expect(await consumeHint('fiftyFifty')).toBe(2);
    expect(await consumeHint('fiftyFifty')).toBe(1);
    expect(await consumeHint('fiftyFifty')).toBe(0);
    expect(await consumeHint('fiftyFifty')).toBe(0);
  });

  it('consumes replaceQuestion independently', async () => {
    expect(await consumeHint('replaceQuestion')).toBe(0); // default 1 -> 0
    const hints = await getHints();
    expect(hints.fiftyFifty).toBe(3); // untouched
  });
});

describe('addHintsBundle', () => {
  it('credits N of each of the three kinds', async () => {
    const next = await addHintsBundle({ fiftyFifty: 5, statistics: 5, replaceQuestion: 5 });
    expect(next).toEqual({ fiftyFifty: 8, statistics: 7, replaceQuestion: 6 });
  });
});

describe('legacy migration', () => {
  it('ignores persisted ai / letter counts and defaults replaceQuestion', async () => {
    await AsyncStorage.setItem(
      KEY,
      JSON.stringify({ fiftyFifty: 4, statistics: 1, ai: 9, letter: 7 }),
    );
    const hints = await getHints();
    expect(hints).toEqual({ fiftyFifty: 4, statistics: 1, replaceQuestion: 1 });
    // The removed kinds are gone entirely.
    expect('ai' in hints).toBe(false);
    expect('letter' in hints).toBe(false);
  });
});
