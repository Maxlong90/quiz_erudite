/**
 * UI strings for the Flags Quiz module (App Template: Geography), kept local to
 * the feature (en/ru/es) — mirrors the Logo Quiz labels pattern. Screen chrome
 * only; quiz content comes from the backend snapshot. Picked by the app's
 * active locale via useFQLabels().
 */
import { useLocale, type SupportedLocale } from '@/hooks/use-locale';

export interface FQLabels {
  appName: string;
  /** Onboarding splash tagline under the QUIZZZES wordmark. */
  tagline: string;
  play: string;
  shop: string;
  settings: string;
  // Play screen
  allCountries: string;
  byContinents: string;
  challenge: string;
  drawFlag: string;
  maps: string;
  otherApps: string;
  comingSoon: string;
  whichCountry: string;
  shareInvite: string;
  // Continents screen
  questions: string;
  africa: string;
  northAmerica: string;
  southAmerica: string;
  asia: string;
  europe: string;
  oceania: string;
  // Settings screen
  cancelSubscription: string;
  restorePurchases: string;
  selectLanguage: string;
  rateApp: string;
  contactSupport: string;
  privacyPolicy: string;
  termsOfUse: string;
  // Restore-purchases result alerts
  restoreDoneTitle: string;
  restoreDoneMessage: string;
  restoreNoneTitle: string;
  restoreNoneMessage: string;
  restoreErrorTitle: string;
  restoreErrorMessage: string;
  ok: string;
  // Result screen (shown after all questions are answered)
  resultTitle: string;
  resultCaption: string;
  resultExcellent: string;
  resultGood: string;
  resultKeepGoing: string;
  playAgain: string;
  retryMistakes: string;
  backHome: string;
  // Gameplay
  tapToContinue: string;
  next: string;
  // Help modal (explains the retry-mistakes / "work on mistakes" flow)
  helpTitle: string;
  helpBody: string;
  gotIt: string;
  // Settings — app version line
  version: string;
}

const EN: FQLabels = {
  appName: 'Flags Quiz',
  tagline: 'Train your brain!',
  play: 'Play',
  shop: 'Shop',
  settings: 'Settings',
  allCountries: 'All countries',
  byContinents: 'By continent',
  challenge: 'Challenge',
  drawFlag: 'Draw a flag',
  maps: 'Maps',
  otherApps: 'Other apps',
  comingSoon: 'Available soon',
  whichCountry: 'Which country\nis this flag?',
  shareInvite: 'Can you guess the flags? Play Flags Quiz: {url}',
  questions: 'Questions',
  africa: 'Africa',
  northAmerica: 'North America',
  southAmerica: 'South America',
  asia: 'Asia',
  europe: 'Europe',
  oceania: 'Oceania',
  cancelSubscription: 'Cancel Subscription',
  restorePurchases: 'Restore Purchases',
  selectLanguage: 'Language',
  rateApp: 'Rate the App',
  contactSupport: 'Contact Support',
  privacyPolicy: 'Privacy Policy',
  termsOfUse: 'Terms of Use',
  restoreDoneTitle: 'Purchases Restored',
  restoreDoneMessage: 'Your premium access has been restored.',
  restoreNoneTitle: 'Nothing to Restore',
  restoreNoneMessage: 'We couldn’t find any previous purchases.',
  restoreErrorTitle: 'Restore Failed',
  restoreErrorMessage: 'Something went wrong. Please try again later.',
  ok: 'OK',
  resultTitle: 'Results',
  resultCaption: 'Correct answers',
  resultExcellent: 'Excellent! You really know your flags.',
  resultGood: 'Nicely done — keep it up!',
  resultKeepGoing: 'Keep practising, you’ll get there!',
  playAgain: 'Play again',
  retryMistakes: 'Retry mistakes',
  backHome: 'Home',
  tapToContinue: 'Tap to continue',
  next: 'Next',
  helpTitle: 'Work on your mistakes',
  helpBody:
    'There are a lot of flags to learn — you don’t have to get them all right at once! Every flag you answer incorrectly is remembered, and at the end of the round you can retry just those flags: a "work on your mistakes" round. So don’t worry about slip-ups — you’ll be able to go over the ones you missed and learn them for good.',
  gotIt: 'Got it',
  version: 'Version',
};

