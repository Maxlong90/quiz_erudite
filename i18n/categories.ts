import type { SupportedLocale } from '@/hooks/use-locale';

// Translations for every Erudite Quiz category and subcategory keyed by
// slug. Backend ships English names verbatim; the mobile app applies
// these on the way in. Keep slugs in sync with
// database/seeders/ContentCategorySeeder.php on the backend.
type Translations = Record<SupportedLocale, string>;

const NAMES: Record<string, Translations> = {
  // Top-level
  geography: { en: 'Geography', es: 'Geografía', ru: 'География', fr: 'Géographie' },
  history: { en: 'History', es: 'Historia', ru: 'История', fr: 'Histoire' },
  'science-and-nature': {
    en: 'Science & Nature',
    es: 'Ciencia y naturaleza',
    ru: 'Наука и природа',
    fr: 'Sciences et nature',
  },
  'arts-literature': {
    en: 'Arts & Literature',
    es: 'Arte y literatura',
    ru: 'Искусство и литература',
    fr: 'Arts et littérature',
  },
  sports: { en: 'Sports', es: 'Deportes', ru: 'Спорт', fr: 'Sport' },
  entertainment: {
    en: 'Entertainment',
    es: 'Entretenimiento',
    ru: 'Развлечения',
    fr: 'Divertissement',
  },
  'general-knowledge': {
    en: 'General Knowledge',
    es: 'Conocimiento general',
    ru: 'Эрудиция',
    fr: 'Culture générale',
  },

  // Geography
  'geography-general': { en: 'General', es: 'General', ru: 'Общее', fr: 'Général' },
  'geography-capitals': { en: 'Capitals', es: 'Capitales', ru: 'Столицы', fr: 'Capitales' },
  'geography-flags': { en: 'Flags', es: 'Banderas', ru: 'Флаги', fr: 'Drapeaux' },
  'geography-landmarks': {
    en: 'Landmarks',
    es: 'Lugares emblemáticos',
    ru: 'Достопримечательности',
    fr: 'Monuments',
  },
  'geography-physical': {
    en: 'Physical Geography',
    es: 'Geografía física',
    ru: 'Физическая география',
    fr: 'Géographie physique',
  },

  // History
  'history-ancient': {
    en: 'Ancient World',
    es: 'Mundo antiguo',
    ru: 'Древний мир',
    fr: 'Monde antique',
  },
  'history-modern': { en: 'Modern Era', es: 'Era moderna', ru: 'Новое время', fr: 'Époque moderne' },
  'history-world-wars': {
    en: 'World Wars',
    es: 'Guerras mundiales',
    ru: 'Мировые войны',
    fr: 'Guerres mondiales',
  },
  'history-famous-figures': {
    en: 'Famous Figures',
    es: 'Figuras famosas',
    ru: 'Известные личности',
    fr: 'Personnages célèbres',
  },

  // Science & Nature
  'science-and-nature-physics': { en: 'Physics', es: 'Física', ru: 'Физика', fr: 'Physique' },
  'science-and-nature-chemistry': { en: 'Chemistry', es: 'Química', ru: 'Химия', fr: 'Chimie' },
  'science-and-nature-biology': { en: 'Biology', es: 'Biología', ru: 'Биология', fr: 'Biologie' },
  'science-and-nature-space-astronomy': {
    en: 'Space & Astronomy',
    es: 'Espacio y astronomía',
    ru: 'Космос и астрономия',
    fr: 'Espace et astronomie',
  },

  // Arts & Literature
  'arts-literature-painting-visual-art': {
    en: 'Painting & Visual Art',
    es: 'Pintura y arte visual',
    ru: 'Живопись и изобразительное искусство',
    fr: 'Peinture et arts visuels',
  },
  'arts-literature-world-literature': {
    en: 'World Literature',
    es: 'Literatura mundial',
    ru: 'Мировая литература',
    fr: 'Littérature mondiale',
  },
  'arts-literature-architecture': {
    en: 'Architecture',
    es: 'Arquitectura',
    ru: 'Архитектура',
    fr: 'Architecture',
  },
  'arts-literature-music-theatre': {
    en: 'Music & Theatre',
    es: 'Música y teatro',
    ru: 'Музыка и театр',
    fr: 'Musique et théâtre',
  },

  // Sports
  'sports-football-soccer': { en: 'Football & Soccer', es: 'Fútbol', ru: 'Футбол', fr: 'Football' },
  'sports-olympic-games': {
    en: 'Olympic Games',
    es: 'Juegos Olímpicos',
    ru: 'Олимпийские игры',
    fr: 'Jeux olympiques',
  },
  'sports-team-sports': {
    en: 'Team Sports',
    es: 'Deportes en equipo',
    ru: 'Командные виды спорта',
    fr: 'Sports collectifs',
  },
  'sports-legends-records': {
    en: 'Legends & Records',
    es: 'Leyendas y récords',
    ru: 'Легенды и рекорды',
    fr: 'Légendes et records',
  },

  // Entertainment
  'entertainment-movies': { en: 'Movies', es: 'Películas', ru: 'Фильмы', fr: 'Cinéma' },
  'entertainment-tv-series': {
    en: 'TV Series',
    es: 'Series de TV',
    ru: 'Сериалы',
    fr: 'Séries TV',
  },
  'entertainment-music': { en: 'Music', es: 'Música', ru: 'Музыка', fr: 'Musique' },
  'entertainment-pop-culture': {
    en: 'Pop Culture',
    es: 'Cultura pop',
    ru: 'Поп-культура',
    fr: 'Culture pop',
  },

  // General Knowledge
  'general-knowledge-mythology-folklore': {
    en: 'Mythology & Folklore',
    es: 'Mitología y folclore',
    ru: 'Мифология и фольклор',
    fr: 'Mythologie et folklore',
  },
  'general-knowledge-inventions-discoveries': {
    en: 'Inventions & Discoveries',
    es: 'Inventos y descubrimientos',
    ru: 'Изобретения и открытия',
    fr: 'Inventions et découvertes',
  },
  'general-knowledge-world-cultures': {
    en: 'World Cultures',
    es: 'Culturas del mundo',
    ru: 'Культуры мира',
    fr: 'Cultures du monde',
  },
  'general-knowledge-famous-quotes': {
    en: 'Famous Quotes',
    es: 'Frases célebres',
    ru: 'Знаменитые цитаты',
    fr: 'Citations célèbres',
  },
};

export function localizeCategoryName(
  slug: string,
  locale: SupportedLocale,
  fallback: string,
): string {
  return NAMES[slug]?.[locale] ?? fallback;
}
