/**
 * UI strings for the Italy Quiz module (App Template: World), kept local to the
 * feature (en/ru/es/fr) — mirrors the Flags Quiz labels pattern. Screen chrome
 * only. Picked by the app's active
 * locale via useItalyLabels(). Quiz content itself lives in constants/italy-quiz/questions.
 */
import { useLocale, type SupportedLocale } from '@/hooks/use-locale';

export interface ItalyLabels {
  appName: string;
  /** Onboarding splash tagline under the QUIZZZES wordmark. */
  tagline: string;
  play: string;
  settings: string;
  /** Title of the category picker screen (Play → categories). */
  categories: string;
  // Place picker + tour intro
  /** Title of the place picker (Play → places). */
  whereTo: string;
  /** Prompt under the map before any pin is selected. */
  pickOnMap: string;
  /** Sublabel on a place that has no questions authored yet. */
  comingSoon: string;
  /** Starts the tour from the intro card. */
  startTour: string;
  /** Header of the ribbon reminding the player of an earlier question. */
  callbackThen: string;
  // Stars
  /** Nudges toward the next star band, by how many are already earned. */
  starHint1: string;
  starHint2: string;
  starHint3: string;
  /** Best result so far — `{stars}` and `{pct}` are substituted. */
  bestResult: string;
  // Estimate questions (notched slider)
  /** Locks in the notch the player stopped on. */
  scaleConfirm: string;
  /** Hints under a slider whose axis is time. */
  axisEarlier: string;
  axisLater: string;
  /** Hints under a slider whose axis is a quantity. */
  axisLess: string;
  axisMore: string;
  // Settings screen
  selectLanguage: string;
  rateApp: string;
  contactSupport: string;
  privacyPolicy: string;
  termsOfUse: string;
  version: string;
  ok: string;
  // Quiz screen
  next: string;
  finish: string;
  loadingContent: string;
  noQuestions: string;
  resultTitle: string;
  resultCaption: string;
  resultExcellent: string;
  resultGood: string;
  resultKeepGoing: string;
  playAgain: string;
  backToCategories: string;
  retryMistakes: string;
  helpTitle: string;
  helpBody: string;
  gotIt: string;
  shareInvite: string;
}

const EN: ItalyLabels = {
  appName: 'Italy Quiz',
  tagline: 'Train your brain!',
  play: 'Play',
  settings: 'Settings',
  categories: 'Categories',
  whereTo: 'Where to?',
  pickOnMap: 'Tap a pin on the map',
  comingSoon: 'coming soon',
  startTour: "Let's go",
  callbackThen: 'BACK THEN',
  starHint1: 'Half right earns your first star.',
  starHint2: '80% earns a second star.',
  starHint3: 'A clean run earns all three.',
  bestResult: 'Best here: {stars}★ · {pct}%',
  scaleConfirm: 'Answer',
  axisEarlier: 'earlier',
  axisLater: 'later',
  axisLess: 'less',
  axisMore: 'more',
  selectLanguage: 'Language',
  rateApp: 'Rate the App',
  contactSupport: 'Contact Support',
  privacyPolicy: 'Privacy Policy',
  termsOfUse: 'Terms of Use',
  version: 'Version',
  ok: 'OK',
  next: 'Next',
  finish: 'Finish',
  loadingContent: 'Loading questions…',
  noQuestions: 'No questions here yet.',
  resultTitle: 'Results',
  resultCaption: 'Correct answers',
  resultExcellent: 'Excellent! You really know Italy.',
  resultGood: 'Nicely done — keep it up!',
  resultKeepGoing: 'Keep practising, you’ll get there!',
  playAgain: 'Play again',
  backToCategories: 'Categories',
  retryMistakes: 'Review mistakes',
  helpTitle: 'Review your mistakes',
  helpBody:
    'A wrong answer never reveals the right one — you simply move on to the next question. Every question you miss is remembered, and at the end of the run you can tap “Review mistakes” to replay just those. Nothing is lost: you can always come back and master the ones you missed.',
  gotIt: 'Got it',
  shareInvite: 'How well do you know Italy? Play Italy Quiz: {url}',
};

const RU: ItalyLabels = {
  appName: 'Викторина Италия',
  tagline: 'Прокачай мозг!',
  play: 'Играть',
  settings: 'Настройки',
  categories: 'Категории',
  whereTo: 'Куда поедем?',
  pickOnMap: 'Выберите точку на карте',
  comingSoon: 'скоро',
  startTour: 'Поехали',
  callbackThen: 'ТОГДА',
  starHint1: 'Половина правильных — первая звезда.',
  starHint2: '80% правильных — вторая звезда.',
  starHint3: 'Без единой ошибки — все три.',
  bestResult: 'Лучший результат: {stars}★ · {pct}%',
  scaleConfirm: 'Ответить',
  axisEarlier: 'раньше',
  axisLater: 'позже',
  axisLess: 'меньше',
  axisMore: 'больше',
  selectLanguage: 'Язык',
  rateApp: 'Оценить приложение',
  contactSupport: 'Связаться с поддержкой',
  privacyPolicy: 'Политика конфиденциальности',
  termsOfUse: 'Условия использования',
  version: 'Версия',
  ok: 'ОК',
  next: 'Далее',
  finish: 'Завершить',
  loadingContent: 'Загружаем вопросы…',
  noQuestions: 'Здесь пока нет вопросов.',
  resultTitle: 'Результат',
  resultCaption: 'Правильных ответов',
  resultExcellent: 'Отлично! Вы прекрасно знаете Италию.',
  resultGood: 'Хорошо — так держать!',
  resultKeepGoing: 'Продолжайте тренироваться, всё получится!',
  playAgain: 'Играть снова',
  backToCategories: 'Категории',
  retryMistakes: 'Работа над ошибками',
  helpTitle: 'Работа над ошибками',
  helpBody:
    'При неправильном ответе правильный не показывается — вы просто переходите к следующему вопросу. Все вопросы, в которых вы ошиблись, запоминаются, и в конце игры можно нажать «Работа над ошибками», чтобы пройти именно их заново. Ничего не теряется: вы всегда сможете вернуться и закрепить то, что не угадали.',
  gotIt: 'Понятно',
  shareInvite: 'Хорошо знаешь Италию? Играй в Italy Quiz: {url}',
};

