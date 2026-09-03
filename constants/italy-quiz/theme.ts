/**
 * Italy Quiz visual language (App Template: World / app slug
 * `italy-history-and-geography-quiz`). The background is the cartoon-3D Italian
 * landmarks artwork (see components/italy-quiz/app-background.tsx); the app's own
 * dark base is left transparent behind it.
 *
 * The buttons reuse the Flags Quiz glossy-tile design (a diagonal gradient tile
 * with a white gloss band, a darker rim, and a centred glyph/label) but recoloured
 * to a rich, saturated DARK NAVY BLUE with a white glyph — per the brief "стиль
 * из Flag Quiz, но цвет тёмно-синий".
 */

export const ItalyColors = {
  // Glossy dark-navy tile shared by the Settings (gear) icon button AND the Play
  // button — same design, deep saturated blue. Light royal-blue at the top-left
  // for the gloss, deep navy at the bottom-right.
  tileLight: '#3B63D6',
  tileDark: '#0C1F66',
  tileRim: '#060F38',
  // Glyph / label colour that sits on the navy tiles (gear + "Play") — white so it
  // reads clearly on the dark blue.
  tileGlyph: '#FFFFFF',

  text: '#FFFFFF',
} as const;

export const ItalyRadius = {
  sm: 10,
  md: 16,
  lg: 22,
  pill: 999,
} as const;

export const ItalyShadow = {
  // Soft drop shadow under the Play button — deep navy so it grounds the tile on
  // the bright artwork.
  card: {
    shadowColor: '#03102F',
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
} as const;
