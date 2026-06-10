import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ContentSnapshot } from '@/lib/content-cache';

const KEY = 'quiz.today.v1';

interface TodayPick {
  /** Local YYYY-MM-DD the question was chosen on. */
  date: string;
  /** Locale the snapshot was localized in when we picked. */
  locale: string;
  /** ID of the picked question. */
  questionId: number;
}

/**
 * Local-time YYYY-MM-DD. We deliberately use the device's local clock,
 * not UTC, so "today's question" rolls over at the player's midnight.
 */
function todayKey(): string {
  const d = new Date();
  const yyyy = d.getFullYear().toString().padStart(4, '0');
  const mm = (d.getMonth() + 1).toString().padStart(2, '0');
  const dd = d.getDate().toString().padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

async function read(): Promise<TodayPick | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as TodayPick;
  } catch {
    return null;
  }
}

async function write(pick: TodayPick): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(pick));
  } catch {
    // best-effort
  }
}

/**
 * Resolve the player's "today's question" — the same question for the
 * whole local day. Re-launches and Play Again from Results land on the
 * same question until midnight rolls over. If the previously stored ID
 * has dropped out of the snapshot (rare — content edits or locale
 * switch), we pick a fresh one and persist that instead.
 */
export async function getTodayQuestionId(snapshot: ContentSnapshot): Promise<number | null> {
  if (snapshot.questions.length === 0) return null;

  const today = todayKey();
  const stored = await read();

  if (
    stored
    && stored.date === today
    && stored.locale === snapshot.locale
    && snapshot.questions.some((q) => q.id === stored.questionId)
  ) {
    return stored.questionId;
  }

  const idx = Math.floor(Math.random() * snapshot.questions.length);
  const picked = snapshot.questions[idx];
  await write({ date: today, locale: snapshot.locale, questionId: picked.id });
  return picked.id;
}
