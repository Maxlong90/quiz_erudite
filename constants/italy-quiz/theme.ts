/**
 * Italy Quiz visual language (App Template: World / app slug
 * `italy-history-and-geography-quiz`).
 *
 * Colour scheme: the LIGHTER blue-violet gradient the operator picked for the
 * screen background, with LIGHT-BLUE glossy buttons on top. The buttons sit
 * lighter than the backdrop and carry dark-navy labels (the Flags Quiz trick),
 * so nothing blends into anything else.
 */

export const ItalyColors = {
  // Full-screen gradient used by the quiz / subcategory screens.
  bgTop: '#6E7FD6',
  bgMid: '#43539F',
  bgBottom: '#212F63',
  /** Soft light glow laid over the top of that gradient. */
  bgGlow: 'rgba(200, 214, 255, 0.5)',

  // Glossy light-blue tile shared by every button and icon tile.
  tileLight: '#9EC4FB',
  tileDark: '#4A73D8',
  tileRim: '#12306E',
  /** Glyph / label colour that sits ON the light-blue tiles. */
  tileGlyph: '#0B1F52',

  /** Dark ink for text on white cards (explanation sheet, modals). */
  ink: '#0B1F52',

  /**
   * Question card — deliberately a couple of tones LIGHTER than the background
   * so the question itself reads as the brightest block on the screen.
   */
  cardBg: 'rgba(120, 140, 220, 0.55)',
  cardRim: 'rgba(210, 224, 255, 0.65)',

  text: '#FFFFFF',
} as const;

export const ItalyRadius = {
  sm: 10,
  md: 16,
  lg: 22,
  pill: 999,
} as const;

export const ItalyShadow = {
  // Soft drop shadow under the buttons so they lift off the background.
  card: {
    shadowColor: '#03102F',
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
} as const;
