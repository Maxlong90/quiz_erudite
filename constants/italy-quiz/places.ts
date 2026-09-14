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
 * The tour is divided into four ACTS played in order, and the acts belong to the
 * PLACE rather than to a shared calendar. Rome runs antiquity → middle ages →
 * renaissance → today, but that is one instance of the rule, not the rule:
 * Florence opens on the commune, because its story starts when it starts minting
 * money, and Venice opens on the lagoon, because in antiquity there was nothing
 * there to open on. Four acts in order is fixed; which four is a question each
 * place answers for itself. So the player does not pick "Ancient Rome", they
 * travel through it. Between acts an interlude card explains the jump — see
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
   *
   * Nothing sets this today — every place is on the schedule now — but the flag
   * stays because it is the only way to express "waiting for content", and the
   * pin already knows how to draw that state.
   */
  locked?: boolean;
  /**
   * A place that is NOT on the chain and is open from the very first run — a
   * side trip rather than a stop on the tour. Mutually exclusive with `locked`
   * and with membership of `ITALY_CHAIN`. Nothing sets it yet; the Sardinia
   * point will.
   */
  alwaysOpen?: boolean;
}

/** How many questions a circle draws from each act. Four acts × five = twenty. */
export const QUESTIONS_PER_ACT = 5;

/**
 * The order cities open in. Clearing CIRCLES_TO_UNLOCK_NEXT circles of a city
 * hands the key to the next one along (see lib/italy-quiz/circles).
 *
 * An ordered array rather than a `requires`/`unlocks` field on each place: the
 * whole progression reads as one line, reordering it is a single edit, and a
 * cycle is not expressible. A place that is not in here is never opened by play
 * — it is either waiting for content (`locked`) or a side trip that needs no
 * key at all (`alwaysOpen`).
 *
 * Every place is on the chain now, ordered by how much content each is likely
 * to get rather than by geography.
 */
export const ITALY_CHAIN: readonly string[] = [
  'rome',
  'florence',
  'venice',
  'sicily',
  'naples',
  'milan',
  'all-italy',
];

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
 * Florence's acts are NOT Rome's with different copy. Rome's four are cut where
 * the empire, the papacy and the tourists take over; Florence's are cut where
 * its money changes hands — the guilds, then one banking family, then a
 * six-year accident of statehood. The third act is the surprise the tour is
 * built around: for six years Florence, not Rome, was the capital of Italy.
 */
const FLORENCE_ACTS: ItalyAct[] = [
  {
    id: 'commune',
    icon: '🏦',
    label: { ru: 'Коммуна и банкиры', en: 'The commune and the bankers' },
    interlude: null,
  },
  {
    id: 'medici',
    icon: '🎨',
    label: { ru: 'Медичи и Возрождение', en: 'The Medici and the Renaissance' },
    interlude: {
      headline: { ru: 'Прошло 300 лет', en: '300 years pass' },
      body: {
        ru: 'Шерсть и золотой флорин сделали Флоренцию богаче Лондона, а потом пришла чума 1348 года и убрала больше половины горожан. Из десятков банкирских семей наверх выбралась одна — и на следующие триста лет город стал мастерской Медичи.',
        en: 'Wool and the gold florin made Florence richer than London — and then the plague of 1348 took more than half its people. Out of dozens of banking families one climbed to the top, and for the next three hundred years the city was the Medici workshop.',
      },
      cta: { ru: 'К Медичи', en: 'To the Medici' },
    },
  },
  {
    id: 'capital',
    icon: '🇮🇹',
    label: { ru: 'Шесть лет столицей', en: 'Six years as the capital' },
    interlude: {
      headline: { ru: 'Прошло ещё 250 лет', en: '250 more years pass' },
      body: {
        ru: 'Последняя из рода Медичи умерла в 1743 году и завещала городу всё собрание — с условием, что ни одна картина никогда не покинет Флоренцию. Через сто с лишним лет город, живший музеем, вдруг получил другую работу: столицы новой Италии. На шесть лет.',
        en: 'The last of the Medici died in 1743 and willed the whole collection to the city, on the condition that not one painting ever leave Florence. A century later the town that lived as a museum was handed a different job: capital of a brand-new Italy. For six years.',
      },
      cta: { ru: 'В столичные годы', en: 'To the capital years' },
    },
  },
  {
    id: 'today',
    icon: '📸',
    label: { ru: 'Сегодня', en: 'Today' },
    interlude: {
      headline: { ru: 'Прошло ещё 150 лет', en: '150 more years pass' },
      body: {
        ru: 'Столицу забрал Рим, а Флоренции остались долги и средневековый центр, снесённый ради широких проспектов. Потом было наводнение 1966 года — вода поднялась на шесть метров, — а теперь на 360 тысяч жителей приходится десять миллионов приезжих в год.',
        en: 'Rome took the capital back, and Florence was left with the debts and a medieval centre pulled down to make way for boulevards. Then came the flood of 1966, when the water rose six metres — and now a city of 360 thousand takes ten million visitors a year.',
      },
      cta: { ru: 'В наши дни', en: 'To the present day' },
    },
  },
];

/**
 * Venice has no antiquity act because Venice has no antiquity: there was no
 * city here when Rome had a million people in it. The tour therefore opens on
 * an empty lagoon, and the FIRST interlude is where that gets said out loud —
 * a player arriving from Rome needs to be told why the clock just restarted in
 * the fifth century rather than the first.
 */
