/**
 * The configurable template's onboarding (app/t/onboarding.tsx).
 *
 * Two things are pinned here, and neither is cosmetic.
 *
 * ORDERING. markSeen() must resolve BEFORE any navigation away, the paywall
 * included. app/paywall.tsx exits with `router.replace('/')`, and on a template
 * build `/` redirects to `/t/splash` — so a player who opened the paywall from
 * the last slide and closed it comes back through the splash. If the flag were
 * not written first, the splash would read "unseen" and push them into
 * onboarding again: a loop with no exit that does not involve buying something.
 *
 * CAPABILITY GATING. The closing pitch only appears where a store can actually
 * charge. Same rule the Erudite flow follows — a build that cannot take money
 * must never show a pitch, least of all to a store reviewer running with
 * billing off.
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

/* eslint-disable import/first -- screen under test loads AFTER its mocks */
import TTemplateOnboarding from '@/app/t/onboarding';
import { T_ASSET_SLOTS } from '@/constants/t/asset-slots';

beforeEach(() => {
  mockReplace.mockClear();
  mockPush.mockClear();
  mockMarkSeen.mockClear();
  markSeenCalls.length = 0;
  navigationCalls.length = 0;
  mockRevenueCatEnabled = true;
  mockReplace.mockImplementation((to: string) => navigationCalls.push(to));
  mockPush.mockImplementation((to: string) => navigationCalls.push(to));
});

/** Walk the primary button forward onto the closing premium slide. */
function advanceToPremiumSlide(getByTestId: (id: string) => unknown) {
  for (let i = 0; i < 3; i += 1) {
    fireEvent.press(getByTestId('t-onboarding-primary') as never);
  }
}

describe('t onboarding', () => {
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
    (
      ['onboarding/step1.png', 'onboarding/step2.png', 'onboarding/step3.png'] as const
    ).forEach((slot) => {
      expect(getByTestId(`t-onboarding-art-${slot}`).props.source).toBe(T_ASSET_SLOTS[slot]);
    });
    advanceToPremiumSlide(getByTestId);
    expect(getByTestId('t-onboarding-art-paywall/hero.png').props.source).toBe(
      T_ASSET_SLOTS['paywall/hero.png'],
    );
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

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/paywall'));
    // THE ordering assertion. Closing the shared paywall replaces to '/', which
    // on this build lands back on /t/splash; unmarked, that bounces the player
    // into onboarding again.
    expect(markSeenCalls).toEqual([0]);
  });

  it('degrades to a plain start when billing is unavailable', async () => {
    mockRevenueCatEnabled = false;
    const { getByTestId } = render(<TTemplateOnboarding />);
    advanceToPremiumSlide(getByTestId);
    expect(getByTestId('t-onboarding-primary')).toHaveTextContent('onboarding.start');

    fireEvent.press(getByTestId('t-onboarding-primary'));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/t'));
    expect(mockPush).not.toHaveBeenCalledWith('/paywall');
    expect(mockMarkSeen).toHaveBeenCalled();
  });
});
