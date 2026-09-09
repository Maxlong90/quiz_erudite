/**
 * The onboarding VARIANT contract (components/t/onboarding/).
 *
 * __tests__/app/t-onboarding.test.tsx pins the FLOW — markSeen() before every
 * navigation, the store-billing gate on the closing pitch — and it does so
 * against the host with whatever variant happens to be registered under the
 * default. This file pins the other half: that every variant, present and
 * future, is interchangeable in the ways the host relies on.
 *
 * Both halves are needed, and the gap between them is the point. The flow test
 * mounts the host, so a variant that navigated on its own would satisfy it just
 * as well as one that reported upward — and __tests__/app/t-routes.test.ts:346,
 * which only asserts that app/t/onboarding.tsx CONTAINS the '/t/paywall'
 * literal, would stay green with that literal sitting in the host as dead text.
 * The ownership guard below is what closes that: it forbids the imports a
 * variant would need in order to take the decision for itself.
 */
import React from 'react';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { Dimensions, ScrollView } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';

// The variants read colours through useTemplateTheme -> useThemeColors, which
// reads the appearance preference. Everything else they need is a prop.
jest.mock('@/hooks/use-theme-pref', () => ({
  useThemePref: () => ({ theme: 'dark', ready: true, setTheme: jest.fn() }),
}));

import { T_ONBOARDING_VARIANTS } from '@/components/t/onboarding';
import { OnboardingClassic } from '@/components/t/onboarding/classic';
import { OnboardingUniversal } from '@/components/t/onboarding/universal';
import type {
  TOnboardingStep,
  TOnboardingVariantProps,
} from '@/components/t/onboarding/contract';
import {
  T_ONBOARDING_RENDERED_TYPES,
  T_ONBOARDING_TYPES,
  showsOnboarding,
} from '@/lib/onboarding/onboarding-type';

const ROOT = join(__dirname, '..', '..');
const VARIANT_DIR = join(ROOT, 'components', 't', 'onboarding');

const STEPS: TOnboardingStep[] = [
  {
    slot: 'onboarding/step1.png',
    titleKey: 'onboarding.page1.title',
    subtitleKey: 'onboarding.page1.subtitle',
  },
  {
    slot: 'onboarding/step2.png',
    titleKey: 'onboarding.page2.title',
    subtitleKey: 'onboarding.page2.subtitle',
  },
  {
    slot: 'onboarding/step3.png',
    titleKey: 'onboarding.page3.title',
    subtitleKey: 'onboarding.page3.subtitle',
  },
];

const PAGE_COUNT = STEPS.length + 1;

function props(overrides: Partial<TOnboardingVariantProps> = {}): TOnboardingVariantProps {
  return {
    steps: STEPS,
    premiumSlot: 'paywall/hero.png',
    premiumTitleKey: 'paywall.subtitle',
    premiumSubtitleKey: 'paywall.feature.unlimited',
    page: 0,
    pageCount: PAGE_COUNT,
    primaryLabel: 'NEXT-LABEL',
    skipLabel: 'SKIP-LABEL',
    // Identity, so an assertion on rendered text names the key it came from.
    t: (key) => key,
    onPrimaryPress: jest.fn(),
    onSkip: jest.fn(),
    onPageChange: jest.fn(),
    ...overrides,
  };
}

const VARIANTS = Object.entries(T_ONBOARDING_VARIANTS);

/** The union members that draw nothing — `none` today, by construction. */
const SKIPPING_TYPES = T_ONBOARDING_TYPES.filter((type) => !showsOnboarding(type));

describe('the onboarding variant registry', () => {
  it('answers for every onboarding type that draws a screen', () => {
    // A Record already makes a missing key a compile error, but there is no
    // `tsc` npm script in this repo, so this is the belt that actually runs.
    expect(Object.keys(T_ONBOARDING_VARIANTS).sort()).toEqual(
      [...T_ONBOARDING_RENDERED_TYPES].sort(),
    );
  });

  it('has no entry for a type that draws nothing', () => {
    // An entry for `none` would not "add support" for it — it would hand the
    // host something to render and thereby overrule the intro gate's skip.
    expect(SKIPPING_TYPES).not.toHaveLength(0); // anti-vacuity
    SKIPPING_TYPES.forEach((type) => {
      expect(T_ONBOARDING_VARIANTS).not.toHaveProperty(type);
    });
  });

  it('accounts for every union member exactly once, as drawn or as skipped', () => {
    // THIS is what replaces the old whole-union equality. Comparing the keys
    // against the rendered subset alone would stay green for a future type that
    // is neither registered NOR marked as skipping — one that fell out of both
    // halves and would reach the host's `??` with nobody noticing.
    expect([...Object.keys(T_ONBOARDING_VARIANTS), ...SKIPPING_TYPES].sort()).toEqual(
      [...T_ONBOARDING_TYPES].sort(),
    );
  });

  it.each(VARIANTS)('%s resolves to a component', (_type, Variant) => {
    expect(typeof Variant).toBe('function');
  });

});

