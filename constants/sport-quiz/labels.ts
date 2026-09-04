/**
 * UI strings for the Sport Quiz module (en/ru/es/fr), kept local to the feature.
 * Screen chrome only — quiz content comes from the backend snapshot. Picked by
 * the app's active locale via useSQLabels(). Mirrors constants/logo-quiz/labels.
 *
 * Grows per screen: main + settings + shop + wheel share this table so every
 * Sport Quiz surface stays in one place.
 */
import { useLocale } from '@/hooks/use-locale';

export interface SQLabels {
  play: string;
  settings: string;
  shop: string;

  // settings
  cancelSubscription: string;
  restorePurchases: string;
  selectLanguage: string;
  rateApp: string;
  contactSupport: string;
  privacyPolicy: string;
  termsOfUse: string;
  ok: string;
  restoreDoneTitle: string;
  restoreDoneMessage: string;
  restoreNoneTitle: string;
  restoreNoneMessage: string;
  restoreErrorTitle: string;
  restoreErrorMessage: string;

  // shop / paywall
  shopTitle: string;
  coinPacks: string;
  coins: string;
  buy: string;
  popular: string;
  purchaseErrorTitle: string;
  purchaseErrorMessage: string;

  // wheel
  wheelSpin: string;
  wheelSpinNow: string;
  wheelOdds: string;
  wheelNextSpinIn: string;
  wheelPrizeWon: string;
  wheelPrizeCoins100: string;
  wheelPrizeCoins500: string;
  wheelPrizeCoins1000: string;
  wheelTitle: string;

  // splash
  splashTagline: string;

  // modes / play
  chooseMode: string;
  modeClassic: string;
  modeLegends: string;
  modeChallenge: string;
  modeSprint: string;
  comingSoon: string;
  otherApps: string;

  // mode info sheet ("?" buttons) + settings version
  infoTitle: string;
  infoClassicText: string;
  infoLegendsText: string;
  infoCorrectAnswer: string;
  infoWrongAnswer: string;
  infoRevealPlate: string;
  infoSkipCost: string;
  appVersion: string; // "Version {v}"

  // levels / quiz
  selectLevel: string;
  levelLabel: string; // "Level {n}"
  finishPrevious: string;
  loadingContent: string;
  noLevels: string;

  // quiz screen
  explanationHeading: string;
  legendPrompt: string; // Sports Legends question prompt ("Who is this?")
  legendRevealHint: string; // tap-to-reveal hint, uses {n} coins
  skip: string;
  next: string;
  back: string;
  levelComplete: string;
  backToLevels: string;

  // header actions + report sheet
  shareQuestion: string;
  reportQuestion: string;
  shareInvite: string; // uses {url}
  reportTitle: string;
  reportSubtitle: string;
  reportCommentPlaceholder: string;
  reportSubmit: string;
  reportCancel: string;
  reportSentTitle: string;
  reportSentBody: string;
  reportDone: string;
  reportError: string;
  reasonIncorrectAnswer: string;
  reasonUnclearWording: string;
  reasonInappropriate: string;
  reasonBrokenMedia: string;
  reasonTranslationIssue: string;
  reasonOther: string;
}

