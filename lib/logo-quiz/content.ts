/**
 * Backend-driven content for the Logo Quiz. Categories and questions come from
 * the shared snapshot API (`/apps/logo-quiz/snapshot?locale=…`) via the offline
 * content cache; these helpers turn that snapshot into the flat, already-
 * localized view-models the Logo Quiz screens render. Real brand artwork is
 * shown from each question's `image_url`.
 */
import { resolveLocalImage, type ContentSnapshot } from '@/lib/content-cache';

/** App slug the Logo Quiz always syncs, regardless of the build's APP_SLUG. */
export const LOGO_QUIZ_SLUG = 'logo-quiz';

/** Fallback tile emoji when a category has no `icon_emoji` in the backend. */
const DEFAULT_CATEGORY_EMOJI = '🏷️';

export interface LogoQuizCategory {
  /** Backend category slug — the stable key for progress and question lookup. */
  slug: string;
  /** Localized display name (snapshot is fetched per-locale). */
  name: string;
  /** Tile emoji (`icon_emoji`, or a sensible default when null). */
  emoji: string;
  /** VIP categories live on the separate VIP screen and stay premium-gated. */
  isVip: boolean;
  /** Total questions available in this category (0 for empty categories). */
  total: number;
}

export interface LogoQuizQuestion {
  id: number;
  /** Correct brand name — the answer the player must pick. */
  brand: string;
  /** Answer choices exactly as served by the backend. */
  options: string[];
  /** Index of the correct option within `options`. */
  correctIndex: number;
  /** Local (or remote) URI of the real brand logo; null if none. */
  imageUri: string | null;
  /** Localized explanation shown on the result screen; may be null/empty. */
  explanation: string | null;
}

/** One answered question carried to the result screen via LogoQuizProvider. */
export interface RoundQuestionResult {
  id: number;
  brand: string;
  /** Whether the player cleared this level (true also for a skip/reveal). */
  correct: boolean;
  explanation: string | null;
}

/** Count questions per category slug across the whole snapshot. */
function countQuestionsBySlug(snapshot: ContentSnapshot): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const q of snapshot.questions) {
    if (q.category_slug) {
      counts[q.category_slug] = (counts[q.category_slug] ?? 0) + 1;
    }
  }
  return counts;
}

/**
 * Flat list of categories for one section. `isVip=false` builds the regular
 * screen, `isVip=true` the VIP screen. Empty categories are kept (they render
 * a 0/0 count) so the grid mirrors the backend exactly.
 */
export function buildCategories(snapshot: ContentSnapshot, isVip: boolean): LogoQuizCategory[] {
  const counts = countQuestionsBySlug(snapshot);
  return snapshot.categories
    .filter((cat) => !!cat.is_vip === isVip)
    .map((cat) => ({
      slug: cat.slug,
      name: cat.name,
      emoji: cat.icon_emoji || DEFAULT_CATEGORY_EMOJI,
      isVip: !!cat.is_vip,
      total: counts[cat.slug] ?? 0,
    }));
}

/**
 * Questions for a category, in backend order, with the real logo resolved to a
 * cached local file when available (falling back to the remote URL).
 */
export function questionsForCategory(
  snapshot: ContentSnapshot,
  categorySlug: string,
): LogoQuizQuestion[] {
  return snapshot.questions
    .filter((q) => q.category_slug === categorySlug)
    .map((q) => ({
      id: q.id,
      brand: q.options[q.correct_option] ?? '',
      options: q.options,
      correctIndex: q.correct_option,
      imageUri: resolveLocalImage(snapshot, q.image_url),
      explanation: q.explanation,
    }));
}
