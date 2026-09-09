/**
 * THE ONBOARDING SWITCH: does the host render the variant the data selected?
 *
 * NOT TO BE CONFUSED WITH __tests__/components/t-onboarding-variants.test.tsx.
 * The two files differ only by directory and they pin different halves:
 *
 *   components/ — every variant is a well-behaved presentational COMPONENT:
 *                 same testIDs, renders the label verbatim, reports gestures
 *                 rather than acting on them, imports nothing that would move a
 *                 decision out of the host.
 *   app/  (here) — the HOST picks the right one, degrades rather than throws on
 *                 data it does not understand, and does not swap the screen out
 *                 from under a flow already in progress.
 *
 * Neither implies the other. Every variant could be impeccable while the
 * registry lookup ignored the backend entirely, and the lookup could be perfect
 * while a variant navigated on its own.
 *
 * WHY THIS SUITE MOCKS THE THEME ENGINE AND NOT THE HOOK
 * -----------------------------------------------------
 * jest.mock('@/hooks/t/use-onboarding-type') is the obvious move and it makes the
 * central case unwritable. The freeze this file has to observe lives in that
 * hook's useRef; a mock deletes it, the host re-reads the hook and redoes the
 * registry lookup on every render, and a mutable mock flipped between renders
 * WOULD swap the variant. Making the mock itself freeze would be testing the
 * mock. So the seam under test is the real hook, and the thing that moves is the
 * engine underneath it — which is also how the value moves in production, via
 * the token gallery's forced refetch.
 *
 * That has a second payoff: `martian` and `null` exercise two DIFFERENT
 * fallbacks. The hook only `??`s on null/undefined, so a bad string passes
 * straight through it and reaches the registry lookup, which is where
 * app/t/onboarding.tsx's own `??` catches it.
 */
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

const mockReplace = jest.fn();
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { replace: (...a: unknown[]) => mockReplace(...a), push: (...a: unknown[]) => mockPush(...a) },
}));

jest.mock('@/lib/revenuecat', () => ({ revenueCatEnabled: true }));
jest.mock('@/hooks/use-onboarding', () => ({
  useOnboarding: () => ({ hasSeen: false, markSeen: jest.fn(async () => {}) }),
}));
jest.mock('@/hooks/use-translation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('@/hooks/use-theme-pref', () => ({
  useThemePref: () => ({ theme: 'dark', ready: true, setTheme: jest.fn() }),
}));

/**
 * The engine, standing in for the whole transport.
 *
 * A partial value is safe on purpose: useThemeColors optional-chains `palettes`
 * (`appTheme?.palettes?.[theme] ?? EruditeColors[theme]`), so ScreenBackground
 * and useTemplateTheme both survive an object that carries nothing but the one
 * field under test — which keeps each case naming exactly the input it varies.
 */
let mockThemeValue: unknown = null;
jest.mock('@/hooks/use-app-theme', () => ({
  ...jest.requireActual('@/hooks/use-app-theme'),
  useAppTheme: () => mockThemeValue,
}));

/* eslint-disable import/first -- screen under test loads AFTER its mocks */
import TTemplateOnboarding from '@/app/t/onboarding';
import { setForcedOnboardingType } from '@/hooks/t/use-onboarding-type';
import {
  T_ONBOARDING_DEFAULT,
  T_ONBOARDING_RENDERED_TYPES,
  type TOnboardingType,
} from '@/lib/onboarding/onboarding-type';

beforeEach(() => {
  jest.clearAllMocks();
  mockThemeValue = null;
  // Module state that outlives a test the way it outlives a navigation.
  setForcedOnboardingType(null);
});

/** The root marker every variant carries, named for its registry key. */
function marker(type: TOnboardingType): string {
  return `t-onboarding-variant-${type}`;
}