const EN: SQLabels = {
  play: 'PLAY',
  settings: 'Settings',
  shop: 'Shop',
  cancelSubscription: 'Cancel Subscription',
  restorePurchases: 'Restore Purchases',
  selectLanguage: 'Language',
  rateApp: 'Rate App',
  contactSupport: 'Contact Support',
  privacyPolicy: 'Privacy Policy',
  termsOfUse: 'Terms of Use',
  ok: 'OK',
  restoreDoneTitle: 'Purchases Restored',
  restoreDoneMessage: 'Your purchases are active again.',
  restoreNoneTitle: 'Nothing to Restore',
  restoreNoneMessage: 'We found no previous purchases to restore.',
  restoreErrorTitle: 'Restore Failed',
  restoreErrorMessage: 'Something went wrong. Please try again later.',
  shopTitle: 'Shop',
  coinPacks: 'Coin Packs',
  coins: 'coins',
  buy: 'Buy',
  popular: 'Popular',
  purchaseErrorTitle: 'Purchase Failed',
  purchaseErrorMessage: 'We could not complete the purchase. Please try again later.',
  wheelSpin: 'SPIN',
  wheelSpinNow: 'Spin now',
  wheelOdds: 'Odds',
  wheelNextSpinIn: 'Next spin in',
  wheelPrizeWon: 'You won',
  wheelPrizeCoins100: '100 coins',
  wheelPrizeCoins500: '500 coins',
  wheelPrizeCoins1000: '1000 coins',
  wheelTitle: 'Wheel of Fortune',
  splashTagline: 'Train your brain!',
  chooseMode: 'Choose a mode',
  modeClassic: 'Classic Mode',
  modeLegends: 'Sports Legends',
  modeChallenge: 'Challenge',
  modeSprint: 'Sprint',
  comingSoon: 'Available soon',
  otherApps: 'Other apps',

  infoTitle: 'How it works',
  infoClassicText: 'Multiple-choice sports questions — pictures, dates and facts. 20 questions per level.',
  infoLegendsText: 'Guess the athlete hidden behind puzzle plates. Tap a plate to uncover a piece of the photo.',
  infoCorrectAnswer: 'Correct answer',
  infoWrongAnswer: 'Wrong answer',
  infoRevealPlate: 'Uncover a plate',
  infoSkipCost: 'Skip the question',
  appVersion: 'Version {v}',
  selectLevel: 'Select Level',
  levelLabel: 'Level {n}',
  finishPrevious: 'Finish the previous level',
  loadingContent: 'Loading…',
  noLevels: 'No levels yet',
  explanationHeading: 'History',
  legendPrompt: 'Who is this?',
  legendRevealHint: 'Tap a tile to reveal a piece ({n} coins)',
  skip: 'Skip',
  next: 'Next',
  back: 'Back',
  levelComplete: 'Level Complete',
  backToLevels: 'Back to Levels',
  shareQuestion: 'Share',
  reportQuestion: 'Report',
  shareInvite: 'Play Sport Quiz! {url}',
  reportTitle: 'Report a problem',
  reportSubtitle: 'What is wrong with this question?',
  reportCommentPlaceholder: 'Add a comment (optional)',
  reportSubmit: 'Submit',
  reportCancel: 'Cancel',
  reportSentTitle: 'Report sent',
  reportSentBody: 'Thanks — we’ll take a look.',
  reportDone: 'Done',
  reportError: 'Could not send. Please try again later.',
  reasonIncorrectAnswer: 'Incorrect answer',
  reasonUnclearWording: 'Unclear wording',
  reasonInappropriate: 'Inappropriate content',
  reasonBrokenMedia: 'Broken image',
  reasonTranslationIssue: 'Translation issue',
  reasonOther: 'Other',
};

