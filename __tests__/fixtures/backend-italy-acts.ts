/**
 * The Italy Quiz ACT VOCABULARY as the BACKEND authored it — the single
 * transcription the Italy parity suites pin against.
 *
 * PROVENANCE. Transcribed by hand from the sibling backend checkout:
 *
 *   quiz-erudit-backend/app/Support/ItalyCityActs.php
 *     — ACTS, PREFIX, MIN_PER_ACT, MIN_IMAGES_PER_CITY
 *     — md5 d7440d8a8d78c1e915e7423559c870bc, 10110 bytes
 *   quiz-erudit-backend/app/Support/ItalyActsCatalogue.php
 *     — LEAVES (key order, sort_order, icon_emoji), PARENTS
 *     — md5 e26e77fe775c3285641f4e7ad4d133e2, 9543 bytes
 *
 * The hashes are prose, not an assertion: they say WHICH bytes were read, so a
 * reviewer can tell a stale transcription from a fresh one. They are not checked
 * at runtime — this repo has no access to that checkout, and a hash assertion
 * would go red on every unrelated backend edit and be muted within a month.
 *
 * WHAT THE CONTRACT IS. The backend writes each act into
 * `content_categories.slug` as `italy-<place>-<act>`, and every question it
 * serves carries that `<act>` in its `act` field. The app matches it against
 * `ItalyAct.id` in constants/italy-quiz/places.ts. The two sets are compared by
 * EQUALITY, so a single renamed or reordered id is a break — and it is a SILENT
 * one: `canDrawCircle()` simply returns false, the city's strip goes dead, and
 * not one line is logged. There is no exception to catch and nothing to grep
 * for. These assertions are the alarm.
 *
 * IF THESE LITERALS AND THE BACKEND DISAGREE, THE BACKEND WON — and unlike the
 * theme contract, that is not merely a convention. `content_categories.slug`
 * carries a GLOBAL unique index, so a wrong slug squats that slug for every app
 * in the portfolio, forever; the app constant is only a build. Fixture and
 * ItalyCityActs.php therefore change together, fixture second. Hand-editing this
 * file to make a parity test pass is exactly how the app quietly stops drawing
 * circles.
 *
 * THE BY-EYE CHECK is `php artisan italy:acts-audit` in the backend: its Block E
 * prints these two lines and the sentence explaining the silence.
 *
 * NO LIVE TWIN. The theme contract has __tests__/lib/theme-contract-live.livetest.ts
 * because there is an endpoint to call. This one has none: constants/italy-quiz/
 * tour-content.ts serves Rome from disk and the tour runs with no network, no
 * content snapshot and no backend involvement at all. The day `getTourQuestions()`
 * grows a snapshot read is the day to add an italy-acts-live.livetest.ts that
 * pulls the real `act` values off the wire.
 *
 * WHAT IS NOT THE CONTRACT. The icons below are transcribed for the record and
 * the four-locale names are deliberately not transcribed at all. Both sides
 * differ ON PURPOSE — the backend's Nova category list needs ten distinct
 * glyphs, so Florence's `today` is 🍷 and Venice's 🛶, while the app reuses one
 * 📸 Today icon across Rome, Florence and Venice; the labels differ in wording
 * and in case ('The sea empire' vs 'The Maritime Empire'). Only the act ID
 * STRINGS and their ORDER cross the repo boundary. The parity suite asserts the
 * six-of-eight emoji agreement AS a six/two split, so that "let's unify these"
 * goes red in either direction.
 *
 * Deliberately NOT named *.test.ts: jest's testMatch only picks up
 * `<rootDir>/__tests__/**` files ending in `.test.{ts,tsx}`, and this file is
 * shared data, not a suite.
 */

/** ItalyCityActs::PREFIX — every category slug this vocabulary owns starts here. */
export const BACKEND_SLUG_PREFIX = 'italy-';

/** ItalyCityActs::places() — array_keys(ACTS), i.e. sort_order order (210, 220). */
export const BACKEND_ITALY_PLACES = ['florence', 'venice'] as const;

/**
 * ItalyCityActs::ACTS, verbatim. KEY ORDER IS TOUR ORDER on both sides: the app
 * plays the acts in this sequence and shows each act's interlude on the way in.
 */
export const BACKEND_ITALY_ACTS = {
  florence: ['commune', 'medici', 'capital', 'today'],
  venice: ['lagoon', 'empire', 'carnival', 'today'],
} as const;

/** ItalyCityActs::parentSlug() for each place — the two city categories. */
export const BACKEND_CITY_PARENT_SLUGS = ['italy-florence', 'italy-venice'] as const;

/**
 * ItalyCityActs::slug() for all eight acts, in tour order — the wire form the
 * app's `act` values have to reconstruct exactly.
 */
export const BACKEND_ACT_SLUGS = [
  'italy-florence-commune',
  'italy-florence-medici',
  'italy-florence-capital',
  'italy-florence-today',
  'italy-venice-lagoon',
  'italy-venice-empire',
  'italy-venice-carnival',
  'italy-venice-today',
] as const;

/**
 * ItalyActsCatalogue::LEAVES sort_order — the WIRE FORM of tour order. The app
 * never reads this number, but it is what orders the categories in Nova and in
 * any content payload sorted by it, so a renumber that disagrees with the act
 * order below would reorder the tour without touching a single id.
 */
export const BACKEND_ACT_SORT_ORDER = {
  'italy-florence-commune': 211,
  'italy-florence-medici': 212,
  'italy-florence-capital': 213,
  'italy-florence-today': 214,
  'italy-venice-lagoon': 221,
  'italy-venice-empire': 222,
  'italy-venice-carnival': 223,
  'italy-venice-today': 224,
} as const;

/**
 * ItalyActsCatalogue::LEAVES icon_emoji. NOT the app's icons — see the 6/2 split
 * in the header. Transcribed so the split can be asserted rather than assumed.
 */
export const BACKEND_ACT_EMOJI = {
  florence: { commune: '🏦', medici: '🎨', capital: '🇮🇹', today: '🍷' },
  venice: { lagoon: '🌊', empire: '⛵', carnival: '🎭', today: '🛶' },
} as const;

/** Four acts per reshaped city — the count the twenty-question circle rests on. */
export const BACKEND_ACTS_PER_CITY = 4;

/** ItalyCityActs::MIN_PER_ACT — questions an act needs before its city is playable. */
export const BACKEND_MIN_PER_ACT = 15;

/** ItalyCityActs::MIN_IMAGES_PER_CITY — image questions a city needs across its acts. */
export const BACKEND_MIN_IMAGES_PER_CITY = 20;
