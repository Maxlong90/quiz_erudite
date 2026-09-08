/**
 * CROSS-REPO PARITY: the bundled palette vs the backend's colour registry.
 *
 * lib/theme/bundled.ts DERIVES the bundled tier from EruditeColors instead of
 * checking in a second literal map, which is what keeps the two from drifting.
 * The independent pin is here: the literals below are transcribed from the
 * BACKEND (quiz-erudit-backend, app/Support/ColorTokenRegistry.php TOKENS), so
 * this test is the mobile mirror of the backend's own registry parity test.
 *
 * IF THIS TEST FAILS BECAUSE YOU CHANGED EruditeColors: that is not a test to
 * update in isolation. ColorTokenRegistry.php must change in the same PR, or
 * every themed build will resolve to a palette that no longer matches what an
 * un-edited preset serves — and the "an unmodified preset is a no-op" guarantee,
 * which is what makes it safe to switch the engine on for a shipped app, is gone.
 */
import { EruditeColors } from '@/constants/theme';
import { BUNDLED_THEME, bundledTokens } from '@/lib/theme/bundled';
import { REMOTE_TOKEN_KEYS } from '@/lib/theme/contract';

/** ColorTokenRegistry::TOKENS — light defaults, in declaration order. */
const BACKEND_LIGHT = {
  bgGradient: ['#f4f2fb', '#ece7fb', '#f4f2fb'],
  bgSolid: '#f4f2fb',
  accent: '#7c5cff',
  accentSoft: '#6a45f5',
  accentBg: '#7c5cff1a',
  accentBgSoft: '#7c5cff14',
  accentBorderSoft: '#7c5cff66',
  optIdleBg: '#6349cc',
  optIdleBorder: '#6349cc',
  optIdleText: '#ffffff',
} as const;

/** ColorTokenRegistry::TOKENS — dark defaults, in declaration order. */
const BACKEND_DARK = {
  bgGradient: ['#1a1a47', '#2d1f5e', '#1a1a47'],
  bgSolid: '#1a1a47',
  accent: '#7c5cff',
  accentSoft: '#a78bff',
  accentBg: '#7c5cff33',
  accentBgSoft: '#7c5cff22',
  accentBorderSoft: '#7c5cff66',
  // NOT a transposition bug: the dark theme deliberately keeps PALE option pills
  // with dark text, so the A/B/C/D cards read as light cards on the dark
  // backdrop. Do not "fix" this to mirror light.
  optIdleBg: '#e5e7eb',
  optIdleBorder: '#d1d5db',
  optIdleText: '#1c1740',
} as const;

describe('bundled theme parity with the backend registry', () => {
  it('matches every light default', () => {
    expect(BUNDLED_THEME.light).toEqual(BACKEND_LIGHT);
  });

  it('matches every dark default', () => {
    expect(BUNDLED_THEME.dark).toEqual(BACKEND_DARK);
  });

  it('is derived from EruditeColors, not a second copy', () => {
    for (const key of REMOTE_TOKEN_KEYS) {
      expect(BUNDLED_THEME.light[key]).toEqual(EruditeColors.light[key]);
      expect(BUNDLED_THEME.dark[key]).toEqual(EruditeColors.dark[key]);
    }
  });

  it('carries the ten tokens in the backend declaration order', () => {
    // Order is part of the ETag contract on the backend and the render order of
    // the token gallery here.
    expect(Object.keys(BUNDLED_THEME.light)).toEqual([...REMOTE_TOKEN_KEYS]);
    expect(Object.keys(BUNDLED_THEME.dark)).toEqual([...REMOTE_TOKEN_KEYS]);
    expect(REMOTE_TOKEN_KEYS).toHaveLength(10);
  });

  it('looks like the payload a preset-less app is served', () => {
    expect(BUNDLED_THEME.name).toBeNull();
    expect(BUNDLED_THEME.supports_dark).toBe(true);
  });

  it('exposes tokens per appearance', () => {
    expect(bundledTokens('dark')).toBe(BUNDLED_THEME.dark);
    expect(bundledTokens('light')).toBe(BUNDLED_THEME.light);
  });
});
