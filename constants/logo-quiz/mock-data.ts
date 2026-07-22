/**
 * Mock content for the Logo Quiz frontend. Real brand artwork is out of scope
 * for this build, so each "logo" is a stylised mark (an emoji glyph on a brand
 * colour) rendered by components/logo-quiz/logo-display.tsx. Brand names are
 * invented placeholders. Categories flagged `vip` are premium-only and live on
 * the separate VIP category screen.
 */

export type DisplayMode = 'full' | 'blurred' | 'pixelated' | 'hidden';

export interface LogoQuestion {
  id: string;
  /** Correct brand name (also present in `options`). */
  answer: string;
  /** Emoji used as the mock logo mark. */
  glyph: string;
  /** Brand colour behind the mark. */
  brandColor: string;
  /** Exactly six answer choices, including the correct one. */
  options: string[];
  /** How the logo is revealed — harder categories hide more. */
  displayMode: DisplayMode;
}

export interface LogoCategory {
  id: string;
  name: { en: string; ru: string; es: string };
  emoji: string;
  vip: boolean;
  questions: LogoQuestion[];
}

type Name = LogoCategory['name'];
/** A brand entry in a category's pool: [answer, glyph, brandColor]. */
type Brand = [string, string, string];

const L = (en: string, ru: string, es: string): Name => ({ en, ru, es });

/**
 * Build a category from a pool of exactly six brands. Generates `count`
 * questions (default 5), each using the whole pool as its six options (rotated so
 * the answer isn't always first). VIP categories reveal less (blurred/hidden) to
 * feel harder; free ones show full/pixelated.
 */
const mk = (
  id: string,
  name: Name,
  emoji: string,
  vip: boolean,
  pool: Brand[],
  count = 5,
): LogoCategory => {
  const names = pool.map((p) => p[0]);
  const questions: LogoQuestion[] = pool.slice(0, count).map(([answer, glyph, color], i) => {
    const options = [answer, ...names.filter((n) => n !== answer)].slice(0, 6);
    const shift = i % options.length;
    const rotated = options.slice(shift).concat(options.slice(0, shift));
    const displayMode: DisplayMode = vip
      ? i % 2 === 0
        ? 'blurred'
        : 'hidden'
      : i % 2 === 0
        ? 'full'
        : 'pixelated';
    return { id: `${id}-${i + 1}`, answer, glyph, brandColor: color, options: rotated, displayMode };
  });
  return { id, name, emoji, vip, questions };
};

