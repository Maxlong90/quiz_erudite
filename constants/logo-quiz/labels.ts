/**
 * UI strings for the Logo Quiz module, kept local to the feature (en/ru/es).
 * Screen chrome only — brand/answer text comes from the backend snapshot
 * (localized per the requested locale). Picked by the app's active locale via
 * useLQLabels().
 */
import { useLocale } from '@/hooks/use-locale';

export interface LQLabels {
  appName: string;
  play: string;
  settings: string;
  loadingContent: string;
  // level select
  selectLevel: string;
  level: string;
  finishPrevious: string;
  noLevels: string;
  backToLevels: string;
  shop: string;
  buyPremium: string;
  basic: string;
  premium: string;
  locked: string;
  unlockWithPremium: string;
  // shop
  shopTitle: string;
  subscription: string;
  premiumPerks: string;
  perkCategories: string;
  perkLives: string;
  perkCoins: string;
  premiumActive: string;
  getPremium: string;
  perWeek: string;
  coins: string;
  coinPacks: string;
  livesPacks: string;
  livesUnit: string;
  buy: string;
  mostPopular: string;
  // quiz
  whichBrand: string;
  fiftyFifty: string;
  skip: string;
  review: string;
  prevLogo: string;
  nextLogo: string;
  premiumLogo: string;
  notEnoughCoins: string;
  outOfLives: string;
  fullLives: string;
  nextLifeIn: string;
  // quiz menu / report / share
  menuTitle: string;
  reportQuestion: string;
  shareQuestion: string;
  reportTitle: string;
  reportSubtitle: string;
  reasonIncorrectAnswer: string;
  reasonUnclearWording: string;
  reasonInappropriate: string;
  reasonBrokenMedia: string;
  reasonTranslationIssue: string;
  reasonOther: string;
  reportCommentPlaceholder: string;
  reportSubmit: string;
  reportCancel: string;
  reportSentTitle: string;
  reportSentBody: string;
  reportError: string;
  reportDone: string;
  /** Share message; `{url}` is replaced with the store link. */
  shareInvite: string;
  // result
  roundOver: string;
  gameOver: string;
  score: string;
  explanations: string;
  coinsEarned: string;
  doubleCoinsUpsell: string;
  playAgain: string;
  next: string;
  goToShop: string;
  home: string;
  // settings
  cancelSubscription: string;
  restorePurchases: string;
  selectLanguage: string;
  privacyPolicy: string;
  termsOfUse: string;
  rateApp: string;
  contactSupport: string;
  // restore-purchases alert strings
  restoreDoneTitle: string;
  restoreDoneMessage: string;
  restoreNoneTitle: string;
  restoreNoneMessage: string;
  restoreErrorTitle: string;
  restoreErrorMessage: string;
  ok: string;
  // wheel of fortune
  wheelTitle: string;
  wheelSpin: string;
  wheelSpinNow: string;
  wheelOdds: string;
  wheelNextSpinIn: string;
  wheelPrizeWon: string;
  wheelPrizeCoins100: string;
  wheelPrizeLives3: string;
  wheelPrizeCoins500: string;
  wheelPrizeLives10: string;
  wheelPrizeCoins1000: string;
}

