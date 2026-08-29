import { useLocale, type SupportedLocale } from '@/hooks/use-locale';

/**
 * Coat of Arms-specific category labels used on the Play screen. The shared
 * Flags Quiz labels cover the common rows (All countries, By continent,
 * Challenge, Available soon); these are the categories unique to Coat of Arms.
 */
export interface CoaLabels {
  internationalSymbols: string;
  cities: string;
  bonusLevel: string;
}

const EN: CoaLabels = {
  internationalSymbols: 'International symbols',
  cities: 'Cities',
  bonusLevel: 'Bonus level',
};

const RU: CoaLabels = {
  internationalSymbols: 'Международная символика',
  cities: 'Города',
  bonusLevel: 'Бонус-уровень',
};

const ES: CoaLabels = {
  internationalSymbols: 'Símbolos internacionales',
  cities: 'Ciudades',
  bonusLevel: 'Nivel bonus',
};

const FR: CoaLabels = {
  internationalSymbols: 'Symboles internationaux',
  cities: 'Villes',
  bonusLevel: 'Niveau bonus',
};

const TABLE: Record<SupportedLocale, CoaLabels> = { en: EN, ru: RU, es: ES, fr: FR };

export function useCoaLabels(): CoaLabels {
  const { locale } = useLocale();
  return TABLE[locale] ?? EN;
}
