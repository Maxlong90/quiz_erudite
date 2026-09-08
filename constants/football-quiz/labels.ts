import { useSQLabels, type SQLabels } from '@/constants/sport-quiz/labels';
import { useLocale } from '@/hooks/use-locale';

/**
 * Football Quiz labels.
 *
 * The app reuses Sport Quiz's strings (same screens, same wording, already
 * translated into 4 locales) and overrides only what is genuinely different.
 * Right now that is the second game mode: Sport Quiz calls it "Sports Legends",
 * Football Quiz calls it "Football Legends".
 *
 * When this app gets its own full translation table, drop the SQ import and move
 * the strings here.
 */
const LEGENDS: Record<string, string> = {
  ru: 'Легенды футбола',
  en: 'Football Legends',
  es: 'Leyendas del fútbol',
  fr: 'Légendes du football',
};

export function useFQLabels(): SQLabels {
  const t = useSQLabels();
  const { locale } = useLocale();
  return { ...t, modeLegends: LEGENDS[locale] ?? LEGENDS.en };
}
