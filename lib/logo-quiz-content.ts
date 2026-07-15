import type { Question } from '@/api/types';
import type { LogoQuizAccent } from '@/constants/logo-quiz-theme';

/**
 * Logo Quiz content layer.
 *
 * The real logo catalog (brand images per category) depends on backend
 * #721, which isn't available yet. Until then this module serves typed
 * MOCK data behind async getters that mirror a future network/cache
 * source, so screens are written against the real async shape and the
 * seam can be swapped without touching UI.
 *
 * TODO(#721): replace the in-module mock arrays below with a real source
 * (e.g. a content-cache snapshot of logo categories/questions). Keep the
 * public getters — `getLogoCategories`, `getLogoQuestions` — and the
 * `LogoCategory` / `LogoQuestion` shapes stable so callers don't change.
 */

export interface LogoCategory {
  /** Stable slug used for navigation params and lookups. */
  slug: string;
  /** Display name (localized at render time via i18n; this is the fallback). */
  name: string;
  /** Neon accent hue driving the card glow. */
  accent: LogoQuizAccent;
  /** How many logos the category advertises (mockup shows "N логотипов"). */
  logoCount: number;
  /** Behind the premium paywall — card shows a lock badge. */
  premium: boolean;
  /** Placeholder brand glyph shown until real thumbnails exist. */
  glyph: string;
}

export interface LogoQuestion {
  id: number;
  /** The correct brand — also the correct answer text. */
  brand: string;
  /** Four answer choices (includes `brand`). */
  options: string[];
  /** Index into `options` of the correct brand. */
  correctOption: number;
  /**
   * Remote/asset logo image. Null in the mock (no backend images yet);
   * the logo card falls back to `glyph`. TODO(#721): populate from DB.
   */
  logoUri: string | null;
  /** Placeholder glyph rendered when `logoUri` is absent. */
  glyph: string;
}

// Fixed prompt shown for every logo question; unused by scoring but kept
// on the mapped Question so the engine's shape is fully populated.
const LOGO_PROMPT = 'logo';

// --- MOCK DATA (TODO(#721): replace with backend content) -----------------

const CATEGORIES: LogoCategory[] = [
  { slug: 'auto', name: 'Автомобильные бренды', accent: 'cyan', logoCount: 24, premium: false, glyph: '🚗' },
  { slug: 'fashion', name: 'Мировая мода', accent: 'magenta', logoCount: 30, premium: true, glyph: '👜' },
  { slug: 'tech', name: 'Техно-гиганты', accent: 'purple', logoCount: 28, premium: false, glyph: '💾' },
  { slug: 'food', name: 'Фастфуд и еда', accent: 'gold', logoCount: 20, premium: false, glyph: '🍔' },
  { slug: 'sport', name: 'Спортивные бренды', accent: 'green', logoCount: 32, premium: false, glyph: '🏋️' },
  { slug: 'media', name: 'Стриминг и медиа', accent: 'magenta', logoCount: 18, premium: true, glyph: '▶️' },
];

