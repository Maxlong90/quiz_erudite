/**
 * Flags Quiz visual language (App Template: Geography). The background is the
 * spiral-of-flags artwork (see components/flags-quiz/app-background.tsx); the
 * app's own dark base is left transparent behind it. The Play CTA uses the
 * metallic grey-beige bezel from the flag-tile reference with blue text; the
 * Settings / Shop buttons use the glossy blue tile from the reference gear.
 * All colours are sampled from the reference art.
 */

export const FQColors = {
  // Full-screen background gradient: light sky blue (top) → deep blue (bottom).
  bgTop: '#6EC1F6',
  bgMid: '#2E7BD0',
  bgBottom: '#0B3E86',

  // Glossy blue tile shared by the Settings / Shop icon buttons AND the Play
  // button — they all use the same design (from the reference gear button).
  tileLight: '#A9E4FE',
  tileDark: '#3E86D6',
  tileRim: '#0B3E86',
  // Glyph / label colour that sits on the blue tiles (gear, bag, and "Play").
  tileGlyph: '#0B3A87',

  text: '#FFFFFF',
} as const;

export const FQRadius = {
  sm: 10,
  md: 16,
  lg: 22,
  pill: 999,
} as const;

export const FQShadow = {
  // Soft drop shadow under the Play button.
  card: {
    shadowColor: '#04204F',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
} as const;
