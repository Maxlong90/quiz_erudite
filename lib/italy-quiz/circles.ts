/**
 * Italy Quiz CIRCLES — the pure half of the progression.
 *
 * A place is no longer one endlessly reshuffled tour. It is ten CIRCLES, and a
 * circle is a fixed set of twenty questions — five from each of the four acts.
 * The set is drawn once, on first entry, and then frozen: replaying circle 3
 * asks the same twenty in the same order, and new material is what the NEXT
 * circle is for. That single promise is what the whole module exists to keep,
 * and it is kept by one rule — `ids` is written exactly once, by `upsertCircle`,
 * and only while it is still empty.
 *
 * Two different things can stop a player, and they must never look alike:
 *
 *  - **locked** — the circle before this one has not been cleared. A door with a
 *    key the player can go and earn.
 *  - **soon** — there is not enough authored content to draw twenty more
 *    questions. Nothing the player can do; the slot opens when the writing does.
 *
 * Everything here is a pure function over data: no React, no AsyncStorage. The
 * hook (`hooks/italy-quiz/use-place-progress`) owns persistence and calls in.
 */
import {
  ITALY_CHAIN,
  QUESTIONS_PER_ACT,
  getPlace,
  type ItalyPlace,
} from '@/constants/italy-quiz/places';
import type { ItalyQuestion } from '@/constants/italy-quiz/question';
import { getTourQuestions } from '@/constants/italy-quiz/tour-content';

/** How many circles a place can ever hold. */
export const CIRCLES_PER_PLACE = 10;

export const MAX_STARS = 3;

/** A circle scoring this share of its questions earns the matching star count. */
const STAR_BANDS: { pct: number; stars: number }[] = [
  { pct: 100, stars: 3 },
  { pct: 80, stars: 2 },
  { pct: 50, stars: 1 },
];

/**
 * The star scale, unchanged from the one-tour-per-place model. The pass mark of
 * a circle is deliberately NOT a new number: it is the first star, ten right out
 * of twenty, so "cleared" and "earned something" are the same event.
 */
export function starsFor(score: number, total: number): number {
  if (total <= 0) return 0;
  const pct = (score / total) * 100;
  return STAR_BANDS.find((b) => pct >= b.pct)?.stars ?? 0;
}

/** One circle of one place. `ids` empty means the set has not been fixed yet. */
export interface CircleRecord {
  /** 1..CIRCLES_PER_PLACE. */
  index: number;
  /** The FIXED set, in play order. Written once, never reshuffled. */
  ids: number[];
  /** Best star count ever earned on this circle — a worse replay takes nothing. */
  stars: number;
  bestPct: number;
  plays: number;
}

export interface PlaceRecordV2 {
  /** Ascending by index; a gap simply means that circle was never entered. */
  circles: CircleRecord[];
  /**
   * Carried over from the v1 record. A SOFT PREFERENCE for the draw, never a
   * filter: a migrated player who had already seen every question must still be
   * able to have their circle fixed, or they would stare at "soon" on top of
   * stars they already earned.
   */
  seen?: number[];
}

export type ProgressMapV2 = Record<string, PlaceRecordV2>;

/** The v1 record, read once at migration and then left alone. */
export interface LegacyPlaceRecord {
  stars: number;
  bestPct: number;
  plays: number;
  seen: number[];
}

export type LegacyProgressMap = Record<string, LegacyPlaceRecord>;

export type CircleState = 'done' | 'current' | 'locked' | 'soon';

export interface CircleSlot {
  index: number;
  state: CircleState;
  stars: number;
  bestPct: number;
  plays: number;
  /** Whether tapping it can start a tour. */
  playable: boolean;
}

const EMPTY_SET: ReadonlySet<number> = new Set<number>();

function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** How many questions one circle of this place holds. */
export function circleSize(place: ItalyPlace): number {
  return place.acts.length * QUESTIONS_PER_ACT;
}

/**
 * Whether a full circle can still be drawn from what is left.
 *
 * Deliberately per ACT, not per total: twenty spare questions all sitting in
 * antiquity is not a circle, it is a fifth of four of them. This is literally
 * the predicate `drawCircle` opens with, so the strip's idea of "playable" and
 * the draw's idea of "possible" can never drift apart.
 */
export function canDrawCircle(
  place: ItalyPlace,
  questions: ItalyQuestion[],
  used: ReadonlySet<number>,
): boolean {
  if (place.acts.length === 0) return false;
  return place.acts.every(
    (act) =>
      questions.filter((q) => q.act === act.id && !used.has(q.id)).length >= QUESTIONS_PER_ACT,
  );
}

