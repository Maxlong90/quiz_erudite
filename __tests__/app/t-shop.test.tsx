/**
 * app/t/shop.tsx — the configurable template's shop.
 *
 * The shipped app/shop.tsx has no test coverage of its own, and the port changed
 * exactly one thing (the palette funnel), so this suite covers two jobs:
 *
 *  1. THE SCREEN REPAINTS WITH AN OPERATOR PRESET. That is not provable through
 *     text colour here: every `color` on this screen is `text` / `textFaint` /
 *     `onAccent`, none of which is in REMOTE_TOKEN_KEYS. The settable tokens sit
 *     on VIEW BACKGROUNDS — `bundleHeader` reads `accentBg`, the buy pill and the
 *     ad CTA read `accent`. So the assertion climbs from a bundle emoji to the
 *     tile behind it. As in the other /t suites, use-app-theme is the mock
 *     boundary; hooks/t/use-template-theme is the thing under test and is never
 *     mocked.
 *  2. THE BEHAVIOUR THE COPY INHERITED, because nothing pinned it before and a
 *     port is exactly when a `!isPremium` slips in for an `isPremium !== true`.
 *     The watch-ad matrix, the cancelled-purchase silence and the store-price
 *     fallback are all one-line regressions away.
 *
 * ADDRESSING NOTE: `❤️`, `💡`, `$0.99`, `$1.99` and `$2.99` each appear more than
 * once on this screen (a balance tile and a bundle share the first two; three
 * bundles share `$1.99`), and getByText throws on a duplicate. `💖` — the
 * lives.30 bundle — is the one unambiguous single-node handle.
 */
import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

// --- controllable mock state -------------------------------------------------

/** null = no operator preset, so useThemeColors falls back to the bundled palette. */
let mockThemeValue: unknown = null;
/** null is the REAL loading value of the premium context, and a tested case. */
let mockIsPremium: boolean | null = null;
let mockAdsEnabled = true;

const mockReloadLives = jest.fn().mockResolvedValue(undefined);
const mockReloadHints = jest.fn().mockResolvedValue(undefined);
const mockStorePrices = jest.fn().mockResolvedValue({});
const mockPurchase = jest.fn().mockResolvedValue('purchased');
const mockWatchAd = jest.fn().mockResolvedValue('granted');

// --- module boundaries -------------------------------------------------------

// The bare stub is CORRECT here: this screen loads through a plain useEffect, and
// the two hooks that DO use a focus effect internally (use-lives, use-hints) are
// mocked out below.
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  useFocusEffect: () => {},
}));

// The remote-theme seam. Mocking useAppTheme (rather than the funnel) leaves the
// real useThemeColors -> deriveTemplateTheme chain running, which is the only way
// this suite can prove the screen tracks a preset.
jest.mock('@/hooks/use-app-theme', () => ({
  ...jest.requireActual('@/hooks/use-app-theme'),
  useAppTheme: () => mockThemeValue,
}));
jest.mock('@/hooks/use-theme-pref', () => ({
  useThemePref: () => ({ theme: 'dark', ready: true, setTheme: jest.fn() }),
}));
jest.mock('@/hooks/use-locale', () => ({ useLocale: () => ({ locale: 'en' }) }));

// Also what the SHARED BottomBar this screen still renders calls — without it
// every render throws for want of a PremiumProvider.
jest.mock('@/hooks/use-premium', () => ({
  usePremium: () => ({ isPremium: mockIsPremium, setPremium: jest.fn(), resetPremium: jest.fn() }),
}));

// Both real hooks call useFocusEffect INTERNALLY (use-lives.ts:22, use-hints.ts:16);
// mocking them is what keeps the plain stub above safe.
jest.mock('@/hooks/use-lives', () => ({
  useLives: () => ({ count: 7, canClaim: false, reload: mockReloadLives }),
}));
jest.mock('@/hooks/use-hints', () => ({
  useHintsState: () => ({
    state: { fiftyFifty: 3, statistics: 2, replaceQuestion: 1 },
    reload: mockReloadHints,
  }),
}));

// A getter, not a value: `adsEnabled` is a build capability frozen at module load
// in @/lib/ads, and a getter is what lets one suite exercise both branches without
// re-registering the module. Same shape t-onboarding.test.tsx uses for
// revenueCatEnabled.
jest.mock('@/lib/ads', () => ({
  get adsEnabled() {
    return mockAdsEnabled;
  },
  watchAdForLife: (...args: unknown[]) => mockWatchAd(...args),
}));

