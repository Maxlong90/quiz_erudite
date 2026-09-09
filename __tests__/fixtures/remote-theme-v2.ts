/**
 * The v2 wire contract as the BACKEND authored it — the single transcription the
 * theme suites pin against.
 *
 * The literals below are copied from the backend's
 * app/Support/ColorTokenRegistry.php (SCHEMA_VERSION = 2, TOKENS defaults), and
 * verified against the live GET /api/v1/apps/erudite-quiz/theme payload, whose
 * preset stores NULL tokens and so serves exactly these defaults. The erudite
 * slug is the deliberate transcription source: test-quiz's preset may carry
 * operator overrides at any time, while the erudite slug's payload IS the
 * default set.
 *
 * IF THESE LITERALS AND THE BACKEND DISAGREE, the backend won: this fixture and
 * ColorTokenRegistry.php change together in the same PR, and
 * __tests__/lib/theme-contract-live.livetest.ts re-checks the live endpoint on
 * demand (npm run check:theme-contract). Do not "fix" a failing parity test by
 * editing this file alone.
 *
 * Deliberately NOT named *.test.ts: jest's testMatch only picks up
 * `<rootDir>/__tests__/**` files ending in `.test.{ts,tsx}`, and this file is
 * shared data, not a suite.
 */

export const SCHEMA_VERSION_V2 = 2;

/**
 * ColorTokenRegistry::TOKENS key order, verbatim. DECLARATION ORDER IS
 * DEPENDENCY ORDER on the backend and part of the ETag contract (the backend
 * hashes the encoded bytes), so this order is load-bearing — never alphabetise.
 */
export const BACKEND_TOKEN_KEYS_V2 = [
  'bgGradient',
  'bgSolid',
  'surface',
  'surfaceSoft',
  'surfaceSunken',
  'sheet',
  'scrim',
  'text',
  'textMuted',
  'textFaint',
  'textDisabled',
  'border',
  'borderStrong',
  'borderSoft',
  'accent',
  'accentSoft',
  'accentBg',
  'accentBgSoft',
  'accentBorderSoft',
  'onAccent',
  'success',
  'danger',
  'gold',
  'optIdleBg',
  'optIdleBorder',
  'optIdleText',
  'optCorrectBg',
  'optWrongBg',
  'explanationBg',
  'explanationText',
  'subscribeBtnBg',
  'subscribeBtnText',
  'subscribeBtnBorder',
  'subscribeHighlightBg',
  'progressTrack',
  'progressFill',
  'tabBg',
  'tabActiveBg',
  'tabActiveText',
  'tabInactiveText',
  'coinColor',
  'lifeColor',
  'hintColor',
  'splashBg',
  'splashFg',
] as const;

/** ColorTokenRegistry::TOKENS — light defaults, in declaration order. */
export const BACKEND_LIGHT_DEFAULTS_V2 = {
  bgGradient: ['#f4f2fb', '#ece7fb', '#f4f2fb'],
  bgSolid: '#f4f2fb',
  surface: '#ffffff',
  surfaceSoft: '#7c5cff0d',
  surfaceSunken: '#eae6f7',
  sheet: '#ffffff',
  scrim: '#14102e59',
  text: '#1c1740',
  textMuted: '#463f6b',
  textFaint: '#6b6390',
  textDisabled: '#a49fc0',
  border: '#1c17401f',
  borderStrong: '#1c174033',
  borderSoft: '#1c174014',
  accent: '#7c5cff',
  accentSoft: '#6a45f5',
  accentBg: '#7c5cff1a',
  accentBgSoft: '#7c5cff14',
  accentBorderSoft: '#7c5cff66',
  onAccent: '#ffffff',
  success: '#16a34a',
  danger: '#dc2626',
  gold: '#ffd23a',
  optIdleBg: '#6349cc',
  optIdleBorder: '#6349cc',
  optIdleText: '#ffffff',
  optCorrectBg: '#dcfce7',
  optWrongBg: '#fee2e2',
  explanationBg: '#f0f9ff',
  explanationText: '#1e40af',
  subscribeBtnBg: '#7c5cff',
  subscribeBtnText: '#ffffff',
  subscribeBtnBorder: '#7c5cff66',
  subscribeHighlightBg: '#7c5cff1a',
  progressTrack: '#7c5cff14',
  progressFill: '#7c5cff',
  tabBg: '#eae6f7',
  tabActiveBg: '#7c5cff',
  tabActiveText: '#ffffff',
  tabInactiveText: '#1c1740cc',
  coinColor: '#ffd23a',
  lifeColor: '#dc2626',
  hintColor: '#7c5cff',
  splashBg: '#f4f2fb',
  splashFg: '#7c5cff',
} as const;

/** ColorTokenRegistry::TOKENS — dark defaults, in declaration order. */
export const BACKEND_DARK_DEFAULTS_V2 = {
  bgGradient: ['#1a1a47', '#2d1f5e', '#1a1a47'],
  bgSolid: '#1a1a47',
  surface: '#ffffff0f',
  surfaceSoft: '#ffffff0d',
  surfaceSunken: '#0e0e2a',
  sheet: '#1f1949',
  scrim: '#0000008c',
  text: '#ffffff',
  textMuted: '#ffffffcc',
  textFaint: '#ffffff99',
  textDisabled: '#ffffff66',
  border: '#ffffff1f',
  borderStrong: '#ffffff33',
  borderSoft: '#ffffff14',
  accent: '#7c5cff',
  accentSoft: '#a78bff',
  accentBg: '#7c5cff33',
  accentBgSoft: '#7c5cff22',
  accentBorderSoft: '#7c5cff66',
  onAccent: '#ffffff',
  success: '#22c55e',
  danger: '#ef4444',
  gold: '#ffd23a',
  // NOT a transposition bug: the dark theme deliberately keeps PALE option pills
  // with dark text, so the A/B/C/D cards read as light cards on the dark
  // backdrop. Do not "fix" this to mirror light.
  optIdleBg: '#e5e7eb',
  optIdleBorder: '#d1d5db',
  optIdleText: '#1c1740',
  optCorrectBg: '#dcfce7',
  optWrongBg: '#fee2e2',
  explanationBg: '#0e1a3a',
  explanationText: '#ffffffd9',
  subscribeBtnBg: '#7c5cff',
  subscribeBtnText: '#ffffff',
  subscribeBtnBorder: '#7c5cff66',
  subscribeHighlightBg: '#7c5cff33',
  progressTrack: '#7c5cff22',
  progressFill: '#7c5cff',
  tabBg: '#0e0e2a',
  tabActiveBg: '#7c5cff',
  tabActiveText: '#ffffff',
  tabInactiveText: '#ffffffcc',
  coinColor: '#ffd23a',
  lifeColor: '#ef4444',
  hintColor: '#7c5cff',
  splashBg: '#1a1a47',
  splashFg: '#7c5cff',
} as const;

/**
 * A full forty-five-token appearance map, valid to the parser. Both appearances
 * of the test theme use the dark defaults — exactly what the old ten-token
 * fixture did, and enough for the parser, which does not care which appearance
 * the values came from.
 */
export function validTokensV2(): Record<string, unknown> {
  return JSON.parse(JSON.stringify(BACKEND_DARK_DEFAULTS_V2)) as Record<string, unknown>;
}

export function validThemeV2(): Record<string, unknown> {
  return {
    name: 'test-quiz 1',
    supports_dark: true,
    light: validTokensV2(),
    dark: validTokensV2(),
  };
}

export function envelopeV2(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { schema_version: SCHEMA_VERSION_V2, theme: validThemeV2(), ...overrides };
}
