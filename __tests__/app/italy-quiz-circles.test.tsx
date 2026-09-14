/**
 * End-to-end drive of the Italy Quiz circle model through the REAL screens —
 * `app/italy-quiz/places.tsx` and `app/italy-quiz/quiz.tsx` — rather than through
 * the hooks underneath them. It walks the exact scenario the feature was
 * specified against:
 *
 *   fresh player → Rome circle 1 → 10 of 20 → circle cleared, Florence still
 *     four circles away (the city gate costs five)
 *   → re-entering circle 1 serves the SAME twenty in the same order
 *   → a mistakes review changes no stars
 *   → circle 2 reads "soon", because Rome's content is one circle deep
 *
 * Everything mocked here is a native/visual leaf (gradients, svg, icons,
 * haptics, the slider's gesture surface). The screens, the draw, the progress
 * record and AsyncStorage are all real.
 */
import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ROME_QUESTIONS } from '@/constants/italy-quiz/questions/rome';

// --- controllable mock state -------------------------------------------------

let mockParams: Record<string, string> = {};
const mockPush = jest.fn();
const mockDismissTo = jest.fn();

// --- module boundaries -------------------------------------------------------

jest.mock('expo-router', () => {
  const ReactModule = require('react');
  return {
    router: {
      push: (...args: unknown[]) => mockPush(...args),
      back: jest.fn(),
      dismissTo: (...args: unknown[]) => mockDismissTo(...args),
    },
    useLocalSearchParams: () => mockParams,
    // The REAL hook runs its callback on focus; usePlaceProgress hydrates there.
    useFocusEffect: (effect: () => undefined | (() => void)) =>
      ReactModule.useEffect(effect, [effect]),
  };
});

jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('react-native-safe-area-context', () => {
  const ReactModule = require('react');
  const { View: RNView } = require('react-native');
  return {
    SafeAreaView: ({ children, ...props }: { children: React.ReactNode }) =>
      ReactModule.createElement(RNView, props, children),
  };
});
jest.mock('expo-linear-gradient', () => {
  const ReactModule = require('react');
  const { View: RNView } = require('react-native');
  return {
    LinearGradient: ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactModule.createElement(RNView, props, children),
  };
});
jest.mock('react-native-svg', () => {
  const ReactModule = require('react');
  const { View: RNView } = require('react-native');
  const Stub = ({ children, ...props }: { children?: React.ReactNode }) =>
    ReactModule.createElement(RNView, props, children);
  return { __esModule: true, default: Stub, Svg: Stub, Path: Stub };
});
// Icons keep their NAME reachable, so the padlock can be asserted on.
jest.mock('@expo/vector-icons', () => {
  const ReactModule = require('react');
  const { View: RNView } = require('react-native');
  return {
    Ionicons: ({ name }: { name: string }) =>
      ReactModule.createElement(RNView, { testID: `icon-${name}` }),
  };
});
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
}));
jest.mock('expo-asset', () => ({ Asset: { loadAsync: jest.fn(() => Promise.resolve([])) } }));
jest.mock('@/components/italy-quiz/app-background', () => ({
  AppBackground: () => null,
  BG_BASE: '#0B1F52',
  useItalyBgReady: () => true,
}));
jest.mock('@/components/logo-quiz/quiz-menu-modal', () => ({ QuizMenuModal: () => null }));
jest.mock('@/lib/store-links', () => ({ getStoreLinks: () => ({ storeUrl: 'https://example' }) }));
jest.mock('@/hooks/use-locale', () => ({ useLocale: () => ({ locale: 'ru' }) }));
/**
 * The slider is a PanResponder surface that RNTL cannot drag. Replaced by four
 * plain taps that report the same notch index down the same `onChange`, so the
 * ANSWER path under test is the real one. The gesture itself is covered by its
 * own suite and verified visually.
 */
jest.mock('@/components/italy-quiz/notched-slider', () => {
  const ReactModule = require('react');
  const { Pressable, View: RNView } = require('react-native');
  return {
    NotchedSlider: ({ count, onChange }: { count: number; onChange: (n: number) => void }) =>
      ReactModule.createElement(
        RNView,
        null,
        Array.from({ length: count }, (_, i) =>
          ReactModule.createElement(Pressable, {
            key: i,
            testID: `notch-${i}`,
            onPress: () => onChange(i),
          }),
        ),
      ),
  };
});

// jest.mock is hoisted above these, so the screens close over the stubs above.
const ItalyQuizPlaces = require('@/app/italy-quiz/places').default;
const ItalyQuizGame = require('@/app/italy-quiz/quiz').default;

