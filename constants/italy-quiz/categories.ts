/**
 * Italy Quiz content map (App Template: World). The seven top-level categories and
 * their subcategories, localized (en/ru/es/fr). This is the frontend information
 * architecture the operator defined; each entry carries a stable `slug` so it can
 * be wired to the backend category snapshot later. The quiz flow itself is not
 * wired yet — tapping a subcategory is a no-op for now.
 */
import type { ImageSourcePropType } from 'react-native';

import { useLocale, type SupportedLocale } from '@/hooks/use-locale';

type Loc = Record<SupportedLocale, string>;

export interface ItalySubcategory {
  id: string;
  slug: string;
  label: Loc;
}

export interface ItalyCategory {
  id: string;
  slug: string;
  /** Leading badge icon shown on the category button. */
  icon: ImageSourcePropType;
  label: Loc;
  subcategories: ItalySubcategory[];
}

export const ITALY_CATEGORIES: ItalyCategory[] = [
  {
    id: 'geography',
    slug: 'geography',
    icon: require('../../assets/italy-quiz/categories/geography.png'),
    label: {
      en: 'Geography',
      ru: 'География',
      es: 'Geografía',
      fr: 'Géographie',
    },
    subcategories: [
      {
        id: 'regions-capitals',
        slug: 'regions-capitals',
        label: {
          en: 'Regions & capitals',
          ru: 'Регионы и столицы',
          es: 'Regiones y capitales',
          fr: 'Régions et capitales',
        },
      },
      {
        id: 'mountains-volcanoes-lakes',
        slug: 'mountains-volcanoes-lakes',
        label: {
          en: 'Mountains, volcanoes & lakes',
          ru: 'Горы, вулканы и озёра',
          es: 'Montañas, volcanes y lagos',
          fr: 'Montagnes, volcans et lacs',
        },
      },
      {
        id: 'seas-islands',
        slug: 'seas-islands',
        label: {
          en: 'Seas & islands',
          ru: 'Моря и острова',
          es: 'Mares e islas',
          fr: 'Mers et îles',
        },
      },
      {
        id: 'cities-by-photo',
        slug: 'cities-by-photo',
        label: {
          en: 'Cities by photo',
          ru: 'Города по фото',
          es: 'Ciudades por foto',
          fr: 'Villes en photo',
        },
      },
    ],
  },
  {
    id: 'history',
    slug: 'history',
    icon: require('../../assets/italy-quiz/categories/history.png'),
    label: {
      en: 'History',
      ru: 'История',
      es: 'Historia',
      fr: 'Histoire',
    },
    subcategories: [
      {
        id: 'ancient-rome',
        slug: 'ancient-rome',
        label: {
          en: 'Ancient Rome',
          ru: 'Древний Рим',
          es: 'Antigua Roma',
          fr: 'Rome antique',
        },
      },
      {
        id: 'middle-ages-city-states',
        slug: 'middle-ages-city-states',
        label: {
          en: 'Middle Ages & city-states',
          ru: 'Средневековье и город-государства',
          es: 'Edad Media y ciudades-estado',
          fr: 'Moyen Âge et cités-États',
        },
      },
      {
        id: 'renaissance',
        slug: 'renaissance',
        label: {
          en: 'Renaissance',
          ru: 'Возрождение',
          es: 'Renacimiento',
          fr: 'Renaissance',
        },
      },
      {
        id: 'unification-20th-century',
        slug: 'unification-20th-century',
        label: {
          en: 'Unification of Italy & the 20th century',
          ru: 'Объединение Италии и XX век',
          es: 'Unificación de Italia y siglo XX',
          fr: 'Unification de l’Italie et XXe siècle',
        },
      },
    ],
  },
  {
    id: 'art-architecture',
    slug: 'art-architecture',
    icon: require('../../assets/italy-quiz/categories/art-architecture.png'),
    label: {
      en: 'Art & architecture',
      ru: 'Искусство и архитектура',
      es: 'Arte y arquitectura',
      fr: 'Art et architecture',
    },
    subcategories: [
      {
        id: 'painting',
        slug: 'painting',
        label: { en: 'Painting', ru: 'Живопись', es: 'Pintura', fr: 'Peinture' },
      },
      {
        id: 'sculpture',
        slug: 'sculpture',
        label: { en: 'Sculpture', ru: 'Скульптура', es: 'Escultura', fr: 'Sculpture' },
      },
      {
        id: 'famous-buildings-monuments',
        slug: 'famous-buildings-monuments',
        label: {
          en: 'Famous buildings & monuments',
          ru: 'Знаменитые здания и памятники',
          es: 'Edificios y monumentos famosos',
          fr: 'Bâtiments et monuments célèbres',
        },
      },
    ],
  },
  {
    id: 'cuisine',
    slug: 'cuisine',
    icon: require('../../assets/italy-quiz/categories/cuisine.png'),
    label: {
      en: 'Cuisine',
      ru: 'Кухня',
      es: 'Cocina',
      fr: 'Cuisine',
    },
    subcategories: [
      {
        id: 'regional-dishes',
        slug: 'regional-dishes',
        label: {
          en: 'Regional dishes',
          ru: 'Блюда по регионам',
          es: 'Platos por regiones',
          fr: 'Plats régionaux',
        },
      },
      {
        id: 'pasta-pizza',
        slug: 'pasta-pizza',
        label: { en: 'Pasta & pizza', ru: 'Паста и пицца', es: 'Pasta y pizza', fr: 'Pâtes et pizza' },
      },
      {
        id: 'wine-cheese',
        slug: 'wine-cheese',
        label: { en: 'Wine & cheese', ru: 'Вино и сыры', es: 'Vino y quesos', fr: 'Vin et fromages' },
      },
    ],
  },
  {
    id: 'culture-people',
    slug: 'culture-people',
    icon: require('../../assets/italy-quiz/categories/culture-people.png'),
    label: {
      en: 'Culture & people',
      ru: 'Культура и люди',
      es: 'Cultura y gente',
      fr: 'Culture et personnalités',
    },
    subcategories: [
      {
        id: 'cinema-directors',
        slug: 'cinema-directors',
        label: {
          en: 'Cinema & directors',
          ru: 'Кино и режиссёры',
          es: 'Cine y directores',
          fr: 'Cinéma et réalisateurs',
        },
      },
      {
        id: 'music-opera',
        slug: 'music-opera',
        label: { en: 'Music & opera', ru: 'Музыка и опера', es: 'Música y ópera', fr: 'Musique et opéra' },
      },
      {
        id: 'writers',
        slug: 'writers',
        label: { en: 'Writers', ru: 'Писатели', es: 'Escritores', fr: 'Écrivains' },
      },
      {
        id: 'famous-italians',
        slug: 'famous-italians',
        label: {
          en: 'Famous Italians',
          ru: 'Знаменитые итальянцы',
          es: 'Italianos famosos',
          fr: 'Italiens célèbres',
        },
      },
    ],
  },
  {
    id: 'sport',
    slug: 'sport',
    icon: require('../../assets/italy-quiz/categories/sport.png'),
    label: {
      en: 'Sport',
      ru: 'Спорт',
      es: 'Deporte',
      fr: 'Sport',
    },
    subcategories: [
      {
        id: 'football',
        slug: 'football',
        label: { en: 'Football', ru: 'Футбол', es: 'Fútbol', fr: 'Football' },
      },
      {
        id: 'motorsport',
        slug: 'motorsport',
        label: { en: 'Motorsport', ru: 'Автомотоспорт', es: 'Automovilismo', fr: 'Sport automobile' },
      },
      {
        id: 'tennis',
        slug: 'tennis',
        label: { en: 'Tennis', ru: 'Теннис', es: 'Tenis', fr: 'Tennis' },
      },
      {
        id: 'team-sports',
        slug: 'team-sports',
        label: {
          en: 'Team sports',
          ru: 'Командные виды спорта',
          es: 'Deportes de equipo',
          fr: 'Sports collectifs',
        },
      },
      {
        id: 'olympics',
        slug: 'olympics',
        label: { en: 'The Olympics', ru: 'Олимпиада', es: 'Juegos Olímpicos', fr: 'Jeux olympiques' },
      },
    ],
  },
  {
    id: 'bonus',
    slug: 'bonus',
    icon: require('../../assets/italy-quiz/categories/bonus.png'),
    label: {
      en: 'Bonus level',
      ru: 'Бонус-уровень',
      es: 'Nivel bonus',
      fr: 'Niveau bonus',
    },
    subcategories: [
      {
        id: 'language-gestures',
        slug: 'language-gestures',
        label: {
          en: 'Language & gestures',
          ru: 'Язык и жесты',
          es: 'Idioma y gestos',
          fr: 'Langue et gestes',
        },
      },
      {
        id: 'traditions-holidays',
        slug: 'traditions-holidays',
        label: {
          en: 'Traditions & holidays',
          ru: 'Традиции и праздники',
          es: 'Tradiciones y fiestas',
          fr: 'Traditions et fêtes',
        },
      },
      {
        id: 'myths-about-italy',
        slug: 'myths-about-italy',
        label: {
          en: 'Myths about Italy',
          ru: 'Мифы об Италии',
          es: 'Mitos sobre Italia',
          fr: 'Mythes sur l’Italie',
        },
      },
      {
        id: 'symbols',
        slug: 'symbols',
        label: { en: 'Symbols', ru: 'Символы', es: 'Símbolos', fr: 'Symboles' },
      },
    ],
  },
];

/** A category/subcategory with its labels already resolved to the active locale. */
export interface LocalizedSubcategory {
  id: string;
  slug: string;
  title: string;
}
export interface LocalizedCategory {
  id: string;
  slug: string;
  icon: ImageSourcePropType;
  title: string;
  subcategories: LocalizedSubcategory[];
}

function pick(label: Loc, locale: SupportedLocale): string {
  return label[locale] ?? label.en;
}

/** All categories with titles resolved to the active locale. */
export function useItalyCategories(): LocalizedCategory[] {
  const { locale } = useLocale();
  return ITALY_CATEGORIES.map((c) => ({
    id: c.id,
    slug: c.slug,
    icon: c.icon,
    title: pick(c.label, locale),
    subcategories: c.subcategories.map((s) => ({ id: s.id, slug: s.slug, title: pick(s.label, locale) })),
  }));
}

/** A single category (by id) with titles resolved to the active locale, or null. */
export function useItalyCategory(id: string | undefined): LocalizedCategory | null {
  const categories = useItalyCategories();
  return categories.find((c) => c.id === id) ?? null;
}
