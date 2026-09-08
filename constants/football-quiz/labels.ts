import { useSQLabels, type SQLabels } from '@/constants/sport-quiz/labels';
import { useLocale } from '@/hooks/use-locale';

/**
 * Football Quiz labels.
 *
 * The app reuses Sport Quiz's strings (same screens, same wording, already
 * translated into 4 locales) and overrides only what is genuinely different —
 * the second game mode, which is "Football Legends" here, not "Sports Legends".
 *
 * The home screen additionally needs each mode name SPLIT INTO ITS WORDS. The
 * two mode cards are half the screen wide, so a name has to sit on two lines,
 * and the split must never fall inside a word. Letting the layout wrap the text
 * is what produced "Классическ / ий" on device, so the break points are data,
 * not a rendering accident.
 */
const LEGENDS: Record<string, string> = {
  ru: 'Легенды футбола',
  en: 'Football Legends',
  es: 'Leyendas del fútbol',
  fr: 'Légendes du football',
};

/** [line 1, line 2] per mode. Measured to fit the card at MODE_FONT. */
const MODE_LINES: Record<string, { classic: [string, string]; legends: [string, string] }> = {
  ru: { classic: ['Классический', 'режим'], legends: ['Легенды', 'футбола'] },
  en: { classic: ['Classic', 'Mode'], legends: ['Football', 'Legends'] },
  es: { classic: ['Modo', 'clásico'], legends: ['Leyendas', 'del fútbol'] },
  fr: { classic: ['Mode', 'classique'], legends: ['Légendes', 'du football'] },
};

export function useFQLabels(): SQLabels {
  const t = useSQLabels();
  const { locale } = useLocale();
  return { ...t, modeLegends: LEGENDS[locale] ?? LEGENDS.en };
}

export function useFQModeLines() {
  const { locale } = useLocale();
  return MODE_LINES[locale] ?? MODE_LINES.en;
}