/**
 * Draw one circle: `QUESTIONS_PER_ACT` questions from each act, acts in order.
 *
 * Three rules shape the draw, and each protects something the circle would
 * otherwise lose to randomness:
 *
 * 1. **Callback pairs are taken whole, or not at all.** A question that refers
 *    back to an earlier one is the best moment in a tour, and half a pair is
 *    worse than none — the ribbon would point at a question the player never
 *    saw. A pair is forced only when BOTH halves are still unused, which makes
 *    it structurally impossible for a pair to straddle two circles. A pair whose
 *    halves are authored in the wrong order (later act first) is ignored rather
 *    than shown broken, and a pair that would not fit an act's quota is dropped
 *    whole and waits for a later circle.
 * 2. **Questions the player has not seen come before ones they have.** Only ever
 *    a tie-breaker inside the free pool — `seen` is migration residue and must
 *    never be able to make a circle undrawable.
 * 3. **The warm-up opens the circle — when it is still available.** Rome's
 *    warm-up is consumed by circle 1 and never comes back, so circle 2 simply
 *    opens on whatever antiquity question the shuffle produced.
 *
 * `used` is the hard exclusion: every id already committed to another circle of
 * this place. Returns null when any act is short, so the caller shows "soon"
 * rather than a stunted tour.
 */
export function drawCircle(
  place: ItalyPlace,
  questions: ItalyQuestion[],
  used: ReadonlySet<number>,
  seen: ReadonlySet<number> = EMPTY_SET,
): number[] | null {
  if (!canDrawCircle(place, questions, used)) return null;

  const actIndex = new Map(place.acts.map((a, i) => [a.id, i]));
  const available = questions.filter((q) => !used.has(q.id));
  const byId = new Map(available.map((q) => [q.id, q]));

  // Rule 3 first — the warm-up occupies a slot, so the quota accounting below
  // has to know about it before any pair is admitted.
  const pinned = new Set<number>();
  const perAct = new Map<string, number>();
  const pin = (q: ItalyQuestion) => {
    if (pinned.has(q.id)) return;
    pinned.add(q.id);
    perAct.set(q.act, (perAct.get(q.act) ?? 0) + 1);
  };
  for (const q of available) if (q.warmup) pin(q);

  // Rule 1 — whole pairs only, and only while they still fit.
  for (const q of available) {
    if (q.callback == null) continue;
    const partner = byId.get(q.callback);
    if (!partner) continue;
    const here = actIndex.get(q.act);
    const there = actIndex.get(partner.act);
    if (here == null || there == null || there >= here) continue;

    const fresh = [partner, q].filter((p) => !pinned.has(p.id));
    const tentative = new Map(perAct);
    const fits = fresh.every((p) => {
      const n = (tentative.get(p.act) ?? 0) + 1;
      tentative.set(p.act, n);
      return n <= QUESTIONS_PER_ACT;
    });
    if (fits) fresh.forEach(pin);
  }

  const picks = place.acts.map((act) => {
    const pool = available.filter((q) => q.act === act.id);
    const warm = pool.filter((q) => q.warmup);
    const rest = pool.filter((q) => !q.warmup);
    const free = rest.filter((q) => !pinned.has(q.id));
    return [
      ...warm,
      ...rest.filter((q) => pinned.has(q.id)),
      // Rule 2 — fresh questions first, then the rest; never an exclusion.
      ...shuffle(free.filter((q) => !seen.has(q.id))),
      ...shuffle(free.filter((q) => seen.has(q.id))),
    ]
      .slice(0, QUESTIONS_PER_ACT)
      .map((q) => q.id);
  });

  return picks.flat();
}

/**
 * How many circles this place's authored content could ever supply — the number
 * content authors actually care about. Capped at the ten a place can hold.
 */
export function availableCircles(place: ItalyPlace, questions: ItalyQuestion[]): number {
  if (place.acts.length === 0) return 0;
  const perAct = place.acts.map((a) => questions.filter((q) => q.act === a.id).length);
  return Math.min(CIRCLES_PER_PLACE, Math.floor(Math.min(...perAct) / QUESTIONS_PER_ACT));
}

/** Every id this place has already committed to a circle, optionally skipping one. */
export function usedIds(rec: PlaceRecordV2 | undefined, exceptIndex?: number): Set<number> {
  const out = new Set<number>();
  for (const c of rec?.circles ?? []) {
    if (c.index === exceptIndex) continue;
    for (const id of c.ids) out.add(id);
  }
  return out;
}

