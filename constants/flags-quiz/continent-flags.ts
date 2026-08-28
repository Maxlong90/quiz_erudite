import type { SupportedLocale } from '@/hooks/use-locale';
import type { FlagSpec } from '@/components/flags-quiz/flag-image';

/**
 * Placeholder flag catalogue for the "By continent" game, grouped by continent.
 * Each country carries a localized name (ru/en/es), a simplified flag spec
 * (stripes / disc / Union-Jack canton — emblems & stars omitted) and a stable
 * `slug` that keys its flag-history blurb (see constants/flags-quiz/flag-history).
 * Real content (~200 accurate flags) will come from the backend snapshot; this
 * keeps every continent playable meanwhile.
 */

export type ContinentKey =
  | 'africa'
  | 'northAmerica'
  | 'southAmerica'
  | 'asia'
  | 'europe'
  | 'oceania';

export interface CountryEntry {
  /** Stable id, also the key into FLAG_HISTORY. */
  slug: string;
  name: Record<SupportedLocale, string>;
  flag: FlagSpec;
}

export const CONTINENT_COUNTRIES: Record<ContinentKey, CountryEntry[]> = {
  africa: [
    { slug: 'nigeria', name: { ru: 'Нигерия', en: 'Nigeria', es: 'Nigeria', fr: 'Nigéria' }, flag: { kind: 'bands', dir: 'v', bands: [{ color: '#008751' }, { color: '#ffffff' }, { color: '#008751' }] } },
    { slug: 'gabon', name: { ru: 'Габон', en: 'Gabon', es: 'Gabón', fr: 'Gabon' }, flag: { kind: 'bands', dir: 'h', bands: [{ color: '#009e60' }, { color: '#fcd116' }, { color: '#3a75c4' }] } },
    { slug: 'mali', name: { ru: 'Мали', en: 'Mali', es: 'Malí', fr: 'Mali' }, flag: { kind: 'bands', dir: 'v', bands: [{ color: '#14b53a' }, { color: '#fcd116' }, { color: '#ce1126' }] } },
    { slug: 'guinea', name: { ru: 'Гвинея', en: 'Guinea', es: 'Guinea', fr: 'Guinée' }, flag: { kind: 'bands', dir: 'v', bands: [{ color: '#ce1126' }, { color: '#fcd116' }, { color: '#009460' }] } },
    { slug: 'ivory-coast', name: { ru: 'Кот-д’Ивуар', en: 'Ivory Coast', es: 'Costa de Marfil', fr: 'Côte d’Ivoire' }, flag: { kind: 'bands', dir: 'v', bands: [{ color: '#f77f00' }, { color: '#ffffff' }, { color: '#009e60' }] } },
    { slug: 'chad', name: { ru: 'Чад', en: 'Chad', es: 'Chad', fr: 'Tchad' }, flag: { kind: 'bands', dir: 'v', bands: [{ color: '#002664' }, { color: '#fecb00' }, { color: '#c60c30' }] } },
  ],
  northAmerica: [
    { slug: 'mexico', name: { ru: 'Мексика', en: 'Mexico', es: 'México', fr: 'Mexique' }, flag: { kind: 'bands', dir: 'v', bands: [{ color: '#006847' }, { color: '#ffffff' }, { color: '#ce1126' }] } },
    { slug: 'canada', name: { ru: 'Канада', en: 'Canada', es: 'Canadá', fr: 'Canada' }, flag: { kind: 'bands', dir: 'v', bands: [{ color: '#d52b1e', weight: 1 }, { color: '#ffffff', weight: 2 }, { color: '#d52b1e', weight: 1 }] } },
    { slug: 'honduras', name: { ru: 'Гондурас', en: 'Honduras', es: 'Honduras', fr: 'Honduras' }, flag: { kind: 'bands', dir: 'h', bands: [{ color: '#0073cf' }, { color: '#ffffff' }, { color: '#0073cf' }] } },
    { slug: 'guatemala', name: { ru: 'Гватемала', en: 'Guatemala', es: 'Guatemala', fr: 'Guatemala' }, flag: { kind: 'bands', dir: 'v', bands: [{ color: '#4997d0' }, { color: '#ffffff' }, { color: '#4997d0' }] } },
    { slug: 'costa-rica', name: { ru: 'Коста-Рика', en: 'Costa Rica', es: 'Costa Rica', fr: 'Costa Rica' }, flag: { kind: 'bands', dir: 'h', bands: [{ color: '#002b7f', weight: 1 }, { color: '#ffffff', weight: 1 }, { color: '#ce1126', weight: 2 }, { color: '#ffffff', weight: 1 }, { color: '#002b7f', weight: 1 }] } },
    { slug: 'nicaragua', name: { ru: 'Никарагуа', en: 'Nicaragua', es: 'Nicaragua', fr: 'Nicaragua' }, flag: { kind: 'bands', dir: 'h', bands: [{ color: '#0067c6' }, { color: '#ffffff' }, { color: '#0067c6' }] } },
  ],
  southAmerica: [
    { slug: 'bolivia', name: { ru: 'Боливия', en: 'Bolivia', es: 'Bolivia', fr: 'Bolivie' }, flag: { kind: 'bands', dir: 'h', bands: [{ color: '#d52b1e' }, { color: '#f9e300' }, { color: '#007a33' }] } },
    { slug: 'peru', name: { ru: 'Перу', en: 'Peru', es: 'Perú', fr: 'Pérou' }, flag: { kind: 'bands', dir: 'v', bands: [{ color: '#d91023' }, { color: '#ffffff' }, { color: '#d91023' }] } },
    { slug: 'colombia', name: { ru: 'Колумбия', en: 'Colombia', es: 'Colombia', fr: 'Colombie' }, flag: { kind: 'bands', dir: 'h', bands: [{ color: '#fcd116', weight: 2 }, { color: '#003893', weight: 1 }, { color: '#ce1126', weight: 1 }] } },
    { slug: 'venezuela', name: { ru: 'Венесуэла', en: 'Venezuela', es: 'Venezuela', fr: 'Venezuela' }, flag: { kind: 'bands', dir: 'h', bands: [{ color: '#ffcc00' }, { color: '#00247d' }, { color: '#cf142b' }] } },
    { slug: 'argentina', name: { ru: 'Аргентина', en: 'Argentina', es: 'Argentina', fr: 'Argentine' }, flag: { kind: 'bands', dir: 'h', bands: [{ color: '#75aadb' }, { color: '#ffffff' }, { color: '#75aadb' }] } },
  ],
  asia: [
    { slug: 'indonesia', name: { ru: 'Индонезия', en: 'Indonesia', es: 'Indonesia', fr: 'Indonésie' }, flag: { kind: 'bands', dir: 'h', bands: [{ color: '#ff0000' }, { color: '#ffffff' }] } },
    { slug: 'armenia', name: { ru: 'Армения', en: 'Armenia', es: 'Armenia', fr: 'Arménie' }, flag: { kind: 'bands', dir: 'h', bands: [{ color: '#d90012' }, { color: '#0033a0' }, { color: '#f2a800' }] } },
    { slug: 'india', name: { ru: 'Индия', en: 'India', es: 'India', fr: 'Inde' }, flag: { kind: 'bands', dir: 'h', bands: [{ color: '#ff9933' }, { color: '#ffffff' }, { color: '#138808' }] } },
    { slug: 'yemen', name: { ru: 'Йемен', en: 'Yemen', es: 'Yemen', fr: 'Yémen' }, flag: { kind: 'bands', dir: 'h', bands: [{ color: '#ce1126' }, { color: '#ffffff' }, { color: '#000000' }] } },
    { slug: 'japan', name: { ru: 'Япония', en: 'Japan', es: 'Japón', fr: 'Japon' }, flag: { kind: 'disc', bg: '#ffffff', color: '#bc002d', r: 11 } },
    { slug: 'bangladesh', name: { ru: 'Бангладеш', en: 'Bangladesh', es: 'Bangladés', fr: 'Bangladesh' }, flag: { kind: 'disc', bg: '#006a4e', color: '#f42a41', r: 11, cx: 27 } },
  ],
  europe: [
    { slug: 'germany', name: { ru: 'Германия', en: 'Germany', es: 'Alemania', fr: 'Allemagne' }, flag: { kind: 'bands', dir: 'h', bands: [{ color: '#000000' }, { color: '#dd0000' }, { color: '#ffce00' }] } },
    { slug: 'france', name: { ru: 'Франция', en: 'France', es: 'Francia', fr: 'France' }, flag: { kind: 'bands', dir: 'v', bands: [{ color: '#0055a4' }, { color: '#ffffff' }, { color: '#ef4135' }] } },
    { slug: 'italy', name: { ru: 'Италия', en: 'Italy', es: 'Italia', fr: 'Italie' }, flag: { kind: 'bands', dir: 'v', bands: [{ color: '#009246' }, { color: '#ffffff' }, { color: '#ce2b37' }] } },
    { slug: 'ireland', name: { ru: 'Ирландия', en: 'Ireland', es: 'Irlanda', fr: 'Irlande' }, flag: { kind: 'bands', dir: 'v', bands: [{ color: '#169b62' }, { color: '#ffffff' }, { color: '#ff883e' }] } },
    { slug: 'belgium', name: { ru: 'Бельгия', en: 'Belgium', es: 'Bélgica', fr: 'Belgique' }, flag: { kind: 'bands', dir: 'v', bands: [{ color: '#000000' }, { color: '#fdda24' }, { color: '#ef3340' }] } },
    { slug: 'netherlands', name: { ru: 'Нидерланды', en: 'Netherlands', es: 'Países Bajos', fr: 'Pays-Bas' }, flag: { kind: 'bands', dir: 'h', bands: [{ color: '#ae1c28' }, { color: '#ffffff' }, { color: '#21468b' }] } },
  ],
  oceania: [
    { slug: 'palau', name: { ru: 'Палау', en: 'Palau', es: 'Palaos', fr: 'Palaos' }, flag: { kind: 'disc', bg: '#4aadd6', color: '#ffde00', r: 11, cx: 26 } },
    { slug: 'nauru', name: { ru: 'Науру', en: 'Nauru', es: 'Nauru', fr: 'Nauru' }, flag: { kind: 'bands', dir: 'h', bands: [{ color: '#002b7f', weight: 3 }, { color: '#ffc61e', weight: 1 }, { color: '#002b7f', weight: 3 }] } },
    { slug: 'australia', name: { ru: 'Австралия', en: 'Australia', es: 'Australia', fr: 'Australie' }, flag: { kind: 'canton', field: '#00008b' } },
    { slug: 'fiji', name: { ru: 'Фиджи', en: 'Fiji', es: 'Fiyi', fr: 'Fidji' }, flag: { kind: 'canton', field: '#68bfe5' } },
  ],
};