// ---- Free categories (30) — shown on the main "Choose a category" screen ----
const FREE: LogoCategory[] = [
  mk('tech', L('Technology', 'Технологии', 'Tecnología'), '💻', false, [
    ['Nimbus', '☁️', '#3B82F6'], ['Vertex', '🔺', '#8B5CF6'], ['Orbit', '🪐', '#0EA5E9'],
    ['Pixel', '🟦', '#2563EB'], ['Quanta', '⚛️', '#6366F1'], ['Flux', '🌀', '#7C3AED'],
  ]),
  mk('food', L('Food', 'Еда', 'Comida'), '🍔', false, [
    ['BurgerBox', '🍔', '#F59E0B'], ['FryDay', '🍟', '#EAB308'], ['PizzaPie', '🍕', '#DC2626'],
    ['ChocoLux', '🍫', '#92400E'], ['FreshBite', '🥗', '#22C55E'], ['SodaPop', '🥤', '#EF4444'],
  ]),
  mk('sport', L('Sport', 'Спорт', 'Deporte'), '⚽', false, [
    ['Strider', '👟', '#10B981'], ['ProGear', '🏅', '#059669'], ['FastLane', '🏃', '#0D9488'],
    ['Peak', '🏔️', '#0891B2'], ['Volt', '⚡', '#EAB308'], ['Apex', '🎯', '#16A34A'],
  ]),
  mk('fashion', L('Fashion', 'Мода', 'Moda'), '👗', false, [
    ['Vogära', '👗', '#EC4899'], ['Trendo', '🧥', '#DB2777'], ['Aurella', '👠', '#BE185D'],
    ['Modena', '👜', '#9D174D'], ['Belleza', '🕶️', '#F472B6'], ['Chicly', '👒', '#F9A8D4'],
  ]),
  mk('cars', L('Cars', 'Автомобили', 'Coches'), '🚗', false, [
    ['Velos', '🚗', '#EF4444'], ['Torque', '🏎️', '#B91C1C'], ['Motorix', '🚙', '#DC2626'],
    ['Drivo', '🛻', '#7F1D1D'], ['Rapida', '🏁', '#991B1B'], ['Auton', '🚘', '#450A0A'],
  ]),
  mk('movies', L('Movies', 'Кино', 'Cine'), '🎬', false, [
    ['Cinemax', '🎬', '#6366F1'], ['Reelio', '🎞️', '#4F46E5'], ['FilmHub', '📽️', '#4338CA'],
    ['Screenr', '🍿', '#3730A3'], ['Flixor', '🎥', '#818CF8'], ['Motiv', '🎦', '#6D28D9'],
  ]),
  mk('games', L('Games', 'Игры', 'Videojuegos'), '🎮', false, [
    ['Pixblox', '🎮', '#22C55E'], ['Questly', '🕹️', '#16A34A'], ['Arcadia', '👾', '#15803D'],
    ['Playr', '🎯', '#166534'], ['Levelup', '🏆', '#4ADE80'], ['Bitzy', '💾', '#84CC16'],
  ]),
  mk('social', L('Social Media', 'Соцсети', 'Redes sociales'), '📱', false, [
    ['Chatly', '💬', '#0EA5E9'], ['Snapzy', '📸', '#0284C7'], ['Pingr', '📍', '#0369A1'],
    ['Vibely', '🎈', '#38BDF8'], ['Tagged', '🏷️', '#075985'], ['Loopz', '🔁', '#0C4A6E'],
  ]),
  mk('airlines', L('Airlines', 'Авиалинии', 'Aerolíneas'), '✈️', false, [
    ['SkyJet', '✈️', '#3B82F6'], ['AeroFly', '🛫', '#2563EB'], ['Cloudair', '☁️', '#1D4ED8'],
    ['Jetstream', '🛩️', '#1E40AF'], ['Nimbo', '🌤️', '#60A5FA'], ['Altura', '🗺️', '#1E3A8A'],
  ]),
  mk('banks', L('Banks', 'Банки', 'Bancos'), '🏦', false, [
    ['Finora', '🏦', '#14B8A6'], ['Capvault', '🔐', '#0D9488'], ['Trustly', '🤝', '#0F766E'],
    ['Monera', '💵', '#115E59'], ['Bancore', '💳', '#134E4A'], ['Ledgr', '📊', '#2DD4BF'],
  ]),
  mk('beauty', L('Beauty', 'Красота', 'Belleza'), '💄', false, [
    ['Glowen', '💄', '#F472B6'], ['Lumé', '✨', '#EC4899'], ['Velveta', '💅', '#DB2777'],
    ['Blushly', '🌷', '#F9A8D4'], ['Auroré', '🌟', '#BE185D'], ['Sheen', '💫', '#FBCFE8'],
  ]),
  mk('drinks', L('Drinks', 'Напитки', 'Bebidas'), '🥤', false, [
    ['Fizzo', '🥤', '#F59E0B'], ['Coolade', '🧃', '#EAB308'], ['Sipster', '🧉', '#CA8A04'],
    ['Aquis', '💧', '#0EA5E9'], ['Zesté', '🍋', '#84CC16'], ['Brewly', '🍺', '#A16207'],
  ]),
  mk('electronics', L('Electronics', 'Электроника', 'Electrónica'), '🔌', false, [
    ['Voltix', '🔌', '#8B5CF6'], ['Chargr', '🔋', '#7C3AED'], ['Powela', '⚡', '#6D28D9'],
    ['Ampio', '🔦', '#5B21B6'], ['Circux', '💡', '#A78BFA'], ['Ionn', '📻', '#4C1D95'],
  ]),
  mk('streaming', L('Streaming', 'Стриминг', 'Streaming'), '📺', false, [
    ['Streamly', '📺', '#EF4444'], ['Bingez', '🍿', '#DC2626'], ['Watchr', '▶️', '#B91C1C'],
    ['Playflix', '🎬', '#991B1B'], ['Streemo', '📡', '#F87171'], ['Vidora', '🎞️', '#7F1D1D'],
  ]),
  mk('coffee', L('Coffee', 'Кофе', 'Café'), '☕', false, [
    ['Brewza', '☕', '#92400E'], ['Beanly', '🫘', '#78350F'], ['Roastr', '🔥', '#B45309'],
    ['Caffè', '☕', '#A16207'], ['Mocca', '🍫', '#713F12'], ['Steamo', '♨️', '#D97706'],
  ]),
  mk('toys', L('Toys', 'Игрушки', 'Juguetes'), '🧸', false, [
    ['Blocco', '🧸', '#F59E0B'], ['Puzzly', '🧩', '#8B5CF6'], ['Zoomer', '🚗', '#EF4444'],
    ['Plushy', '🐻', '#EC4899'], ['Kitely', '🪁', '#0EA5E9'], ['Robo', '🤖', '#10B981'],
  ]),
  mk('pets', L('Pets', 'Питомцы', 'Mascotas'), '🐾', false, [
    ['Pawly', '🐾', '#F59E0B'], ['Whiskr', '🐱', '#8B5CF6'], ['Barko', '🐶', '#B45309'],
    ['Furry', '🐹', '#EC4899'], ['Nibbl', '🦴', '#10B981'], ['Tweet', '🐦', '#0EA5E9'],
  ]),
  mk('travel', L('Travel', 'Путешествия', 'Viajes'), '🧳', false, [
    ['Roamly', '🧳', '#0EA5E9'], ['Voyagr', '🗺️', '#0284C7'], ['Trekko', '🥾', '#0369A1'],
    ['Nomado', '🏕️', '#0F766E'], ['Wandr', '🧭', '#1D4ED8'], ['Jetset', '🛎️', '#075985'],
  ]),
  mk('music', L('Music', 'Музыка', 'Música'), '🎵', false, [
    ['Tunely', '🎵', '#8B5CF6'], ['Beatz', '🎧', '#7C3AED'], ['Melodo', '🎼', '#6D28D9'],
    ['Sonix', '🔊', '#5B21B6'], ['Rifft', '🎸', '#A78BFA'], ['Harmo', '🎹', '#4C1D95'],
  ]),
  mk('books', L('Books', 'Книги', 'Libros'), '📚', false, [
    ['Readly', '📚', '#B45309'], ['Pagely', '📖', '#92400E'], ['Novella', '📕', '#DC2626'],
    ['Inkwl', '🖋️', '#1E40AF'], ['Chaptr', '🔖', '#0F766E'], ['Litero', '📗', '#16A34A'],
  ]),
  mk('furniture', L('Furniture', 'Мебель', 'Muebles'), '🛋️', false, [
    ['Comfo', '🛋️', '#B45309'], ['Woodsy', '🪑', '#92400E'], ['Nestly', '🛏️', '#78350F'],
    ['Deko', '🖼️', '#A16207'], ['Loungr', '🧶', '#713F12'], ['Homey', '🏠', '#D97706'],
  ]),
  mk('icecream', L('Ice Cream', 'Мороженое', 'Helados'), '🍦', false, [
    ['Scoopz', '🍦', '#F472B6'], ['Frosté', '🍨', '#EC4899'], ['Gelato', '🍧', '#DB2777'],
    ['Chillo', '🧊', '#0EA5E9'], ['Sundae', '🍒', '#EF4444'], ['Coneo', '🥤', '#F9A8D4'],
  ]),
  mk('candy', L('Candy', 'Сладости', 'Dulces'), '🍬', false, [
    ['Sweetz', '🍬', '#EC4899'], ['Gummo', '🐻', '#F59E0B'], ['Choco', '🍫', '#92400E'],
    ['Lolly', '🍭', '#F472B6'], ['Jelio', '🟢', '#22C55E'], ['Minto', '🌿', '#10B981'],
  ]),
  mk('tools', L('Tools', 'Инструменты', 'Herramientas'), '🔧', false, [
    ['Fixxo', '🔧', '#EAB308'], ['Boltz', '🔩', '#CA8A04'], ['Drillo', '🪛', '#B45309'],
    ['Gripo', '🗜️', '#A16207'], ['Hammr', '🔨', '#78350F'], ['Sawly', '🪚', '#D97706'],
  ]),
  mk('watches', L('Watches', 'Часы', 'Relojes'), '⌚', false, [
    ['Tickr', '⌚', '#1E40AF'], ['Chrono', '🕰️', '#1D4ED8'], ['Momento', '⏱️', '#1E3A8A'],
    ['Dialz', '🧭', '#0F766E'], ['Wristo', '⏲️', '#334155'], ['Secndo', '⏳', '#0369A1'],
  ]),
  mk('fuel', L('Fuel', 'Топливо', 'Combustible'), '⛽', false, [
    ['Fuelo', '⛽', '#EF4444'], ['Ignis', '🔥', '#DC2626'], ['Octan', '🛢️', '#B91C1C'],
    ['Voltz', '⚡', '#EAB308'], ['Gaso', '🚏', '#991B1B'], ['Pyra', '💥', '#7F1D1D'],
  ]),
  mk('supermarket', L('Supermarket', 'Супермаркет', 'Supermercado'), '🛒', false, [
    ['Marto', '🛒', '#22C55E'], ['Freshly', '🥬', '#16A34A'], ['Cartly', '🧺', '#15803D'],
    ['Grocio', '🍎', '#EF4444'], ['Stockr', '📦', '#B45309'], ['Dailyo', '🥛', '#0EA5E9'],
  ]),
  mk('delivery', L('Delivery', 'Доставка', 'Entrega'), '📦', false, [
    ['Shipr', '📦', '#B45309'], ['Boxo', '📮', '#92400E'], ['Rushly', '🛵', '#EF4444'],
    ['Parcl', '🏷️', '#78350F'], ['Dropo', '🚚', '#A16207'], ['Quicko', '⚡', '#EAB308'],
  ]),
  mk('camera', L('Cameras', 'Фото', 'Cámaras'), '📷', false, [
    ['Snaply', '📷', '#334155'], ['Lensr', '🔎', '#1E293B'], ['Fokus', '🎯', '#0F172A'],
    ['Shuttr', '📸', '#475569'], ['Pixio', '🖼️', '#64748B'], ['Framez', '🎞️', '#111827'],
  ]),
  mk('fitness', L('Fitness', 'Фитнес', 'Fitness'), '🏋️', false, [
    ['Fitro', '🏋️', '#EF4444'], ['Flexo', '💪', '#DC2626'], ['Pulsr', '❤️', '#B91C1C'],
    ['Reppo', '🏃', '#991B1B'], ['Toneo', '🧘', '#10B981'], ['Cardo', '🚴', '#0EA5E9'],
  ]),
];

