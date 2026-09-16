import {
  CIRCLES_PER_PLACE,
  CIRCLES_TO_UNLOCK_NEXT,
  availableCircles,
  canDrawCircle,
  circleSlots,
  circlesLeftToUnlock,
  drawCircle,
  isPlaceUnlocked,
  nextCircleIndex,
  placeStars,
  type PlaceRecordV2,
  type ProgressMapV2,
} from '@/lib/italy-quiz/circles';
import { ITALY_CHAIN, ITALY_PLACES, QUESTIONS_PER_ACT, getPlace } from '@/constants/italy-quiz/places';
import { hasTourContent } from '@/constants/italy-quiz/tour-content';
import { ROME_QUESTIONS } from '@/constants/italy-quiz/questions/rome';
import type { ItalyQuestion } from '@/constants/italy-quiz/question';

const rome = getPlace('rome')!;
const byId = new Map(ROME_QUESTIONS.map((q) => [q.id, q]));
const actIndex = new Map(rome.acts.map((a, i) => [a.id, i]));
const CIRCLE = rome.acts.length * QUESTIONS_PER_ACT;

/**
 * Rome supplies exactly ONE circle today, so every multi-circle guarantee needs
 * a deeper pool. Same four acts, just enough questions of each that a second and
 * third circle exist.
 */
function makePool(perAct: number): ItalyQuestion[] {
  const out: ItalyQuestion[] = [];
  let id = 1;
  rome.acts.forEach((act) => {
    for (let i = 0; i < perAct; i++) {
      out.push({
        id: id++,
        act: act.id,
        question: { ru: 'q', en: 'q' },
        options: [
          { ru: 'a', en: 'a' },
          { ru: 'b', en: 'b' },
          { ru: 'c', en: 'c' },
          { ru: 'd', en: 'd' },
        ],
        correct: 0,
        explanation: { ru: 'e', en: 'e' },
      });
    }
  });
  return out;
}

describe('drawCircle', () => {
  /** Many draws, because every guarantee here has to hold for all of them. */
  const draws = () =>
    Array.from({ length: 40 }, () => drawCircle(rome, ROME_QUESTIONS, new Set())!);

  it('draws five questions from each act, in act order', () => {
    for (const ids of draws()) {
      expect(ids).toHaveLength(CIRCLE);
      const acts = ids.map((id) => actIndex.get(byId.get(id)!.act)!);
      expect(acts).toEqual([...acts].sort((a, b) => a - b));
      for (const act of rome.acts) {
        const n = ids.filter((id) => byId.get(id)!.act === act.id).length;
        expect(n).toBe(QUESTIONS_PER_ACT);
      }
    }
  });

  it('never repeats a question inside one circle', () => {
    for (const ids of draws()) expect(new Set(ids).size).toBe(ids.length);
  });

  it('returns null when ONE act is short, even though the total is not', () => {
    // Twenty spare questions all sitting in antiquity is not a circle — it is a
    // fifth of four of them.
    const full = makePool(20);
    const perAct = new Map<string, number>();
    const lopsided = full.filter((q) => {
      const cap = q.act === rome.acts[0].id ? 20 : 2;
      const n = (perAct.get(q.act) ?? 0) + 1;
      perAct.set(q.act, n);
      return n <= cap;
    });
    expect(lopsided.length).toBeGreaterThan(CIRCLE);
    expect(canDrawCircle(rome, lopsided, new Set())).toBe(false);
    expect(drawCircle(rome, lopsided, new Set())).toBeNull();
  });

  it('draws consecutive circles that do not overlap', () => {
    const pool = makePool(10);
    const first = drawCircle(rome, pool, new Set())!;
    const second = drawCircle(rome, pool, new Set(first))!;
    expect(first).toHaveLength(CIRCLE);
    expect(second).toHaveLength(CIRCLE);
    expect(second.filter((id) => first.includes(id))).toEqual([]);
  });

  it('gives Rome exactly one circle with the content authored today', () => {
    // The tripwire for content authors: circle 2 needs ten questions per act and
    // Rome has eight. Bump the questions and this number goes up on its own.
    expect(canDrawCircle(rome, ROME_QUESTIONS, new Set())).toBe(true);
    const first = drawCircle(rome, ROME_QUESTIONS, new Set())!;
    expect(canDrawCircle(rome, ROME_QUESTIONS, new Set(first))).toBe(false);
    expect(drawCircle(rome, ROME_QUESTIONS, new Set(first))).toBeNull();
    expect(availableCircles(rome, ROME_QUESTIONS)).toBe(1);
  });

  it('prefers questions the player has not seen yet', () => {
    const antiquity = ROME_QUESTIONS.filter((q) => q.act === 'antiquity');
    const fresh = antiquity.slice(0, 2).map((q) => q.id);
    const seen = new Set(ROME_QUESTIONS.map((q) => q.id).filter((id) => !fresh.includes(id)));

    for (let i = 0; i < 20; i++) {
      const ids = drawCircle(rome, ROME_QUESTIONS, new Set(), seen)!;
      for (const id of fresh) expect(ids).toContain(id);
    }
  });

  it('lets `seen` prefer but never block', () => {
    // A migrated player who had already been served every question must still be
    // able to have circle 1 fixed — otherwise they would meet "soon" sitting on
    // top of stars they already earned.
    const all = new Set(ROME_QUESTIONS.map((q) => q.id));
    expect(drawCircle(rome, ROME_QUESTIONS, new Set(), all)).toHaveLength(CIRCLE);
  });

  it('produces different circles across draws', () => {
    const shapes = new Set(draws().map((ids) => ids.join(',')));
    expect(shapes.size).toBeGreaterThan(1);
  });
});

