import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'quiz.mistakes.v1';
const MAX = 200;

interface MistakeStore {
  ids: number[];
}

async function read(): Promise<number[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MistakeStore;
    return Array.isArray(parsed.ids) ? parsed.ids : [];
  } catch {
    return [];
  }
}

async function write(ids: number[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify({ ids }));
  } catch {
    // best-effort
  }
}

export async function recordMistake(questionId: number): Promise<void> {
  const ids = await read();
  // Drop duplicates so repeat-mistakes don't crowd out other questions,
  // and re-insert at the head so the most recently failed Q surfaces
  // first when the player taps "Mistakes".
  const without = ids.filter((id) => id !== questionId);
  const next = [questionId, ...without].slice(0, MAX);
  await write(next);
}

export async function getMistakeIds(): Promise<number[]> {
  return read();
}

export async function clearMistakes(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