describe.each(VARIANTS)('the %s variant', (type, Variant) => {
  it('renders the controls the host drives it through', () => {
    const { getByTestId } = render(<Variant {...props()} />);
    expect(getByTestId('t-onboarding-skip')).toBeTruthy();
    expect(getByTestId('t-onboarding-primary')).toBeTruthy();
  });

  it('marks itself with the registry key that reached it', () => {
    // Each variant hardcodes exactly ONE marker, so this doubles as the proof
    // that no two keys share a component — no `.not.toBe` needed. Э8-B-1's
    // looser form matched any name from the union, which would have stayed green
    // through a re-alias since both keys are union members; naming `type` is what
    // makes the assertion bind.
    const { getByTestId } = render(<Variant {...props()} />);
    expect(getByTestId(`t-onboarding-variant-${type}`)).toBeTruthy();
  });

  it('shows the artwork of the page it was given', () => {
    STEPS.forEach((step, index) => {
      const { getByTestId } = render(<Variant {...props({ page: index })} />);
      expect(getByTestId(`t-onboarding-art-${step.slot}`)).toBeTruthy();
      expect(getByTestId(`t-onboarding-page-${index}`)).toBeTruthy();
    });
  });

  it('addresses the ACTIVE progress indicator and no other', () => {
    // The negative half is what gives the id its meaning. `classic` mounts every
    // page at once, so no art testID says which page is visible and this is the
    // only thing that does — and a variant that tagged all four indicators would
    // make every per-page assertion in this repo (including the host suite's
    // walk through the four slots) silently vacuous while staying green, because
    // the index is part of the id and all four would still be unique.
    const { queryByTestId } = render(<Variant {...props({ page: 1 })} />);
    expect(queryByTestId('t-onboarding-page-1')).toBeTruthy();
    [0, 2, 3].forEach((i) => expect(queryByTestId(`t-onboarding-page-${i}`)).toBeNull());
  });

  it('closes on the premium pitch', () => {
    const { getByTestId } = render(<Variant {...props({ page: PAGE_COUNT - 1 })} />);
    expect(getByTestId('t-onboarding-art-paywall/hero.png')).toBeTruthy();
    expect(getByTestId(`t-onboarding-page-${PAGE_COUNT - 1}`)).toBeTruthy();
  });

  it('renders the label the host computed, verbatim', () => {
    // The label arrives ALREADY capability-gated. A variant that rebuilt it from
    // the page number would be a second, divergent billing gate.
    const { getByTestId } = render(
      <Variant {...props({ page: PAGE_COUNT - 1, primaryLabel: 'GATED-LABEL' })} />,
    );
    expect(getByTestId('t-onboarding-primary')).toHaveTextContent('GATED-LABEL');
    expect(getByTestId('t-onboarding-skip')).toHaveTextContent('SKIP-LABEL');
  });

  it('reports a press rather than acting on it', () => {
    const onPrimaryPress = jest.fn();
    const onSkip = jest.fn();
    const { getByTestId } = render(<Variant {...props({ onPrimaryPress, onSkip })} />);

    fireEvent.press(getByTestId('t-onboarding-primary'));
    expect(onPrimaryPress).toHaveBeenCalledTimes(1);
    expect(onSkip).not.toHaveBeenCalled();

    fireEvent.press(getByTestId('t-onboarding-skip'));
    expect(onSkip).toHaveBeenCalledTimes(1);
    expect(onPrimaryPress).toHaveBeenCalledTimes(1);
  });

  it('does not move the page by itself', () => {
    // onPageChange reports a page the USER reached by gesture. A variant that
    // fired it on mount, or to acknowledge a page the host set, would put the
    // two of them in a loop.
    const onPageChange = jest.fn();
    const { rerender } = render(<Variant {...props({ onPageChange })} />);
    expect(onPageChange).not.toHaveBeenCalled();

    rerender(<Variant {...props({ page: 1, onPageChange })} />);
    expect(onPageChange).not.toHaveBeenCalled();
  });
});