describe('circleSlots', () => {
  const pool = makePool(10);
  const done = (index: number, ids: number[], stars = 1) => ({
    index,
    ids,
    stars,
    bestPct: 60,
    plays: 1,
  });

  it('opens a fresh place on circle 1 and locks the rest', () => {
    const slots = circleSlots(rome, ROME_QUESTIONS, undefined);
    expect(slots).toHaveLength(10);
    expect(slots.map((s) => s.state)).toEqual([
      'current',
      ...Array.from({ length: 9 }, () => 'locked'),
    ]);
  });

  it('marks the next circle "soon" when the content runs out, not "locked"', () => {
    const first = drawCircle(rome, ROME_QUESTIONS, new Set())!;
    const rec: PlaceRecordV2 = { circles: [done(1, first)] };
    const slots = circleSlots(rome, ROME_QUESTIONS, rec);
    expect(slots.map((s) => s.state)).toEqual([
      'done',
      'soon',
      ...Array.from({ length: 8 }, () => 'locked'),
    ]);
    // Cleared circles stay playable: the set is frozen and stars keep their best,
    // so a replay can only ever add.
    expect(slots[0].playable).toBe(true);
    expect(slots[1].playable).toBe(false);
  });

  it('opens the next circle when there IS content for it', () => {
    const first = drawCircle(rome, pool, new Set())!;
    const rec: PlaceRecordV2 = { circles: [done(1, first)] };
    expect(circleSlots(rome, pool, rec).map((s) => s.state)).toEqual([
      'done',
      'current',
      ...Array.from({ length: 8 }, () => 'locked'),
    ]);
  });

  it('treats a fixed but unpassed circle as the current one', () => {
    const first = drawCircle(rome, pool, new Set())!;
    const rec: PlaceRecordV2 = { circles: [{ ...done(1, first), stars: 0, bestPct: 40 }] };
    const slots = circleSlots(rome, pool, rec);
    expect(slots[0]).toMatchObject({ state: 'current', stars: 0, playable: true });
    expect(slots[1].state).toBe('locked');
  });

  it('never crashes on a place with no questions at all', () => {
    // "soon" is spent on the FIRST blocked slot only. Everything behind it is
    // locked, because "you have not cleared the one before" is knowable while
    // "will content ever exist" is not.
    const slots = circleSlots(rome, [], undefined);
    expect(slots.map((s) => s.state)).toEqual([
      'soon',
      ...Array.from({ length: 9 }, () => 'locked'),
    ]);
    expect(slots.every((s) => !s.playable)).toBe(true);
    expect(nextCircleIndex(slots)).toBeNull();
  });

  it('points the entry button at the live circle, or the last cleared one', () => {
    expect(nextCircleIndex(circleSlots(rome, ROME_QUESTIONS, undefined))).toBe(1);

    const first = drawCircle(rome, ROME_QUESTIONS, new Set())!;
    const rec: PlaceRecordV2 = { circles: [done(1, first)] };
    // Circle 2 is still being written, so the only offer left is a replay of 1.
    expect(nextCircleIndex(circleSlots(rome, ROME_QUESTIONS, rec))).toBe(1);
  });

  it('sums a place’s stars across all of its circles', () => {
    const rec: PlaceRecordV2 = {
      circles: [done(1, [1], 3), done(2, [2], 2), done(3, [3], 1)],
    };
    expect(placeStars(rec)).toBe(6);
    expect(placeStars(undefined)).toBe(0);
  });
});

