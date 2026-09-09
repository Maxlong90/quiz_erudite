/**
 * The configurable template's onboarding (app/t/onboarding.tsx).
 *
 * Two things are pinned here, and neither is cosmetic.
 *
 * ORDERING. markSeen() must resolve BEFORE any navigation away, the paywall
 * included. The paywall is PUSHED, so this screen stays mounted underneath it
 * and a dismissal navigates to /t rather than popping back — writing the flag
 * first is what makes that a return home instead of a second trip through
 * onboarding, whatever order the transitions arrive in.
 *
 * The ordering used to guard something sharper: until app/t/paywall.tsx existed
 * the last slide pitched the ERUDITE paywall, which exits with
 * `router.replace('/')`, and on a template build `/` redirects to /t/splash — an
 * unmarked player came back through the splash and was pushed into onboarding
 * again, a loop with no exit that did not involve buying something. The ported
 * paywall exits to '/t' directly, so that hazard is gone and this assertion now
 * pins the cheaper invariant.
 *
 * CAPABILITY GATING. The closing pitch only appears where a store can actually
 * charge. Same rule the Erudite flow follows — a build that cannot take money
 * must never show a pitch, least of all to a store reviewer running with
 * billing off.
 *
 * BOTH ARE PROVEN AGAINST EVERY VARIANT THE UNION ADMITS. Э8-B-2 wrapped the
 * cases in describe.each(T_ONBOARDING_TYPES): the flow is the host's, but it is
 * only worth anything if it holds through whichever screen the backend selects,
 * and a suite pinned to the default would have gone on passing while `universal`
 * quietly failed to report a press. Which variant the registry PICKS is a
 * different question, pinned next door in
 * __tests__/app/t-onboarding-variants.test.tsx.
 */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

// --- mock boundaries ---------------------------------------------------------

const mockReplace = jest.fn();
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: {
    replace: (...args: unknown[]) => mockReplace(...args),
    push: (...args: unknown[]) => mockPush(...args),
  },
}));

// Store-billing capability. A getter so each test can flip it (the real module
// needs a native SDK).
let mockRevenueCatEnabled = true;
jest.mock('@/lib/revenuecat', () => ({
  get revenueCatEnabled() {
    return mockRevenueCatEnabled;
  },
}));

const markSeenCalls: number[] = [];
const navigationCalls: string[] = [];
const mockMarkSeen = jest.fn(async () => {
  markSeenCalls.push(navigationCalls.length);
});
jest.mock('@/hooks/use-onboarding', () => ({
  useOnboarding: () => ({ hasSeen: false, markSeen: mockMarkSeen }),
}));

// Return the key verbatim so buttons can be queried by their string key.
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
 * Which variant the host renders, per case.
 *
 * No getter wrapper here, unlike `revenueCatEnabled` above: that one is a VALUE
 * read at import time, so it needs a property that re-reads. This is a FUNCTION,
 * and the arrow closes over the mutable binding — every call sees the current
 * assignment. The `mock` name prefix is what makes referencing it legal inside a
 * hoisted jest factory.
 *
 * Mocking the hook is right HERE and wrong next door: this suite is about the
 * flow given a variant, so pinning the variant is the point. The suite that asks
 * whether the right variant gets picked mocks the theme engine instead, because
 * the freeze it needs to observe lives in this hook's useRef.
 */
let mockOnboardingType: TOnboardingType = T_ONBOARDING_DEFAULT;
jest.mock('@/hooks/t/use-onboarding-type', () => ({
  useOnboardingType: () => mockOnboardingType,
}));

/* eslint-disable import/first -- screen under test loads AFTER its mocks */
import TTemplateOnboarding from '@/app/t/onboarding';
import { T_ASSET_SLOTS, type TAssetSlot } from '@/constants/t/asset-slots';
import {
  T_ONBOARDING_DEFAULT,
  T_ONBOARDING_TYPES,
  type TOnboardingType,
} from '@/lib/onboarding/onboarding-type';

