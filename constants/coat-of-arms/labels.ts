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
  /** Help modal (the "?" button on the game screen): title, body, dismiss CTA. */
  helpTitle: string;
  helpBody: string;
  helpCta: string;
}

const EN: CoaLabels = {
  internationalSymbols: 'International symbols',
  cities: 'Cities',
  bonusLevel: 'Bonus level',
  version: 'Version',
  appName: 'Coat of Arms',
  quizPrompt: '',
  helpTitle: 'Review your mistakes',
  helpBody:
    'There are a lot of questions in this game. Every question you answer incorrectly is remembered — at the end of the run you can tap “Retry mistakes” to play just those again and review your mistakes. So nothing is lost: you can always go back and master the ones you missed.',
  helpCta: 'Got it',
};

const RU: CoaLabels = {
  internationalSymbols: 'Международная\nсимволика',
  cities: 'Города',
  bonusLevel: 'Бонус-уровень',
  version: 'Версия',
  appName: 'Гербы',
  quizPrompt: 'Какой стране\nпринадлежит этот герб?',
  helpTitle: 'Работа над ошибками',
  helpBody:
    'В игре много вопросов. Все вопросы, на которые вы ответили неправильно, запоминаются — в конце игры нажмите «Повторить ошибки», чтобы пройти именно их заново и сделать работу над ошибками. Ничего не теряется: вы всегда сможете вернуться и закрепить то, в чём ошиблись.',
  helpCta: 'Понятно',
};

const ES: CoaLabels = {
  internationalSymbols: 'Símbolos internacionales',
  cities: 'Ciudades',
  bonusLevel: 'Nivel bonus',
  version: 'Versión',
  appName: 'Escudos',
  quizPrompt: '',
  helpTitle: 'Repaso de errores',
  helpBody:
    'Hay muchas preguntas en este juego. Cada pregunta que respondas mal se guarda: al terminar la partida puedes pulsar «Repetir errores» para volver a jugar solo esas y repasar tus fallos. Nada se pierde: siempre podrás volver y dominar las que fallaste.',
  helpCta: 'Entendido',
};

const FR: CoaLabels = {
  internationalSymbols: 'Symboles internationaux',
  cities: 'Villes',
  bonusLevel: 'Niveau bonus',
  version: 'Version',
  appName: 'Blasons',
  quizPrompt: '',
  helpTitle: 'Révision des erreurs',
  helpBody:
    'Ce jeu comporte beaucoup de questions. Chaque question à laquelle vous répondez mal est mémorisée : à la fin de la partie, appuyez sur « Revoir les erreurs » pour rejouer uniquement celles-ci et corriger vos erreurs. Rien n’est perdu : vous pourrez toujours revenir et maîtriser celles que vous avez ratées.',
  helpCta: 'Compris',
};

const TABLE: Record<SupportedLocale, CoaLabels> = { en: EN, ru: RU, es: ES, fr: FR };

export function useCoaLabels(): CoaLabels {
  const { locale } = useLocale();
  return TABLE[locale] ?? EN;
}