describe('the city chain', () => {
  /** A record with `count` circles, each worth `stars`. */
  const cleared = (count: number, stars = 1): PlaceRecordV2 => ({
    circles: Array.from({ length: count }, (_, i) => ({
      index: i + 1,
      ids: [],
      stars,
      bestPct: stars ? 60 : 45,
      plays: 3,
    })),
  });

  it('opens only the head of the chain on a fresh install', () => {
    for (const p of ITALY_PLACES) {
      expect(isPlaceUnlocked(p.id, {})).toBe(p.id === ITALY_CHAIN[0]);
    }
  });

  it('hands the key on only once FIVE circles are cleared', () => {
    for (let n = 0; n < CIRCLES_TO_UNLOCK_NEXT; n++) {
      const map = { rome: cleared(n) };
      expect(isPlaceUnlocked('florence', map)).toBe(false);
      expect(circlesLeftToUnlock('florence', map)).toBe(CIRCLES_TO_UNLOCK_NEXT - n);
    }

    const map = { rome: cleared(CIRCLES_TO_UNLOCK_NEXT) };
    expect(isPlaceUnlocked('florence', map)).toBe(true);
    expect(circlesLeftToUnlock('florence', map)).toBe(0);
    // One key at a time: Rome's five say nothing about Venice.
    expect(isPlaceUnlocked('venice', map)).toBe(false);
    expect(
      isPlaceUnlocked('venice', { ...map, florence: cleared(CIRCLES_TO_UNLOCK_NEXT) }),
    ).toBe(true);
  });

  it('gates on the star, not on having played', () => {
    // Ten circles played and not one cleared is still a shut gate.
    const map = { rome: cleared(CIRCLES_PER_PLACE, 0) };
    expect(isPlaceUnlocked('florence', map)).toBe(false);
    expect(circlesLeftToUnlock('florence', map)).toBe(CIRCLES_TO_UNLOCK_NEXT);
  });

  it('runs the chain to its end, one city at a time', () => {
    // Every place is on the chain now, so a full sweep is the whole progression.
    const map: ProgressMapV2 = {};
    for (const [i, id] of ITALY_CHAIN.entries()) {
      expect(isPlaceUnlocked(id, map)).toBe(true);
      const next = ITALY_CHAIN[i + 1];
      if (!next) break;
      expect(isPlaceUnlocked(next, map)).toBe(false);
      map[id] = cleared(CIRCLES_TO_UNLOCK_NEXT);
    }
  });

  it('never opens a place that is off the chain and not alwaysOpen', () => {
    const everything = Object.fromEntries(
      ITALY_CHAIN.map((id) => [id, cleared(CIRCLES_PER_PLACE, 3)]),
    );
    expect(isPlaceUnlocked('sardinia', everything)).toBe(false);
    expect(isPlaceUnlocked('', everything)).toBe(false);
  });
});

describe('places', () => {
  it('gives every place four acts', () => {
    for (const p of ITALY_PLACES) expect(p.acts).toHaveLength(4);
  });

  it('has content authored for exactly one place so far', () => {
    expect(ITALY_PLACES.filter((p) => hasTourContent(p.id)).map((p) => p.id)).toEqual(['rome']);
  });

  it('puts every place on the chain, none locked-by-content', () => {
    // No place is `locked` any more: all of them are opened by play, and their
    // circles read "soon" until their questions exist.
    expect([...ITALY_CHAIN].sort()).toEqual(ITALY_PLACES.map((p) => p.id).sort());
    for (const p of ITALY_PLACES) {
      expect(!!p.locked).toBe(false);
      expect(!!p.alwaysOpen).toBe(false);
    }
  });

  it('gives every Rome question four options and a valid correct index', () => {
    // Two shapes remain — plain text and text+image — both answered as a 4×4
    // grid, so every question must offer exactly four options.
    for (const q of ROME_QUESTIONS) {
      expect(q.options).toHaveLength(4);
      expect(q.correct).toBeGreaterThanOrEqual(0);
      expect(q.correct).toBeLessThan(q.options.length);
    }
  });
});