const RU: FQLabels = {
  appName: 'Флаги',
  tagline: 'Прокачай мозг!',
  play: 'Играть',
  shop: 'Магазин',
  settings: 'Настройки',
  allCountries: 'Все страны',
  byContinents: 'По континентам',
  challenge: 'Челлендж',
  drawFlag: 'Нарисовать флаг',
  maps: 'Карты',
  otherApps: 'Другие приложения',
  comingSoon: 'Будет доступно в скором времени',
  whichCountry: 'Какой стране\nпринадлежит этот флаг?',
  shareInvite: 'Угадаешь флаги? Играй в Flags Quiz: {url}',
  questions: 'Вопросов',
  africa: 'Африка',
  northAmerica: 'Северная Америка',
  southAmerica: 'Южная Америка',
  asia: 'Азия',
  europe: 'Европа',
  oceania: 'Океания',
  cancelSubscription: 'Отменить подписку',
  restorePurchases: 'Восстановить покупки',
  selectLanguage: 'Язык',
  rateApp: 'Оценить приложение',
  contactSupport: 'Связаться с поддержкой',
  privacyPolicy: 'Политика конфиденциальности',
  termsOfUse: 'Условия использования',
  restoreDoneTitle: 'Покупки восстановлены',
  restoreDoneMessage: 'Ваш премиум-доступ восстановлен.',
  restoreNoneTitle: 'Нечего восстанавливать',
  restoreNoneMessage: 'Мы не нашли предыдущих покупок.',
  restoreErrorTitle: 'Ошибка восстановления',
  restoreErrorMessage: 'Что-то пошло не так. Попробуйте позже.',
  ok: 'ОК',
  resultTitle: 'Результат',
  resultCaption: 'Правильных ответов',
  resultExcellent: 'Отлично! Ты прекрасно знаешь флаги.',
  resultGood: 'Хорошо — так держать!',
  resultKeepGoing: 'Продолжай тренироваться, всё получится!',
  playAgain: 'Пройти заново',
  retryMistakes: 'Повторить ошибки',
  backHome: 'На главную',
  tapToContinue: 'Нажми, чтобы продолжить',
  next: 'Далее',
  helpTitle: 'Работа над ошибками',
  helpBody:
    'Флагов очень много, и не обязательно угадывать все сразу! Каждый флаг, в котором ты ошибся, запоминается, и в конце раунда ты сможешь пройти работу над ошибками — заново ответить только на те вопросы, где ошибся. Так что не переживай из-за промахов: ты сможешь перепройти пропущенные флаги и запомнить их окончательно.',
  gotIt: 'Понятно',
  version: 'Версия',
};

const ES: FQLabels = {
  appName: 'Quiz de Banderas',
  tagline: '¡Entrena tu mente!',
  play: 'Jugar',
  shop: 'Tienda',
  settings: 'Ajustes',
  allCountries: 'Todos los países',
  byContinents: 'Por continentes',
  challenge: 'Reto',
  drawFlag: 'Dibujar bandera',
  maps: 'Mapas',
  otherApps: 'Otras apps',
  comingSoon: 'Disponible próximamente',
  whichCountry: '¿De qué país\nes esta bandera?',
  shareInvite: '¿Adivinas las banderas? Juega a Flags Quiz: {url}',
  questions: 'Preguntas',
  africa: 'África',
  northAmerica: 'América del Norte',
  southAmerica: 'América del Sur',
  asia: 'Asia',
  europe: 'Europa',
  oceania: 'Oceanía',
  cancelSubscription: 'Cancelar suscripción',
  restorePurchases: 'Restaurar compras',
  selectLanguage: 'Idioma',
  rateApp: 'Valorar la app',
  contactSupport: 'Contactar soporte',
  privacyPolicy: 'Política de privacidad',
  termsOfUse: 'Términos de uso',
  restoreDoneTitle: 'Compras restauradas',
  restoreDoneMessage: 'Tu acceso premium ha sido restaurado.',
  restoreNoneTitle: 'Nada que restaurar',
  restoreNoneMessage: 'No encontramos compras anteriores.',
  restoreErrorTitle: 'Error al restaurar',
  restoreErrorMessage: 'Algo salió mal. Inténtalo más tarde.',
  ok: 'OK',
  resultTitle: 'Resultado',
  resultCaption: 'Respuestas correctas',
  resultExcellent: '¡Excelente! Conoces muy bien las banderas.',
  resultGood: '¡Bien hecho, sigue así!',
  resultKeepGoing: '¡Sigue practicando, lo lograrás!',
  playAgain: 'Jugar de nuevo',
  retryMistakes: 'Repetir errores',
  backHome: 'Inicio',
  tapToContinue: 'Toca para continuar',
  next: 'Siguiente',
  helpTitle: 'Repaso de errores',
  helpBody:
    '¡Hay muchísimas banderas por aprender y no tienes que acertarlas todas de una vez! Cada bandera que falles se guarda y, al terminar la ronda, podrás repetir solo esas banderas: un repaso de tus errores. Así que no te preocupes por los fallos: podrás volver a ver las que fallaste y memorizarlas de una vez.',
  gotIt: 'Entendido',
  version: 'Versión',
};