describe('the host renders the variant the backend selected', () => {
  it('ships more than one variant to choose between', () => {
    // Anti-vacuity, and it is the negative half below that needs it: with one
    // DRAWING type there is no "other" marker to be absent, and every case in
    // this file would pass for a host that ignored the data entirely. Counting
    // the RENDERED subset rather than the whole union is what keeps that true —
    // a union of ['classic', 'none'] satisfies `>= 2` while offering nothing to
    // choose between.
    expect(T_ONBOARDING_RENDERED_TYPES.length).toBeGreaterThanOrEqual(2);
  });

  // One %s only: it.each hands a single argument per row, and printf
  // substitution is positional — a second %s would print literally.
  it.each(T_ONBOARDING_RENDERED_TYPES)('renders %s and no other variant', (type) => {
    mockThemeValue = { onboardingType: type };
    const { getByTestId, queryByTestId } = render(<TTemplateOnboarding />);

    expect(getByTestId(marker(type))).toBeTruthy();
    // The negative half is not decoration: a host that rendered BOTH variants
    // stacked would satisfy the positive assertion on every type in the union.
    T_ONBOARDING_RENDERED_TYPES.filter((other) => other !== type).forEach((other) => {
      expect(queryByTestId(marker(other))).toBeNull();
    });
  });

  it('degrades to the shipped screen when handed a type that draws nothing', () => {
    // Reaching this host on a `none` build means the intro gate was bypassed
    // (a cold deep link is the only route). The host must still paint something
    // rather than throw or blank.
    //
    // This is the PREDICATE branch of the lookup, where the older `martian` case
    // below is the `??` branch — two distinct paths to the same default, and
    // neither one covers the other.
    mockThemeValue = { onboardingType: 'none' };
    let root: ReturnType<typeof render> | null = null;
    expect(() => {
      root = render(<TTemplateOnboarding />);
    }).not.toThrow();
    expect(root!.getByTestId(marker(T_ONBOARDING_DEFAULT))).toBeTruthy();
    // There is no such component, so there must be no such marker.
    expect(root!.queryByTestId(marker('none'))).toBeNull();
  });

  it('degrades to the shipped screen when the backend names one this build lacks', () => {
    // Exercises the HOST's `??`, not the hook's. `martian` is a string, so
    // useOnboardingType() passes it through untouched and the registry lookup
    // returns undefined — which app/t/onboarding.tsx answers structurally rather
    // than by comparing names, so a rename of the base variant stays a
    // one-constant change. `reject a set you cannot half-apply; degrade a scalar
    // you can`.
    mockThemeValue = { onboardingType: 'martian' };
    let root: ReturnType<typeof render> | null = null;
    expect(() => {
      root = render(<TTemplateOnboarding />);
    }).not.toThrow();
    expect(root!.getByTestId(marker(T_ONBOARDING_DEFAULT))).toBeTruthy();
  });

  it('degrades to the shipped screen with no theme engine above it at all', () => {
    // Exercises the HOOK's `??`: a build with no provider, an offline first run,
    // or any of the fail-open paths that end in an absent value.
    mockThemeValue = null;
    const { getByTestId } = render(<TTemplateOnboarding />);
    expect(getByTestId(marker(T_ONBOARDING_DEFAULT))).toBeTruthy();
  });
});

describe('the choice is made once, for the whole flow', () => {
  it('does not swap the screen — or lose the page — when the engine changes mid-flow', () => {
    /**
     * The case that cannot be written next door, and the one the freeze exists
     * for. The token gallery's forced refetch is the only way the value moves
     * after the splash has settled it, and a swap at that moment would remount
     * the onboarding component and silently reset the player to page 0.
     *
     * So the page assertion is not a bonus: page survival is the stated REASON
     * for the freeze, and a test that only checked the marker would pass for an
     * implementation that remounted the same variant.
     */
    mockThemeValue = { onboardingType: 'classic' };
    const { getByTestId, queryByTestId, rerender } = render(<TTemplateOnboarding />);
    fireEvent.press(getByTestId('t-onboarding-primary'));
    expect(getByTestId('t-onboarding-page-1')).toBeTruthy();

    mockThemeValue = { onboardingType: 'universal' };
    rerender(<TTemplateOnboarding />);

    expect(getByTestId(marker('classic'))).toBeTruthy();
    expect(queryByTestId(marker('universal'))).toBeNull();
    expect(getByTestId('t-onboarding-page-1')).toBeTruthy();
  });
});

describe('the dev override reaches the screen', () => {
  it('renders the pinned variant over the one the backend sent', () => {
    // Today this is the ONLY path to the second screen on hardware: the deployed
    // backend serves schema_version 2, the client understands 1, so the envelope
    // carrying `onboarding_type` is rejected before anything reads it. This case
    // is the end-to-end proof of the path the operator flow in
    // docs/configurable-template.md actually walks — gallery, dev reset, splash.
    mockThemeValue = { onboardingType: 'classic' };
    setForcedOnboardingType('universal');

    const { getByTestId, queryByTestId } = render(<TTemplateOnboarding />);
    expect(getByTestId(marker('universal'))).toBeTruthy();
    expect(queryByTestId(marker('classic'))).toBeNull();
  });
});