const VENICE_ACTS: ItalyAct[] = [
  {
    id: 'lagoon',
    icon: '🌊',
    label: { ru: 'Рождение на воде', en: 'Born on the water' },
    interlude: null,
  },
  {
    id: 'empire',
    icon: '⛵',
    label: { ru: 'Морская империя', en: 'The sea empire' },
    interlude: {
      headline: { ru: 'Прошло 400 лет', en: '400 years pass' },
      body: {
        ru: 'Города на этих островах не было ни при Цезаре, ни при Августе — только вода, ил и птицы. За четыреста лет беглецы вбили в дно миллионы свай, выбрали первого дожа и обнаружили, что у них есть то, чего нет больше ни у кого в Италии: флот.',
        en: 'There was no city on these islands under Caesar or Augustus — only water, mud and birds. In four hundred years the refugees drove millions of piles into the seabed, elected their first doge, and found they had the one thing nobody else in Italy had: a fleet.',
      },
      cta: { ru: 'К морской империи', en: 'To the sea empire' },
    },
  },
  {
    id: 'carnival',
    icon: '🎭',
    label: { ru: 'Карнавал и упадок', en: 'Carnival and decline' },
    interlude: {
      headline: { ru: 'Прошло ещё 500 лет', en: '500 more years pass' },
      body: {
        ru: 'Арсенал спускал на воду по галере в день, а венецианские фактории стояли от Крита до Чёрного моря. Потом турки взяли Константинополь, португальцы обошли Африку — и торговля ушла в Атлантику. Республика, потерявшая рынки, начала торговать собой: карнавал растянулся на полгода.',
        en: 'The Arsenal launched a galley a day and Venetian trading posts ran from Crete to the Black Sea. Then the Turks took Constantinople, the Portuguese sailed round Africa, and the trade went to the Atlantic. A republic that had lost its markets began selling itself: the carnival stretched to six months of the year.',
      },
      cta: { ru: 'К карнавалу', en: 'To the carnival' },
    },
  },
  {
    id: 'today',
    icon: '📸',
    label: { ru: 'Сегодня', en: 'Today' },
    interlude: {
      headline: { ru: 'Прошло ещё 200 лет', en: '200 more years pass' },
      body: {
        ru: 'В 1797 году Наполеон отменил республику, простоявшую тысячу лет, и последний дож снял шапку со словами, что она ему больше не понадобится. С тех пор город теряет по тысяче жителей в год: в историческом центре осталось меньше пятидесяти тысяч — на двадцать миллионов туристов.',
        en: 'In 1797 Napoleon abolished a republic that had stood for a thousand years, and the last doge took off his cap remarking that he would not be needing it again. The city has lost a thousand residents a year ever since: fewer than fifty thousand are left in the historic centre — against twenty million tourists.',
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
  // Every place below is on ITALY_CHAIN and opens by play; their circles show
  // "soon" until their questions exist. They keep the four-act COUNT, which the
  // twenty-question draw depends on, but not Rome's acts: ids, icons, labels and
  // interludes are their own, because their centuries are their own. A place
  // still pointing at ROME_ACTS below is a placeholder waiting for its own.
  {
    id: 'naples',
    label: { ru: 'Неаполь и Везувий', en: 'Naples & Vesuvius' },
    tagline: { ru: 'Помпеи, Бурбоны и пицца', en: 'Pompeii, the Bourbons and pizza' },
    acts: ROME_ACTS,
  },
  {
    id: 'venice',
    label: { ru: 'Венеция', en: 'Venice' },
    tagline: { ru: 'Лагуна, Республика, карнавал', en: 'The lagoon, the Republic, the carnival' },
    acts: VENICE_ACTS,
  },
  {
    id: 'florence',
    label: { ru: 'Флоренция и Тоскана', en: 'Florence & Tuscany' },
    tagline: { ru: 'Этруски, Медичи, Кьянти', en: 'Etruscans, the Medici, Chianti' },
    acts: FLORENCE_ACTS,
  },
  {
    id: 'milan',
    label: { ru: 'Милан и Север', en: 'Milan & the North' },
    tagline: { ru: 'Медиоланум, Ла Скала, мода', en: 'Mediolanum, La Scala, fashion' },
    acts: ROME_ACTS,
  },
  {
    id: 'sicily',
    label: { ru: 'Сицилия', en: 'Sicily' },
    tagline: { ru: 'Греки, норманны, Этна', en: 'Greeks, Normans, Etna' },
    acts: ROME_ACTS,
  },
  // Not a city: the country itself, by theme instead of by century. Its pin sits
  // off the coast so it reads as "all of this", not as one more place to visit.
  {
    id: 'all-italy',
    label: { ru: 'Вся Италия', en: 'All of Italy' },
    tagline: { ru: 'Еда, кальчо, кино, привычки', en: 'Food, calcio, cinema, habits' },
    acts: ALL_ITALY_ACTS,
  },
];

export interface LocalizedPlace {
  id: string;
  title: string;
  tagline: string;
  locked: boolean;
  alwaysOpen: boolean;
  acts: { id: string; icon: string; title: string }[];
}

function localizePlace(place: ItalyPlace, locale: SupportedLocale): LocalizedPlace {
  return {
    id: place.id,
    title: pickText(place.label, locale),
    tagline: pickText(place.tagline, locale),
    locked: !!place.locked,
    alwaysOpen: !!place.alwaysOpen,
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
