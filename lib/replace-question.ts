/**
 * Pure candidate picker for the "Replace question" hint. Given the full
 * question pool (the loaded content snapshot), it finds an UNUSED question to
 * swap in for the current one.
 *
 * NOTE on "same difficulty/level": the data model has no difficulty field on a
 * question — the only per-question metadata is `category_slug` (the
 * subcategory) plus, in Hard mode, whether the answer text is playable
 * (`eligible`). So "same difficulty/level" is honored via the best available
 * proxies: same subcategory + (in Hard mode) the same Hard-eligibility filter.
 * When the current question carries no slug (e.g. it came from the live API
 * fallback rather than the snapshot) we fall back to any eligible question.
 *
 * Kept as a pure, dependency-free function so it can be unit tested directly.
 */

export interface ReplaceCandidate {
  id: number;
  category_slug?: string | null;
  options?: string[];
  correct_option: number;
}

export interface FindReplacementArgs<T extends ReplaceCandidate> {
  /** Full pool to draw from (typically snapshot.questions). */
  pool: T[];
  /** Id of the question being replaced. */
  currentId: number;
  /** Ids to exclude — already in this session AND already seen historically. */
  excludeIds: Set<number>;
  /** Optional eligibility gate (Hard mode). Omit to accept any question. */
  eligible?: (q: T) => boolean;
  /** Injectable RNG for deterministic tests. Defaults to Math.random. */
  random?: () => number;
}

/**
 * Returns a fresh question of the same subcategory (when known) that is not
 * excluded, or null when none is available. Never returns the current question.
 */
export function findReplacementQuestion<T extends ReplaceCandidate>(
  args: FindReplacementArgs<T>,
): T | null {
  const { pool, currentId, excludeIds, eligible } = args;
  const random = args.random ?? Math.random;

  const current = pool.find((q) => q.id === currentId) ?? null;
  const targetSlug = current?.category_slug ?? null;

  const candidates = pool.filter((q) => {
    if (q.id === currentId) return false;
    if (excludeIds.has(q.id)) return false;
    // Same subcategory when the current question has one.
    if (targetSlug != null && (q.category_slug ?? null) !== targetSlug) return false;
    if (eligible && !eligible(q)) return false;
    return true;
  });

  if (candidates.length === 0) return null;
  const idx = Math.floor(random() * candidates.length);
  return candidates[idx] ?? candidates[0];
}