// The REAL BUNDLES stay: nine cards with their real emoji and fallback prices are
// what the addressing above relies on.
jest.mock('@/lib/iap', () => ({
  ...jest.requireActual('@/lib/iap'),
  getBundleStorePrices: (...args: unknown[]) => mockStorePrices(...args),
  purchaseBundle: (...args: unknown[]) => mockPurchase(...args),
}));

jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
// A plain View rather than a `({children}) => children` pass-through: the latter
// DROPS props.colors, which would make any gradient assertion pass vacuously.
jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return { LinearGradient: View };
});
jest.mock('react-native-safe-area-context', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaView: ({ children, ...props }: { children: React.ReactNode }) =>
      ReactModule.createElement(View, props, children),
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});
jest.mock('@/components/ui/icon-symbol', () => {
  const { View } = require('react-native');
  const ReactModule = require('react');
  return {
    IconSymbol: (props: { name: string }) =>
      ReactModule.createElement(View, { ...props, testID: `icon-${props.name}` }),
  };
});

/* eslint-disable import/first -- the screen must load AFTER its mocks */
import TShopScreen from '@/app/t/shop';
import { EruditeColors } from '@/constants/theme';
import { BUNDLES } from '@/lib/iap';
import { BUNDLED_THEME } from '@/lib/theme/bundled';
import { resolvePalette } from '@/lib/theme/resolve';
/* eslint-enable import/first */

// --- fixtures and helpers ----------------------------------------------------

/**
 * An operator preset moving `accentBg` — the token behind every bundle tile —
 * built through the real overlay rather than by hand.
 */
const PRESET_ACCENT_BG = '#ff0055';
const OVERRIDDEN_DARK = resolvePalette(EruditeColors.dark, {
  ...BUNDLED_THEME.dark,
  accentBg: PRESET_ACCENT_BG,
});

/** The only bundle emoji that is not shared with a balance tile. */
const UNIQUE_BUNDLE_EMOJI = '💖';
/** …and its id, so the store-price fixture below cannot drift from it. */
const UNIQUE_BUNDLE_ID = 'lives.30';

/** Collapse a node's (possibly nested, possibly conditional) style prop. */
function flatStyle(node: { props: { style?: unknown } }): Record<string, unknown> {
  return Object.assign({}, ...[node.props.style].flat(Infinity).filter(Boolean));
}

/**
 * Walks UP from a node to the first ancestor carrying a background, rather than
 * hopping a fixed number of `.parent`s: a fixed count breaks the moment a mock or
 * the component's own wrapping changes. Searching for "has a backgroundColor"
 * rather than for the expected VALUE keeps the assertion honest.
 */
function backgroundBehind(node: { parent: unknown }): Record<string, unknown> {
  let cursor = node as { parent: unknown; props?: { style?: unknown } } | null;
  while (cursor) {
    const style = flatStyle({ props: { style: cursor.props?.style } });
    if (style.backgroundColor !== undefined) return style;
    cursor = cursor.parent as typeof cursor;
  }
  throw new Error('no ancestor carries a background colour');
}

/** Render and wait for the store-price effect to settle. */
async function renderReady() {
  render(<TShopScreen />);
  await waitFor(() => expect(mockStorePrices).toHaveBeenCalled());
  return screen;
}

let alertSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  mockThemeValue = null;
  mockIsPremium = null;
  mockAdsEnabled = true;
  mockStorePrices.mockResolvedValue({});
  mockPurchase.mockResolvedValue('purchased');
  mockWatchAd.mockResolvedValue('granted');
  mockReloadLives.mockResolvedValue(undefined);
  mockReloadHints.mockResolvedValue(undefined);
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

afterEach(() => {
  alertSpy.mockRestore();
});

describe('the shop repaints with an operator preset', () => {
  it('draws the bundle tile from the bundled accentBg by default', async () => {
    await renderReady();
    expect(backgroundBehind(screen.getByText(UNIQUE_BUNDLE_EMOJI)).backgroundColor).toBe(
      EruditeColors.dark.accentBg,
    );
  });

  it('moves the bundle tile with the preset', async () => {
    // THE assertion of this file. The port removed no literal from this screen —
    // it had none — so the only thing worth proving is that the copy still reads
    // the funnel, which means the operator's token has to reach the pixel.
    mockThemeValue = { palettes: { dark: OVERRIDDEN_DARK, light: EruditeColors.light } };

    await renderReady();
    expect(backgroundBehind(screen.getByText(UNIQUE_BUNDLE_EMOJI)).backgroundColor).toBe(
      PRESET_ACCENT_BG,
    );
  });
});

