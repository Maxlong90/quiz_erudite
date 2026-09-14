/**
 * CROSS-REPO PARITY: the app's Italy act ids vs the backend's act vocabulary.
 *
 * The backend owns the vocabulary in quiz-erudit-backend/app/Support/
 * ItalyCityActs.php (ACTS) and lays it out as categories in
 * app/Support/ItalyActsCatalogue.php (LEAVES). Each act becomes a
 * `content_categories.slug` of the form `italy-<place>-<act>`, and every
 * question the backend serves carries that `<act>` string. This app declares the
 * same ids as `ItalyAct.id` in constants/italy-quiz/places.ts.
 *
 * When the two disagree, NOTHING SAYS SO. `canDrawCircle()` compares the two
 * sets, returns false, and the city's whole circle strip goes dead — no
 * exception, no warning, no log line. That failure is proved executable in
 * italy-acts-draw-parity.test.ts; this file pins the vocabulary itself, which is
 * the cheaper half and the one that fails first.
 *
 * The backend side is transcribed once, in __tests__/fixtures/backend-italy-acts.ts.
 * The app side is read from getPlace() — the code under test — plus the small
 * fenced block of app-only literals below. NEITHER SIDE OF ANY ASSERTION MAY BE
 * DERIVED FROM THE OTHER, and no expectation here may be computed from the thing
 * it checks: a parity test that reads `getPlace().acts` on both sides survives
 * any permutation of them and asserts nothing. The backend learned this the hard
 * way — swapping `capital` and `today` in ItalyCityActs::ACTS left its
 * act-table-order test green, because that test built its expectation out of the
 * very constant it was checking.
 *
 * IF THIS TEST FAILS BECAUSE YOU CHANGED places.ts: it is not a test to update in
 * isolation. `ItalyCityActs::ACTS` changes in the same PR, and the fixture is
 * updated FIRST, from the backend, never from here. The by-eye check on the other
 * side is `php artisan italy:acts-audit` (Block E).
 */
import {
  BACKEND_ACTS_PER_CITY,
  BACKEND_ACT_EMOJI,
  BACKEND_ACT_SLUGS,
  BACKEND_ACT_SORT_ORDER,
  BACKEND_CITY_PARENT_SLUGS,
  BACKEND_ITALY_ACTS,
  BACKEND_ITALY_PLACES,
  BACKEND_MIN_PER_ACT,
  BACKEND_SLUG_PREFIX,
} from '@/__tests__/fixtures/backend-italy-acts';
import { ITALY_PLACES, QUESTIONS_PER_ACT, getPlace } from '@/constants/italy-quiz/places';
import { circleSize } from '@/lib/italy-quiz/circles';

/**
 * The app's OWN facts, transcribed here rather than read from places.ts, so each
 * assertion below has a literal on one side and the code under test on the
 * other. None of these is part of the cross-repo contract: Rome and All-Italy
 * have no backend content at all, the place ORDER is the map's, not the
 * backend's, and the icons are the app's.
 */
const APP_PLACE_IDS = ['rome', 'naples', 'venice', 'florence', 'milan', 'sicily', 'all-italy'];
const APP_ROME_ACTS = ['antiquity', 'middle-ages', 'renaissance', 'today'];
const APP_ALL_ITALY_ACTS = ['table', 'calcio', 'dolce-vita', 'people'];
/** Placeholder places still pointing at Rome's acts until their own are authored. */
const APP_PLACEHOLDER_PLACES = ['naples', 'milan', 'sicily'];
const APP_ACT_ICONS: Record<string, Record<string, string>> = {
  florence: { commune: '🏦', medici: '🎨', capital: '🇮🇹', today: '📸' },
  venice: { lagoon: '🌊', empire: '⛵', carnival: '🎭', today: '📸' },
};

/** Widened views of the `as const` fixture maps, so an act id can index them. */
const BACKEND_EMOJI: Record<string, Record<string, string>> = BACKEND_ACT_EMOJI;
const BACKEND_SORT_ORDER: Record<string, number> = BACKEND_ACT_SORT_ORDER;

const actIdsOf = (placeId: string): string[] => getPlace(placeId)!.acts.map((a) => a.id);
const CONTRACTED_ACT_IDS = [
  ...BACKEND_ITALY_ACTS.florence,
  ...BACKEND_ITALY_ACTS.venice,
] as readonly string[];