// --- helpers -----------------------------------------------------------------

const byId = new Map(ROME_QUESTIONS.map((q) => [q.id, q]));

/**
 * The locked-city caption, keyed by the GATE city — the one whose circles hold
 * the key. It is a single text node carrying two lines: the requirement, then
 * where to go and meet it. Spelled out in full rather than assembled from the
 * label table, the way every other RU string in this suite is, so that a change
 * to the copy shows up here as a diff and not as a silently passing assertion.
 */
const GATE_CTA: Record<string, string> = {
  rome: 'Пройдите ещё 5 кругов\nРим',
  venice: 'Пройдите ещё 5 кругов\nВенеция',
  milan: 'Пройдите ещё 5 кругов\nМилан и Север',
};

const ACT_CTA: Record<string, string> = {
  'middle-ages': 'В Средние века',
  renaissance: 'В Возрождение',
  today: 'В наши дни',
};

/**
 * The AsyncStorage jest mock defers through setImmediate, which fake timers
 * hold — so flushing has to tick the clock as well as the microtask queue, or
 * every storage read stalls forever. 1ms is far short of WRONG_ADVANCE_MS, so
 * this can never fire the auto-advance early.
 */
const flush = () =>
  act(async () => {
    jest.advanceTimersByTime(1);
  });

async function readCircleIds(): Promise<number[]> {
  const raw = await AsyncStorage.getItem('italy.progress.v2');
  return JSON.parse(raw!).rome.circles.find((c: { index: number }) => c.index === 1).ids;
}

/** Walk a whole circle, getting the first `correctCount` questions right. */
async function playCircle(ids: number[], correctCount: number) {
  fireEvent.press(screen.getByText('Поехали'));
  await flush();

  for (let i = 0; i < ids.length; i++) {
    const q = byId.get(ids[i])!;
    // An act boundary raises the interlude card before the question.
    if (i > 0 && byId.get(ids[i - 1])!.act !== q.act) {
      fireEvent.press(screen.getByText(ACT_CTA[q.act]));
      await flush();
    }

    const wantCorrect = i < correctCount;
    const pick = wantCorrect ? q.correct : (q.correct + 1) % q.options.length;

    if (q.estimate) {
      fireEvent.press(screen.getByTestId(`notch-${pick}`));
      await flush();
      fireEvent.press(screen.getByText('Ответить'));
    } else {
      fireEvent.press(screen.getByText(q.options[pick].ru));
    }
    await flush();

    if (wantCorrect) {
      fireEvent.press(screen.getByText(i + 1 >= ids.length ? 'Завершить' : 'Далее'));
      await flush();
    } else {
      // A wrong pick reveals nothing and auto-advances after WRONG_ADVANCE_MS.
      await act(async () => {
        jest.advanceTimersByTime(800);
      });
    }
  }
  // Banking the circle is a serialised read-modify-write over AsyncStorage, so
  // the outcome the result screen reads lands several microtask rounds later.
  for (let i = 0; i < 6; i++) await flush();
}

async function openMap() {
  mockParams = {};
  const view = render(<ItalyQuizPlaces />);
  await waitFor(() => expect(screen.getByText('Куда поедем?')).toBeTruthy());
  return view;
}

