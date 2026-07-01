import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'quiz.hints.v1';

// The canonical hint set is exactly these three. The former 'ai'
// (explanation) and 'letter' (reveal-letter) kinds were removed; any
// persisted counts for them are simply ignored on read.
export type HintKind = 'fiftyFifty' | 'statistics' | 'replaceQuestion';

export type HintsState = Record<HintKind, number>;

const DEFAULTS: HintsState = {
  fiftyFifty: 3,
  statistics: 2,
  replaceQuestion: 1,
};

async function read(): Promise<HintsState> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<HintsState>;
    return {
      fiftyFifty: typeof parsed.fiftyFifty === 'number' ? parsed.fiftyFifty : DEFAULTS.fiftyFifty,
      statistics: typeof parsed.statistics === 'number' ? parsed.statistics : DEFAULTS.statistics,
      replaceQuestion:
        typeof parsed.replaceQuestion === 'number' ? parsed.replaceQuestion : DEFAULTS.replaceQuestion,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

async function write(state: HintsState): Promise<void> {
  try { await AsyncStorage.setItem(KEY, JSON.stringify(state)); } catch {}
}

export async function getHints(): Promise<HintsState> {
  return read();
}

export async function consumeHint(kind: HintKind): Promise<number> {
  const state = await read();
  const cur = state[kind] ?? 0;
  if (cur <= 0) return 0;
  const next = { ...state, [kind]: cur - 1 };
  await write(next);
  return next[kind];
}

export async function addHints(kind: HintKind, amount: number): Promise<number> {
  const state = await read();
  const next = { ...state, [kind]: (state[kind] ?? 0) + amount };
  await write(next);
  return next[kind];
}

export async function addHintsBundle(amount: Partial<Record<HintKind, number>>): Promise<HintsState> {
  const state = await read();
  const next: HintsState = { ...state };
  for (const [k, v] of Object.entries(amount)) {
    const key = k as HintKind;
    next[key] = (next[key] ?? 0) + (v ?? 0);
  }
  await write(next);
  return next;
}
