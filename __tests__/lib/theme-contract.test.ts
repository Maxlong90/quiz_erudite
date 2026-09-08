/**
 * The wire contract for the remote theme (lib/theme/contract.ts).
 *
 * This parser is the app's only defence between an operator's colour form and a
 * native style prop. An unparseable colour THROWS in native code on Android, so
 * a theme engine that lets one through can hard-crash the app it themes. These
 * tests pin the policy: reject the whole envelope on any bad token, ignore
 * unknown ones, and never throw.
 */
import {
  CLIENT_THEME_SCHEMA_VERSION,
  REMOTE_TOKEN_KEYS,
  asGradient,
  isColorValue,
  parseRemoteTheme,
  parseThemeEnvelope,
} from '@/lib/theme/contract';

/** A byte-for-byte copy of what the live endpoint serves for configurable-quiz. */
function validTokens(): Record<string, unknown> {
  return {
    bgGradient: ['#1a1a47', '#2d1f5e', '#1a1a47'],
    bgSolid: '#1a1a47',
    accent: '#7c5cff',
    accentSoft: '#a78bff',
    accentBg: '#7c5cff33',
    accentBgSoft: '#7c5cff22',
    accentBorderSoft: '#7c5cff66',
    optIdleBg: '#e5e7eb',
    optIdleBorder: '#d1d5db',
    optIdleText: '#1c1740',
  };
}

function validTheme(): Record<string, unknown> {
  return {
    name: 'configurable-quiz 1',
    supports_dark: true,
    light: validTokens(),
    dark: validTokens(),
  };
}

function envelope(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { schema_version: 1, theme: validTheme(), ...overrides };
}

describe('isColorValue', () => {
  it.each(['#fff', '#ffff', '#7c5cff', '#7c5cff33', '#FFFFFF'])('accepts %s', (value) => {
    expect(isColorValue(value)).toBe(true);
  });

  it.each([
    'rgba(0,0,0,0.5)',
    'red',
    '#12345',
    '#xyzxyz',
    '7c5cff',
    '',
    null,
    undefined,
    123,
    ['#fff'],
  ])('rejects %p', (value) => {
    expect(isColorValue(value)).toBe(false);
  });
});

describe('asGradient', () => {
  it('accepts exactly three colours', () => {
    expect(asGradient(['#1a1a47', '#2d1f5e', '#1a1a47'])).toEqual([
      '#1a1a47',
      '#2d1f5e',
      '#1a1a47',
    ]);
  });

  it('rejects two stops', () => {
    expect(asGradient(['#1a1a47', '#2d1f5e'])).toBeNull();
  });

  it('rejects four stops rather than truncating to three', () => {
    // Truncating would render a palette the operator never previewed.
    expect(asGradient(['#111111', '#222222', '#333333', '#444444'])).toBeNull();
  });

  it('rejects a non-array', () => {
    expect(asGradient('#1a1a47')).toBeNull();
    expect(asGradient({ 0: '#111111', 1: '#222222', 2: '#333333' })).toBeNull();
  });

  it('rejects a well-sized array holding a bad colour', () => {
    expect(asGradient(['#111111', 'papayawhip', '#333333'])).toBeNull();
  });
});