/** Cleared means one star — the pass mark and the first star are one event. */
export function isCirclePassed(circle: CircleRecord | undefined): boolean {
  return (circle?.stars ?? 0) >= 1;
}

/** Whether progress (as opposed to content) allows entering this circle. */
export function isCircleOpen(rec: PlaceRecordV2 | undefined, index: number): boolean {
  if (index < 1 || index > CIRCLES_PER_PLACE) return false;
  if (index === 1) return true;
  return isCirclePassed(rec?.circles.find((c) => c.index === index - 1));
}

/**
 * The ten slots the strip draws, as data.
 *
 * Walks the circles in order carrying what has been used and whether the chain
 * of passes is still unbroken, which gives the display four deliberate
 * properties: there is EXACTLY ONE `current`; `soon` is given only to the first
 * blocked slot (everything after it is `locked`, because "you have not cleared
 * the one before" is knowable while "will content exist" is not); a circle whose
 * set is fixed but which was never passed is `current`, not `done`; and a `done`
 * circle stays playable, which is safe because the set is frozen and stars are
 * kept at their best, so a replay can only ever add.
 */
export function circleSlots(
  place: ItalyPlace,
  questions: ItalyQuestion[],
  rec: PlaceRecordV2 | undefined,
): CircleSlot[] {
  const slots: CircleSlot[] = [];
  const used = new Set<number>();
  let open = true;

  for (let index = 1; index <= CIRCLES_PER_PLACE; index++) {
    const record = rec?.circles.find((c) => c.index === index);
    let state: CircleState;

    if (!open) {
      state = 'locked';
    } else if (record) {
      for (const id of record.ids) used.add(id);
      if (isCirclePassed(record)) {
        state = 'done';
      } else {
        state = 'current';
        open = false;
      }
    } else if (canDrawCircle(place, questions, used)) {
      state = 'current';
      open = false;
    } else {
      state = 'soon';
      open = false;
    }

    slots.push({
      index,
      state,
      stars: record?.stars ?? 0,
      bestPct: record?.bestPct ?? 0,
      plays: record?.plays ?? 0,
      playable: state === 'done' || state === 'current',
    });
  }

  return slots;
}

/**
 * Which circle the card's button should open: the one live circle, or — when
 * every playable circle is already cleared and the next is still being written —
 * the last cleared one, so the button offers a replay rather than nothing.
 */
export function nextCircleIndex(slots: CircleSlot[]): number | null {
  const current = slots.find((s) => s.state === 'current');
  if (current) return current.index;
  const done = [...slots].reverse().find((s) => s.state === 'done');
  return done ? done.index : null;
}

/** The number on the map pin: every star of every circle, 0..30. */
export function placeStars(rec: PlaceRecordV2 | undefined): number {
  return (rec?.circles ?? []).reduce((sum, c) => sum + c.stars, 0);
}

/**
 * Whether a place is open on the map.
 *
 * The chain lives in one array (`ITALY_CHAIN`), so the whole progression reads
 * as a single line, reordering is one edit, and a cycle is not expressible. A
 * place outside the chain is never opened by play — it is waiting for content,
 * which is a different kind of shut.
 */
export function isPlaceUnlocked(placeId: string, map: ProgressMapV2): boolean {
  const i = ITALY_CHAIN.indexOf(placeId);
  if (i < 0) return false;
  if (i === 0) return true;
  const prev = map[ITALY_CHAIN[i - 1]];
  return isCirclePassed(prev?.circles.find((c) => c.index === 1));
}

/** The place whose first circle opens this one, or null for the head of the chain. */
export function unlockedBy(placeId: string): string | null {
  const i = ITALY_CHAIN.indexOf(placeId);
  return i > 0 ? ITALY_CHAIN[i - 1] : null;
}

/** The place this one's first circle opens, or null at the end of the chain. */
export function unlocksNext(placeId: string): string | null {
  const i = ITALY_CHAIN.indexOf(placeId);
  return i >= 0 && i + 1 < ITALY_CHAIN.length ? ITALY_CHAIN[i + 1] : null;
}

/**
 * Turn a v1 record into circle 1 of a v2 one, losing nothing.
 *
 * `seen` becomes the circle's fixed set when it is exactly one tour's worth,
 * because in v1 that is precisely what it was: the ids served by the one tour
 * that was played, in served order. Any other length means several tours were
 * merged, so the set cannot be reconstructed — the circle still counts as
 * passed, and its twenty are fixed on next entry.
 */
