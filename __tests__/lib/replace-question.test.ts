/**
 * Tests for lib/replace-question.ts#findReplacementQuestion (Part D, the
 * replaceQuestion hint): picks an UNUSED question of the same subcategory,
 * honors an optional (Hard-mode) eligibility gate, never returns the current
 * question, excludes already-seen/in-session ids, and returns null when nothing
 * qualifies.
 */

import { findReplacementQuestion, type ReplaceCandidate } from '@/lib/replace-question';

interface Q extends ReplaceCandidate {
  id: number;
  category_slug: string | null;
  options: string[];
  correct_option: number;
}

const pool: Q[] = [
  { id: 1, category_slug: 'geo', options: ['Paris', 'Rome'], correct_option: 0 },
  { id: 2, category_slug: 'geo', options: ['Berlin', 'Lyon'], correct_option: 0 }, // same topic, fresh
  { id: 3, category_slug: 'geo', options: ['Madrid', 'Oslo'], correct_option: 0 }, // same topic, but seen
  { id: 4, category_slug: 'hist', options: ['1914', '1939'], correct_option: 0 }, // different topic
];

describe('findReplacementQuestion', () => {
  it('returns a fresh question of the same subcategory', async () => {
    const chosen = findReplacementQuestion({
      pool,
      currentId: 1,
      excludeIds: new Set([1, 3]), // 1 in session, 3 already seen
      random: () => 0,
    });
    // Only id 2 qualifies (same 'geo' topic, not excluded, not current).
    expect(chosen?.id).toBe(2);
  });

  it('never returns the current question even if not in excludeIds', () => {
    const chosen = findReplacementQuestion({
      pool: [pool[0]], // only the current question exists
      currentId: 1,
      excludeIds: new Set(),
    });
    expect(chosen).toBeNull();
  });

  it('returns null when every same-topic candidate is excluded', () => {
    const chosen = findReplacementQuestion({
      pool,
      currentId: 1,
      excludeIds: new Set([1, 2, 3]), // all geo questions used up
    });
    // id 4 is a different subcategory, so it does not qualify.
    expect(chosen).toBeNull();
  });

  it('applies the Hard-mode eligibility gate', () => {
    const gate = (q: Q) => (q.options[q.correct_option] ?? '').length <= 5; // "Paris"/"Lyon" ok
    const chosen = findReplacementQuestion({
      pool,
      currentId: 1,
      excludeIds: new Set([1]),
      eligible: gate,
      random: () => 0,
    });
    // id 2 answer "Berlin" (6) fails the gate; id 3 "Madrid" (6) fails too →
    // no eligible geo candidate remains.
    expect(chosen).toBeNull();
  });

  it('falls back to any topic when the current question has no slug', () => {
    const noSlug: Q[] = [
      { id: 10, category_slug: null, options: ['a', 'b'], correct_option: 0 },
      { id: 11, category_slug: 'geo', options: ['c', 'd'], correct_option: 0 },
    ];
    const chosen = findReplacementQuestion({
      pool: noSlug,
      currentId: 10,
      excludeIds: new Set([10]),
      random: () => 0,
    });
    expect(chosen?.id).toBe(11);
  });
});
