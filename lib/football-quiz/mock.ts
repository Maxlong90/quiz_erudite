/**
 * Mock data for the Football Quiz prototype.
 *
 * The backend app (QuizApp id 4, slug `football-quiz`) exists but has ZERO
 * content categories, so there is nothing to fetch yet. These fixtures let the
 * screens be reviewed on a real device at full fidelity. The economy numbers
 * (coin packs, wheel prizes and weights, wedge layout) are copied verbatim from
 * lib/sport-quiz/economy.ts so the prototype matches the app we are cloning.
 */

export const MOCK_COINS = 1240;

export interface MockLevel {
  level: number;
  solved: number;
  total: number;
  unlocked: boolean;
}

export const MOCK_LEVELS: MockLevel[] = [
  { level: 1, solved: 10, total: 10, unlocked: true },
  { level: 2, solved: 10, total: 10, unlocked: true },
  { level: 3, solved: 6, total: 10, unlocked: true },
  { level: 4, solved: 0, total: 10, unlocked: false },
  { level: 5, solved: 0, total: 10, unlocked: false },
  { level: 6, solved: 0, total: 10, unlocked: false },
  { level: 7, solved: 0, total: 10, unlocked: false },
  { level: 8, solved: 0, total: 10, unlocked: false },
];

export interface MockQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export const MOCK_QUESTIONS: MockQuestion[] = [
  {
    id: 9001,
    question: 'Кто выиграл «Золотой мяч» в 2021 году?',
    options: ['Лионель Месси', 'Криштиану Роналду', 'Роберт Левандовски', 'Килиан Мбаппе'],
    correctAnswer: 'Лионель Месси',
    explanation: 'Седьмой «Золотой мяч» Месси — рекорд, который до сих пор никто не повторил.',
  },
  {
    id: 9002,
    question: 'Какая сборная выиграла чемпионат мира 2018 года?',
    options: ['Франция', 'Хорватия', 'Бразилия', 'Германия'],
    correctAnswer: 'Франция',
    explanation: 'В финале в Москве Франция обыграла Хорватию со счётом 4:2.',
  },
  {
    id: 9003,
    question: 'В каком клубе Криштиану Роналду начал профессиональную карьеру?',
    options: ['Спортинг', 'Бенфика', 'Порту', 'Манчестер Юнайтед'],
    correctAnswer: 'Спортинг',
    explanation: 'Роналду дебютировал за «Спортинг» из Лиссабона в 2002 году, в 17 лет.',
  },
  {
    id: 9004,
    question: 'Сколько игроков одной команды находится на поле?',
    options: ['11', '10', '12', '9'],
    correctAnswer: '11',
    explanation: 'Одиннадцать игроков, включая вратаря — правило не менялось с 1897 года.',
  },
  {
    id: 9005,
    question: 'Какой клуб выиграл больше всего Лиг чемпионов?',
    options: ['Реал Мадрид', 'Милан', 'Бавария', 'Ливерпуль'],
    correctAnswer: 'Реал Мадрид',
    explanation: 'У «Реала» 15 титулов — почти вдвое больше, чем у ближайшего преследователя.',
  },
];

/** Cost of skipping a question — mirrors Sport Quiz's HINT_SKIP_COST. */
export const SKIP_COST = 50;

/** Coin packs — identical to lib/sport-quiz/economy.ts COIN_PACKS. */
export const MOCK_PACKS = [
  { id: 'coins_100', coins: 100, price: '$0.99', popular: false },
  { id: 'coins_500', coins: 500, price: '$3.99', popular: true },
  { id: 'coins_1000', coins: 1000, price: '$6.99', popular: false },
];

export type WheelTier = 'base' | 'rare' | 'legendary';

/** Prizes + weights — identical to lib/sport-quiz/economy.ts WHEEL_PRIZES. */
export const MOCK_WHEEL_PRIZES: { id: string; coins: number; weight: number; tier: WheelTier }[] = [
  { id: 'coins100', coins: 100, weight: 90, tier: 'base' },
  { id: 'coins500', coins: 500, weight: 8, tier: 'rare' },
  { id: 'coins1000', coins: 1000, weight: 2, tier: 'legendary' },
];

/**
 * The eight wedges, in order — identical to WHEEL_SEGMENTS in Sport Quiz. This
 * is the WEDGE layout, not the odds: 1000 owns one wedge and 500 owns two, but
 * the real chance comes from the weights above (90 / 8 / 2).
 */
export const MOCK_WHEEL_SEGMENTS: string[] = [
  'coins100',
  'coins500',
  'coins100',
  'coins1000',
  'coins100',
  'coins500',
  'coins100',
  'coins100',
];

export function wheelPrizeById(id: string) {
  const p = MOCK_WHEEL_PRIZES.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown wheel prize id: ${id}`);
  return p;
}

/** Weighted pick — mirrors pickWheelPrizeIndex in Sport Quiz's economy. */
export function pickWheelPrize(rand: number) {
  const total = MOCK_WHEEL_PRIZES.reduce((s, p) => s + p.weight, 0);
  let threshold = rand * total;
  for (const p of MOCK_WHEEL_PRIZES) {
    threshold -= p.weight;
    if (threshold <= 0) return p;
  }
  return MOCK_WHEEL_PRIZES[MOCK_WHEEL_PRIZES.length - 1];
}
