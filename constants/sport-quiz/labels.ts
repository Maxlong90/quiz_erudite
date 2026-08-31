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
  modeClassic: 'Classic Mod',
  modeLegends: 'Sports Legends',
  modeChallenge: 'Challenge',
  modeSprint: 'Sprint',
  comingSoon: 'Available soon',
  otherApps: 'Other apps',
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
};

const TABLE: Record<string, SQLabels> = { en: EN, ru: RU, es: ES, fr: FR };

export function useSQLabels(): SQLabels {
  const { locale } = useLocale();
  return TABLE[locale] ?? EN;
}
