/**
 * Italy Quiz taxonomy — PLACES, not school subjects.
 *
 * The old information architecture was seven subject categories (Geography,
 * History, Art, Cuisine…) split into 27 subcategories, and it played badly: a
 * subcategory was a wall of one discipline, so a player either knew the whole
 * thing or missed the whole thing. This replaces it with a single axis.
 *
 * ONE LEVEL: a place. Tapping it starts a tour of that place, and the disciplines
 * that used to be categories are mixed inside it — a tour of Rome asks about its
 * map, its emperors, its frescoes, its pasta and its football clubs. There is no
 * subcategory screen any more.
 *
 * The tour is divided into four ACTS by TIME, played in order: antiquity →
 * middle ages → renaissance → today. So the player does not pick "Ancient Rome",
 * they travel through it. Between acts an interlude card explains the jump — see
 * `interlude` below.
 *
 * Question content lives in `constants/italy-quiz/questions/`, keyed by place id.
 */
import { useLocale, type SupportedLocale } from '@/hooks/use-locale';

/**
 * Prototype content is authored in Russian and English; Spanish and French fall
 * back to English until the real content arrives from the backend.
 */
export interface LocalizedText {
  ru: string;
  en: string;
  es?: string;
  fr?: string;
}

export function pickText(text: LocalizedText, locale: SupportedLocale): string {
  return text[locale] ?? text.en;
}

/** The card shown between two acts, explaining the jump in time. */
export interface ActInterlude {
  /** Big line — how much time just passed. */
  headline: LocalizedText;
  /** Two or three sentences setting up what the next act is about. */
  body: LocalizedText;
  /**
   * The continue button's label. Deliberately NAMES the destination rather than
   * saying something generic: the card's whole job is to explain where the tour
   * is jumping to, and a button reading "Next" throws that away on the one
   * control the player actually presses.
   */
  cta: LocalizedText;
}

export interface ItalyAct {
  id: string;
  /** Shown in the progress strip and on the interlude card. */
  icon: string;
  label: LocalizedText;
  /** Interlude shown BEFORE this act. Null for the first act of a tour. */
  interlude: ActInterlude | null;
}

export interface ItalyPlace {
  id: string;
  label: LocalizedText;
  /** One line under the place name on the tour intro card. */
  tagline: LocalizedText;
  acts: ItalyAct[];
  /**
   * Places that are not on the schedule at all: no content, no place in
   * `ITALY_CHAIN`, nothing the player can do to reach them. They render hollow
   * and are not tappable. A place that IS in the chain is never marked here —
   * its state is computed from the player's progress instead.
   */
  locked?: boolean;
}

/** How many questions a circle draws from each act. Four acts × five = twenty. */
export const QUESTIONS_PER_ACT = 5;

/**
 * The order cities open in. Clearing a city's FIRST circle hands the key to the
 * next one along.
 *
 * An ordered array rather than a `requires`/`unlocks` field on each place: the
 * whole progression reads as one line, reordering it is a single edit, and a
 * cycle is not expressible. A place that is not in here is never opened by play
 * — it is waiting for content, which is a different kind of shut (see `locked`).
 */
export const ITALY_CHAIN: readonly string[] = ['rome', 'florence', 'venice'];

const ROME_ACTS: ItalyAct[] = [
  {
    id: 'antiquity',
    icon: '🏛',
    label: { ru: 'Античность', en: 'Antiquity' },
    interlude: null,
  },
  {
    id: 'middle-ages',
    icon: '⚔️',
    label: { ru: 'Средние века', en: 'Middle Ages' },
    interlude: {
      headline: { ru: 'Прошло 500 лет', en: '500 years pass' },
      body: {
        ru: 'Империя рухнула. Город опустел с миллиона человек до двадцати пяти тысяч, а на Форуме, где решались судьбы мира, начали пасти коров.',
        en: 'The empire fell. The city emptied from a million people down to twenty-five thousand, and cattle grazed on the Forum where the world was once run.',
      },
      cta: { ru: 'В Средние века', en: 'To the Middle Ages' },
    },
  },
  {
    id: 'renaissance',
    icon: '🎨',
    label: { ru: 'Возрождение', en: 'Renaissance' },
    interlude: {
      headline: { ru: 'Прошло ещё 900 лет', en: '900 more years pass' },
      body: {
        ru: 'Папы вернулись из Авиньона в разорённый город и решили, что Рим снова станет столицей мира. Начинается самая дорогая стройка в истории Европы.',
        en: 'The popes returned from Avignon to a ruined city and decided Rome would be the capital of the world again. The most expensive building project in European history begins.',
      },
      cta: { ru: 'В Возрождение', en: 'To the Renaissance' },
    },
  },
  {
    id: 'today',
    icon: '📸',
    label: { ru: 'Сегодня', en: 'Today' },
    interlude: {
      headline: { ru: 'Прошло ещё 400 лет', en: '400 more years pass' },
      body: {
        ru: 'Рим стал столицей новой страны — Италии. Теперь сюда приезжают не завоёвывать, а фотографироваться: тридцать пять миллионов туристов в год.',
        en: 'Rome became the capital of a new country — Italy. People come now not to conquer but to take pictures: thirty-five million tourists a year.',
      },
      cta: { ru: 'В наши дни', en: 'To the present day' },
    },
  },
];

/**
 * The one tour that is not a city. Its acts run by THEME rather than by time,
 * because the material — food, football, cinema, the way Italians actually are —
 * has no chronology worth walking. It is the home for everything true of Italy
 * as a whole, which a city tour has nowhere to put.
 */