const RU: SQLabels = {
  play: 'ИГРАТЬ',
  settings: 'Настройки',
  shop: 'Магазин',
  cancelSubscription: 'Отменить подписку',
  restorePurchases: 'Восстановить покупки',
  selectLanguage: 'Язык',
  rateApp: 'Оценить приложение',
  contactSupport: 'Поддержка',
  privacyPolicy: 'Политика конфиденциальности',
  termsOfUse: 'Условия использования',
  ok: 'ОК',
  restoreDoneTitle: 'Покупки восстановлены',
  restoreDoneMessage: 'Ваши покупки снова активны.',
  restoreNoneTitle: 'Нечего восстанавливать',
  restoreNoneMessage: 'Предыдущих покупок не найдено.',
  restoreErrorTitle: 'Не удалось восстановить',
  restoreErrorMessage: 'Что-то пошло не так. Попробуйте позже.',
  shopTitle: 'Магазин',
  coinPacks: 'Наборы монет',
  coins: 'монет',
  buy: 'Купить',
  popular: 'Популярное',
  purchaseErrorTitle: 'Покупка не удалась',
  purchaseErrorMessage: 'Не удалось завершить покупку. Попробуйте позже.',
  wheelSpin: 'КРУТИТЬ',
  wheelSpinNow: 'Крутить',
  wheelOdds: 'Шансы',
  wheelNextSpinIn: 'Следующий спин через',
  wheelPrizeWon: 'Вы выиграли',
  wheelPrizeCoins100: '100 монет',
  wheelPrizeCoins500: '500 монет',
  wheelPrizeCoins1000: '1000 монет',
  wheelTitle: 'Колесо фортуны',
  splashTagline: 'Тренируй свой мозг!',
  chooseMode: 'Выбери режим',
  modeClassic: 'Классический',
  modeLegends: 'Легенды спорта',
  modeChallenge: 'Челлендж',
  modeSprint: 'Спринт',
  comingSoon: 'Скоро',
  otherApps: 'Другие приложения',

  infoTitle: 'Как это работает',
  infoClassicText: 'Спортивные вопросы с выбором ответа — фото, даты и факты. По 20 вопросов на уровень.',
  infoLegendsText: 'Угадай спортсмена, скрытого за пазлами. Тап по пазлу открывает кусочек фото.',
  infoCorrectAnswer: 'Правильный ответ',
  infoWrongAnswer: 'Неправильный ответ',
  infoRevealPlate: 'Открыть пазл',
  infoSkipCost: 'Пропустить вопрос',
  appVersion: 'Версия {v}',
  selectLevel: 'Выбери уровень',
  levelLabel: 'Уровень {n}',
  finishPrevious: 'Пройди предыдущий уровень',
  loadingContent: 'Загрузка…',
  noLevels: 'Уровней пока нет',
  explanationHeading: 'История',
  legendPrompt: 'Кто это?',
  legendRevealHint: 'Тап по пазлу открывает кусок ({n} монет)',
  skip: 'Пропустить',
  next: 'Далее',
  back: 'Назад',
  levelComplete: 'Уровень пройден',
  backToLevels: 'К уровням',
  shareQuestion: 'Поделиться',
  reportQuestion: 'Пожаловаться',
  shareInvite: 'Играй в Sport Quiz! {url}',
  reportTitle: 'Сообщить о проблеме',
  reportSubtitle: 'Что не так с этим вопросом?',
  reportCommentPlaceholder: 'Добавить комментарий (необязательно)',
  reportSubmit: 'Отправить',
  reportCancel: 'Отмена',
  reportSentTitle: 'Жалоба отправлена',
  reportSentBody: 'Спасибо — мы проверим.',
  reportDone: 'Готово',
  reportError: 'Не удалось отправить. Попробуйте позже.',
  reasonIncorrectAnswer: 'Неверный ответ',
  reasonUnclearWording: 'Непонятная формулировка',
  reasonInappropriate: 'Неприемлемый контент',
  reasonBrokenMedia: 'Битая картинка',
  reasonTranslationIssue: 'Ошибка перевода',
  reasonOther: 'Другое',
};

