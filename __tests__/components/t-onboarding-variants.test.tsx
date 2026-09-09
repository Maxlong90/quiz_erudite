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
import { fireEvent, render } from '@testing-library/react-native';

// The variants read colours through useTemplateTheme -> useThemeColors, which
// reads the appearance preference. Everything else they need is a prop.
jest.mock('@/hooks/use-theme-pref', () => ({
  useThemePref: () => ({ theme: 'dark', ready: true, setTheme: jest.fn() }),
}));

import { T_ONBOARDING_VARIANTS } from '@/components/t/onboarding';
import type {
  TOnboardingStep,
  TOnboardingVariantProps,
} from '@/components/t/onboarding/contract';
import { T_ONBOARDING_TYPES } from '@/lib/onboarding/onboarding-type';

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

describe('the onboarding variant registry', () => {
  it('answers for every onboarding type the union admits', () => {
    // A Record already makes a missing key a compile error, but there is no
    // `tsc` npm script in this repo, so this is the belt that actually runs.
    expect(Object.keys(T_ONBOARDING_VARIANTS).sort()).toEqual([...T_ONBOARDING_TYPES].sort());
  });

  it.each(VARIANTS)('%s resolves to a component', (_type, Variant) => {
    expect(typeof Variant).toBe('function');
  });

  it('still aliases universal onto the classic screen', () => {
    /**
     * A TRIPWIRE FOR Э8-B-2, and the reason the root marker exists at all.
     *
     * Э8-A shipped the union — and a backend able to send `universal` — ahead of
     * the second screen, so the registry points both keys at the classic one.
     * While that holds, useOnboardingType() is observably INERT: both keys render
     * the same tree, and no render assertion anywhere can tell them apart. This
     * is the one assertion that CAN, and it is deliberately written to fail when
     * the alias is removed rather than to tolerate either state — a guard that
     * passed before and after would not be recording anything.
     *
     * Э8-B-2: delete this case, and let the per-variant marker case above
     * (which already accepts any name from the union) carry it from there.
     */
    const Universal = T_ONBOARDING_VARIANTS.universal;
    const { getByTestId } = render(<Universal {...props()} />);
    expect(getByTestId('t-onboarding-variant-classic')).toBeTruthy();
    expect(T_ONBOARDING_VARIANTS.universal).toBe(T_ONBOARDING_VARIANTS.classic);
  });
});

describe.each(VARIANTS)('the %s variant', (type, Variant) => {
  it('renders the controls the host drives it through', () => {
    const { getByTestId } = render(<Variant {...props()} />);
    expect(getByTestId('t-onboarding-skip')).toBeTruthy();
    expect(getByTestId('t-onboarding-primary')).toBeTruthy();
  });

  it('marks which variant rendered, by a name from the union', () => {
    // The marker names the COMPONENT that drew the screen, not the registry key
    // that reached it — and today those differ, because `universal` is aliased
    // to the classic screen until Э8-B-2. Asserting `t-onboarding-variant-${type}`
    // here would therefore be asserting the alias away rather than recording it;
    // the alias gets its own case below, where it is visible.
    const { getByTestId } = render(<Variant {...props()} />);
    const marker = getByTestId(new RegExp(`^t-onboarding-variant-(${T_ONBOARDING_TYPES.join('|')})$`));
    expect(marker).toBeTruthy();
  });

  it('shows the artwork of the page it was given', () => {
    STEPS.forEach((step, index) => {
      const { getByTestId } = render(<Variant {...props({ page: index })} />);
      expect(getByTestId(`t-onboarding-art-${step.slot}`)).toBeTruthy();
      expect(getByTestId(`t-onboarding-page-${index}`)).toBeTruthy();
    });
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
