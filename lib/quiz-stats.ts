import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'quiz.stats.v1';
const SEEN_PREFIX = 'quiz.seen.v1.';

interface QuizStats {
  /** Number of quiz sessions the player has finished. */
  quizzesTaken: number;
  /** Total seconds spent across all finished quizzes. */
  totalSeconds: number;
  /** Total questions the player has answered. */
  totalQuestions: number;
  /** Of those, how many were correct. */
  totalCorrect: number;
  /** Quizzes finished with 100% (and at least PERFECT_MIN questions). */
  perfectQuizzes: number;
}

const EMPTY: QuizStats = {
  quizzesTaken: 0,
  totalSeconds: 0,
  totalQuestions: 0,
  totalCorrect: 0,
  perfectQuizzes: 0,
};

/** Min questions for a 100%-correct run to count as a "perfect" quiz. */
const PERFECT_MIN = 5;

export async function getStats(): Promise<QuizStats> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<QuizStats>;
    return {
      quizzesTaken: parsed.quizzesTaken ?? 0,
      totalSeconds: parsed.totalSeconds ?? 0,
      totalQuestions: parsed.totalQuestions ?? 0,
      totalCorrect: parsed.totalCorrect ?? 0,
      perfectQuizzes: parsed.perfectQuizzes ?? 0,
    };
  } catch {
    return EMPTY;
  }
}

interface RecordInput {
  questionsAnswered: number;
  correct: number;
  durationSeconds: number;
  /**
   * Whether this counts as a completed quiz (bumps quizzesTaken and is
   * eligible for the "perfect run" badge). Early exits pass false: the
   * answered questions, correct count and time still accrue, but the
   * session isn't tallied as a finished quiz.
   */
  countAsQuiz?: boolean;
}

/**
 * Add the results of a quiz session to the running totals. Called from
 * the quiz screen on natural finish (countAsQuiz=true) and on early
 * exit (countAsQuiz=false). Failures are swallowed — stats are best-
 * effort, never block UX.
 */
export async function recordQuizCompletion(input: RecordInput): Promise<void> {
  if (input.questionsAnswered <= 0) return;
  const countAsQuiz = input.countAsQuiz ?? true;
  // 100% on a long-enough quiz = a perfect run. Only full completions
  // are eligible — bailing early never earns the perfect badge.
  const isPerfect =
    countAsQuiz
    && input.questionsAnswered >= PERFECT_MIN
    && input.correct === input.questionsAnswered;
  try {
    const current = await getStats();
    const next: QuizStats = {
      quizzesTaken: current.quizzesTaken + (countAsQuiz ? 1 : 0),
      totalSeconds: current.totalSeconds + Math.max(0, Math.round(input.durationSeconds)),
      totalQuestions: current.totalQuestions + input.questionsAnswered,
      totalCorrect: current.totalCorrect + input.correct,
      perfectQuizzes: current.perfectQuizzes + (isPerfect ? 1 : 0),
    };
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // best-effort
  }
}

/**
 * Union of every distinct question id the player has been served,
 * across all seen-set buckets (per-category, __all__, hard variants).
 * The stats screen resolves these ids back to their subject via the
 * snapshot — that way questions seen in mixed-category modes like
 * "10 random" still count toward the right subject, which a per-slug
 * bucket count can't do (the __all__ bucket has no subject of its own).
 */
export async function getAllSeenIds(): Promise<Set<number>> {
  const ids = new Set<number>();
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const seenKeys = allKeys.filter((k) => k.startsWith(SEEN_PREFIX));
    if (seenKeys.length === 0) return ids;
    const pairs = await AsyncStorage.multiGet(seenKeys);
    for (const [, value] of pairs) {
      if (!value) continue;
      try {
        const parsed = JSON.parse(value) as { ids?: number[] };
        if (Array.isArray(parsed.ids)) {
          for (const id of parsed.ids) ids.add(id);
        }
      } catch {
        // skip malformed bucket
      }
    }
  } catch {
    // ignore
  }
  return ids;
}

export async function clearStats(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