const ES: SQLabels = {
  play: 'JUGAR',
  settings: 'Ajustes',
  shop: 'Tienda',
  cancelSubscription: 'Cancelar suscripción',
  restorePurchases: 'Restaurar compras',
  selectLanguage: 'Idioma',
  rateApp: 'Valorar la app',
  contactSupport: 'Soporte',
  privacyPolicy: 'Política de privacidad',
  termsOfUse: 'Términos de uso',
  ok: 'OK',
  restoreDoneTitle: 'Compras restauradas',
  restoreDoneMessage: 'Tus compras están activas de nuevo.',
  restoreNoneTitle: 'Nada que restaurar',
  restoreNoneMessage: 'No encontramos compras anteriores.',
  restoreErrorTitle: 'Error al restaurar',
  restoreErrorMessage: 'Algo salió mal. Inténtalo más tarde.',
  shopTitle: 'Tienda',
  coinPacks: 'Paquetes de monedas',
  coins: 'monedas',
  buy: 'Comprar',
  popular: 'Popular',
  purchaseErrorTitle: 'Error en la compra',
  purchaseErrorMessage: 'No pudimos completar la compra. Inténtalo más tarde.',
  wheelSpin: 'GIRAR',
  wheelSpinNow: 'Girar',
  wheelOdds: 'Probabilidades',
  wheelNextSpinIn: 'Próximo giro en',
  wheelPrizeWon: 'Ganaste',
  wheelPrizeCoins100: '100 monedas',
  wheelPrizeCoins500: '500 monedas',
  wheelPrizeCoins1000: '1000 monedas',
  wheelTitle: 'Rueda de la fortuna',
  splashTagline: '¡Entrena tu cerebro!',
  chooseMode: 'Elige un modo',
  modeClassic: 'Clásico',
  modeLegends: 'Leyendas del deporte',
  modeChallenge: 'Desafío',
  modeSprint: 'Sprint',
  comingSoon: 'Muy pronto',
  otherApps: 'Otras apps',

  infoTitle: 'Cómo funciona',
  infoClassicText: 'Preguntas de deporte con opciones — fotos, fechas y datos. 20 preguntas por nivel.',
  infoLegendsText: 'Adivina al deportista oculto tras las piezas. Toca una pieza para descubrir parte de la foto.',
  infoCorrectAnswer: 'Respuesta correcta',
  infoWrongAnswer: 'Respuesta incorrecta',
  infoRevealPlate: 'Descubrir una pieza',
  infoSkipCost: 'Saltar la pregunta',
  appVersion: 'Versión {v}',
  selectLevel: 'Elige un nivel',
  levelLabel: 'Nivel {n}',
  finishPrevious: 'Completa el nivel anterior',
  loadingContent: 'Cargando…',
  noLevels: 'Aún no hay niveles',
  explanationHeading: 'Historia',
  legendPrompt: '¿Quién es?',
  legendRevealHint: 'Toca una ficha para revelar ({n} monedas)',
  skip: 'Saltar',
  next: 'Siguiente',
  back: 'Atrás',
  levelComplete: 'Nivel completado',
  backToLevels: 'A los niveles',
  shareQuestion: 'Compartir',
  reportQuestion: 'Reportar',
  shareInvite: '¡Juega a Sport Quiz! {url}',
  reportTitle: 'Reportar un problema',
  reportSubtitle: '¿Qué está mal en esta pregunta?',
  reportCommentPlaceholder: 'Añade un comentario (opcional)',
  reportSubmit: 'Enviar',
  reportCancel: 'Cancelar',
  reportSentTitle: 'Reporte enviado',
  reportSentBody: 'Gracias, lo revisaremos.',
  reportDone: 'Listo',
  reportError: 'No se pudo enviar. Inténtalo más tarde.',
  reasonIncorrectAnswer: 'Respuesta incorrecta',
  reasonUnclearWording: 'Redacción confusa',
  reasonInappropriate: 'Contenido inapropiado',
  reasonBrokenMedia: 'Imagen rota',
  reasonTranslationIssue: 'Error de traducción',
  reasonOther: 'Otro',
};

