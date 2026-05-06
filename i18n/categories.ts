import type { SupportedLocale } from '@/hooks/use-locale';

// Translations for every Erudite Quiz category and subcategory keyed by
// slug. Backend ships English names verbatim; the mobile app applies
// these on the way in. Keep slugs in sync with
// database/seeders/ContentCategorySeeder.php on the backend.
type Translations = Record<SupportedLocale, string>;

const NAMES: Record<string, Translations> = {
  // Top-level
  geography: { en: 'Geography', es: 'Geografía', ru: 'География' },
  history: { en: 'History', es: 'Historia', ru: 'История' },
  'science-and-nature': {
    en: 'Science & Nature',
    es: 'Ciencia y naturaleza',
    ru: 'Наука и природа',
  },
  'arts-literature': {
    en: 'Arts & Literature',
    es: 'Arte y literatura',
    ru: 'Искусство и литература',
  },
  sports: { en: 'Sports', es: 'Deportes', ru: 'Спорт' },
  entertainment: { en: 'Entertainment', es: 'Entretenimiento', ru: 'Развлечения' },
  'general-knowledge': {
    en: 'General Knowledge',
    es: 'Conocimiento general',
    ru: 'Эрудиция',
  },

  // Geography
  'geography-general': { en: 'General', es: 'General', ru: 'Общее' },
  'geography-capitals': { en: 'Capitals', es: 'Capitales', ru: 'Столицы' },
  'geography-flags': { en: 'Flags', es: 'Banderas', ru: 'Флаги' },
  'geography-landmarks': {
    en: 'Landmarks',
    es: 'Lugares emblemáticos',
    ru: 'Достопримечательности',
  },
  'geography-physical': {
    en: 'Physical Geography',
    es: 'Geografía física',
    ru: 'Физическая география',
  },

  // History
  'history-ancient': { en: 'Ancient World', es: 'Mundo antiguo', ru: 'Древний мир' },
  'history-modern': { en: 'Modern Era', es: 'Era moderna', ru: 'Новое время' },
  'history-world-wars': {
    en: 'World Wars',
    es: 'Guerras mundiales',
    ru: 'Мировые войны',
  },
  'history-famous-figures': {
    en: 'Famous Figures',
    es: 'Figuras famosas',
    ru: 'Известные личности',
  },

  // Science & Nature
  'science-and-nature-physics': { en: 'Physics', es: 'Física', ru: 'Физика' },
  'science-and-nature-chemistry': { en: 'Chemistry', es: 'Química', ru: 'Химия' },
  'science-and-nature-biology': { en: 'Biology', es: 'Biología', ru: 'Биология' },
  'science-and-nature-space-astronomy': {
    en: 'Space & Astronomy',
    es: 'Espacio y astronomía',
    ru: 'Космос и астрономия',
  },

  // Arts & Literature
  'arts-literature-painting-visual-art': {
    en: 'Painting & Visual Art',
    es: 'Pintura y arte visual',
    ru: 'Живопись и изобразительное искусство',
  },
  'arts-literature-world-literature': {
    en: 'World Literature',
    es: 'Literatura mundial',
    ru: 'Мировая литература',
  },
  'arts-literature-architecture': {
    en: 'Architecture',
    es: 'Arquitectura',
    ru: 'Архитектура',
  },
  'arts-literature-music-theatre': {
    en: 'Music & Theatre',
    es: 'Música y teatro',
    ru: 'Музыка и театр',
  },

  // Sports
  'sports-football-soccer': { en: 'Football & Soccer', es: 'Fútbol', ru: 'Футбол' },
  'sports-olympic-games': {
    en: 'Olympic Games',
    es: 'Juegos Olímpicos',
    ru: 'Олимпийские игры',
  },
  'sports-team-sports': {
    en: 'Team Sports',
    es: 'Deportes en equipo',
    ru: 'Командные виды спорта',
  },
  'sports-legends-records': {
    en: 'Legends & Records',
    es: 'Leyendas y récords',
    ru: 'Легенды и рекорды',
  },

  // Entertainment
  'entertainment-movies': { en: 'Movies', es: 'Películas', ru: 'Фильмы' },
  'entertainment-tv-series': { en: 'TV Series', es: 'Series de TV', ru: 'Сериалы' },
  'entertainment-music': { en: 'Music', es: 'Música', ru: 'Музыка' },
  'entertainment-pop-culture': {
    en: 'Pop Culture',
    es: 'Cultura pop',
    ru: 'Поп-культура',
  },

  // General Knowledge
  'general-knowledge-mythology-folklore': {
    en: 'Mythology & Folklore',
    es: 'Mitología y folclore',
    ru: 'Мифология и фольклор',
  },
  'general-knowledge-inventions-discoveries': {
    en: 'Inventions & Discoveries',
    es: 'Inventos y descubrimientos',
    ru: 'Изобретения и открытия',
  },
  'general-knowledge-world-cultures': {
    en: 'World Cultures',
    es: 'Culturas del mundo',
    ru: 'Культуры мира',
  },
  'general-knowledge-famous-quotes': {
    en: 'Famous Quotes',
    es: 'Frases célebres',
    ru: 'Знаменитые цитаты',
  },
};

export function localizeCategoryName(
  slug: string,
  locale: SupportedLocale,
  fallback: string,
): string {
  return NAMES[slug]?.[locale] ?? fallback;
}