const EN: LQLabels = {
  appName: 'Logo Quiz',
  play: 'Play',
  settings: 'Settings',
  loadingContent: 'Loading…',
  selectLevel: 'Select level',
  level: 'Level {n}',
  finishPrevious: 'Finish 9 logos in the previous level',
  noLevels: 'No levels yet',
  backToLevels: 'Back to levels',
  shop: 'Shop',
  buyPremium: 'Buy Premium',
  basic: 'Basic',
  premium: 'Premium',
  locked: 'Locked',
  unlockWithPremium: 'Unlock with Premium',
  shopTitle: 'Shop',
  subscription: 'Subscription',
  premiumPerks: 'Premium unlocks',
  perkCategories: 'Unlock all premium logos',
  perkLives: '3× faster life regeneration',
  perkCoins: '2× coins per correct answer',
  premiumActive: 'Premium active',
  getPremium: 'Get Premium',
  perWeek: '/week',
  coins: 'Coins',
  coinPacks: 'Coins',
  livesPacks: 'Lives',
  livesUnit: 'Lives',
  buy: 'Buy',
  mostPopular: 'Popular',
  whichBrand: 'Which brand is this?',
  fiftyFifty: '50/50',
  skip: 'Skip',
  review: 'Review',
  prevLogo: 'Previous',
  nextLogo: 'Next',
  premiumLogo: 'Premium logo',
  notEnoughCoins: 'Not enough coins',
  outOfLives: 'Out of lives!',
  fullLives: 'Lives full',
  nextLifeIn: 'Next life in',
  menuTitle: 'Options',
  reportQuestion: 'Report question',
  shareQuestion: 'Share question',
  reportTitle: 'Report a problem',
  reportSubtitle: "Tell us what's wrong with this question.",
  reasonIncorrectAnswer: 'Incorrect answer',
  reasonUnclearWording: 'Unclear or confusing',
  reasonInappropriate: 'Inappropriate content',
  reasonBrokenMedia: "Image doesn't load",
  reasonTranslationIssue: 'Translation issue',
  reasonOther: 'Other',
  reportCommentPlaceholder: 'Add a comment (optional)',
  reportSubmit: 'Send',
  reportCancel: 'Cancel',
  reportSentTitle: 'Thank you!',
  reportSentBody: 'Your report has been sent.',
  reportError: "Couldn't send. Please try again.",
  reportDone: 'Done',
  shareInvite: 'Can you guess this logo? Play Logo Quiz: {url}',
  roundOver: 'Round complete!',
  gameOver: 'Game over',
  score: 'Score',
  explanations: 'Explanations',
  coinsEarned: 'Coins earned',
  doubleCoinsUpsell: 'Get 2× more coins with Premium!',
  playAgain: 'Play again',
  next: 'Next',
  goToShop: 'Go to Shop',
  home: 'Home',
  cancelSubscription: 'Cancel Subscription',
  restorePurchases: 'Restore Purchases',
  selectLanguage: 'Language',
  privacyPolicy: 'Privacy Policy',
  termsOfUse: 'Terms of Use',
  rateApp: 'Rate the App',
  contactSupport: 'Contact Support',
  restoreDoneTitle: 'Purchases Restored',
  restoreDoneMessage: 'Your premium subscription is now active.',
  restoreNoneTitle: 'No Purchases Found',
  restoreNoneMessage: "We couldn't find any previous purchases to restore.",
  restoreErrorTitle: 'Restore Failed',
  restoreErrorMessage: 'Something went wrong. Please try again later.',
  ok: 'OK',
  wheelTitle: 'Wheel of Fortune',
  wheelSpin: 'SPIN',
  wheelSpinNow: 'Spin now',
  wheelOdds: 'Odds disclosure',
  wheelNextSpinIn: 'Next spin in',
  wheelPrizeWon: 'You won',
  wheelPrizeCoins100: '100 coins',
  wheelPrizeLives3: '3 lives',
  wheelPrizeCoins500: '500 coins',
  wheelPrizeLives10: '10 lives',
  wheelPrizeCoins1000: '1000 coins',
};

