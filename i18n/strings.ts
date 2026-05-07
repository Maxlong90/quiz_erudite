import type { SupportedLocale } from '@/hooks/use-locale';

export type StringKey =
  // splash
  | 'splash.tagline'
  // language picker
  | 'language.title'
  | 'language.subtitle'
  // onboarding
  | 'onboarding.skip'
  | 'onboarding.next'
  | 'onboarding.start'
  | 'onboarding.page1.title'
  | 'onboarding.page1.subtitle'
  | 'onboarding.page2.title'
  | 'onboarding.page2.subtitle'
  | 'onboarding.page3.title'
  | 'onboarding.page3.subtitle'
  // settings
  | 'settings.title'
  | 'settings.language'
  // home
  | 'home.tile.soon'
  | 'home.tile.meta'
  | 'home.tile.coming.title'
  | 'home.tile.coming.meta'
  | 'home.error.load'
  // quiz
  | 'quiz.loading'
  | 'quiz.error.title'
  | 'quiz.error.retry'
  | 'quiz.error.home'
  | 'quiz.next'
  | 'quiz.results'
  // results
  | 'results.title'
  | 'results.scoreLabel'
  | 'results.playAgain'
  | 'results.home'
  | 'results.messageExcellent'
  | 'results.messageGood'
  | 'results.messageKeepGoing'
  // report
  | 'report.title'
  | 'report.subtitle'
  | 'report.commentPlaceholder'
  | 'report.cancel'
  | 'report.submit'
  | 'report.successTitle'
  | 'report.successBody'
  | 'report.helper'
  | 'report.error'
  | 'report.reason.incorrect_answer'
  | 'report.reason.unclear_wording'
  | 'report.reason.inappropriate'
  | 'report.reason.broken_media'
  | 'report.reason.translation_issue'
  | 'report.reason.other'
  // paywall
  | 'paywall.title'
  | 'paywall.subtitle'
  | 'paywall.feature.unlimited'
  | 'paywall.feature.adfree'
  | 'paywall.feature.alllanguages'
  | 'paywall.feature.exclusive'
  | 'paywall.cta'
  | 'paywall.continueFree'
  | 'paywall.disclaimer'
  | 'paywall.thanks'
  // quiz mode picker
  | 'mode.title'
  | 'mode.daily.title'
  | 'mode.daily.subtitle'
  | 'mode.quick.title'
  | 'mode.quick.subtitle'
  | 'mode.timed.title'
  | 'mode.timed.subtitle'
  | 'mode.timed.questionsLabel'
  | 'mode.timed.startCta'
  | 'mode.survival.title'
  | 'mode.survival.subtitle'
  | 'mode.flashcards.title'
  | 'mode.flashcards.subtitle'
  | 'mode.lockedSoon'
  // timed quiz
  | 'quiz.timeUp'
  // survival
  | 'quiz.survival.streak'
  | 'quiz.survival.over';

type Bundle = Record<StringKey, string>;