const FR: FQLabels = {
  appName: 'Quiz des Drapeaux',
  tagline: 'Entraîne ton cerveau !',
  play: 'Jouer',
  shop: 'Boutique',
  settings: 'Réglages',
  allCountries: 'Tous les pays',
  byContinents: 'Par continent',
  challenge: 'Défi',
  drawFlag: 'Dessiner un drapeau',
  maps: 'Cartes',
  otherApps: 'Autres applis',
  comingSoon: 'Bientôt disponible',
  whichCountry: 'À quel pays\nappartient ce drapeau ?',
  shareInvite: 'Sauras-tu deviner les drapeaux ? Joue à Flags Quiz : {url}',
  questions: 'Questions',
  africa: 'Afrique',
  northAmerica: 'Amérique du Nord',
  southAmerica: 'Amérique du Sud',
  asia: 'Asie',
  europe: 'Europe',
  oceania: 'Océanie',
  cancelSubscription: 'Annuler l’abonnement',
  restorePurchases: 'Restaurer les achats',
  selectLanguage: 'Langue',
  rateApp: 'Noter l’application',
  contactSupport: 'Contacter le support',
  privacyPolicy: 'Politique de confidentialité',
  termsOfUse: 'Conditions d’utilisation',
  restoreDoneTitle: 'Achats restaurés',
  restoreDoneMessage: 'Votre accès premium a été restauré.',
  restoreNoneTitle: 'Rien à restaurer',
  restoreNoneMessage: 'Nous n’avons trouvé aucun achat précédent.',
  restoreErrorTitle: 'Échec de la restauration',
  restoreErrorMessage: 'Une erreur est survenue. Réessayez plus tard.',
  ok: 'OK',
  resultTitle: 'Résultats',
  resultCaption: 'Bonnes réponses',
  resultExcellent: 'Excellent ! Tu connais vraiment tes drapeaux.',
  resultGood: 'Bien joué — continue comme ça !',
  resultKeepGoing: 'Continue à t’entraîner, tu vas y arriver !',
  playAgain: 'Rejouer',
  retryMistakes: 'Revoir les erreurs',
  backHome: 'Accueil',
  tapToContinue: 'Touche pour continuer',
  next: 'Suivant',
  helpTitle: 'Travail sur les erreurs',
  helpBody:
    'Il y a énormément de drapeaux à apprendre — pas besoin de tous les réussir d’un coup ! Chaque drapeau raté est mémorisé et, à la fin de la manche, tu pourras revoir uniquement ces drapeaux : un travail sur tes erreurs. Ne t’inquiète donc pas des ratés : tu pourras repasser ceux que tu as manqués et les mémoriser définitivement.',
  gotIt: 'Compris',
  version: 'Version',
};

const TABLE: Record<SupportedLocale, FQLabels> = { en: EN, ru: RU, es: ES, fr: FR };

/** Each language shown in its own name, regardless of the active locale. */
export const FQ_LANGUAGE_NAMES: Record<SupportedLocale, string> = {
  en: 'English',
  ru: 'Русский',
  es: 'Español',
  fr: 'Français',
};

export function useFQLabels(): FQLabels {
  const { locale } = useLocale();
  return TABLE[locale] ?? EN;
}