describe('parseThemeEnvelope', () => {
  it('parses a valid payload', () => {
    const result = parseThemeEnvelope(envelope());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.schemaVersion).toBe(1);
    expect(result.theme.name).toBe('configurable-quiz 1');
    expect(result.theme.supports_dark).toBe(true);
    expect(result.theme.dark.bgGradient).toEqual(['#1a1a47', '#2d1f5e', '#1a1a47']);
    expect(result.theme.light.accent).toBe('#7c5cff');
  });

  it('accepts a null preset name', () => {
    const result = parseThemeEnvelope(envelope({ theme: { ...validTheme(), name: null } }));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.theme.name).toBeNull();
  });

  it('accepts supports_dark:false with the backend-mirrored dark map', () => {
    // The backend mirrors light into dark rather than omitting it, so clients can
    // always index theme[appearance]. Nothing special happens here.
    const theme = { ...validTheme(), supports_dark: false };
    const result = parseThemeEnvelope(envelope({ theme }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.theme.supports_dark).toBe(false);
      expect(result.theme.dark.accent).toBe('#7c5cff');
    }
  });

  it('ignores an unknown eleventh token instead of rejecting it', () => {
    // Forward-compatible WITHIN schema 1: a token this build does not know about
    // is dropped at the parser and can never reach a style prop.
    const light = { ...validTokens(), someFutureToken: '#abcdef' };
    const result = parseThemeEnvelope(envelope({ theme: { ...validTheme(), light } }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Object.keys(result.theme.light)).toEqual([...REMOTE_TOKEN_KEYS]);
      expect(result.theme.light).not.toHaveProperty('someFutureToken');
    }
  });

  it.each(REMOTE_TOKEN_KEYS)('rejects the whole envelope when %s is missing', (key) => {
    // Whole-envelope rejection, not per-token fallback: optIdleBg/optIdleText are
    // a contrast pair, so half-applying a palette can produce white-on-white.
    const light = validTokens();
    delete light[key];
    const result = parseThemeEnvelope(envelope({ theme: { ...validTheme(), light } }));
    expect(result).toEqual({ ok: false, reason: 'malformed', schemaVersion: 1 });
  });

  it('rejects a non-string token', () => {
    const dark = { ...validTokens(), accent: 123 };
    expect(parseThemeEnvelope(envelope({ theme: { ...validTheme(), dark } })).ok).toBe(false);
  });

  it('rejects a non-hex token', () => {
    const dark = { ...validTokens(), accent: 'rebeccapurple' };
    expect(parseThemeEnvelope(envelope({ theme: { ...validTheme(), dark } })).ok).toBe(false);
  });

  it('rejects a malformed bgGradient', () => {
    const dark = { ...validTokens(), bgGradient: ['#111111', '#222222'] };
    expect(parseThemeEnvelope(envelope({ theme: { ...validTheme(), dark } })).ok).toBe(false);
  });

  it('rejects a missing dark map', () => {
    const theme = validTheme();
    delete theme.dark;
    expect(parseThemeEnvelope(envelope({ theme })).ok).toBe(false);
  });

  it('rejects a non-boolean supports_dark', () => {
    expect(
      parseThemeEnvelope(envelope({ theme: { ...validTheme(), supports_dark: 'yes' } })).ok,
    ).toBe(false);
  });

  it('reports a newer schema as unsupported, with the version', () => {
    expect(parseThemeEnvelope(envelope({ schema_version: 2 }))).toEqual({
      ok: false,
      reason: 'unsupported-schema',
      schemaVersion: 2,
    });
  });

  it('reports unsupported without judging the body it cannot understand', () => {
    const result = parseThemeEnvelope({ schema_version: 99, theme: { totally: 'different' } });
    expect(result).toEqual({ ok: false, reason: 'unsupported-schema', schemaVersion: 99 });
  });

  it.each([
    ['zero', 0],
    ['a string', '1'],
    ['a float', 1.5],
    ['null', null],
    ['a boolean', true],
  ])(
    'treats %s as a malformed schema_version, not an unsupported one',
    (_label, schemaVersion) => {
      // These mean "we are not talking to the endpoint we think we are", which is
      // a different failure from "the backend moved ahead of this build".
      const result = parseThemeEnvelope({ schema_version: schemaVersion, theme: validTheme() });
      expect(result).toEqual({ ok: false, reason: 'malformed', schemaVersion: null });
    },
  );

  it('treats an absent schema_version as malformed', () => {
    expect(parseThemeEnvelope({ theme: validTheme() })).toEqual({
      ok: false,
      reason: 'malformed',
      schemaVersion: null,
    });
  });

  it.each([null, undefined, 'a string', 42, ['an array']])(
    'never throws on %p',
    (input) => {
      expect(() => parseThemeEnvelope(input)).not.toThrow();
      expect(parseThemeEnvelope(input).ok).toBe(false);
    },
  );

  it('pins the client schema version', () => {
    expect(CLIENT_THEME_SCHEMA_VERSION).toBe(1);
  });
});

describe('parseRemoteTheme', () => {
  it('parses the bare theme object (the shape the snapshot transport carries)', () => {
    // Identical bytes to the /theme endpoint's `theme` key — one client parser
    // serves both transports.
    expect(parseRemoteTheme(validTheme())).not.toBeNull();
  });

  it('rejects a non-object', () => {
    expect(parseRemoteTheme('nope')).toBeNull();
  });
});