const RU: LQLabels = {
  appName: 'Logo Quiz',
  play: 'Играть',
  settings: 'Настройки',
  loadingContent: 'Загрузка…',
  selectLevel: 'Выберите уровень',
  level: 'Уровень {n}',
  finishPrevious: 'Закончи 9 логотипов в предыдущем уровне',
  noLevels: 'Пока нет уровней',
  backToLevels: 'К уровням',
  shop: 'Магазин',
  buyPremium: 'Купить Premium',
  basic: 'Basic',
  premium: 'Premium',
  locked: 'Заблокировано',
  unlockWithPremium: 'Открыть с Premium',
  shopTitle: 'Магазин',
  subscription: 'Подписка',
  premiumPerks: 'Premium открывает',
  perkCategories: 'Открыты все premium-логотипы',
  perkLives: '×3 скорость восстановления жизней',
  perkCoins: '2× монеты за верный ответ',
  premiumActive: 'Premium активен',
  getPremium: 'Оформить Premium',
  perWeek: '/неделя',
  coins: 'Монеты',
  coinPacks: 'Монеты',
  livesPacks: 'Жизни',
  livesUnit: 'жизни',
  buy: 'Купить',
  mostPopular: 'Хит',
  whichBrand: 'Что это за бренд?',
  fiftyFifty: '50/50',
  skip: 'Пропустить',
  review: 'Просмотр',
  prevLogo: 'Назад',
  nextLogo: 'Далее',
  premiumLogo: 'Premium-логотип',
  notEnoughCoins: 'Недостаточно монет',
  outOfLives: 'Жизни закончились!',
  fullLives: 'Жизни полны',
  nextLifeIn: 'Новая жизнь через',
  menuTitle: 'Меню',
  reportQuestion: 'Пожаловаться на вопрос',
  shareQuestion: 'Поделиться вопросом',
  reportTitle: 'Сообщить о проблеме',
  reportSubtitle: 'Расскажите, что не так с этим вопросом.',
  reasonIncorrectAnswer: 'Неверный ответ',
  reasonUnclearWording: 'Непонятная формулировка',
  reasonInappropriate: 'Неприемлемый контент',
  reasonBrokenMedia: 'Изображение не загружается',
  reasonTranslationIssue: 'Проблема с переводом',
  reasonOther: 'Другое',
  reportCommentPlaceholder: 'Комментарий (необязательно)',
  reportSubmit: 'Отправить',
  reportCancel: 'Отмена',
  reportSentTitle: 'Спасибо!',
  reportSentBody: 'Ваша жалоба отправлена.',
  reportError: 'Не удалось отправить. Попробуйте ещё раз.',
  reportDone: 'Готово',
  shareInvite: 'Угадаешь этот логотип? Играй в Logo Quiz: {url}',
  roundOver: 'Раунд пройден!',
  gameOver: 'Игра окончена',
  score: 'Очки',
  explanations: 'Объяснения',
  coinsEarned: 'Заработано монет',
  doubleCoinsUpsell: 'Получи в 2 раза больше монет с Premium!',
  playAgain: 'Играть снова',
  next: 'Дальше',
  goToShop: 'Перейти в магазин',
  home: 'На главную',
  cancelSubscription: 'Отмена подписки',
  restorePurchases: 'Восстановить покупки',
  selectLanguage: 'Выбор языка',
  privacyPolicy: 'Политика конфиденциальности',
  termsOfUse: 'Условия использования',
  rateApp: 'Оценить приложение',
  contactSupport: 'Связаться с поддержкой',
  restoreDoneTitle: 'Покупки восстановлены',
  restoreDoneMessage: 'Премиум-подписка снова активна.',
  restoreNoneTitle: 'Покупки не найдены',
  restoreNoneMessage: 'Не удалось найти предыдущие покупки для восстановления.',
  restoreErrorTitle: 'Не удалось восстановить',
  restoreErrorMessage: 'Что-то пошло не так. Попробуйте позже.',
  ok: 'ОК',
  wheelTitle: 'Колесо фортуны',
  wheelSpin: 'СПИН',
  wheelSpinNow: 'Крутить',
  wheelOdds: 'Шансы призов',
  wheelNextSpinIn: 'Следующее вращение через',
  wheelPrizeWon: 'Вы выиграли',
  wheelPrizeCoins100: '100 монет',
  wheelPrizeLives3: '3 жизни',
  wheelPrizeCoins500: '500 монет',
  wheelPrizeLives10: '10 жизней',
  wheelPrizeCoins1000: '1000 монет',
};

