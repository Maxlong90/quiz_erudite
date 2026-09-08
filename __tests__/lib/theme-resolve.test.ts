/**
 * Palette resolution (lib/theme/resolve.ts).
 *
 * REFERENCE IDENTITY IS THE POINT. Sixty-nine call sites do
 * `useMemo(() => makeStyles(colors), [colors])`, so a resolve that returns a
 * new-but-equal palette rebuilds every stylesheet in the app — a diffuse
 * flicker/perf regression no visual diff would catch. Every identity assertion
 * below therefore uses toBe, never toEqual.
 */
import { EruditeColors } from '@/constants/theme';
import { BUNDLED_THEME } from '@/lib/theme/bundled';
import { REMOTE_TOKEN_KEYS, type RemoteTokens } from '@/lib/theme/contract';
import { overriddenKeys, resolvePalette, resolvePalettes } from '@/lib/theme/resolve';

/** The ten tokens exactly as bundled — i.e. an operator preset nobody edited. */
function unchangedTokens(appearance: 'light' | 'dark'): RemoteTokens {
  return { ...BUNDLED_THEME[appearance] };
}

/** Tokens the backend does NOT serve; they must survive every resolve. */
const UNTOUCHED_KEYS = [
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
  'onAccent',
  'success',
  'danger',
  'gold',
  'optCorrectBg',
  'optWrongBg',
  'explanationBg',
  'explanationText',
] as const;

describe('resolvePalette', () => {
  it('returns the base palette itself when there are no tokens', () => {
    expect(resolvePalette(EruditeColors.dark, null)).toBe(EruditeColors.dark);
  });

  it('returns the base palette ITSELF when the payload is byte-equal', () => {
    // This is what makes switching the engine on for a shipped app a no-op: an
    // unmodified preset resolves to the identical object, so nothing re-renders.
    expect(resolvePalette(EruditeColors.dark, unchangedTokens('dark'))).toBe(EruditeColors.dark);
    expect(resolvePalette(EruditeColors.light, unchangedTokens('light'))).toBe(
      EruditeColors.light,
    );
  });

  it('returns a NEW palette when a single token changes', () => {
    const tokens = { ...unchangedTokens('dark'), accent: '#ff0000' };
    const resolved = resolvePalette(EruditeColors.dark, tokens);
    expect(resolved).not.toBe(EruditeColors.dark);
    expect(resolved.accent).toBe('#ff0000');
  });

  it('treats a case-only difference as a change', () => {
    // Renders identically but is a genuine operator edit; one extra re-render is
    // a cheaper mistake than ignoring a real one.
    const tokens = { ...unchangedTokens('dark'), accent: '#7C5CFF' };
    expect(resolvePalette(EruditeColors.dark, tokens)).not.toBe(EruditeColors.dark);
  });

  it('lands all ten tokens over the base', () => {
    const tokens: RemoteTokens = {
      bgGradient: ['#000001', '#000002', '#000003'],
      bgSolid: '#000004',
      accent: '#000005',
      accentSoft: '#000006',
      accentBg: '#000007',
      accentBgSoft: '#000008',
      accentBorderSoft: '#000009',
      optIdleBg: '#00000a',
      optIdleBorder: '#00000b',
      optIdleText: '#00000c',
    };
    const resolved = resolvePalette(EruditeColors.dark, tokens);
    for (const key of REMOTE_TOKEN_KEYS) {
      expect(resolved[key]).toEqual(tokens[key]);
    }
  });

  it('leaves the twenty tokens the backend does not serve at their bundled values', () => {
    const tokens = { ...unchangedTokens('dark'), accent: '#ff0000' };
    const resolved = resolvePalette(EruditeColors.dark, tokens);
    for (const key of UNTOUCHED_KEYS) {
      expect(resolved[key]).toBe(EruditeColors.dark[key]);
    }
  });

  it('keeps bgGradient a real three-stop tuple LinearGradient can consume', () => {
    const gradient = ['#111111', '#222222', '#333333'] as const;
    const resolved = resolvePalette(EruditeColors.dark, {
      ...unchangedTokens('dark'),
      bgGradient: gradient,
    });
    expect(Array.isArray(resolved.bgGradient)).toBe(true);
    expect(resolved.bgGradient).toHaveLength(3);
    expect(resolved.bgGradient).toEqual(['#111111', '#222222', '#333333']);
  });

  it('detects a change in any single gradient stop', () => {
    const tokens = {
      ...unchangedTokens('dark'),
      bgGradient: ['#1a1a47', '#2d1f5e', '#000000'] as const,
    };
    expect(resolvePalette(EruditeColors.dark, tokens)).not.toBe(EruditeColors.dark);
  });

  it('does not mutate the base palette', () => {
    const before = { ...EruditeColors.dark };
    resolvePalette(EruditeColors.dark, { ...unchangedTokens('dark'), accent: '#ff0000' });
    expect(EruditeColors.dark).toEqual(before);
  });
});

describe('resolvePalettes', () => {
  it('passes both appearances through unchanged for the bundled theme', () => {
    const resolved = resolvePalettes(EruditeColors, BUNDLED_THEME);
    expect(resolved.dark).toBe(EruditeColors.dark);
    expect(resolved.light).toBe(EruditeColors.light);
  });

  it('resolves each appearance independently', () => {
    const theme = {
      ...BUNDLED_THEME,
      dark: { ...BUNDLED_THEME.dark, accent: '#ff0000' },
    };
    const resolved = resolvePalettes(EruditeColors, theme);
    expect(resolved.dark.accent).toBe('#ff0000');
    expect(resolved.light).toBe(EruditeColors.light);
  });

  it('falls back to the base palettes for a null theme', () => {
    const resolved = resolvePalettes(EruditeColors, null);
    expect(resolved.dark).toBe(EruditeColors.dark);
    expect(resolved.light).toBe(EruditeColors.light);
  });
});

describe('overriddenKeys', () => {
  it('flags nothing for the bundled theme', () => {
    const flags = overriddenKeys(BUNDLED_THEME);
    expect(Object.values(flags).some(Boolean)).toBe(false);
  });

  it('flags exactly the changed tokens', () => {
    const theme = {
      ...BUNDLED_THEME,
      dark: { ...BUNDLED_THEME.dark, accent: '#ff0000', optIdleBg: '#00ff00' },
    };
    const flags = overriddenKeys(theme);
    expect(flags.accent).toBe(true);
    expect(flags.optIdleBg).toBe(true);
    expect(flags.bgSolid).toBe(false);
    expect(flags.optIdleText).toBe(false);
  });

  it('flags a token changed in only one appearance, so the marker survives the toggle', () => {
    const theme = {
      ...BUNDLED_THEME,
      light: { ...BUNDLED_THEME.light, accent: '#ff0000' },
    };
    expect(overriddenKeys(theme).accent).toBe(true);
  });

  it('flags a gradient stop change', () => {
    const theme = {
      ...BUNDLED_THEME,
      dark: { ...BUNDLED_THEME.dark, bgGradient: ['#1a1a47', '#2d1f5e', '#000000'] as const },
    };
    expect(overriddenKeys(theme).bgGradient).toBe(true);
  });

  it('reports every key as unflagged for a null theme', () => {
    const flags = overriddenKeys(null);
    expect(Object.keys(flags)).toEqual([...REMOTE_TOKEN_KEYS]);
    expect(Object.values(flags).every((v) => v === false)).toBe(true);
  });
});
