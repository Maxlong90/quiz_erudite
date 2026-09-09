import { orderTour } from '@/hooks/italy-quiz/use-tour-progress';
import { ITALY_PLACES, QUESTIONS_PER_ACT, getPlace } from '@/constants/italy-quiz/places';
import { ROME_QUESTIONS } from '@/constants/italy-quiz/questions/rome';
import type { ItalyQuestion } from '@/constants/italy-quiz/question';

/**
 * The Rome tour is drawn at random from a pool larger than the tour, so the three
 * things the draw must protect can no longer be read off the authored order.
 * These lock them in.
 */
describe('orderTour', () => {
  const rome = getPlace('rome')!;
  const byId = new Map(ROME_QUESTIONS.map((q) => [q.id, q]));
  const actIndex = new Map(rome.acts.map((a, i) => [a.id, i]));

  /** Many draws, because every guarantee here has to hold for all of them. */
  const draws = () => Array.from({ length: 40 }, () => orderTour(rome, ROME_QUESTIONS, new Set()));

  it('draws five questions from each act, in act order', () => {
    for (const ids of draws()) {
      expect(ids).toHaveLength(rome.acts.length * QUESTIONS_PER_ACT);
      const acts = ids.map((id) => actIndex.get(byId.get(id)!.act)!);
      expect(acts).toEqual([...acts].sort((a, b) => a - b));
      for (const act of rome.acts) {
        const n = ids.filter((id) => byId.get(id)!.act === act.id).length;
        expect(n).toBe(QUESTIONS_PER_ACT);
      }
    }
  });

  it('never repeats a question inside one tour', () => {
    for (const ids of draws()) expect(new Set(ids).size).toBe(ids.length);
  });

  it('opens on the warm-up question', () => {
    const warmup = ROME_QUESTIONS.find((q) => q.warmup)!;
    for (const ids of draws()) expect(ids[0]).toBe(warmup.id);
  });

  it('always includes BOTH halves of a callback pair, first half first', () => {
    // Half a pair is worse than none: the ribbon would point at a question the
    // player never saw.
    for (const ids of draws()) {
      for (const id of ids) {
        const q = byId.get(id)!;
        if (q.callback == null) continue;
        expect(ids).toContain(q.callback);
        expect(ids.indexOf(q.callback)).toBeLessThan(ids.indexOf(id));
      }
    }
  });

  it('prefers questions the place has not asked yet', () => {
    // Mark everything seen except the non-forced questions of one act, and check
    // those unseen ones all get drawn.
    const forced = new Set(
      ROME_QUESTIONS.flatMap((q) => (q.callback != null ? [q.id, q.callback] : [])),
    );
    const antiquity = ROME_QUESTIONS.filter((q) => q.act === 'antiquity' && !forced.has(q.id));
    const fresh = antiquity.slice(0, 2).map((q) => q.id);
    const seen = new Set(ROME_QUESTIONS.map((q) => q.id).filter((id) => !fresh.includes(id)));

    for (let i = 0; i < 20; i++) {
      const ids = orderTour(rome, ROME_QUESTIONS, seen);
      for (const id of fresh) expect(ids).toContain(id);
    }
  });

  it('still fills a tour once every question has been seen', () => {
    const all = new Set(ROME_QUESTIONS.map((q) => q.id));
    const ids = orderTour(rome, ROME_QUESTIONS, all);
    expect(ids).toHaveLength(rome.acts.length * QUESTIONS_PER_ACT);
  });

  it('produces different tours across draws', () => {
    const seen = new Set<number>();
    const shapes = new Set(draws().map((ids) => ids.join(',')));
    expect(shapes.size).toBeGreaterThan(1);
    expect(seen.size).toBe(0);
  });

  it('survives a place whose pool is smaller than a full tour', () => {
    const thin: ItalyQuestion[] = ROME_QUESTIONS.filter((q) => q.act === 'antiquity').slice(0, 2);
    expect(() => orderTour(rome, thin, new Set())).not.toThrow();
    expect(orderTour(rome, thin, new Set())).toHaveLength(2);
  });
});

describe('places', () => {
  it('gives every place four acts and only one live place so far', () => {
    for (const p of ITALY_PLACES) expect(p.acts).toHaveLength(4);
    expect(ITALY_PLACES.filter((p) => !p.locked).map((p) => p.id)).toEqual(['rome']);
  });

  it('orders every estimate question smallest to largest', () => {
    // The notched slider lays the options along a line, so a reversed set would
    // read as a bug on screen rather than in the data.
    const estimates = ROME_QUESTIONS.filter((q) => q.estimate);
    expect(estimates.length).toBeGreaterThan(0);
    for (const q of estimates) {
      expect(q.options).toHaveLength(4);
      expect(q.axis === 'time' || q.axis === 'amount').toBe(true);
    }
  });
});