// Fictional brands keep the mock free of trademark concerns while the
// gameplay/scoring is exercised end-to-end. Each question carries a
// glyph placeholder in lieu of a real logo image.
const QUESTIONS: Record<string, LogoQuestion[]> = {
  auto: [
    { id: 1001, brand: 'Velocitá', options: ['Velocitá', 'Motoric', 'Autolux', 'Драйв線'], correctOption: 0, logoUri: null, glyph: '🚗' },
    { id: 1002, brand: 'Northwind', options: ['Cruz Motors', 'Northwind', 'Ferro', 'Apex Auto'], correctOption: 1, logoUri: null, glyph: '🏎️' },
    { id: 1003, brand: 'Ferro', options: ['Volt', 'Rover One', 'Ferro', 'Zenith'], correctOption: 2, logoUri: null, glyph: '🚙' },
    { id: 1004, brand: 'Apex Auto', options: ['Velocitá', 'Motoric', 'Autolux', 'Apex Auto'], correctOption: 3, logoUri: null, glyph: '🚐' },
    { id: 1005, brand: 'Voltiq', options: ['Voltiq', 'Northwind', 'Cruz Motors', 'Zenith'], correctOption: 0, logoUri: null, glyph: '⚡' },
  ],
  fashion: [
    { id: 2001, brand: 'Maison Vela', options: ['Maison Vela', 'Atelier Nord', 'Lumo', 'Sévigné'], correctOption: 0, logoUri: null, glyph: '👗' },
    { id: 2002, brand: 'Atelier Nord', options: ['Vestige', 'Atelier Nord', 'Lumo', 'Cara'], correctOption: 1, logoUri: null, glyph: '👠' },
    { id: 2003, brand: 'Sévigné', options: ['Lumo', 'Vestige', 'Sévigné', 'Cara'], correctOption: 2, logoUri: null, glyph: '👜' },
    { id: 2004, brand: 'Lumo', options: ['Maison Vela', 'Atelier Nord', 'Sévigné', 'Lumo'], correctOption: 3, logoUri: null, glyph: '🕶️' },
  ],
  tech: [
    { id: 3001, brand: 'Aperture Systems', options: ['NovaTech', 'Aperture Systems', 'Vortex Labs', 'Circuit One'], correctOption: 1, logoUri: null, glyph: '📷' },
    { id: 3002, brand: 'NovaTech', options: ['NovaTech', 'Vortex Labs', 'Circuit One', 'Hexcore'], correctOption: 0, logoUri: null, glyph: '💠' },
    { id: 3003, brand: 'Vortex Labs', options: ['Circuit One', 'NovaTech', 'Vortex Labs', 'Pulsar'], correctOption: 2, logoUri: null, glyph: '🌀' },
    { id: 3004, brand: 'Hexcore', options: ['NovaTech', 'Aperture Systems', 'Circuit One', 'Hexcore'], correctOption: 3, logoUri: null, glyph: '⬡' },
    { id: 3005, brand: 'Pulsar', options: ['Pulsar', 'Vortex Labs', 'Circuit One', 'NovaTech'], correctOption: 0, logoUri: null, glyph: '🔺' },
  ],
  food: [
    { id: 4001, brand: 'Burgr House', options: ['Burgr House', 'Frytek', 'Nomly', 'Zesto'], correctOption: 0, logoUri: null, glyph: '🍔' },
    { id: 4002, brand: 'Frytek', options: ['Nomly', 'Frytek', 'Zesto', 'Crunch'], correctOption: 1, logoUri: null, glyph: '🍟' },
    { id: 4003, brand: 'Zesto', options: ['Nomly', 'Crunch', 'Zesto', 'Burgr House'], correctOption: 2, logoUri: null, glyph: '🥤' },
    { id: 4004, brand: 'Nomly', options: ['Frytek', 'Zesto', 'Crunch', 'Nomly'], correctOption: 3, logoUri: null, glyph: '🍕' },
  ],
  sport: [
    { id: 5001, brand: 'Strider', options: ['Strider', 'Peakform', 'Volt Athletics', 'Grip'], correctOption: 0, logoUri: null, glyph: '👟' },
    { id: 5002, brand: 'Peakform', options: ['Grip', 'Peakform', 'Volt Athletics', 'Kinetic'], correctOption: 1, logoUri: null, glyph: '🏋️' },
    { id: 5003, brand: 'Volt Athletics', options: ['Grip', 'Kinetic', 'Volt Athletics', 'Strider'], correctOption: 2, logoUri: null, glyph: '⚽' },
    { id: 5004, brand: 'Kinetic', options: ['Strider', 'Peakform', 'Grip', 'Kinetic'], correctOption: 3, logoUri: null, glyph: '🏀' },
    { id: 5005, brand: 'Grip', options: ['Grip', 'Volt Athletics', 'Peakform', 'Kinetic'], correctOption: 0, logoUri: null, glyph: '🥊' },
  ],
  media: [
    { id: 6001, brand: 'Streamly', options: ['Streamly', 'Playr', 'Vibe', 'Loop'], correctOption: 0, logoUri: null, glyph: '▶️' },
    { id: 6002, brand: 'Playr', options: ['Vibe', 'Playr', 'Loop', 'Beacon'], correctOption: 1, logoUri: null, glyph: '🎬' },
    { id: 6003, brand: 'Vibe', options: ['Loop', 'Beacon', 'Vibe', 'Streamly'], correctOption: 2, logoUri: null, glyph: '🎵' },
    { id: 6004, brand: 'Beacon', options: ['Streamly', 'Playr', 'Loop', 'Beacon'], correctOption: 3, logoUri: null, glyph: '📺' },
  ],
};

// Small artificial latency so the mock behaves like an async source and
// loading states are exercised. Kept tiny so it never slows real use.
const MOCK_LATENCY_MS = 60;

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), MOCK_LATENCY_MS));
}

/** All logo categories (free + premium). */
export function getLogoCategories(): Promise<LogoCategory[]> {
  // TODO(#721): fetch from backend / content cache instead of the mock.
  return delay(CATEGORIES.map((c) => ({ ...c })));
}

/** Synchronous lookup used by screens that already hold a slug param. */
export function findLogoCategory(slug: string): LogoCategory | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

/** Questions for one category, in fixed order (empty array if unknown). */
export function getLogoQuestions(categorySlug: string): Promise<LogoQuestion[]> {
  // TODO(#721): fetch from backend / content cache instead of the mock.
  const list = QUESTIONS[categorySlug] ?? [];
  return delay(list.map((q) => ({ ...q })));
}

/**
 * Coin balance shown in the home header. There is no coin economy in the
 * app yet; this is a stubbed value.
 * TODO: wire to a real currency store when the logo-quiz economy exists.
 */
export function getMockCoinBalance(): number {
  return 1250;
}

/**
 * Adapt logo questions to the engine's generic {@link Question} shape so
 * the existing, well-tested `useQuizSession` reducer drives scoring and
 * progress. The visible prompt is a fixed localized string rendered by
 * the screen, so `question` here is just a stable non-empty marker.
 */
export function toQuizQuestions(questions: LogoQuestion[]): Question[] {
  return questions.map((q) => ({
    id: q.id,
    question: LOGO_PROMPT,
    options: q.options,
    correct_option: q.correctOption,
    explanation: null,
    image_url: q.logoUri,
  }));
}