beforeEach(async () => {
  await AsyncStorage.clear();
  // Silence the first-run help sheet except where it is the thing under test.
  await AsyncStorage.setItem('italy.help.seen.v3', '1');
  mockParams = {};
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('the map on a fresh install', () => {
  it('offers Rome circle 1 and nothing else', async () => {
    await openMap();

    fireEvent.press(screen.getByText('Рим'));
    await flush();

    // The button names the circle it will open.
    expect(screen.getByText('Круг 1')).toBeTruthy();
    // Ten slots, and only the first one is live.
    for (let n = 1; n <= 10; n++) expect(screen.getByTestId(`italy-circle-${n}`)).toBeTruthy();
    expect(screen.getByTestId('italy-circle-1').props.accessibilityState?.disabled).toBeFalsy();
    expect(screen.getByTestId('italy-circle-2').props.accessibilityState?.disabled).toBe(true);

    fireEvent.press(screen.getByText('Круг 1'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/italy-quiz/quiz',
      params: { place: 'rome', circle: '1' },
    });
  });

  it('shows Florence locked by the chain, with the count and the city on two lines', async () => {
    await openMap();

    fireEvent.press(screen.getByText('Флоренция и Тоскана'));
    await flush();

    // Selectable on purpose: a dead pin cannot explain why it is dead. The
    // caption is ONE text node holding two lines — requirement, then where.
    expect(screen.getByText(GATE_CTA.rome)).toBeTruthy();
    fireEvent.press(screen.getByText(GATE_CTA.rome));
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('puts every other place on the chain too, each naming its own gate', async () => {
    await openMap();

    // Sicily used to be untappable dead weight; it is now a stop on the tour,
    // three cities along, and says so.
    fireEvent.press(screen.getByText('Сицилия'));
    await flush();
    expect(screen.getByText(GATE_CTA.venice)).toBeTruthy();

    fireEvent.press(screen.getByText('Вся Италия'));
    await flush();
    expect(screen.getByText(GATE_CTA.milan)).toBeTruthy();
  });

  it('auto-opens the help sheet once, explaining circles before the first tour', async () => {
    await AsyncStorage.removeItem('italy.help.seen.v3');
    await openMap();
    await waitFor(() => expect(screen.getByText('Как это устроено')).toBeTruthy());

    expect(screen.getByText('Круг — это 20 вопросов')).toBeTruthy();
    expect(screen.getByText('Звёзды и проходной балл')).toBeTruthy();
    expect(screen.getByText('Что открывается дальше')).toBeTruthy();
    expect(screen.getByText('Работа над ошибками')).toBeTruthy();

    // …and not again on the next visit.
    screen.unmount();
    await openMap();
    await flush();
    expect(screen.queryByText('Как это устроено')).toBeNull();
  });
});

describe('playing Rome circle 1', () => {
  async function enterCircle(index = 1) {
    mockParams = { place: 'rome', circle: String(index) };
    const view = render(<ItalyQuizGame />);
    await flush();
    return view;
  }

  it('clears the circle at 10 of 20 without yet opening Florence', async () => {
    await enterCircle();
    const ids = await readCircleIds();
    expect(ids).toHaveLength(20);

    await playCircle(ids, 10);

    expect(screen.getByText('Результат')).toBeTruthy();
    expect(screen.getByText('10/20')).toBeTruthy();
    expect(screen.getByText('Рим · Круг 1')).toBeTruthy();
    expect(screen.getByText('Круг пройден!')).toBeTruthy();
    // One circle of five: no city yet, and no next circle either, because Rome's
    // content is exactly one circle deep.
    expect(screen.queryByText(/Новый город на карте/)).toBeNull();
    expect(screen.queryByText(/Открылся круг/)).toBeNull();
    expect(screen.getByText('Дальше')).toBeTruthy();
    expect(screen.queryByText('Играть снова')).toBeNull();

    fireEvent.press(screen.getByText('Дальше'));
    expect(mockDismissTo).toHaveBeenCalledWith('/italy-quiz/places');
  });

  it('states the rule instead of a nudge when the gate is missed', async () => {
    await enterCircle();
    const ids = await readCircleIds();

    await playCircle(ids, 9);

    expect(screen.getByText('9/20')).toBeTruthy();
    expect(screen.getByText('Чтобы пройти круг, нужно 10 правильных из 20.')).toBeTruthy();
    expect(screen.queryByText('Круг пройден!')).toBeNull();
    expect(screen.queryByText(/Новый город на карте/)).toBeNull();
  });
});

describe('after clearing Rome circle 1', () => {
  /** Drive the real screen once so the record is written the way play writes it. */
  async function clearCircleOne() {
    mockParams = { place: 'rome', circle: '1' };
    render(<ItalyQuizGame />);
    await flush();
    const ids = await readCircleIds();
    await playCircle(ids, 10);
    screen.unmount();
    return ids;
  }

  it('serves the SAME twenty in the same order on re-entry', async () => {
    const ids = await clearCircleOne();

    mockParams = { place: 'rome', circle: '1' };
    render(<ItalyQuizGame />);
    await flush();

    expect(await readCircleIds()).toEqual(ids);
    // And the screen is actually walking that set: its first question is the one
    // the fixed order names.
    fireEvent.press(screen.getByText('Поехали'));
    await flush();
    expect(screen.getByText(byId.get(ids[0])!.question.ru)).toBeTruthy();
  });

  it('shows the map with one star, circle 2 "soon", and Florence still shut', async () => {
    await clearCircleOne();
    await openMap();

    fireEvent.press(screen.getByText('Рим'));
    await flush();

    // The cleared circle is offered as a replay, not as a fresh circle.
    expect(screen.getByText('Круг 1 · ещё раз')).toBeTruthy();
    // Circle 2 exists but cannot be entered — its questions are not written.
    expect(screen.getByTestId('italy-circle-2').props.accessibilityState?.disabled).toBe(true);

    // Florence still costs four more circles, and the caption counts down rather
    // than repeating the target — that is what keeps the locked pin honest while
    // no city has content for five.
    fireEvent.press(screen.getByText('Флоренция и Тоскана'));
    await flush();
    expect(screen.queryByText(GATE_CTA.rome)).toBeNull();
    expect(screen.getByText('Пройдите ещё 4 круга\nРим')).toBeTruthy();
  });

  it('refuses circle 2 with "soon" rather than a crash when deep-linked', async () => {
    await clearCircleOne();

    mockParams = { place: 'rome', circle: '2' };
    render(<ItalyQuizGame />);
    await flush();

    expect(screen.getByText('Вопросы для этого круга ещё готовятся.')).toBeTruthy();
  });

  it('clamps a nonsense circle number instead of crashing', async () => {
    mockParams = { place: 'rome', circle: '99' };
    render(<ItalyQuizGame />);
    await flush();
    // Clamped to 10, which is locked by progress → the generic empty line.
    expect(screen.getByText('Здесь пока нет вопросов.')).toBeTruthy();
  });
});

describe('the mistakes review', () => {
  it('replays only the misses and changes no stars', async () => {
    mockParams = { place: 'rome', circle: '1' };
    render(<ItalyQuizGame />);
    await flush();
    const ids = await readCircleIds();

    await playCircle(ids, 10);
    const afterFirst = JSON.parse((await AsyncStorage.getItem('italy.progress.v2'))!);
    expect(afterFirst.rome.circles[0]).toMatchObject({ stars: 1, bestPct: 50, plays: 1 });

    fireEvent.press(screen.getByText('Работа над ошибками (10)'));
    await flush();

    // A review shows no stars, no gate line and no unlock — it changes nothing.
    const misses = ids.slice(10);
    for (let i = 0; i < misses.length; i++) {
      const q = byId.get(misses[i])!;
      const pick = q.correct;
      if (q.estimate) {
        fireEvent.press(screen.getByTestId(`notch-${pick}`));
        await flush();
        fireEvent.press(screen.getByText('Ответить'));
      } else {
        fireEvent.press(screen.getByText(q.options[pick].ru));
      }
      await flush();
      fireEvent.press(screen.getByText(i + 1 >= misses.length ? 'Завершить' : 'Далее'));
      await flush();
    }

    expect(screen.getByText('10/10')).toBeTruthy();
    expect(screen.queryByText('Круг пройден!')).toBeNull();
    expect(screen.queryByText('Рим · Круг 1')).toBeNull();

    const afterReview = JSON.parse((await AsyncStorage.getItem('italy.progress.v2'))!);
    expect(afterReview.rome.circles[0]).toEqual(afterFirst.rome.circles[0]);
  });
});

describe('a player upgrading from the v1 record', () => {
  it('keeps their stars and finds them on circle 1 of the map', async () => {
    // Exactly one tour's worth of `seen` — in v1 that IS the tour that was played.
    const seen = ROME_QUESTIONS.filter((q) => q.act === 'antiquity')
      .slice(0, 5)
      .concat(ROME_QUESTIONS.filter((q) => q.act === 'middle-ages').slice(0, 5))
      .concat(ROME_QUESTIONS.filter((q) => q.act === 'renaissance').slice(0, 5))
      .concat(ROME_QUESTIONS.filter((q) => q.act === 'today').slice(0, 5))
      .map((q) => q.id);
    const v1 = JSON.stringify({ rome: { stars: 2, bestPct: 85, plays: 3, seen } });
    await AsyncStorage.setItem('italy.progress.v1', v1);

    await openMap();
    fireEvent.press(screen.getByText('Рим'));
    await waitFor(() => expect(screen.getByText('Круг 1 · ещё раз')).toBeTruthy());

    // Their two stars became circle 1's.
    expect(JSON.parse((await AsyncStorage.getItem('italy.progress.v2'))!).rome.circles).toEqual([
      { index: 1, ids: seen, stars: 2, bestPct: 85, plays: 3 },
    ]);
    expect(await AsyncStorage.getItem('italy.progress.v1')).toBe(v1);

    // Two stars is still ONE cleared circle, so Florence stays shut with four
    // owed — a v1 record can never have held more than one circle's worth.
    fireEvent.press(screen.getByText('Флоренция и Тоскана'));
    await flush();
    expect(screen.getByText('Пройдите ещё 4 круга\nРим')).toBeTruthy();
  });
});