const ALL_ITALY_ACTS: ItalyAct[] = [
  {
    id: 'table',
    icon: '🍝',
    label: { ru: 'За столом', en: 'At the table' },
    interlude: null,
  },
  {
    id: 'calcio',
    icon: '⚽',
    label: { ru: 'Кальчо', en: 'Calcio' },
    interlude: {
      headline: { ru: 'Со стола — на трибуну', en: 'From the table to the terraces' },
      body: {
        ru: 'Есть только одна вещь, ради которой итальянец встанет из-за стола недоевшим. В воскресенье страна делится не на север и юг, а на цвета клубов.',
        en: 'There is only one thing that gets an Italian up from the table mid-meal. On Sunday the country splits not into north and south but into club colours.',
      },
      cta: { ru: 'К футболу', en: 'To the football' },
    },
  },
  {
    id: 'dolce-vita',
    icon: '🎬',
    label: { ru: 'Дольче вита', en: 'La dolce vita' },
    interlude: {
      headline: { ru: 'Италия на экране', en: 'Italy on screen' },
      body: {
        ru: 'В пятидесятых мир влюбился в итальянцев через кино и моду: скутер, тёмные очки, костюм. Образ оказался долговечнее фильмов.',
        en: 'In the fifties the world fell for Italy through cinema and fashion: the scooter, the sunglasses, the suit. The image outlived the films.',
      },
      cta: { ru: 'К дольче вита', en: 'To la dolce vita' },
    },
  },
  {
    id: 'people',
    icon: '🤌',
    label: { ru: 'Как устроены итальянцы', en: 'How Italians work' },
    interlude: {
      headline: { ru: 'А теперь — про людей', en: 'And now — the people' },
      body: {
        ru: 'Кофе после обеда, но никогда после ужина. Жесты, которые понимают без слов. Правила, которых нет ни в одном путеводителе.',
        en: 'Coffee after lunch, never after dinner. Gestures that need no words. Rules no guidebook prints.',
      },
      cta: { ru: 'К привычкам', en: 'To the habits' },
    },
  },
];

export const ITALY_PLACES: ItalyPlace[] = [
  {
    id: 'rome',
    label: { ru: 'Рим', en: 'Rome' },
    tagline: { ru: '2000 лет за 20 вопросов', en: '2000 years in 20 questions' },
    acts: ROME_ACTS,
  },
  // Locked until their question sets are authored, EXCEPT the two that are in
  // ITALY_CHAIN — Florence and Venice open by play, and their circles show
  // "soon" until their questions exist. They keep the same four-act shape; only
  // the interlude copy changes per place.
  {
    id: 'naples',
    label: { ru: 'Неаполь и Везувий', en: 'Naples & Vesuvius' },
    tagline: { ru: 'Помпеи, Бурбоны и пицца', en: 'Pompeii, the Bourbons and pizza' },
    acts: ROME_ACTS,
    locked: true,
  },
  {
    id: 'venice',
    label: { ru: 'Венеция', en: 'Venice' },
    tagline: { ru: 'Лагуна, Республика, карнавал', en: 'The lagoon, the Republic, the carnival' },
    acts: ROME_ACTS,
  },
  {
    id: 'florence',
    label: { ru: 'Флоренция и Тоскана', en: 'Florence & Tuscany' },
    tagline: { ru: 'Этруски, Медичи, Кьянти', en: 'Etruscans, the Medici, Chianti' },
    acts: ROME_ACTS,
  },
  {
    id: 'milan',
    label: { ru: 'Милан и Север', en: 'Milan & the North' },
    tagline: { ru: 'Медиоланум, Ла Скала, мода', en: 'Mediolanum, La Scala, fashion' },
    acts: ROME_ACTS,
    locked: true,
  },
  {
    id: 'sicily',
    label: { ru: 'Сицилия', en: 'Sicily' },
    tagline: { ru: 'Греки, норманны, Этна', en: 'Greeks, Normans, Etna' },
    acts: ROME_ACTS,
    locked: true,
  },
  // Not a city: the country itself, by theme instead of by century. Its pin sits
  // off the coast so it reads as "all of this", not as one more place to visit.
  {
    id: 'all-italy',
    label: { ru: 'Вся Италия', en: 'All of Italy' },
    tagline: { ru: 'Еда, кальчо, кино, привычки', en: 'Food, calcio, cinema, habits' },
    acts: ALL_ITALY_ACTS,
    locked: true,
  },
];

export interface LocalizedPlace {
  id: string;
  title: string;
  tagline: string;
  locked: boolean;
  acts: { id: string; icon: string; title: string }[];
}

function localizePlace(place: ItalyPlace, locale: SupportedLocale): LocalizedPlace {
  return {
    id: place.id,
    title: pickText(place.label, locale),
    tagline: pickText(place.tagline, locale),
    locked: !!place.locked,
    acts: place.acts.map((a) => ({
      id: a.id,
      icon: a.icon,
      title: pickText(a.label, locale),
    })),
  };
}

/** Every place, titles resolved to the active locale. */
export function useItalyPlaces(): LocalizedPlace[] {
  const { locale } = useLocale();
  return ITALY_PLACES.map((p) => localizePlace(p, locale));
}

/** One place by id, or null. */
export function useItalyPlace(id: string | undefined): LocalizedPlace | null {
  const { locale } = useLocale();
  const place = ITALY_PLACES.find((p) => p.id === id);
  return place ? localizePlace(place, locale) : null;
}

/** The raw (unlocalized) place record — used where the interlude copy is needed. */
export function getPlace(id: string | undefined): ItalyPlace | null {
  return ITALY_PLACES.find((p) => p.id === id) ?? null;
}