describe('the watch-ad card visibility matrix', () => {
  it.each([
    [null, true, 'shows it while the premium context is still loading'],
    [false, true, 'shows it for a free player'],
    [true, false, 'hides it for a subscriber, whose lives are unlimited'],
  ] as const)('isPremium=%s -> %s (%s)', async (isPremium, visible, _why) => {
    // The load-time case is the one that matters: the source reads
    // `isPremium !== true`, not `!isPremium`. A `!isPremium` port would hide the
    // card on every cold start and nothing else in this suite would notice.
    mockIsPremium = isPremium;
    await renderReady();

    expect(screen.queryByText('Watch a short video') !== null).toBe(visible);
  });

  it('hides it when the build carries no rewarded-ad module', async () => {
    mockAdsEnabled = false;
    mockIsPremium = false;
    await renderReady();

    expect(screen.queryByText('Watch a short video')).toBeNull();
    expect(screen.queryByText('Free lives')).toBeNull();
  });
});

describe('watching an ad for a life', () => {
  it('reloads the life count and stays silent when the reward is granted', async () => {
    mockIsPremium = false;
    await renderReady();

    fireEvent.press(screen.getByText('Watch'));
    await waitFor(() => expect(mockReloadLives).toHaveBeenCalled());
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('alerts and grants nothing when the ad was not watched through', async () => {
    mockIsPremium = false;
    mockWatchAd.mockResolvedValue('no-reward');
    await renderReady();

    fireEvent.press(screen.getByText('Watch'));
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('No reward', expect.any(String)));
    expect(mockReloadLives).not.toHaveBeenCalled();
  });
});

describe('buying a bundle', () => {
  it('credits and thanks on a resolved purchase', async () => {
    await renderReady();

    fireEvent.press(screen.getByText(UNIQUE_BUNDLE_EMOJI));
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Thanks!', expect.any(String)));
    expect(mockPurchase).toHaveBeenCalledWith(
      expect.objectContaining({ id: UNIQUE_BUNDLE_ID }),
    );
    expect(mockReloadLives).toHaveBeenCalled();
    expect(mockReloadHints).toHaveBeenCalled();
  });

  it('grants nothing and says nothing when the user cancels the store sheet', async () => {
    // A cancellation that "thanks" the player is a support ticket; one that also
    // reloads the balances would mask a missing grant.
    mockPurchase.mockResolvedValue('cancelled');
    await renderReady();

    fireEvent.press(screen.getByText(UNIQUE_BUNDLE_EMOJI));
    await waitFor(() => expect(mockPurchase).toHaveBeenCalled());
    expect(alertSpy).not.toHaveBeenCalled();
    expect(mockReloadLives).not.toHaveBeenCalled();
    expect(mockReloadHints).not.toHaveBeenCalled();
  });

  it('alerts the failure when the purchase throws', async () => {
    mockPurchase.mockRejectedValue(new Error('store unavailable'));
    await renderReady();

    fireEvent.press(screen.getByText(UNIQUE_BUNDLE_EMOJI));
    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith('Purchase failed', expect.any(String)),
    );
    expect(mockReloadLives).not.toHaveBeenCalled();
  });
});

describe('store prices', () => {
  it('prefers a live store price over the hardcoded one', async () => {
    // Three bundles ship the same $1.99 fallback, so the count dropping to two is
    // what proves the override landed on the right card rather than merely that
    // the string rendered somewhere.
    mockStorePrices.mockResolvedValue({ [UNIQUE_BUNDLE_ID]: '€2,49' });
    await renderReady();

    await waitFor(() => expect(screen.getByText('€2,49')).toBeTruthy());
    expect(screen.getAllByText('$1.99')).toHaveLength(2);
  });

  it('keeps the hardcoded price when the store lookup rejects', async () => {
    mockStorePrices.mockRejectedValue(new Error('revenuecat disabled'));
    await renderReady();

    expect(screen.getAllByText('$1.99')).toHaveLength(3);
  });
});

describe('the ported screen renders the whole catalog', () => {
  it('shows both balance tiles with the summed hint count', async () => {
    await renderReady();

    expect(screen.getByText('Shop')).toBeTruthy();
    expect(screen.getByText('7')).toBeTruthy();
    // 3 fiftyFifty + 2 statistics + 1 replaceQuestion.
    expect(screen.getByText('6')).toBeTruthy();
    expect(screen.getByText('Lives')).toBeTruthy();
    expect(screen.getByText('Hints')).toBeTruthy();
  });

  it('shows every bundle under its section label', async () => {
    await renderReady();

    for (const label of ['Lives bundles', 'Hint bundles', 'Combo bundles']) {
      expect(screen.getByText(label)).toBeTruthy();
    }
    for (const bundle of BUNDLES) {
      expect(screen.queryAllByText(bundle.emoji).length).toBeGreaterThan(0);
    }
  });
});