export const STRINGS: Record<SupportedLocale, Bundle> = {
  en: {
    'splash.tagline': 'Sharpen your mind',
    'language.title': 'Choose your language',
    'language.subtitle': 'You can change this later in Settings',

    'onboarding.skip': 'Skip',
    'onboarding.next': 'Next',
    'onboarding.start': 'Get started',
    'onboarding.page1.title': 'Sharpen your mind',
    'onboarding.page1.subtitle':
      'Discover new facts and test what you know across the topics you love.',
    'onboarding.page2.title': 'Pick your topics',
    'onboarding.page2.subtitle':
      'Geography, history, science, arts, sports — play what you actually like.',
    'onboarding.page3.title': 'Track your progress',
    'onboarding.page3.subtitle':
      'Earn points, keep your streak alive, and climb the leaderboard.',

    'settings.title': 'Settings',
    'settings.language': 'Language',

    'home.tile.soon': 'Coming soon',
    'home.tile.meta': '{questions} questions · {topics} topics',
    'home.tile.coming.title': 'More categories',
    'home.tile.coming.meta': 'Coming soon',
    'home.error.load': "Couldn't load categories",

    'quiz.loading': 'Loading questions...',
    'quiz.error.title': 'Something went wrong',
    'quiz.error.retry': 'Try Again',
    'quiz.error.home': 'Go Home',
    'quiz.next': 'Next',
    'quiz.results': 'See Results',

    'results.title': 'Quiz Complete!',
    'results.scoreLabel': '{score} of {total}',
    'results.playAgain': 'Play Again',
    'results.home': 'Home',
    'results.messageExcellent': "Excellent! You're a true erudite!",
    'results.messageGood': 'Good job! Keep learning.',
    'results.messageKeepGoing': "Keep practicing, you'll get there!",

    'report.title': 'Report a problem',
    'report.subtitle': "What's wrong with this item?",
    'report.commentPlaceholder': 'Add details (optional)',
    'report.cancel': 'Cancel',
    'report.submit': 'Send report',
    'report.successTitle': 'Thanks for the report',
    'report.successBody': "We'll review it and clean up the content.",
    'report.helper': 'Report a problem with this question',
    'report.error': "Couldn't send the report",
    'report.reason.incorrect_answer': 'Incorrect answer',
    'report.reason.unclear_wording': 'Unclear or poorly worded',
    'report.reason.inappropriate': 'Inappropriate content',
    'report.reason.broken_media': "Image or audio doesn't load",
    'report.reason.translation_issue': 'Translation issue',
    'report.reason.other': 'Other',

    'paywall.title': 'Quizzzes Premium',
    'paywall.subtitle': 'Unlock the full experience',
    'paywall.feature.unlimited': 'Unlimited quizzes every day',
    'paywall.feature.adfree': 'Ad-free, distraction-free',
    'paywall.feature.alllanguages': 'All languages and topics',
    'paywall.feature.exclusive': 'Exclusive premium-only categories',
    'paywall.cta': 'Try Premium',
    'paywall.continueFree': 'Maybe later',
    'paywall.disclaimer': 'Cancel anytime in App Store settings.',
    'paywall.thanks': 'Welcome to Premium 🎉',

    'mode.title': 'Choose a mode',
    'mode.daily.title': "Today's question",
    'mode.daily.subtitle': 'A single question to keep you sharp',
    'mode.quick.title': 'Quick quiz',
    'mode.quick.subtitle': '10 questions, no time limit',
    'mode.timed.title': 'Timed quiz',
    'mode.timed.subtitle': '30 seconds per question',
    'mode.timed.questionsLabel': 'Questions',
    'mode.timed.startCta': 'Start',
    'mode.survival.title': 'Survival',
    'mode.survival.subtitle': 'One mistake and the run is over',
    'mode.flashcards.title': 'Flashcards',
    'mode.flashcards.subtitle': 'Browse cards to study at your pace',
    'mode.lockedSoon': 'Coming soon',

    'quiz.timeUp': "Time's up!",
    'quiz.survival.streak': 'Streak',
    'quiz.survival.over': 'Run ended at question {n}',
  },
  es: {
    'splash.tagline': 'Afina tu mente',
    'language.title': 'Elige tu idioma',
    'language.subtitle': 'Puedes cambiarlo en Ajustes',

    'onboarding.skip': 'Omitir',
    'onboarding.next': 'Siguiente',
    'onboarding.start': 'Empezar',
    'onboarding.page1.title': 'Afina tu mente',
    'onboarding.page1.subtitle':
      'Descubre datos nuevos y pon a prueba tus conocimientos en tus temas favoritos.',
    'onboarding.page2.title': 'Elige tus temas',
    'onboarding.page2.subtitle':
      'Geografía, historia, ciencia, arte, deportes y más: juega a lo que de verdad te gusta.',
    'onboarding.page3.title': 'Sigue tu progreso',
    'onboarding.page3.subtitle':
      'Gana puntos, mantén tu racha y sube en la tabla de clasificación.',

    'settings.title': 'Ajustes',
    'settings.language': 'Idioma',

    'home.tile.soon': 'Próximamente',
    'home.tile.meta': '{questions} preguntas · {topics} temas',
    'home.tile.coming.title': 'Más categorías',
    'home.tile.coming.meta': 'Próximamente',
    'home.error.load': 'No se pudieron cargar las categorías',

    'quiz.loading': 'Cargando preguntas...',
    'quiz.error.title': 'Algo salió mal',
    'quiz.error.retry': 'Intentar de nuevo',
    'quiz.error.home': 'Ir al inicio',
    'quiz.next': 'Siguiente',
    'quiz.results': 'Ver resultados',

    'results.title': '¡Quiz terminado!',
    'results.scoreLabel': '{score} de {total}',
    'results.playAgain': 'Volver a jugar',
    'results.home': 'Inicio',
    'results.messageExcellent': '¡Excelente! Eres un verdadero erudito.',
    'results.messageGood': '¡Buen trabajo! Sigue aprendiendo.',
    'results.messageKeepGoing': '¡Sigue practicando, lo lograrás!',

    'report.title': 'Reportar un problema',
    'report.subtitle': '¿Qué tiene de malo este elemento?',
    'report.commentPlaceholder': 'Añade detalles (opcional)',
    'report.cancel': 'Cancelar',
    'report.submit': 'Enviar reporte',
    'report.successTitle': 'Gracias por el reporte',
    'report.successBody': 'Lo revisaremos y limpiaremos el contenido.',
    'report.helper': 'Reportar un problema con esta pregunta',
    'report.error': 'No se pudo enviar el reporte',
    'report.reason.incorrect_answer': 'Respuesta incorrecta',
    'report.reason.unclear_wording': 'Pregunta poco clara',
    'report.reason.inappropriate': 'Contenido inapropiado',
    'report.reason.broken_media': 'La imagen o el audio no carga',
    'report.reason.translation_issue': 'Problema de traducción',
    'report.reason.other': 'Otro',

    'paywall.title': 'Quizzzes Premium',
    'paywall.subtitle': 'Desbloquea la experiencia completa',
    'paywall.feature.unlimited': 'Quizzes ilimitados cada día',
    'paywall.feature.adfree': 'Sin anuncios, sin distracciones',
    'paywall.feature.alllanguages': 'Todos los idiomas y temas',
    'paywall.feature.exclusive': 'Categorías exclusivas para Premium',
    'paywall.cta': 'Probar Premium',
    'paywall.continueFree': 'Quizá más tarde',
    'paywall.disclaimer': 'Cancela cuando quieras en los ajustes del App Store.',
    'paywall.thanks': 'Bienvenido a Premium 🎉',

    'mode.title': 'Elige un modo',
    'mode.daily.title': 'Pregunta del día',
    'mode.daily.subtitle': 'Una pregunta para entrenar la mente',
    'mode.quick.title': 'Quiz rápido',
    'mode.quick.subtitle': '10 preguntas, sin límite de tiempo',
    'mode.timed.title': 'Quiz cronometrado',
    'mode.timed.subtitle': '30 segundos por pregunta',
    'mode.timed.questionsLabel': 'Preguntas',
    'mode.timed.startCta': 'Empezar',
    'mode.survival.title': 'Supervivencia',
    'mode.survival.subtitle': 'Un error y se acabó',
    'mode.flashcards.title': 'Flashcards',
    'mode.flashcards.subtitle': 'Estudia tarjetas a tu ritmo',
    'mode.lockedSoon': 'Próximamente',

    'quiz.timeUp': '¡Se acabó el tiempo!',
    'quiz.survival.streak': 'Racha',
    'quiz.survival.over': 'Racha terminada en la pregunta {n}',
  },
  ru: {
    'splash.tagline': 'Прокачай эрудицию',
    'language.title': 'Выберите язык',
    'language.subtitle': 'Изменить можно в настройках',

    'onboarding.skip': 'Пропустить',
    'onboarding.next': 'Далее',
    'onboarding.start': 'Начать',
    'onboarding.page1.title': 'Прокачай эрудицию',
    'onboarding.page1.subtitle':
      'Узнавай новое и проверяй знания в самых интересных темах каждый день.',
    'onboarding.page2.title': 'Выбирай любимые темы',
    'onboarding.page2.subtitle':
      'География, история, наука, искусство, спорт и не только — играй в то, что нравится.',
    'onboarding.page3.title': 'Следи за прогрессом',
    'onboarding.page3.subtitle':
      'Зарабатывай очки, удерживай серию и поднимайся в рейтинге эрудитов.',

    'settings.title': 'Настройки',
    'settings.language': 'Язык',

    'home.tile.soon': 'Скоро',
    'home.tile.meta': '{questions} вопросов · {topics} тем',
    'home.tile.coming.title': 'Новые категории',
    'home.tile.coming.meta': 'Скоро',
    'home.error.load': 'Не удалось загрузить категории',

    'quiz.loading': 'Загружаем вопросы...',
    'quiz.error.title': 'Что-то пошло не так',
    'quiz.error.retry': 'Попробовать снова',
    'quiz.error.home': 'На главную',
    'quiz.next': 'Дальше',
    'quiz.results': 'Результат',

    'results.title': 'Квиз завершён!',
    'results.scoreLabel': '{score} из {total}',
    'results.playAgain': 'Сыграть снова',
    'results.home': 'На главную',
    'results.messageExcellent': 'Великолепно! Настоящий эрудит.',
    'results.messageGood': 'Хороший результат! Продолжай учиться.',
    'results.messageKeepGoing': 'Тренируйся ещё — у тебя получится!',

    'report.title': 'Сообщить о проблеме',
    'report.subtitle': 'Что не так с этим вопросом?',
    'report.commentPlaceholder': 'Подробности (по желанию)',
    'report.cancel': 'Отмена',
    'report.submit': 'Отправить',
    'report.successTitle': 'Спасибо за репорт',
    'report.successBody': 'Мы проверим и поправим контент.',
    'report.helper': 'Пожаловаться на этот вопрос',
    'report.error': 'Не удалось отправить репорт',
    'report.reason.incorrect_answer': 'Неверный ответ',
    'report.reason.unclear_wording': 'Непонятная формулировка',
    'report.reason.inappropriate': 'Неуместный контент',
    'report.reason.broken_media': 'Не загружается картинка или звук',
    'report.reason.translation_issue': 'Проблема с переводом',
    'report.reason.other': 'Другое',

    'paywall.title': 'Quizzzes Premium',
    'paywall.subtitle': 'Открой полный опыт',
    'paywall.feature.unlimited': 'Безлимит квизов каждый день',
    'paywall.feature.adfree': 'Без рекламы и отвлечений',
    'paywall.feature.alllanguages': 'Все языки и темы',
    'paywall.feature.exclusive': 'Эксклюзивные категории для Premium',
    'paywall.cta': 'Попробовать Premium',
    'paywall.continueFree': 'Может, позже',
    'paywall.disclaimer': 'Отмена в любой момент в настройках App Store.',
    'paywall.thanks': 'Добро пожаловать в Premium 🎉',

    'mode.title': 'Выберите режим',
    'mode.daily.title': 'Вопрос дня',
    'mode.daily.subtitle': 'Один вопрос, чтобы держать форму',
    'mode.quick.title': 'Быстрый квиз',
    'mode.quick.subtitle': '10 вопросов без таймера',
    'mode.timed.title': 'На время',
    'mode.timed.subtitle': '30 секунд на вопрос',
    'mode.timed.questionsLabel': 'Вопросов',
    'mode.timed.startCta': 'Начать',
    'mode.survival.title': 'На выживание',
    'mode.survival.subtitle': 'Одна ошибка — и игра окончена',
    'mode.flashcards.title': 'Карточки',
    'mode.flashcards.subtitle': 'Изучай карточки в своём темпе',
    'mode.lockedSoon': 'Скоро',

    'quiz.timeUp': 'Время вышло!',
    'quiz.survival.streak': 'Серия',
    'quiz.survival.over': 'Серия прервана на вопросе №{n}',
  },
};

export function format(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    key in vars ? String(vars[key]) : `{${key}}`,
  );
}
