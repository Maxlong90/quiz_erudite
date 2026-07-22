/**
 * UI strings for the Logo Quiz module, kept local to the feature (en/ru/es).
 * Screen chrome only — brand/answer text lives in mock-data.ts. Picked by the
 * app's active locale via useLQLabels().
 */
import { useLocale } from '@/hooks/use-locale';

export interface LQLabels {
  appName: string;
  play: string;
  settings: string;
  chooseCategory: string;
  vipCategories: string;
  shop: string;
  buyPremium: string;
  premiumBanner: string;
  basic: string;
  premium: string;
  vip: string;
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
  prevLevel: string;
  nextLevel: string;
  notEnoughCoins: string;
  outOfLives: string;
  fullLives: string;
  nextLifeIn: string;
  // result
  roundOver: string;
  gameOver: string;
  score: string;
  coinsEarned: string;
  doubleCoinsUpsell: string;
  playAgain: string;
  next: string;
  backToCategories: string;
  goToShop: string;
  home: string;
}

const EN: LQLabels = {
  appName: 'Logo Quiz',
  play: 'Play',
  settings: 'Settings',
  chooseCategory: 'Choose a category',
  vipCategories: 'VIP Categories',
  shop: 'Shop',
  buyPremium: 'Buy Premium',
  premiumBanner: 'Go Premium — unlock every category & 3× faster lives',
  basic: 'Basic',
  premium: 'Premium',
  vip: 'VIP',
  locked: 'Locked',
  unlockWithPremium: 'Unlock with Premium',
  shopTitle: 'Shop',
  subscription: 'Subscription',
  premiumPerks: 'Premium unlocks',
  perkCategories: 'Unlock all VIP categories',
  perkLives: '3× faster life regeneration',
  perkCoins: '2× coins per correct answer',
  premiumActive: 'Premium active',
  getPremium: 'Get Premium',
  coins: 'Coins',
  coinPacks: 'Coin packs',
  livesPacks: 'Lives',
  livesUnit: 'lives',
  buy: 'Buy',
  mostPopular: 'Popular',
  whichBrand: 'Which brand is this?',
  fiftyFifty: '50/50',
  skip: 'Next level',
  prevLevel: 'Previous level',
  nextLevel: 'Next level',
  notEnoughCoins: 'Not enough coins',
  outOfLives: 'Out of lives!',
  fullLives: 'Lives full',
  nextLifeIn: 'Next life in',
  roundOver: 'Round complete!',
  gameOver: 'Game over',
  score: 'Score',
  coinsEarned: 'Coins earned',
  doubleCoinsUpsell: 'Get 2× more coins with Premium!',
  playAgain: 'Play again',
  next: 'Next',
  backToCategories: 'Back to categories',
  goToShop: 'Go to Shop',
  home: 'Home',
};

const RU: LQLabels = {
  appName: 'Logo Quiz',
  play: 'Играть',
  settings: 'Настройки',
  chooseCategory: 'Выберите категорию',
  vipCategories: 'VIP категории',
  shop: 'Магазин',
  buyPremium: 'Купить Premium',
  premiumBanner: 'Premium — все категории и ×3 скорость восстановления жизней',
  basic: 'Basic',
  premium: 'Premium',
  vip: 'VIP',
  locked: 'Заблокировано',
  unlockWithPremium: 'Открыть с Premium',
  shopTitle: 'Магазин',
  subscription: 'Подписка',
  premiumPerks: 'Premium открывает',
  perkCategories: 'Открыты все VIP-категории',
  perkLives: '×3 скорость восстановления жизней',
  perkCoins: '2× монеты за верный ответ',
  premiumActive: 'Premium активен',
  getPremium: 'Оформить Premium',
  coins: 'Монеты',
  coinPacks: 'Пакеты монет',
  livesPacks: 'Жизни',
  livesUnit: 'жизни',
  buy: 'Купить',
  mostPopular: 'Хит',
  whichBrand: 'Что это за бренд?',
  fiftyFifty: '50/50',
  skip: 'Следующий уровень',
  prevLevel: 'Предыдущий уровень',
  nextLevel: 'Следующий уровень',
  notEnoughCoins: 'Недостаточно монет',
  outOfLives: 'Жизни закончились!',
  fullLives: 'Жизни полны',
  nextLifeIn: 'Новая жизнь через',
  roundOver: 'Раунд пройден!',
  gameOver: 'Игра окончена',
  score: 'Очки',
  coinsEarned: 'Заработано монет',
  doubleCoinsUpsell: 'Получи в 2 раза больше монет с Premium!',
  playAgain: 'Играть снова',
  next: 'Дальше',
  backToCategories: 'Обратно в категории',
  goToShop: 'Перейти в магазин',
  home: 'На главную',
};

const ES: LQLabels = {
  ...EN,
  play: 'Jugar',
  settings: 'Ajustes',
  chooseCategory: 'Elige una categoría',
  vipCategories: 'Categorías VIP',
  shop: 'Tienda',
  buyPremium: 'Comprar Premium',
  premiumBanner: 'Hazte Premium — todas las categorías y regeneración de vidas ×3',
  locked: 'Bloqueado',
  unlockWithPremium: 'Desbloquear con Premium',
  shopTitle: 'Tienda',
  subscription: 'Suscripción',
  premiumPerks: 'Premium desbloquea',
  perkCategories: 'Desbloquea todas las categorías VIP',
  perkLives: 'Regeneración de vidas ×3',
  perkCoins: '2× monedas por respuesta correcta',
  premiumActive: 'Premium activo',
  getPremium: 'Obtener Premium',
  coins: 'Monedas',
  coinPacks: 'Paquetes de monedas',
  livesPacks: 'Vidas',
  livesUnit: 'vidas',
  buy: 'Comprar',
  mostPopular: 'Popular',
  whichBrand: '¿Qué marca es esta?',
  skip: 'Siguiente nivel',
  prevLevel: 'Nivel anterior',
  nextLevel: 'Siguiente nivel',
  notEnoughCoins: 'Monedas insuficientes',
  outOfLives: '¡Sin vidas!',
  fullLives: 'Vidas al máximo',
  nextLifeIn: 'Próxima vida en',
  roundOver: '¡Ronda completada!',
  gameOver: 'Fin del juego',
  score: 'Puntos',
  coinsEarned: 'Monedas ganadas',
  doubleCoinsUpsell: '¡Consigue el doble de monedas con Premium!',
  playAgain: 'Jugar de nuevo',
  next: 'Siguiente',
  backToCategories: 'Volver a categorías',
  goToShop: 'Ir a la tienda',
  home: 'Inicio',
};

const TABLE: Record<string, LQLabels> = { en: EN, ru: RU, es: ES };

export function useLQLabels(): LQLabels {
  const { locale } = useLocale();
  return TABLE[locale] ?? EN;
}
