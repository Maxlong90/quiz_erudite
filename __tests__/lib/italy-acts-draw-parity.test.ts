/**
 * CROSS-REPO PARITY, the consequence half: what an act-id mismatch actually does
 * to the app, made executable.
 *
 * italy-acts-parity.test.ts pins the vocabulary. This file proves the claim the
 * backend's ItalyCityActs docblock makes about it — "any divergence makes
 * `canDrawCircle` return false, the city renders ten 'soon' slots, and not one
 * line is logged" — by feeding circles.ts a question pool built from the backend
 * ids and then from drifted ones.
 *
 * It also CORRECTS that docblock's shorthand. The true shape is one `soon`
 * followed by nine `locked`: circleSlots() gives `soon` only to the first blocked
 * slot and closes the strip behind it. The backend's wording is asserted verbatim
 * in two shipped backend tests, so it is not worth churning — but the app side
 * should assert what actually happens.
 *
 * Every pool here is built from LITERAL act ids out of
 * __tests__/fixtures/backend-italy-acts.ts, never from `place.acts`. A pool
 * derived from the place it is drawn against always draws, whatever either side
 * says, and would assert nothing.
 */
import {
  BACKEND_ITALY_ACTS,
  BACKEND_MIN_PER_ACT,
} from '@/__tests__/fixtures/backend-italy-acts';
import { QUESTIONS_PER_ACT, getPlace } from '@/constants/italy-quiz/places';
import type { ItalyQuestion } from '@/constants/italy-quiz/question';
import {
  CIRCLES_PER_PLACE,
  availableCircles,
  canDrawCircle,
  circleSlots,
  drawCircle,
  nextCircleIndex,
} from '@/lib/italy-quiz/circles';

const florence = getPlace('florence')!;
const venice = getPlace('venice')!;

/**
 * A question pool carrying exactly the act ids it is given — the backend's, or a
 * drifted variant of them. Named `poolFor` rather than `makePool` (the helper in
 * __tests__/hooks/italy-tour-draw.test.ts) because that one derives its acts from
 * a place and this one must not.
 */
function poolFor(actIds: readonly string[], per: number = QUESTIONS_PER_ACT): ItalyQuestion[] {
  const out: ItalyQuestion[] = [];
  let id = 1;
  for (const act of actIds) {
    for (let i = 0; i < per; i++) {
      out.push({
        id: id++,
        act,
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
  }
  return out;
}

/** Florence's acts with the third id renamed — one character of drift. */
const DRIFTED_FLORENCE = ['commune', 'medici', 'capitale', 'today'];
/** Florence's acts with the third id borrowed from Rome's frozen vocabulary. */
const ROME_FLAVOURED_FLORENCE = ['commune', 'medici', 'renaissance', 'today'];

describe('drawing a circle from backend-shaped content', () => {
  it('draws when the questions carry the backend act ids', () => {
    // The positive control: every refusal below only means something because this
    // passes. It is also what goes red the moment an id is RENAMED on either side.
    expect(canDrawCircle(florence, poolFor(BACKEND_ITALY_ACTS.florence), new Set())).toBe(true);
    expect(canDrawCircle(venice, poolFor(BACKEND_ITALY_ACTS.venice), new Set())).toBe(true);
  });

  it('draws a full twenty, five per act, in backend order', () => {
    const pool = poolFor(BACKEND_ITALY_ACTS.florence);
    const byId = new Map(pool.map((q) => [q.id, q]));
    const drawn = drawCircle(florence, pool, new Set())!;

    expect(drawn).toHaveLength(20);
    // drawCircle shuffles WITHIN an act but never across acts, so the act
    // sequence is deterministic even though the id sequence is not.
    expect(drawn.map((id) => byId.get(id)!.act)).toEqual(
      BACKEND_ITALY_ACTS.florence.flatMap((act) => Array(QUESTIONS_PER_ACT).fill(act)),
    );
  });

  it('refuses when ONE act id drifts', () => {
    const pool = poolFor(DRIFTED_FLORENCE);
    expect(canDrawCircle(florence, pool, new Set())).toBe(false);
    expect(drawCircle(florence, pool, new Set())).toBeNull();
  });

  it('refuses when an act id is borrowed from rome', () => {
    // The shape the "unify the two vocabularies" refactor would produce.
    const pool = poolFor(ROME_FLAVOURED_FLORENCE);
    expect(canDrawCircle(florence, pool, new Set())).toBe(false);
  });

  it('takes the whole strip down silently — no error, no warning', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      const slots = circleSlots(florence, poolFor(DRIFTED_FLORENCE), undefined);

      // The backend docblock's "ten soon slots" is shorthand: `soon` is given to
      // the first blocked slot only, and the nine behind it are `locked`.
      expect(slots).toHaveLength(CIRCLES_PER_PLACE);
      expect(slots.map((s) => s.state)).toEqual(['soon', ...Array(9).fill('locked')]);
      expect(slots.every((s) => !s.playable)).toBe(true);
      expect(nextCircleIndex(slots)).toBeNull();

      // This is the whole reason the assertions above have to exist.
      expect(errorSpy).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
    } finally {
      errorSpy.mockRestore();
      warnSpy.mockRestore();
    }
  });

  it('refuses venice content offered to florence, `today` notwithstanding', () => {
    // `today` is the one id both cities own, so a place/act cross-wiring is three
    // quarters invisible — the shared act matches and the other three do not.
    const pool = poolFor(BACKEND_ITALY_ACTS.venice);
    expect(canDrawCircle(florence, pool, new Set())).toBe(false);
    expect(canDrawCircle(venice, pool, new Set())).toBe(true);
  });

  it('turns the backend minimum into exactly three circles, and drift into none', () => {
    expect(availableCircles(florence, poolFor(BACKEND_ITALY_ACTS.florence, BACKEND_MIN_PER_ACT)))
      .toBe(3);
    expect(availableCircles(florence, poolFor(DRIFTED_FLORENCE, BACKEND_MIN_PER_ACT))).toBe(0);
  });
});