export function migrateV1(legacy: LegacyProgressMap): ProgressMapV2 {
  const out: ProgressMapV2 = {};
  for (const [placeId, rec] of Object.entries(legacy ?? {})) {
    if (!rec || typeof rec !== 'object') continue;
    const place = getPlace(placeId);
    const seen = Array.isArray(rec.seen) ? rec.seen.filter((n) => Number.isInteger(n)) : [];
    const exact = place != null && seen.length === circleSize(place);
    out[placeId] = {
      circles: [
        {
          index: 1,
          ids: exact ? [...seen] : [],
          stars: Number(rec.stars) || 0,
          bestPct: Number(rec.bestPct) || 0,
          plays: Number(rec.plays) || 0,
        },
      ],
      seen,
    };
  }
  return out;
}

/**
 * Fix a circle's set, or leave it exactly as it was.
 *
 * The spread order is load-bearing: `...existing` comes AFTER the zero defaults
 * so a migrated circle keeps its stars, and `ids` comes AFTER `...existing` so
 * the set being written is the one passed in. Fixing a set must never cost a
 * star, and a fixed set must never be redrawn.
 */
export function upsertCircle(
  map: ProgressMapV2,
  placeId: string,
  index: number,
  ids: number[],
): ProgressMapV2 {
  const rec = map[placeId] ?? { circles: [] };
  const existing = rec.circles.find((c) => c.index === index);
  const circle: CircleRecord = { index, stars: 0, bestPct: 0, plays: 0, ...existing, ids };
  const circles = [...rec.circles.filter((c) => c.index !== index), circle].sort(
    (a, b) => a.index - b.index,
  );
  return { ...map, [placeId]: { ...rec, circles } };
}

/** Bank a finished circle: best stars win, the set never moves. */
export function applyResult(
  map: ProgressMapV2,
  placeId: string,
  index: number,
  score: number,
  total: number,
): ProgressMapV2 {
  const rec = map[placeId];
  const circle = rec?.circles.find((c) => c.index === index);
  if (!rec || !circle) return map;

  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const next: CircleRecord = {
    ...circle,
    stars: Math.max(circle.stars, starsFor(score, total)),
    bestPct: Math.max(circle.bestPct, pct),
    plays: circle.plays + 1,
  };
  return {
    ...map,
    [placeId]: { ...rec, circles: rec.circles.map((c) => (c.index === index ? next : c)) },
  };
}

function sanitizeCircle(raw: unknown): CircleRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const c = raw as Partial<CircleRecord>;
  const index = Number(c.index);
  if (!Number.isInteger(index) || index < 1 || index > CIRCLES_PER_PLACE) return null;
  return {
    index,
    ids: Array.isArray(c.ids) ? c.ids.filter((n) => Number.isInteger(n)) : [],
    stars: Math.min(MAX_STARS, Math.max(0, Number(c.stars) || 0)),
    bestPct: Math.min(100, Math.max(0, Number(c.bestPct) || 0)),
    plays: Math.max(0, Number(c.plays) || 0),
  };
}

/**
 * Make a stored map safe to render.
 *
 * The interesting case is a circle holding an id the content no longer has —
 * after an edit to the authored questions, say. Its set is dropped (the stars
 * are not) and it is re-fixed through the same path as a migration, because the
 * alternative is a tour whose lookup returns undefined halfway through and a
 * result screen that fires on question eleven.
 */
export function sanitize(map: ProgressMapV2): ProgressMapV2 {
  const out: ProgressMapV2 = {};
  for (const [placeId, rec] of Object.entries(map ?? {})) {
    if (!rec || typeof rec !== 'object') continue;
    const known = new Set(getTourQuestions(placeId).map((q) => q.id));
    const byIndex = new Map<number, CircleRecord>();
    const claimed = new Set<number>();

    for (const raw of Array.isArray(rec.circles) ? rec.circles : []) {
      const circle = sanitizeCircle(raw);
      if (!circle || byIndex.has(circle.index)) continue;
      // An id must exist in the content AND belong to exactly one circle.
      const intact =
        circle.ids.length > 0 &&
        circle.ids.every((id) => known.has(id) && !claimed.has(id)) &&
        new Set(circle.ids).size === circle.ids.length;
      if (intact) for (const id of circle.ids) claimed.add(id);
      byIndex.set(circle.index, intact ? circle : { ...circle, ids: [] });
    }

    out[placeId] = {
      circles: [...byIndex.values()].sort((a, b) => a.index - b.index),
      ...(Array.isArray(rec.seen) ? { seen: rec.seen.filter((n) => Number.isInteger(n)) } : {}),
    };
  }
  return out;
}
