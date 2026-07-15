import type { StringKey } from '@/i18n/strings';
import type { LogoCategory } from '@/lib/logo-quiz-content';

/**
 * Pure Logo Quiz logic — no React, no I/O — so it can be unit-tested in
 * isolation and reused across screens.
 */

/** Points awarded per correct logo answer (mockup shows 320 = 8 × 40). */
export const POINTS_PER_QUESTION = 40;

/** Score in points from a count of correct answers. */
export function computePoints(correctCount: number): number {
  if (!Number.isFinite(correctCount) || correctCount <= 0) return 0;
  return Math.floor(correctCount) * POINTS_PER_QUESTION;
}

/**
 * Whether the AI-topic-input screen is reachable. Premium-only: a loading
 * (`null`) or non-premium flag both deny access, so a race during
 * hydration never leaks the gated screen.
 */
export function canAccessAiTopicInput(isPremium: boolean | null): boolean {
  return isPremium === true;
}

/**
 * Whether a category shows the lock badge / routes to the paywall. Premium
 * categories are locked unless the player is confirmed premium; a loading
 * (`null`) flag is treated as non-premium so nothing unlocks prematurely.
 */
export function isCategoryLocked(category: LogoCategory, isPremium: boolean | null): boolean {
  return category.premium && isPremium !== true;
}

/** Answer-choice letter badge (A/B/C/D), matching the main quiz convention. */
const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export function optionLetter(index: number): string {
  return OPTION_LETTERS[index] ?? String.fromCharCode(65 + index);
}

/** i18n key for a category's localized display name (`logoQuiz.category.<slug>`). */
export function categoryNameKey(slug: string): StringKey {
  return `logoQuiz.category.${slug}` as StringKey;
}
