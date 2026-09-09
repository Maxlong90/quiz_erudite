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
  T_ONBOARDING_DEFAULT,
  T_ONBOARDING_TYPES,
} from '@/lib/onboarding/onboarding-type';
import {
  CLIENT_THEME_SCHEMA_VERSION,
  REMOTE_TOKEN_KEYS,
  asGradient,
  isColorValue,
  parseRemoteTheme,
  parseThemeEnvelope,
} from '@/lib/theme/contract';
import {
  SCHEMA_VERSION_V2,
  envelopeV2 as envelope,
  validThemeV2 as validTheme,
  validTokensV2 as validTokens,
} from '@/__tests__/fixtures/remote-theme-v2';

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
    expect(result.schemaVersion).toBe(SCHEMA_VERSION_V2);
    expect(result.theme.name).toBe('test-quiz 1');
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

  it('ignores an unknown token instead of rejecting it', () => {
    // Forward-compatible WITHIN a schema version: a token this build does not
    // know about is dropped at the parser and can never reach a style prop.
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
    expect(result).toEqual({ ok: false, reason: 'malformed', schemaVersion: SCHEMA_VERSION_V2 });
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
    expect(parseThemeEnvelope(envelope({ schema_version: 3 }))).toEqual({
      ok: false,
      reason: 'unsupported-schema',
      schemaVersion: 3,
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

  it('pins the client schema version against the backend registry', () => {
    // This is a one-directional trap, which is why it is pinned rather than
    // merely documented: if the backend serves a version this build does not
    // understand, every ALREADY-INSTALLED client takes the unsupported-schema
    // branch, the provider persists nothing, and every device in the field loses
    // the operator's palette until the app updates. Store-review latency means
    // the client cannot be rolled out first to absorb it.
    //
    // v2 is the Э1 widening — the backend added the paywall/progress/economy/
    // splash groups, which a ten-token client would have half-applied, so the
    // bump was correct and this build was updated in step. The rule for v3
    // stands: the version moves ONLY for a change that would make an installed
    // client render something WRONG — a renamed or removed token, or a changed
    // value domain. Adding a key is safe by construction — parseTokens iterates
    // REMOTE_TOKEN_KEYS rather than the payload's own keys, as pinned above by
    // 'ignores an unknown token'. The live contract is re-checked on demand by
    // __tests__/lib/theme-contract-live.livetest.ts.
    expect(CLIENT_THEME_SCHEMA_VERSION).toBe(SCHEMA_VERSION_V2);
  });
});

describe('onboarding_type', () => {
  it("defaults when the key is absent — today's backend, unchanged", () => {
    // The whole reason this subtask can ship BEFORE the backend does.
    const result = parseThemeEnvelope(envelope());
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.onboardingType).toBe(T_ONBOARDING_DEFAULT);
  });

  it.each(T_ONBOARDING_TYPES)('round-trips %s', (type) => {
    const result = parseThemeEnvelope(envelope({ onboarding_type: type }));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.onboardingType).toBe(type);
  });

  it('reads it as a SIBLING of theme, not a key inside it', () => {
    // Inside `theme` it would break the invariant that theme's keys mirror the
    // backend's ColorTokenRegistry one for one — and parseTokens would drop it.
    const theme = { ...validTheme(), onboarding_type: 'universal' };
    const result = parseThemeEnvelope(envelope({ theme }));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.onboardingType).toBe(T_ONBOARDING_DEFAULT);
  });

  it.each([42, '', null, [], {}, true, 'UNIVERSAL', ' classic ', 'martian'])(
    'degrades %p to the default WITHOUT rejecting the envelope',
    (value) => {
      // Decision C: reject a set you cannot half-apply; degrade a scalar you can.
      // Colours are a contrast pair and reach a native style prop that throws on
      // garbage; a switch discriminant has neither property. Rejecting here would
      // discard the operator's ENTIRE palette over one bad non-colour string.
      const result = parseThemeEnvelope(envelope({ onboarding_type: value }));
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.onboardingType).toBe(T_ONBOARDING_DEFAULT);
      // The claim that actually matters — the palette survived intact.
      expect(result.theme.light.accent).toBe('#7c5cff');
      expect(result.theme.dark.bgGradient).toEqual(['#1a1a47', '#2d1f5e', '#1a1a47']);
    },
  );

  it('is not resolved onto a malformed envelope', () => {
    // Read only AFTER the theme parses, so a failure branch carries no type.
    const result = parseThemeEnvelope(envelope({ onboarding_type: 'universal', theme: 'nope' }));
    expect(result).toEqual({ ok: false, reason: 'malformed', schemaVersion: SCHEMA_VERSION_V2 });
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