beforeEach(() => {
  mockReplace.mockClear();
  mockPush.mockClear();
  mockMarkSeen.mockClear();
  markSeenCalls.length = 0;
  navigationCalls.length = 0;
  mockRevenueCatEnabled = true;
  mockOnboardingType = T_ONBOARDING_DEFAULT;
  mockReplace.mockImplementation((to: string) => navigationCalls.push(to));
  mockPush.mockImplementation((to: string) => navigationCalls.push(to));
});

/** The four pages in order: the three intro steps, then the closing pitch. */
const PAGE_SLOTS: readonly TAssetSlot[] = [
  'onboarding/step1.png',
  'onboarding/step2.png',
  'onboarding/step3.png',
  'paywall/hero.png',
];

/** Walk the primary button forward onto the closing premium slide. */
function advanceToPremiumSlide(getByTestId: (id: string) => unknown) {
  for (let i = 0; i < 3; i += 1) {
    fireEvent.press(getByTestId('t-onboarding-primary') as never);
  }
}

describe.each(T_ONBOARDING_TYPES)('t onboarding (%s)', (type) => {
  beforeEach(() => {
    mockOnboardingType = type;
  });

  it('renders an image for every bundled slot the packs supply for it', () => {
    const { getByTestId } = render(<TTemplateOnboarding />);
    // The reason this screen exists at all: before it, nothing under app/t drew
    // a bundled image, so the pack slots had no reader.
    //
    // What this proves is that four <Image>s mount and take their source from
    // T_ASSET_SLOTS — NOT that each got the right picture. It cannot: jest-expo
    // rewrites every image module to `1`, so all five slots are the same value
    // here. That artwork↔slot correspondence is checked structurally instead, by
    // __tests__/app/t-asset-packs.test.ts reading the requires out of the source.
    //
    // WALKED RATHER THAN CO-MOUNTED, AND THAT IS STRICTLY STRONGER. Э8-B-1's
    // form asserted all three step arts at page 0, which only held because the
    // classic pager mounts every page at once — an accident of one variant that
    // contract.ts explicitly disclaims ("the artwork of the page CURRENTLY ON
    // SCREEN"). Pairing each slot with `t-onboarding-page-${index}` recovers more
    // than co-mounting ever asserted: the old shape would have stayed green for a
    // variant that drew step3 on page 1.
    PAGE_SLOTS.forEach((slot, index) => {
      if (index > 0) fireEvent.press(getByTestId('t-onboarding-primary'));
      expect(getByTestId(`t-onboarding-art-${slot}`).props.source).toBe(T_ASSET_SLOTS[slot]);
      expect(getByTestId(`t-onboarding-page-${index}`)).toBeTruthy();
    });
  });

  it('skips straight home, marking onboarding seen first', async () => {
    const { getByTestId } = render(<TTemplateOnboarding />);
    fireEvent.press(getByTestId('t-onboarding-skip'));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/t'));
    expect(mockMarkSeen).toHaveBeenCalled();
    // markSeen() recorded zero prior navigations, i.e. it ran first.
    expect(markSeenCalls).toEqual([0]);
  });

  it('steps through the slides rather than leaving early', () => {
    const { getByTestId } = render(<TTemplateOnboarding />);
    fireEvent.press(getByTestId('t-onboarding-primary'));
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('offers the paywall from the last slide when billing is available', async () => {
    const { getByTestId } = render(<TTemplateOnboarding />);
    advanceToPremiumSlide(getByTestId);
    expect(getByTestId('t-onboarding-primary')).toHaveTextContent('paywall.cta');

    fireEvent.press(getByTestId('t-onboarding-primary'));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/t/paywall'));
    // THE ordering assertion: the flag is written before the push, so however
    // the player leaves the paywall they land on a home that knows they have
    // seen this screen rather than being pushed back into it.
    expect(markSeenCalls).toEqual([0]);
  });

  it('degrades to a plain start when billing is unavailable', async () => {
    mockRevenueCatEnabled = false;
    const { getByTestId } = render(<TTemplateOnboarding />);
    advanceToPremiumSlide(getByTestId);
    expect(getByTestId('t-onboarding-primary')).toHaveTextContent('onboarding.start');

    fireEvent.press(getByTestId('t-onboarding-primary'));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/t'));
    expect(mockPush).not.toHaveBeenCalledWith('/t/paywall');
    expect(mockMarkSeen).toHaveBeenCalled();
  });
});
