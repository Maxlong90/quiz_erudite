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
  /** Sub-label under the "AVANTI!" button — where the player is going. */
  destination: LocalizedText;
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
  /** Places without content yet render greyed out and are not tappable. */
  locked?: boolean;
}

/** How many questions a tour draws from each act. Four acts × five = twenty. */
export const QUESTIONS_PER_ACT = 5;

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
      destination: { ru: 'в Средние века', en: 'to the Middle Ages' },
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
      destination: { ru: 'в Возрождение', en: 'to the Renaissance' },
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
      destination: { ru: 'в наши дни', en: 'to the present day' },
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
  // Locked until their question sets are authored. They keep the same four-act
  // shape — only the interlude copy changes per place.
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
    locked: true,
  },
  {
    id: 'florence',
    label: { ru: 'Флоренция и Тоскана', en: 'Florence & Tuscany' },
    tagline: { ru: 'Этруски, Медичи, Кьянти', en: 'Etruscans, the Medici, Chianti' },
    acts: ROME_ACTS,
    locked: true,
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
