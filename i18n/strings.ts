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
  | 'report.reason.other';

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

    'results.title': 'Quiz finished',
    'results.scoreLabel': '{score} of {total}',
    'results.playAgain': 'Play Again',
    'results.home': 'Home',

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

    'results.title': 'Quiz terminado',
    'results.scoreLabel': '{score} de {total}',
    'results.playAgain': 'Volver a jugar',
    'results.home': 'Inicio',

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

    'results.title': 'Квиз завершён',
    'results.scoreLabel': '{score} из {total}',
    'results.playAgain': 'Сыграть снова',
    'results.home': 'На главную',

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
  },
};

export function format(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    key in vars ? String(vars[key]) : `{${key}}`,
  );
}
