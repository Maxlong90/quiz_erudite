/**
 * The onboarding variant union and its parser (lib/onboarding/onboarding-type.ts).
 *
 * Two properties carry the whole module: the parser is TOTAL over hostile input
 * (it never throws, whatever arrives off the wire or off the disk), and the match
 * is EXACT (no case folding, no trimming), so a near-miss from a drifting backend
 * surfaces as the default rather than hiding behind a screen that happens to
 * render.
 */
import {
  T_ONBOARDING_DEFAULT,
  T_ONBOARDING_RENDERED_TYPES,
  T_ONBOARDING_TYPES,
  parseOnboardingType,
  resolveOnboardingType,
  showsOnboarding,
  type TOnboardingType,
} from '@/lib/onboarding/onboarding-type';

/**
 * Everything that is not a shipped variant. Kept in one list so both the parser
 * and the resolver are driven over the identical inputs — the pair of them is the
 * contract, not either one alone.
 */
const HOSTILE_INPUT: unknown[] = [
  undefined,
  null,
  42,
  0,
  NaN,
  true,
  false,
  '',
  [],
  {},
  ['universal'],
  { type: 'universal' },
  'martian',
  'onboarding',
  // Near-misses. These are the interesting ones: each is a plausible thing a
  // drifting backend or a hand-edited record could contain.
  'UNIVERSAL',
  'Universal',
  'Classic',
  ' classic ',
  'classic ',
  'universal\n',
];

describe('the union', () => {
  it('names today\'s screen as the default', () => {
    // 'classic' is the screen that ships now. This is what makes a build that
    // gets no answer from the backend render pixel-identically to what shipped
    // before the field existed.
    expect(T_ONBOARDING_DEFAULT).toBe('classic');
  });

  it('contains its own default', () => {
    // Anti-vacuity: Э8-B builds a Record<TOnboardingType, Component> registry and
    // falls back to VARIANTS[T_ONBOARDING_DEFAULT]. A default outside the union
    // would make that fallback resolve to undefined and render nothing.
    expect(T_ONBOARDING_TYPES).toContain(T_ONBOARDING_DEFAULT);
  });

  it('holds no duplicates', () => {
    expect(new Set(T_ONBOARDING_TYPES).size).toBe(T_ONBOARDING_TYPES.length);
  });

  it('matches the backend enum, IN ORDER', () => {
    // The counterpart lives in the other repository:
    // /var/www/quiz-erudit-backend/tests/Unit/OnboardingTypeEnumTest.php
    //   ::test_the_enum_holds_the_three_documented_cases
    // which asserts the same three values in the same order against
    // OnboardingTypeEnum::cases().
    //
    // ORDER, not merely membership. Nothing runs the two suites together and
    // nothing can — they are different languages in different repositories — so
    // the only mechanism keeping them aligned is that both spell out one literal
    // list that a human can read side by side. A set comparison would leave the
    // two free to drift into different orders, and the backend's assertSame is
    // order-sensitive, so the drift would surface there as a mystery failure
    // rather than here as an obvious one.
    expect([...T_ONBOARDING_TYPES]).toEqual(['classic', 'universal', 'none']);
  });
});

describe('showsOnboarding', () => {
  it.each(T_ONBOARDING_RENDERED_TYPES)('says %s draws a screen', (type) => {
    expect(showsOnboarding(type)).toBe(true);
  });

  it('says none draws nothing', () => {
    expect(showsOnboarding('none')).toBe(false);
  });

  it('treats none as the ONLY non-drawing type', () => {
    // Anti-vacuity in both directions. Too permissive and the intro gate would
    // skip onboarding for a type that has a screen; too strict and `none` would
    // render one. Deriving the expectation from `filter` rather than restating
    // the union is safe here because the assertion is about the PREDICATE's
    // partition of the union, not about the union's contents.
    expect(T_ONBOARDING_TYPES.filter((type) => !showsOnboarding(type))).toEqual(['none']);
  });

  it('agrees that the fail-open default draws something', () => {
    // Load-bearing for every `?? T_ONBOARDING_VARIANTS[T_ONBOARDING_DEFAULT]` in
    // the tree: a default that drew nothing would make each of them undefined.
    expect(showsOnboarding(T_ONBOARDING_DEFAULT)).toBe(true);
  });

  it('does not parse — it answers about union members only', () => {
    // A value smuggled past the union reads as DRAWING, which is the fail-open
    // direction: the host's registry lookup then misses and falls back to the
    // shipped screen. The alternative (an allow-list) would answer `false` and
    // skip onboarding entirely for a typo. Parsing belongs to
    // parseOnboardingType, and duplicating it here would create a second,
    // weaker parser reachable around the first.
    expect(showsOnboarding('NONE' as TOnboardingType)).toBe(true);
    expect(showsOnboarding('martian' as TOnboardingType)).toBe(true);
  });
});

describe('the rendered subset', () => {
  it('is the union minus the types that draw nothing', () => {
    expect([...T_ONBOARDING_RENDERED_TYPES]).toEqual(['classic', 'universal']);
  });

  it('excludes none', () => {
    expect(T_ONBOARDING_RENDERED_TYPES).not.toContain('none');
  });

  it('is a subset of the union', () => {
    T_ONBOARDING_RENDERED_TYPES.forEach((type) => {
      expect(T_ONBOARDING_TYPES).toContain(type);
    });
  });
});

describe('parseOnboardingType', () => {
  it.each(T_ONBOARDING_TYPES)('accepts %s and returns it unchanged', (type) => {
    expect(parseOnboardingType(type)).toBe(type);
  });

  it.each(HOSTILE_INPUT)('rejects %p', (raw) => {
    expect(parseOnboardingType(raw)).toBeNull();
  });

  it('never throws, whatever it is handed', () => {
    const nasty: unknown[] = [
      ...HOSTILE_INPUT,
      Symbol('universal'),
      () => 'universal',
      // A getter that explodes when read would take a naive implementation with
      // it; this one only ever does a typeof check and an includes.
      Object.defineProperty({}, 'toString', {
        get() {
          throw new Error('boom');
        },
      }),
    ];
    for (const raw of nasty) {
      expect(() => parseOnboardingType(raw)).not.toThrow();
    }
  });

  it('does NOT normalise case or whitespace', () => {
    // Pinned deliberately: leniency here would let a backend enum and a client
    // union drift apart while everything still appeared to work.
    expect(parseOnboardingType('UNIVERSAL')).toBeNull();
    expect(parseOnboardingType(' classic ')).toBeNull();
  });
});

describe('resolveOnboardingType', () => {
  it.each(T_ONBOARDING_TYPES)('passes %s straight through', (type) => {
    expect(resolveOnboardingType(type)).toBe(type);
  });

  it('is total — every hostile input yields the default', () => {
    for (const raw of HOSTILE_INPUT) {
      expect(resolveOnboardingType(raw)).toBe(T_ONBOARDING_DEFAULT);
    }
  });

  it('always returns a member of the union', () => {
    for (const raw of [...HOSTILE_INPUT, ...T_ONBOARDING_TYPES]) {
      expect(T_ONBOARDING_TYPES).toContain(resolveOnboardingType(raw));
    }
  });
});