const ES: LQLabels = {
  ...EN,
  play: 'Jugar',
  settings: 'Ajustes',
  loadingContent: 'Cargando…',
  selectLevel: 'Elige un nivel',
  level: 'Nivel {n}',
  finishPrevious: 'Termina 9 logotipos del nivel anterior',
  noLevels: 'Aún no hay niveles',
  backToLevels: 'Volver a niveles',
  shop: 'Tienda',
  buyPremium: 'Comprar Premium',
  locked: 'Bloqueado',
  unlockWithPremium: 'Desbloquear con Premium',
  shopTitle: 'Tienda',
  subscription: 'Suscripción',
  premiumPerks: 'Premium desbloquea',
  perkCategories: 'Desbloquea todos los logos premium',
  perkLives: 'Regeneración de vidas ×3',
  perkCoins: '2× monedas por respuesta correcta',
  premiumActive: 'Premium activo',
  getPremium: 'Obtener Premium',
  perWeek: '/semana',
  coins: 'Monedas',
  coinPacks: 'Monedas',
  livesPacks: 'Vidas',
  livesUnit: 'vidas',
  buy: 'Comprar',
  mostPopular: 'Popular',
  whichBrand: '¿Qué marca es esta?',
  skip: 'Saltar',
  review: 'Repaso',
  prevLogo: 'Anterior',
  nextLogo: 'Siguiente',
  premiumLogo: 'Logo premium',
  notEnoughCoins: 'Monedas insuficientes',
  outOfLives: '¡Sin vidas!',
  fullLives: 'Vidas al máximo',
  nextLifeIn: 'Próxima vida en',
  menuTitle: 'Opciones',
  reportQuestion: 'Reportar pregunta',
  shareQuestion: 'Compartir pregunta',
  reportTitle: 'Reportar un problema',
  reportSubtitle: 'Cuéntanos qué está mal con esta pregunta.',
  reasonIncorrectAnswer: 'Respuesta incorrecta',
  reasonUnclearWording: 'Poco clara o confusa',
  reasonInappropriate: 'Contenido inapropiado',
  reasonBrokenMedia: 'La imagen no carga',
  reasonTranslationIssue: 'Problema de traducción',
  reasonOther: 'Otro',
  reportCommentPlaceholder: 'Añade un comentario (opcional)',
  reportSubmit: 'Enviar',
  reportCancel: 'Cancelar',
  reportSentTitle: '¡Gracias!',
  reportSentBody: 'Tu reporte ha sido enviado.',
  reportError: 'No se pudo enviar. Inténtalo de nuevo.',
  reportDone: 'Hecho',
  shareInvite: '¿Puedes adivinar este logo? Juega a Logo Quiz: {url}',
  roundOver: '¡Ronda completada!',
  gameOver: 'Fin del juego',
  score: 'Puntos',
  explanations: 'Explicaciones',
  coinsEarned: 'Monedas ganadas',
  doubleCoinsUpsell: '¡Consigue el doble de monedas con Premium!',
  playAgain: 'Jugar de nuevo',
  next: 'Siguiente',
  goToShop: 'Ir a la tienda',
  home: 'Inicio',
  cancelSubscription: 'Cancelar suscripción',
  restorePurchases: 'Restaurar compras',
  selectLanguage: 'Idioma',
  privacyPolicy: 'Política de privacidad',
  termsOfUse: 'Términos de uso',
  rateApp: 'Valorar la app',
  contactSupport: 'Contactar soporte',
  restoreDoneTitle: 'Compras restauradas',
  restoreDoneMessage: 'Tu suscripción premium ya está activa.',
  restoreNoneTitle: 'No se encontraron compras',
  restoreNoneMessage: 'No encontramos compras anteriores para restaurar.',
  restoreErrorTitle: 'Error al restaurar',
  restoreErrorMessage: 'Algo salió mal. Inténtalo de nuevo más tarde.',
  ok: 'OK',
  wheelTitle: 'Rueda de la fortuna',
  wheelSpin: 'GIRAR',
  wheelSpinNow: 'Girar',
  wheelOdds: 'Probabilidades',
  wheelNextSpinIn: 'Próximo giro en',
  wheelPrizeWon: '¡Ganaste',
  wheelPrizeCoins100: '100 monedas',
  wheelPrizeLives3: '3 vidas',
  wheelPrizeCoins500: '500 monedas',
  wheelPrizeLives10: '10 vidas',
  wheelPrizeCoins1000: '1000 monedas',
};

const TABLE: Record<string, LQLabels> = { en: EN, ru: RU, es: ES };

export function useLQLabels(): LQLabels {
  const { locale } = useLocale();
  return TABLE[locale] ?? EN;
}