/**
 * Pinned against OnboardingClassic DIRECTLY rather than through describe.each,
 * because this is not a contract every variant owes: `classic` is the only
 * variant that mounts all four pages inside one pagingEnabled ScrollView, so it
 * is the only one that has to reconcile a controlled `page` prop with a list
 * that also moves under the player's finger. `universal` mounts one page at a
 * time and has no ScrollView to fight with.
 *
 * The behaviour is a deliberate deviation from the obvious implementation and
 * these four cases are the whole record of it — see the `settledPage` docblock
 * in components/t/onboarding/classic.tsx. Replacing that ref with a bare
 * `useEffect(scrollTo, [page])` fails the first and third case below while every
 * other assertion in this repo stays green.
 */
describe('the classic pager scrolls on a press and on nothing else', () => {
  // @react-native/jest-preset installs `scrollTo: jest.fn()` on the ScrollView
  // PROTOTYPE (jest/mockComponent.js does Object.assign(Component.prototype,
  // instanceMethods)), so the spy is shared by every instance and readable from
  // out here without a ref of our own.
  const scrollTo = (ScrollView.prototype as unknown as { scrollTo: jest.Mock }).scrollTo;
  const { width: SCREEN_WIDTH } = Dimensions.get('window');

  beforeEach(() => {
    scrollTo.mockClear();
  });

  /** Dispatch the scroll event a pagingEnabled list emits as it settles. */
  function swipeTo(root: ReturnType<typeof render>, page: number) {
    fireEvent.scroll(root.UNSAFE_getByType(ScrollView), {
      nativeEvent: {
        contentOffset: { x: page * SCREEN_WIDTH, y: 0 },
        contentSize: { width: PAGE_COUNT * SCREEN_WIDTH, height: 100 },
        layoutMeasurement: { width: SCREEN_WIDTH, height: 100 },
      },
    });
  }

  it('does not scroll on mount', () => {
    // The naive effect fires here for a pointless animated scroll to x=0.
    render(<OnboardingClassic {...props()} />);
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('scrolls when the host moves the page, as the button does', () => {
    const root = render(<OnboardingClassic {...props()} />);
    root.rerender(<OnboardingClassic {...props({ page: 1 })} />);

    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith({ x: SCREEN_WIDTH, animated: true });
  });

  it('reports a swipe without scrolling itself', () => {
    const onPageChange = jest.fn();
    const root = render(<OnboardingClassic {...props({ onPageChange })} />);

    swipeTo(root, 1);
    expect(onPageChange).toHaveBeenCalledWith(1);
    expect(scrollTo).not.toHaveBeenCalled();

    // The host answers the report by re-rendering with the page it was told
    // about. The list is ALREADY there; a programmatic animated scroll now would
    // fight the player's finger and the pager's own momentum.
    root.rerender(<OnboardingClassic {...props({ page: 1, onPageChange })} />);
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('ignores a drag that has not crossed a page boundary', () => {
    const onPageChange = jest.fn();
    const root = render(<OnboardingClassic {...props({ onPageChange })} />);

    swipeTo(root, 0);
    expect(onPageChange).not.toHaveBeenCalled();
    expect(scrollTo).not.toHaveBeenCalled();
  });
});

/**
 * The mirror image of the pager block above, and imported directly for the same
 * reason: the filmstrip is `universal`'s answer to a problem `classic` solves
 * with a pagingEnabled ScrollView. `classic` gets backward navigation for free
 * from the gesture; a one-page-at-a-time variant has to offer it explicitly, or
 * the only way back through the intro is to finish it.
 *
 * So this is not a capability `universal` invents — it is the capability
 * `classic` already has, made visible. Which is exactly why it is safe: the host
 * holds one state cell (`page`) and recomputes isPremiumSlide, offersPremium and
 * the button label inline from it on every render, with no memo and no
 * high-water mark, so a backward onPageChange(0) is indistinguishable from any
 * other value it could be handed.
 */
describe('the universal filmstrip offers the way back that a pager gets for free', () => {
  it('draws a thumbnail per step and none for the closing pitch', () => {
    // Bounded to the steps ON PURPOSE: a tap must never be able to jump to the
    // premium page, which is reachable only through the primary button and the
    // capability gate that computes its label.
    const { getByTestId, queryByTestId } = render(
      <OnboardingUniversal {...props({ page: PAGE_COUNT - 1 })} />,
    );

    STEPS.forEach((step) => expect(getByTestId(`t-onboarding-thumb-${step.slot}`)).toBeTruthy());
    expect(queryByTestId('t-onboarding-thumb-paywall/hero.png')).toBeNull();
  });

  it('keeps the thumbnails addressable apart from the artwork', () => {
    // The `thumb` prefix is mandatory rather than decorative: a thumbnail draws
    // the same slot the stage does, and getByTestId throws on duplicates — so
    // reusing `t-onboarding-art-` would take down the shared contract cases
    // above rather than failing anything here.
    const { getByTestId } = render(<OnboardingUniversal {...props({ page: 0 })} />);
    expect(getByTestId('t-onboarding-art-onboarding/step1.png')).toBeTruthy();
    expect(getByTestId('t-onboarding-thumb-onboarding/step1.png')).toBeTruthy();
  });

  it('reports a tap on another page as a gesture', () => {
    const onPageChange = jest.fn();
    const { getByTestId } = render(
      <OnboardingUniversal {...props({ page: 2, onPageChange })} />,
    );

    fireEvent.press(getByTestId('t-onboarding-thumb-onboarding/step1.png'));
    expect(onPageChange).toHaveBeenCalledWith(0);
  });

  it('never reports the page it is already on', () => {
    // onPageChange means "the user reached a page BY GESTURE". Acknowledging a
    // page the host already set is how a controlled list ends up talking to
    // itself. Held twice over in the component — the active thumbnail is
    // `disabled` and the handler re-checks the index — so that either half alone
    // delivers the behaviour this asserts.
    const onPageChange = jest.fn();
    const { getByTestId } = render(
      <OnboardingUniversal {...props({ page: 1, onPageChange })} />,
    );

    const active = getByTestId('t-onboarding-thumb-onboarding/step2.png');
    // Pressable folds `disabled` into accessibilityState, so both facts — which
    // one a screen reader announces as current, and which one it refuses to
    // activate — are readable off the same prop.
    expect(active.props.accessibilityState).toMatchObject({ selected: true, disabled: true });
    expect(
      getByTestId('t-onboarding-thumb-onboarding/step1.png').props.accessibilityState,
    ).toMatchObject({ selected: false, disabled: false });

    fireEvent.press(active);
    expect(onPageChange).not.toHaveBeenCalled();
  });
});

describe('a variant owns pixels and nothing else', () => {
  /** Every source file under components/t/onboarding/, contract included. */
  const OWNED = readdirSync(VARIANT_DIR)
    .filter((name) => /\.tsx?$/.test(name))
    .filter((name) => statSync(join(VARIANT_DIR, name)).isFile())
    .sort();

  /**
   * Imports that would move a decision out of the host.
   *
   * '@/hooks/use-onboarding' is safely NOT a substring of
   * '@/hooks/t/use-onboarding-type' — the `t/` intervenes — so a variant reading
   * the onboarding TYPE (which is inert presentation data) cannot false-positive
   * against the row that forbids reading the SEEN FLAG.
   */
  const FORBIDDEN = [
    // Navigation is the host's: t-routes.test.ts pins both route literals there.
    'expo-router',
    // markSeen() ordering is the host's, and it is what t-onboarding.test.tsx proves.
    '@/hooks/use-onboarding',
    // Capability gating is the host's; the variant gets an already-gated label.
    '@/lib/revenuecat',
    // Colours go through useTemplateTheme(), like everywhere under /t.
    '@/hooks/use-theme-colors',
  ];

  it('finds the variant sources', () => {
    // Anti-vacuity: contract.ts, classic.tsx and index.ts at minimum.
    expect(OWNED.length).toBeGreaterThanOrEqual(3);
  });

  it.each(FORBIDDEN)('no variant source imports %s', (specifier) => {
    const offenders = OWNED.filter((name) => {
      const source = readFileSync(join(VARIANT_DIR, name), 'utf8')
        // Strip comments, so a docblock EXPLAINING the rule does not break it.
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '');
      return new RegExp(`['"]${specifier.replace(/[/*+?^${}()|[\]\\]/g, '\\$&')}['"]`).test(source);
    });
    expect({ specifier, offenders }).toEqual({ specifier, offenders: [] });
  });
});