const ES: ItalyLabels = {
  appName: 'Quiz de Italia',
  tagline: '¡Entrena tu mente!',
  play: 'Jugar',
  settings: 'Ajustes',
  categories: 'Categorías',
  whereTo: '¿A dónde vamos?',
  pickOnMap: 'Toca un punto del mapa',
  comingSoon: 'próximamente',
  startTour: 'Vamos',
  callbackThen: 'ENTONCES',
  starHint1: 'La mitad acertada da la primera estrella.',
  starHint2: 'El 80% da la segunda estrella.',
  starHint3: 'Sin fallos, las tres.',
  bestResult: 'Mejor aquí: {stars}★ · {pct}%',
  scaleConfirm: 'Responder',
  axisEarlier: 'antes',
  axisLater: 'después',
  axisLess: 'menos',
  axisMore: 'más',
  selectLanguage: 'Idioma',
  rateApp: 'Valorar la app',
  contactSupport: 'Contactar soporte',
  privacyPolicy: 'Política de privacidad',
  termsOfUse: 'Términos de uso',
  version: 'Versión',
  ok: 'OK',
  next: 'Siguiente',
  finish: 'Finalizar',
  loadingContent: 'Cargando preguntas…',
  noQuestions: 'Aún no hay preguntas aquí.',
  resultTitle: 'Resultado',
  resultCaption: 'Respuestas correctas',
  resultExcellent: '¡Excelente! Conoces muy bien Italia.',
  resultGood: '¡Bien hecho, sigue así!',
  resultKeepGoing: '¡Sigue practicando, lo lograrás!',
  playAgain: 'Jugar de nuevo',
  backToCategories: 'Categorías',
  retryMistakes: 'Repasar errores',
  helpTitle: 'Repaso de errores',
  helpBody:
    'Una respuesta incorrecta nunca revela la correcta: simplemente pasas a la siguiente pregunta. Cada pregunta que falles se guarda y, al terminar la partida, puedes pulsar «Repasar errores» para jugar solo esas. Nada se pierde: siempre podrás volver y dominar las que fallaste.',
  gotIt: 'Entendido',
  shareInvite: '¿Conoces bien Italia? Juega a Italy Quiz: {url}',
};

const FR: ItalyLabels = {
  appName: 'Quiz Italie',
  tagline: 'Entraîne ton cerveau !',
  play: 'Jouer',
  settings: 'Réglages',
  categories: 'Catégories',
  whereTo: 'On va où ?',
  pickOnMap: 'Touchez un point sur la carte',
  comingSoon: 'bientôt',
  startTour: 'C’est parti',
  callbackThen: 'À L’ÉPOQUE',
  starHint1: 'La moitié donne la première étoile.',
  starHint2: '80% donne la deuxième étoile.',
  starHint3: 'Sans faute, les trois.',
  bestResult: 'Meilleur ici : {stars}★ · {pct}%',
  scaleConfirm: 'Répondre',
  axisEarlier: 'plus tôt',
  axisLater: 'plus tard',
  axisLess: 'moins',
  axisMore: 'plus',
  selectLanguage: 'Langue',
  rateApp: 'Noter l’application',
  contactSupport: 'Contacter le support',
  privacyPolicy: 'Politique de confidentialité',
  termsOfUse: 'Conditions d’utilisation',
  version: 'Version',
  ok: 'OK',
  next: 'Suivant',
  finish: 'Terminer',
  loadingContent: 'Chargement des questions…',
  noQuestions: 'Pas encore de questions ici.',
  resultTitle: 'Résultats',
  resultCaption: 'Bonnes réponses',
  resultExcellent: 'Excellent ! Vous connaissez bien l’Italie.',
  resultGood: 'Bien joué — continuez comme ça !',
  resultKeepGoing: 'Continuez à vous entraîner, vous y arriverez !',
  playAgain: 'Rejouer',
  backToCategories: 'Catégories',
  retryMistakes: 'Revoir les erreurs',
  helpTitle: 'Travail sur les erreurs',
  helpBody:
    'Une mauvaise réponse ne révèle jamais la bonne : vous passez simplement à la question suivante. Chaque question ratée est mémorisée et, à la fin de la partie, vous pouvez appuyer sur « Revoir les erreurs » pour rejouer uniquement celles-ci. Rien n’est perdu : vous pourrez toujours revenir et maîtriser celles que vous avez ratées.',
  gotIt: 'Compris',
  shareInvite: 'Connaissez-vous bien l’Italie ? Jouez à Italy Quiz : {url}',
};

const TABLE: Record<SupportedLocale, ItalyLabels> = { en: EN, ru: RU, es: ES, fr: FR };

export function useItalyLabels(): ItalyLabels {
  const { locale } = useLocale();
  return TABLE[locale] ?? EN;
}
