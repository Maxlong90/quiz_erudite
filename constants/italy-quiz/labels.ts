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
  // Circles
  /** The place card's entry button — `{n}` is the circle number. */
  circleLabel: string;
  /** Same, when the circle has already been cleared. */
  circleReplayLabel: string;
  /** Entry button when the place is open but has no circle left to draw. */
  circlesSoonCta: string;
  /**
   * Line 1 of the entry button on a city the chain has not opened yet: how many
   * circles of the GATE city are still to be cleared, `{n}` substituted. Line 2
   * is the gate city's name, appended by the caller with a "\n" — two lines
   * because one ran under the padlock, and because the requirement and the
   * place to go are two different facts.
   *
   * Three forms, not one string, because the count is live (1..5) and Russian
   * inflects "круг" on it. Pick with pickPlural() below.
   */
  cityLockedNeed: { one: string; few: string; many: string };
  /** Shown instead of the tour when a circle's questions are not written yet. */
  circleSoon: string;
  /** Result screen — whether the 10-of-20 gate was met. */
  circlePassed: string;
  circleNotPassed: string;
  /** Result screen — what clearing the circle opened. `{n}` / `{place}`. */
  unlockedCircle: string;
  unlockedCity: string;
  /** Result screen — back to the map. */
  continueOn: string;
  // Stars
  /** Nudges toward the next star band, by how many are already earned. */
  starHint2: string;
  starHint3: string;
  /** Best on this circle — `{stars}` and `{pct}` are substituted. */
  bestResult: string;
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
  retryMistakes: string;
  // Help sheet — a lede plus four titled sections.
  helpTitle: string;
  helpBody: string;
  helpCirclesTitle: string;
  helpCirclesBody: string;
  helpStarsTitle: string;
  helpStarsBody: string;
  helpUnlockTitle: string;
  helpUnlockBody: string;
  helpMistakesTitle: string;
  helpMistakesBody: string;
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
  circleLabel: 'Circle {n}',
  circleReplayLabel: 'Circle {n} · again',
  circlesSoonCta: 'Questions still being written',
  cityLockedNeed: {
    one: 'Clear {n} more circle',
    few: 'Clear {n} more circles',
    many: 'Clear {n} more circles',
  },
  circleSoon: 'The questions for this circle are still being written.',
  circlePassed: 'Circle cleared!',
  circleNotPassed: 'You need 10 correct out of 20 to clear a circle.',
  unlockedCircle: 'Circle {n} unlocked',
  // Never inflects around the name — see the Russian note below.
  unlockedCity: 'New city on the map: {place}',
  continueOn: 'Continue',
  starHint2: '80% correct earns a second star.',
  starHint3: 'A clean run earns all three stars.',
  bestResult: 'Best on this circle: {stars}★ · {pct}%',
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
  retryMistakes: 'Review mistakes',
  helpTitle: 'How it works',
  helpBody:
    'The map of Italy is a set of cities. Each city holds 10 circles, and each circle is one tour of 20 questions.',
  helpCirclesTitle: 'A circle is 20 questions',
  helpCirclesBody:
    'A circle is twenty questions — five from each of the tour’s four acts. A circle’s set is fixed: however many times you replay it, it is the same twenty. New questions wait in the next circle.',
  helpStarsTitle: 'Stars and the pass mark',
  helpStarsBody:
    'Get ten of twenty right and the circle is cleared — that is your first star. Sixteen of twenty (80%) earns a second, a clean twenty earns a third. Stars are kept at your best, so a weak replay can never take away what you already won. On the map each city carries the sum of the stars of all its circles — thirty at most.',
  helpUnlockTitle: 'What opens next',
  helpUnlockBody:
    'Clearing a circle opens the next one. And clearing five circles of a city puts a new city on the map, along the route Rome → Florence → Venice → Sicily → Naples → Milan → All of Italy. A circle with a padlock is simply waiting for you to clear the one before it. A faded circle with no padlock is not a restriction — its questions are still being written, and it will open by itself once they are ready.',
  helpMistakesTitle: 'Review your mistakes',
  helpMistakesBody:
    'A wrong answer never reveals the right one — you simply move on. Every question you miss is remembered, and at the end of a circle you can tap “Review mistakes” to replay just those. It is practice: it earns no stars and does not change the circle’s result.',
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
  circleLabel: 'Круг {n}',
  circleReplayLabel: 'Круг {n} · ещё раз',
  circlesSoonCta: 'Вопросы ещё пишутся',
  // Название города здесь не склоняется вовсе: оно уезжает на вторую строку
  // кнопки отдельной подписью, в именительном падеже, как на карте.
  cityLockedNeed: {
    one: 'Пройдите ещё {n} круг',
    few: 'Пройдите ещё {n} круга',
    many: 'Пройдите ещё {n} кругов',
  },
  circleSoon: 'Вопросы для этого круга ещё готовятся.',
  circlePassed: 'Круг пройден!',
  circleNotPassed: 'Чтобы пройти круг, нужно 10 правильных из 20.',
  unlockedCircle: 'Открылся круг {n}',
  // НЕ «Открылась {place}»: род привязан к названию, и на «Рим» фраза ломается.
  // Именительный после двоеточия работает для любого города.
  unlockedCity: 'Новый город на карте: {place}',
  continueOn: 'Дальше',
  starHint2: '80% правильных — и будет вторая звезда.',
  starHint3: 'Без единой ошибки — все три звезды.',
  bestResult: 'Лучший результат круга: {stars}★ · {pct}%',
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
  retryMistakes: 'Работа над ошибками',
  helpTitle: 'Как это устроено',
  helpBody:
    'Италия на карте — это города. В каждом городе 10 кругов, и каждый круг — это одна экскурсия на 20 вопросов.',
  helpCirclesTitle: 'Круг — это 20 вопросов',
  helpCirclesBody:
    'Круг состоит из двадцати вопросов: по пять в каждом из четырёх актов экскурсии. Набор у круга постоянный: сколько бы раз вы его ни переиграли, это будут те же двадцать вопросов. Новые ждут в следующем круге.',
  helpStarsTitle: 'Звёзды и проходной балл',
  helpStarsBody:
    'Десять правильных из двадцати — круг пройден, это первая звезда. Шестнадцать из двадцати (80%) — вторая, все двадцать — третья. Звёзды сохраняются по лучшему результату, поэтому слабая переигровка никогда не отнимет заработанное. На карте у каждого города стоит сумма звёзд всех его кругов — максимум тридцать.',
  helpUnlockTitle: 'Что открывается дальше',
  helpUnlockBody:
    'Пройденный круг открывает следующий. А пять пройденных кругов города открывают на карте новый город — по маршруту Рим → Флоренция → Венеция → Сицилия → Неаполь → Милан → Вся Италия. Кружок с замком просто ждёт, пока вы пройдёте предыдущий. А блёклый кружок без замка — это не запрет: вопросы для него ещё пишутся, и он откроется сам, когда они будут готовы.',
  helpMistakesTitle: 'Работа над ошибками',
  helpMistakesBody:
    'При неправильном ответе правильный не показывается — вы просто идёте дальше. Все вопросы, где вы ошиблись, запоминаются, и в конце круга можно нажать «Работа над ошибками» и пройти именно их. Это тренировка: звёзд она не даёт и результат круга не меняет.',
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
  circleLabel: 'Círculo {n}',
  circleReplayLabel: 'Círculo {n} · otra vez',
  circlesSoonCta: 'Preguntas en preparación',
  cityLockedNeed: {
    one: 'Supera {n} círculo más',
    few: 'Supera {n} círculos más',
    many: 'Supera {n} círculos más',
  },
  circleSoon: 'Las preguntas de este círculo aún se están escribiendo.',
  circlePassed: '¡Círculo superado!',
  circleNotPassed: 'Necesitas 10 aciertos de 20 para superar el círculo.',
  unlockedCircle: 'Círculo {n} desbloqueado',
  // Dos puntos y el nombre: evita tener que concordar «abierta/abierto».
  unlockedCity: 'Nueva ciudad en el mapa: {place}',
  continueOn: 'Continuar',
  starHint2: 'Un 80% de aciertos da la segunda estrella.',
  starHint3: 'Sin fallos, las tres estrellas.',
  bestResult: 'Mejor en este círculo: {stars}★ · {pct}%',
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
  retryMistakes: 'Repasar errores',
  helpTitle: 'Cómo funciona',
  helpBody:
    'El mapa de Italia son ciudades. Cada ciudad tiene 10 círculos, y cada círculo es un recorrido de 20 preguntas.',
  helpCirclesTitle: 'Un círculo son 20 preguntas',
  helpCirclesBody:
    'Un círculo son veinte preguntas: cinco de cada uno de los cuatro actos del recorrido. El conjunto de un círculo es fijo: por muchas veces que lo repitas, serán las mismas veinte. Las preguntas nuevas te esperan en el círculo siguiente.',
  helpStarsTitle: 'Estrellas y el aprobado',
  helpStarsBody:
    'Con diez aciertos de veinte el círculo queda superado: esa es la primera estrella. Dieciséis de veinte (80%) dan la segunda, y un veinte de veinte impecable da la tercera. Las estrellas se guardan por tu mejor resultado, así que una repetición floja nunca te quita lo ya ganado. En el mapa, cada ciudad lleva la suma de las estrellas de todos sus círculos: treinta como máximo.',
  helpUnlockTitle: 'Qué se abre después',
  helpUnlockBody:
    'Superar un círculo abre el siguiente. Y superar cinco círculos de una ciudad pone una ciudad nueva en el mapa, siguiendo la ruta Roma → Florencia → Venecia → Sicilia → Nápoles → Milán → Toda Italia. Un círculo con candado solo espera a que superes el anterior. Un círculo apagado y sin candado no es una restricción: sus preguntas aún se están escribiendo y se abrirá solo cuando estén listas.',
  helpMistakesTitle: 'Repaso de errores',
  helpMistakesBody:
    'Una respuesta incorrecta nunca revela la correcta: simplemente sigues adelante. Cada pregunta que falles se guarda y, al terminar el círculo, puedes pulsar «Repasar errores» para jugar solo esas. Es entrenamiento: no da estrellas ni cambia el resultado del círculo.',
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
  circleLabel: 'Cercle {n}',
  circleReplayLabel: 'Cercle {n} · encore',
  circlesSoonCta: 'Questions en préparation',
  // «Encore …» rather than «Réussissez encore …»: the verb pushed the line past
  // what the button can shrink to on a 360dp phone, and a countdown reads
  // naturally without it. The other three locales keep their verb — they fit.
  cityLockedNeed: {
    one: 'Encore {n} cercle',
    few: 'Encore {n} cercles',
    many: 'Encore {n} cercles',
  },
  circleSoon: 'Les questions de ce cercle sont encore en cours d’écriture.',
  circlePassed: 'Cercle réussi !',
  circleNotPassed: 'Il faut 10 bonnes réponses sur 20 pour réussir le cercle.',
  unlockedCircle: 'Cercle {n} débloqué',
  // Deux-points puis le nom : évite d’accorder « ouvert/ouverte ».
  unlockedCity: 'Nouvelle ville sur la carte : {place}',
  continueOn: 'Continuer',
  starHint2: '80 % de bonnes réponses donnent la deuxième étoile.',
  starHint3: 'Sans faute, les trois étoiles.',
  bestResult: 'Meilleur sur ce cercle : {stars}★ · {pct}%',
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
  retryMistakes: 'Revoir les erreurs',
  helpTitle: 'Comment ça marche',
  helpBody:
    'La carte d’Italie, ce sont des villes. Chaque ville compte 10 cercles, et chaque cercle est une visite de 20 questions.',
  helpCirclesTitle: 'Un cercle, c’est 20 questions',
  helpCirclesBody:
    'Un cercle, ce sont vingt questions : cinq dans chacun des quatre actes de la visite. Le contenu d’un cercle est figé : peu importe combien de fois vous le rejouez, ce sont les mêmes vingt. Les nouvelles questions vous attendent au cercle suivant.',
  helpStarsTitle: 'Les étoiles et la barre de réussite',
  helpStarsBody:
    'Dix bonnes réponses sur vingt et le cercle est réussi : c’est votre première étoile. Seize sur vingt (80 %) en donnent une deuxième, un sans-faute de vingt en donne une troisième. Les étoiles sont conservées à votre meilleur score : une reprise ratée ne vous enlèvera jamais ce qui est acquis. Sur la carte, chaque ville porte la somme des étoiles de tous ses cercles — trente au maximum.',
  helpUnlockTitle: 'Ce qui s’ouvre ensuite',
  helpUnlockBody:
    'Réussir un cercle ouvre le suivant. Et réussir cinq cercles d’une ville fait apparaître une nouvelle ville sur la carte, le long de l’itinéraire Rome → Florence → Venise → Sicile → Naples → Milan → Toute l’Italie. Un cercle avec un cadenas attend simplement que vous réussissiez le précédent. Un cercle pâle et sans cadenas n’est pas un verrou : ses questions sont encore en cours d’écriture, et il s’ouvrira tout seul quand elles seront prêtes.',
  helpMistakesTitle: 'Revoir les erreurs',
  helpMistakesBody:
    'Une mauvaise réponse ne révèle jamais la bonne : vous passez simplement à la suite. Chaque question ratée est mémorisée et, à la fin du cercle, vous pouvez appuyer sur « Revoir les erreurs » pour rejouer uniquement celles-ci. C’est de l’entraînement : cela ne rapporte pas d’étoiles et ne change pas le résultat du cercle.',
  gotIt: 'Compris',
  shareInvite: 'Connaissez-vous bien l’Italie ? Jouez à Italy Quiz : {url}',
};

const TABLE: Record<SupportedLocale, ItalyLabels> = { en: EN, ru: RU, es: ES, fr: FR };

export function useItalyLabels(): ItalyLabels {
  const { locale } = useLocale();
  return TABLE[locale] ?? EN;
}

/**
 * Pick the right form of a counted string for the active locale.
 *
 * Hand-rolled rather than `Intl.PluralRules`, which is absent from the default
 * Hermes build unless the app opts into the full ICU payload — a several-MB
 * price for one label. The three languages that ship here besides Russian all
 * split at one, so `one`/`many` covers them and `few` is simply never asked for;
 * Russian gets the real rule (1, 21, 31 → one; 2-4, 22-24 → few; the rest,
 * including the whole 11-14 band, → many).
 */
export function pickPlural(
  locale: SupportedLocale,
  n: number,
  forms: { one: string; few: string; many: string },
): string {
  if (locale !== 'ru') return n === 1 ? forms.one : forms.many;
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms.one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms.few;
  return forms.many;
}
