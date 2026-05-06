export interface CategoryVisual {
  emoji: string;
  gradient: readonly [string, string];
}

// Slug-keyed so backend can rename a display name without breaking the
// brand colors / icons. An explicit slug change is the only thing that
// would need a sync here.
export const CATEGORY_VISUALS: Record<string, CategoryVisual> = {
  geography: { emoji: '🌍', gradient: ['#4f6df5', '#7c5cff'] },
  history: { emoji: '🏛️', gradient: ['#c97a3f', '#8a4a2a'] },
  'science-and-nature': { emoji: '🔬', gradient: ['#3aa37a', '#1f6f55'] },
  'arts-literature': { emoji: '🎨', gradient: ['#e0529c', '#a23ad6'] },
  sports: { emoji: '⚽', gradient: ['#f59f3a', '#d6533a'] },
  entertainment: { emoji: '🎬', gradient: ['#7c5cff', '#3aa6ff'] },
  'general-knowledge': { emoji: '💡', gradient: ['#ffd23a', '#f59f3a'] },
};

export const FALLBACK_VISUAL: CategoryVisual = {
  emoji: '📚',
  gradient: ['#5a5fb8', '#3a3f8a'],
};
