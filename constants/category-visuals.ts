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

// Per-subcategory emoji. Slug-keyed; falls back to the parent's emoji
// for any subcategory not listed here.
export const SUBCATEGORY_EMOJI: Record<string, string> = {
  // Geography
  'geography-general': '🌐',
  'geography-capitals': '🏙️',
  'geography-flags': '🚩',
  'geography-landmarks': '🗽',
  'geography-physical': '⛰️',

  // History
  'history-ancient': '🏺',
  'history-modern': '📜',
  'history-world-wars': '⚔️',
  'history-famous-figures': '👑',

  // Science & Nature
  'science-and-nature-physics': '⚛️',
  'science-and-nature-chemistry': '🧪',
  'science-and-nature-biology': '🧬',
  'science-and-nature-space-astronomy': '🚀',

  // Arts & Literature
  'arts-literature-painting-visual-art': '🖼️',
  'arts-literature-world-literature': '📚',
  'arts-literature-architecture': '🏛️',
  'arts-literature-music-theatre': '🎭',

  // Sports
  'sports-football-soccer': '⚽',
  'sports-olympic-games': '🏅',
  'sports-team-sports': '🏐',
  'sports-legends-records': '🏆',

  // Entertainment
  'entertainment-movies': '🎬',
  'entertainment-tv-series': '📺',
  'entertainment-music': '🎵',
  'entertainment-pop-culture': '🌟',

  // General Knowledge
  'general-knowledge-mythology-folklore': '🧙',
  'general-knowledge-inventions-discoveries': '💡',
  'general-knowledge-world-cultures': '🎎',
  'general-knowledge-famous-quotes': '💬',
};