// ---- VIP categories (premium-only) — shown on the VIP category screen ----
const VIP: LogoCategory[] = [
  mk('rare', L('Rare Brands', 'Редкие бренды', 'Marcas raras'), '💎', true, [
    ['Lumière', '💡', '#6366F1'], ['Aureus', '🏛️', '#7C3AED'], ['Solace', '🕊️', '#4F46E5'],
    ['Verano', '🌅', '#4338CA'], ['Étoile', '✨', '#4C1D95'], ['Marée', '🌊', '#5B21B6'],
  ]),
  mk('retro', L('Retro Logos', 'Ретро-логотипы', 'Logos retro'), '📼', true, [
    ['WaveTron', '📻', '#F97316'], ['VinylCo', '💿', '#EA580C'], ['ArcadeX', '🕹️', '#C2410C'],
    ['RetroWave', '🌆', '#DB2777'], ['PixelPop', '👾', '#9A3412'], ['DiscoLab', '🪩', '#BE185D'],
  ]),
  mk('luxury', L('Luxury', 'Люкс', 'Lujo'), '👑', true, [
    ['Aurézo', '👑', '#CA8A04'], ['Régalia', '💍', '#A16207'], ['Opulé', '💎', '#854D0E'],
    ['Prestige', '🏆', '#713F12'], ['Noblé', '🎩', '#B45309'], ['Élite', '⭐', '#78350F'],
  ]),
  mk('supercars', L('Supercars', 'Суперкары', 'Superdeportivos'), '🏎️', true, [
    ['Veloce', '🏎️', '#DC2626'], ['Furioso', '🏁', '#B91C1C'], ['Corsa', '🚗', '#991B1B'],
    ['Bolide', '💨', '#7F1D1D'], ['Rapidé', '🔥', '#EF4444'], ['Turbo', '⚡', '#450A0A'],
  ]),
  mk('yachts', L('Yachts', 'Яхты', 'Yates'), '🛥️', true, [
    ['Maré', '🛥️', '#0EA5E9'], ['Azura', '🌊', '#0284C7'], ['Seafarr', '⚓', '#0369A1'],
    ['Oceana', '🐚', '#0F766E'], ['Regatta', '⛵', '#075985'], ['Nautli', '🧭', '#0C4A6E'],
  ]),
  mk('jets', L('Private Jets', 'Джеты', 'Jets privados'), '🛩️', true, [
    ['Altair', '🛩️', '#3B82F6'], ['Zephyr', '🌬️', '#2563EB'], ['Aeris', '✈️', '#1D4ED8'],
    ['Skylor', '🛫', '#1E40AF'], ['Jeté', '🚀', '#60A5FA'], ['Cirrus', '☁️', '#1E3A8A'],
  ]),
  mk('haute', L('Haute Horlogerie', 'Высокие часы', 'Alta relojería'), '🕰️', true, [
    ['Horaé', '🕰️', '#854D0E'], ['Chronos', '⌚', '#713F12'], ['Tourbo', '⚙️', '#92400E'],
    ['Complik', '🔧', '#A16207'], ['Grande', '🏛️', '#B45309'], ['Minuté', '⏱️', '#78350F'],
  ]),
  mk('couture', L('Couture', 'Кутюр', 'Alta costura'), '👛', true, [
    ['Maisón', '👛', '#EC4899'], ['Atelié', '✂️', '#DB2777'], ['Étoffe', '🧵', '#BE185D'],
    ['Draperé', '🎀', '#9D174D'], ['Broidr', '🪡', '#F472B6'], ['Satiné', '👗', '#831843'],
  ]),
  mk('champagne', L('Champagne', 'Шампанское', 'Champán'), '🍾', true, [
    ['Cuvée', '🍾', '#CA8A04'], ['Bruté', '🥂', '#A16207'], ['Millés', '🍇', '#854D0E'],
    ['Réserve', '🍷', '#713F12'], ['Blanché', '✨', '#B45309'], ['Doré', '🌟', '#78350F'],
  ]),
  mk('fineart', L('Fine Art', 'Искусство', 'Bellas artes'), '🖼️', true, [
    ['Galeria', '🖼️', '#6366F1'], ['Muséo', '🏛️', '#4F46E5'], ['Palettr', '🎨', '#4338CA'],
    ['Canvaé', '🖌️', '#3730A3'], ['Fresqo', '🎭', '#5B21B6'], ['Auctio', '🔨', '#4C1D95'],
  ]),
  mk('perfume', L('Perfume', 'Парфюм', 'Perfume'), '🌸', true, [
    ['Fleuré', '🌸', '#EC4899'], ['Aromé', '🌷', '#DB2777'], ['Essenza', '💧', '#BE185D'],
    ['Muské', '🖤', '#9D174D'], ['Bloomé', '🌹', '#F472B6'], ['Scenté', '✨', '#831843'],
  ]),
  mk('castles', L('Castles', 'Замки', 'Castillos'), '🏰', true, [
    ['Château', '🏰', '#854D0E'], ['Manoir', '🏯', '#713F12'], ['Palais', '👑', '#92400E'],
    ['Domaine', '🗝️', '#A16207'], ['Fortré', '🛡️', '#B45309'], ['Estaté', '🌳', '#78350F'],
  ]),
  mk('gems', L('Gemstones', 'Драгоценности', 'Gemas'), '💠', true, [
    ['Diamé', '💠', '#0EA5E9'], ['Rubyé', '❤️', '#DC2626'], ['Emeró', '💚', '#10B981'],
    ['Saphé', '💙', '#2563EB'], ['Topaz', '🔶', '#EAB308'], ['Opalé', '🌈', '#8B5CF6'],
  ]),
  mk('wine', L('Fine Wine', 'Вино', 'Vinos'), '🍷', true, [
    ['Vinté', '🍷', '#7F1D1D'], ['Grandé', '🍇', '#991B1B'], ['Bordox', '🥃', '#B91C1C'],
    ['Réserva', '🍾', '#450A0A'], ['Cellré', '🛢️', '#78350F'], ['Terroir', '🌿', '#166534'],
  ]),
  mk('cigars', L('Cigars', 'Сигары', 'Puros'), '🚬', true, [
    ['Havané', '🚬', '#854D0E'], ['Fumé', '💨', '#713F12'], ['Robusto', '🍂', '#92400E'],
    ['Cohíba', '🔥', '#A16207'], ['Maduro', '🟤', '#78350F'], ['Torpéd', '🗿', '#B45309'],
  ]),
];

export const LOGO_CATEGORIES: LogoCategory[] = [...FREE, ...VIP];

/** Free categories for the main "Choose a category" screen (30). */
export const REGULAR_CATEGORIES = FREE;
/** Premium-only categories for the VIP category screen. */
export const VIP_CATEGORIES = VIP;

export function getCategory(id: string): LogoCategory | undefined {
  return LOGO_CATEGORIES.find((c) => c.id === id);
}

/** All questions for a category, or a shuffled mix across all unlocked ones. */
export function questionsForCategory(id: string): LogoQuestion[] {
  return getCategory(id)?.questions ?? [];
}
