import { useLocale, type SupportedLocale } from '@/hooks/use-locale';

/**
 * Coat of Arms-specific category labels used on the Play screen. The shared
 * Flags Quiz labels cover the common rows (All countries, By continent,
 * Challenge, Available soon); these are the categories unique to Coat of Arms.
 */
export interface CoaLabels {
  /** Play-screen category. RU wraps "символика" to a second line via "\n". */
  internationalSymbols: string;
  cities: string;
  bonusLevel: string;
  /** "Version" — the shared Flags Quiz EN labels don't declare this key. */
  version: string;
  /** App name shown as the share-card header. */
  appName: string;
  /** RU-only two-line quiz prompt override; empty in other locales (which keep
   *  the backend question, whose single-line wrap already looks right). */
  quizPrompt: string;
}

const EN: CoaLabels = {
  internationalSymbols: 'International symbols',
  cities: 'Cities',
  bonusLevel: 'Bonus level',
  version: 'Version',
  appName: 'Coat of Arms',
  quizPrompt: '',
};

const RU: CoaLabels = {
  internationalSymbols: 'Международная\nсимволика',
  cities: 'Города',
  bonusLevel: 'Бонус-уровень',
  version: 'Версия',
  appName: 'Гербы',
  quizPrompt: 'Какой стране\nпринадлежит этот герб?',
};

const ES: CoaLabels = {
  internationalSymbols: 'Símbolos internacionales',
  cities: 'Ciudades',
  bonusLevel: 'Nivel bonus',
  version: 'Versión',
  appName: 'Escudos',
  quizPrompt: '',
};

const FR: CoaLabels = {
  internationalSymbols: 'Symboles internationaux',
  cities: 'Villes',
  bonusLevel: 'Niveau bonus',
  version: 'Version',
  appName: 'Blasons',
  quizPrompt: '',
};

const TABLE: Record<SupportedLocale, CoaLabels> = { en: EN, ru: RU, es: ES, fr: FR };

export function useCoaLabels(): CoaLabels {
  const { locale } = useLocale();
  return TABLE[locale] ?? EN;
}