describe('the app act ids vs the backend vocabulary', () => {
  it('gives florence the backend act ids, in backend order', () => {
    // Order is load-bearing twice over: it is the sequence the interludes are
    // written for, and drawCircle() takes its five-per-act in exactly this order.
    expect(actIdsOf('florence')).toEqual([...BACKEND_ITALY_ACTS.florence]);
  });

  it('gives venice the backend act ids, in backend order', () => {
    expect(actIdsOf('venice')).toEqual([...BACKEND_ITALY_ACTS.venice]);
  });

  it('keeps a `today` in BOTH cities — the vocabulary is a list, never a set', () => {
    // Counting ELEMENTS, not substrings: `today` is the one word the two cities
    // share, which is why the backend's parse() may never reason from an act
    // backwards to a place. De-duplicating it on either side breaks one city.
    const all = [...actIdsOf('florence'), ...actIdsOf('venice')];
    expect(all.filter((id) => id === 'today')).toHaveLength(2);
    expect(new Set(all).size).toBe(7);
  });

  it('gives each contracted city four acts, which is twenty questions a circle', () => {
    for (const placeId of BACKEND_ITALY_PLACES) {
      const place = getPlace(placeId)!;
      expect(place.acts).toHaveLength(BACKEND_ACTS_PER_CITY);
      // A fifth or a dropped act changes every circle silently AND invalidates
      // every stored CircleRecord.ids, which was sized against the old count.
      expect(circleSize(place)).toBe(BACKEND_ACTS_PER_CITY * QUESTIONS_PER_ACT);
      expect(circleSize(place)).toBe(20);
    }
  });

  it('contracts exactly two of the app’s seven places', () => {
    expect(ITALY_PLACES.map((p) => p.id)).toEqual(APP_PLACE_IDS);
    // The two repos order places differently on purpose — the backend by
    // sort_order (florence 210, venice 220), the app by map layout (venice
    // before florence) — so the intersection is compared sorted.
    const contracted = APP_PLACE_IDS.filter((id) =>
      (BACKEND_ITALY_PLACES as readonly string[]).includes(id),
    );
    expect([...contracted].sort()).toEqual([...BACKEND_ITALY_PLACES].sort());
  });

  it('leaves rome and all-italy outside the backend vocabulary', () => {
    // The two vocabularies coexist by design; ItalyCityActs' docblock freezes the
    // "let's unify them" refactor, and this is its app-side half.
    expect(actIdsOf('rome')).toEqual(APP_ROME_ACTS);
    expect(actIdsOf('all-italy')).toEqual(APP_ALL_ITALY_ACTS);
    expect(BACKEND_ACT_SLUGS.some((slug) => slug.startsWith('italy-rome-'))).toBe(false);
    expect(BACKEND_ACT_SLUGS.some((slug) => slug.startsWith('italy-all-italy-'))).toBe(false);
    expect([...BACKEND_CITY_PARENT_SLUGS]).toEqual(['italy-florence', 'italy-venice']);
  });

  it('shares only the word `today` with rome', () => {
    expect(APP_ROME_ACTS.filter((id) => CONTRACTED_ACT_IDS.includes(id))).toEqual(['today']);
    expect(APP_ALL_ITALY_ACTS.filter((id) => CONTRACTED_ACT_IDS.includes(id))).toEqual([]);
  });

  it('keeps naples, milan and sicily on rome’s placeholder acts', () => {
    // A locked placeholder acquiring a contracted act id would make the backend
    // look like it owed that city content it has never been asked for.
    for (const placeId of APP_PLACEHOLDER_PLACES) {
      const place = getPlace(placeId)!;
      expect(place.acts.map((a) => a.id)).toEqual(APP_ROME_ACTS);
      expect(place.locked).toBe(true);
    }
  });

  it('builds every backend slug out of the ids the app ships', () => {
    const slugs = BACKEND_ITALY_PLACES.flatMap((placeId) =>
      actIdsOf(placeId).map((actId) => `${BACKEND_SLUG_PREFIX}${placeId}-${actId}`),
    );
    expect(slugs).toEqual([...BACKEND_ACT_SLUGS]);
  });

  it('keeps every contracted act id free of the slug separator', () => {
    // `middle-ages` and `dolce-vita` are real app act ids WITH a hyphen — none of
    // the eight contracted ones is, which is what keeps `italy-<place>-<act>`
    // unambiguous without leaning on the backend's longest-place-prefix parse.
    for (const id of CONTRACTED_ACT_IDS) {
      expect(id).not.toContain('-');
    }
    expect(APP_ROME_ACTS.filter((id) => id.includes('-'))).toEqual(['middle-ages']);
  });

  it('orders the backend leaves the way the app orders its acts', () => {
    const bySortOrder = [...BACKEND_ACT_SLUGS].sort(
      (a, b) => BACKEND_SORT_ORDER[a] - BACKEND_SORT_ORDER[b],
    );
    const appSlugs = BACKEND_ITALY_PLACES.flatMap((placeId) =>
      actIdsOf(placeId).map((actId) => `${BACKEND_SLUG_PREFIX}${placeId}-${actId}`),
    );
    // A renumber of sort_order reorders the categories without touching an id,
    // so this is the one place that would notice it.
    expect(bySortOrder).toEqual(appSlugs);
  });

  it('matches six of eight icons, and differs on the two `today`s on purpose', () => {
    for (const placeId of BACKEND_ITALY_PLACES) {
      for (const act of getPlace(placeId)!.acts) {
        expect(act.icon).toBe(APP_ACT_ICONS[placeId][act.id]);
        if (act.id === 'today') {
          // The backend needs ten distinct glyphs in the Nova category list; the
          // app reuses one Today icon across Rome, Florence and Venice. Asserted
          // as a difference so "let's unify these" goes red in either direction.
          expect(act.icon).toBe('📸');
          expect(act.icon).not.toBe(BACKEND_EMOJI[placeId].today);
        } else {
          expect(act.icon).toBe(BACKEND_EMOJI[placeId][act.id]);
        }
      }
    }
  });

  it('ties the backend minimum to exactly three of the app’s circles', () => {
    // MIN_PER_ACT is what the backend audit calls "playable". If QUESTIONS_PER_ACT
    // were raised without moving it, the audit would report a city green that the
    // app cannot draw a single circle from.
    expect(BACKEND_MIN_PER_ACT % QUESTIONS_PER_ACT).toBe(0);
    expect(BACKEND_MIN_PER_ACT / QUESTIONS_PER_ACT).toBe(3);
    expect(BACKEND_MIN_PER_ACT).toBeGreaterThanOrEqual(QUESTIONS_PER_ACT);
  });
});