const FR: SQLabels = {
  play: 'JOUER',
  settings: 'Réglages',
  shop: 'Boutique',
  cancelSubscription: 'Annuler l’abonnement',
  restorePurchases: 'Restaurer les achats',
  selectLanguage: 'Langue',
  rateApp: 'Noter l’application',
  contactSupport: 'Contacter le support',
  privacyPolicy: 'Politique de confidentialité',
  termsOfUse: 'Conditions d’utilisation',
  ok: 'OK',
  restoreDoneTitle: 'Achats restaurés',
  restoreDoneMessage: 'Tes achats sont de nouveau actifs.',
  restoreNoneTitle: 'Rien à restaurer',
  restoreNoneMessage: 'Aucun achat précédent trouvé.',
  restoreErrorTitle: 'Échec de la restauration',
  restoreErrorMessage: 'Une erreur est survenue. Réessaie plus tard.',
  shopTitle: 'Boutique',
  coinPacks: 'Packs de pièces',
  coins: 'pièces',
  buy: 'Acheter',
  popular: 'Populaire',
  purchaseErrorTitle: 'Échec de l’achat',
  purchaseErrorMessage: 'Nous n’avons pas pu finaliser l’achat. Réessaie plus tard.',
  wheelSpin: 'TOURNER',
  wheelSpinNow: 'Tourner',
  wheelOdds: 'Probabilités',
  wheelNextSpinIn: 'Prochain tour dans',
  wheelPrizeWon: 'Tu as gagné',
  wheelPrizeCoins100: '100 pièces',
  wheelPrizeCoins500: '500 pièces',
  wheelPrizeCoins1000: '1000 pièces',
  wheelTitle: 'Roue de la fortune',
  splashTagline: 'Entraîne ton cerveau !',
  chooseMode: 'Choisis un mode',
  modeClassic: 'Classique',
  modeLegends: 'Légendes du sport',
  modeChallenge: 'Défi',
  modeSprint: 'Sprint',
  comingSoon: 'Bientôt',
  otherApps: 'Autres apps',

  infoTitle: 'Comment ça marche',
  infoClassicText: 'Questions de sport à choix multiple — photos, dates et faits. 20 questions par niveau.',
  infoLegendsText: 'Devine le sportif caché derrière les pièces. Touche une pièce pour révéler la photo.',
  infoCorrectAnswer: 'Bonne réponse',
  infoWrongAnswer: 'Mauvaise réponse',
  infoRevealPlate: 'Révéler une pièce',
  infoSkipCost: 'Passer la question',
  appVersion: 'Version {v}',
  selectLevel: 'Choisis un niveau',
  levelLabel: 'Niveau {n}',
  finishPrevious: 'Termine le niveau précédent',
  loadingContent: 'Chargement…',
  noLevels: 'Pas encore de niveaux',
  explanationHeading: 'Histoire',
  legendPrompt: 'Qui est-ce ?',
  legendRevealHint: 'Touche une tuile pour révéler ({n} pièces)',
  skip: 'Passer',
  next: 'Suivant',
  back: 'Retour',
  levelComplete: 'Niveau terminé',
  backToLevels: 'Aux niveaux',
  shareQuestion: 'Partager',
  reportQuestion: 'Signaler',
  shareInvite: 'Joue à Sport Quiz ! {url}',
  reportTitle: 'Signaler un problème',
  reportSubtitle: 'Quel est le problème avec cette question ?',
  reportCommentPlaceholder: 'Ajoute un commentaire (facultatif)',
  reportSubmit: 'Envoyer',
  reportCancel: 'Annuler',
  reportSentTitle: 'Signalement envoyé',
  reportSentBody: 'Merci — nous allons vérifier.',
  reportDone: 'OK',
  reportError: 'Envoi impossible. Réessaie plus tard.',
  reasonIncorrectAnswer: 'Réponse incorrecte',
  reasonUnclearWording: 'Formulation confuse',
  reasonInappropriate: 'Contenu inapproprié',
  reasonBrokenMedia: 'Image cassée',
  reasonTranslationIssue: 'Erreur de traduction',
  reasonOther: 'Autre',
};

const TABLE: Record<string, SQLabels> = { en: EN, ru: RU, es: ES, fr: FR };

export function useSQLabels(): SQLabels {
  const { locale } = useLocale();
  return TABLE[locale] ?? EN;
}
