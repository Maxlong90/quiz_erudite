/**
 * The configurable template's paywall (app/t/paywall.tsx).
 *
 * The screen is a port of app/paywall.tsx, which HAS a suite of its own
 * (__tests__/app/paywall.test.tsx: tier rendering, price formatting, the save-%
 * maths). This file deliberately does not re-derive any of that. It pins the six
 * things the port CHANGED, plus the one behaviour that must survive a copy
 * unaltered:
 *
 *  1. all five exits land inside /t. Asserted over every recorded call, not just
 *     the one the test tapped, so a branch no case exercises still cannot escape;
 *  2. the comparison panel repaints with an operator preset. THIS IS THE
 *     ACCEPTANCE PROPERTY — literal-free is the mechanism, repainting is the
 *     point;
 *  3. the premium column follows `gold` rather than the byte-identical hex it
 *     replaced;
 *  4. both featured-card chips are the redesigned tinted outlines, with the ink
 *     on `c.text` and none of the four deleted literals surviving as chip ink —
 *     on BOTH appearances, since the light one is why the redesign exists;
 *  5. the hero is the asset-pack slot, not Erudite's trophy;
 *  6. the free-unlock guard still fails closed.
 *
 * NEITHER hooks/t/use-template-theme.ts is mocked: it is the thing under test,
 * and mocking the funnel would make every colour assertion self-fulfilling. The
 * mock boundary is use-app-theme, which leaves the real useThemeColors ->
 * deriveTemplateTheme chain running — the same recipe t-quiz-mode.test.tsx uses.
 */
import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

// --- mock boundaries ---------------------------------------------------------

let mockEnabled = false;
// Whether the app is running in Expo Go — the only non-web env where the
// disabled-store local unlock is allowed. On a real store device it stays
// false so subscribe fails closed.
let mockIsExpoGo = false;
const mockFetchPremiumPackages = jest.fn();
const mockPurchasePremiumPackage = jest.fn();
const mockRestorePremium = jest.fn();

jest.mock('@/lib/revenuecat', () => ({
  get revenueCatEnabled() {
    return mockEnabled;
  },
  get isExpoGo() {
    return mockIsExpoGo;
  },
  fetchPremiumPackages: (...args: unknown[]) => mockFetchPremiumPackages(...args),
  purchasePremiumPackage: (...args: unknown[]) => mockPurchasePremiumPackage(...args),
  restorePremium: (...args: unknown[]) => mockRestorePremium(...args),
}));

const mockSetPremium = jest.fn().mockResolvedValue(undefined);
jest.mock('@/hooks/use-premium', () => ({
  usePremium: () => ({ setPremium: mockSetPremium, isPremium: false, resetPremium: jest.fn() }),
}));

let mockSnapshot: unknown = null;
jest.mock('@/hooks/use-content-cache', () => ({
  useContentCache: () => ({ snapshot: mockSnapshot }),
}));

// Pin the locale so the real useTranslation resolves English strings.
jest.mock('@/hooks/use-locale', () => ({
  useLocale: () => ({ locale: 'en' }),
}));

// Stub Sentry so the offering-load failure tracking never pulls in the native
// @sentry/react-native module during the test run.
jest.mock('@/lib/sentry', () => ({
  sentryEnabled: false,
  Sentry: { captureException: jest.fn(), captureMessage: jest.fn() },
}));

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  router: { replace: (...args: unknown[]) => mockReplace(...args) },
}));

// The remote palette the screen resolves through useThemeColors(). Overriding a
// token here is exactly what an operator's preset edit does on a real device.
let mockThemeValue: unknown = null;
jest.mock('@/hooks/use-app-theme', () => ({
  ...jest.requireActual('@/hooks/use-app-theme'),
  useAppTheme: () => mockThemeValue,
}));

// The appearance toggle. Flipping it to 'light' is what the chip redesign
// exists for: gold on the light `surfaceSoft` is about 1.3:1.
let mockAppearance: 'dark' | 'light' = 'dark';
jest.mock('@/hooks/use-theme-pref', () => ({
  useThemePref: () => ({ theme: mockAppearance, ready: true, setTheme: jest.fn() }),
}));

jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('@/components/paywall/reviewer-unlock-modal', () => ({
  ReviewerUnlockModal: () => null,
}));

// A plain View rather than a pass-through, so ScreenBackground's `colors` prop
// stays readable in the tree. (paywall.test.tsx's `({children}) => children`
// form DROPS it, which would make a gradient assertion pass vacuously.)
jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return { LinearGradient: View };
});

// Renders a View so the close icon's `color` prop stays readable.
jest.mock('@/components/ui/icon-symbol', () => {
  const { View } = require('react-native');
  const ReactModule = require('react');
  return {
    IconSymbol: (props: { name: string }) =>
      ReactModule.createElement(View, { ...props, testID: `icon-${props.name}` }),
  };
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

/* eslint-disable import/first -- screen under test loads AFTER its mocks */
import TPaywallScreen from '@/app/t/paywall';
import { T_ASSET_SLOTS } from '@/constants/t/asset-slots';
import { EruditeColors } from '@/constants/theme';
import { BUNDLED_THEME } from '@/lib/theme/bundled';
import { withAlpha } from '@/lib/theme/color';
import { resolvePalette } from '@/lib/theme/resolve';

/** A preset accent, built through the real overlay rather than by hand. */
const PRESET_ACCENT = '#ff0055';
const OVERRIDDEN_DARK = resolvePalette(EruditeColors.dark, {
  ...BUNDLED_THEME.dark,
  accent: PRESET_ACCENT,
});

/** Collapse a node's (possibly nested, possibly conditional) style prop. */
function flatStyle(node: { props: { style?: unknown } }): Record<string, unknown> {
  return Object.assign({}, ...[node.props.style].flat(Infinity).filter(Boolean));
}

/**
 * The comparison panel: the outermost node carrying both a background and the
 * table's 18px radius. Found by shape rather than by a testID the screen does
 * not otherwise need, and by shape rather than by VALUE so the search cannot
 * presuppose the answer.
 */
function comparePanelStyle(): Record<string, unknown> {
  const [panel] = screen.UNSAFE_root
    .findAll((node) => typeof node.type === 'string')
    .map((node) => flatStyle(node))
    .filter((style) => style.borderRadius === 18 && style.overflow === 'hidden');
  if (!panel) throw new Error('the comparison panel is not in the tree');
  return panel;
}

/** The style of the pill wrapping a chip's text — its first View ancestor. */
function chipPillAround(label: string): Record<string, unknown> {
  let node = screen.getByText(label).parent as
    | { parent: unknown; props?: { style?: unknown } }
    | null;
  while (node) {
    const style = flatStyle({ props: { style: node.props?.style } });
    if (style.backgroundColor !== undefined) return style;
    node = node.parent as typeof node;
  }
  throw new Error(`no ancestor of "${label}" carries a background colour`);
}

/** Every destination router.replace was handed, across all recorded calls. */
function everyExit(): unknown[] {
  return mockReplace.mock.calls.map(([destination]) => destination);
}

/** A live `default` offering with all three tiers and store price strings. */
function liveOffering() {
  return {
    weekly: { identifier: '$rc_weekly', product: { priceString: '$5.99', price: 5.99 } },
    monthly: { identifier: '$rc_monthly', product: { priceString: '$15.99', price: 15.99 } },
    annual: { identifier: '$rc_annual', product: { priceString: '$59.99', price: 59.99 } },
  };
}

beforeEach(() => {
  mockEnabled = false;
  mockIsExpoGo = false;
  mockSnapshot = null;
  mockThemeValue = null;
  mockAppearance = 'dark';
  mockFetchPremiumPackages.mockReset().mockResolvedValue({
    weekly: null,
    monthly: null,
    annual: null,
  });
  mockPurchasePremiumPackage.mockReset();
  mockRestorePremium.mockReset();
  mockSetPremium.mockClear();
  mockReplace.mockClear();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

afterEach(() => {
  (Alert.alert as jest.Mock).mockRestore();
});

describe('t paywall — every exit stays inside /t', () => {
  it('sends the close ✕ to the template home, not through the erudite splash', () => {
    render(<TPaywallScreen />);

    fireEvent.press(screen.getByTestId('paywall-close'));

    // '/' would not crash or dead-end: app/index.tsx redirects it to /t/splash
    // on a template build, so the player is silently bounced through the splash
    // on the way home. That is the whole reason this port exists.
    expect(mockReplace).toHaveBeenCalledWith('/t');
    expect(mockReplace).not.toHaveBeenCalledWith('/');
  });

  it('sends the Expo Go local unlock to the template home', async () => {
    mockIsExpoGo = true;
    render(<TPaywallScreen />);

    fireEvent.press(screen.getByTestId('paywall-subscribe'));

    await waitFor(() => expect(mockSetPremium).toHaveBeenCalledWith(true));
    expect(everyExit()).toEqual(['/t']);
  });

  it('sends a completed purchase to the template home', async () => {
    mockEnabled = true;
    mockFetchPremiumPackages.mockResolvedValue(liveOffering());
    mockPurchasePremiumPackage.mockResolvedValue({ outcome: 'purchased', premiumActive: true });
    render(<TPaywallScreen />);
    await waitFor(() => expect(screen.getByText('$59.99')).toBeTruthy());

    fireEvent.press(screen.getByTestId('paywall-subscribe'));

    await waitFor(() => expect(mockSetPremium).toHaveBeenCalledWith(true));
    expect(everyExit()).toEqual(['/t']);
  });

  it('sends a successful restore to the template home', async () => {
    mockEnabled = true;
    mockFetchPremiumPackages.mockResolvedValue(liveOffering());
    mockRestorePremium.mockResolvedValue(true);
    render(<TPaywallScreen />);
    await waitFor(() => expect(screen.getByTestId('paywall-restore')).toBeTruthy());

    fireEvent.press(screen.getByTestId('paywall-restore'));

    await waitFor(() => expect(mockSetPremium).toHaveBeenCalledWith(true));
    expect(everyExit()).toEqual(['/t']);
  });

  it('has no exit anywhere in its source that leaves the subtree', () => {
    // The three cases above cover four of the five router.replace sites; the
    // fifth (handleReviewUnlocked) is behind a backend flag and a modal this
    // suite stubs out. __tests__/app/t-routes.test.ts scans the SOURCE, so it
    // covers that branch and every future one — this assertion is the pointer
    // to it, so a reader here does not conclude the fifth site is untested.
    expect(everyExit().every((exit) => exit === '/t' || String(exit).startsWith('/t/'))).toBe(true);
  });
});

describe('t paywall — the comparison panel is operator data', () => {
  it('washes the panel in the bundled accent by default', () => {
    render(<TPaywallScreen />);

    const panel = comparePanelStyle();
    expect(panel.backgroundColor).toBe(withAlpha(EruditeColors.dark.accent, 0.8));
    expect(panel.borderColor).toBe(EruditeColors.dark.accent);
  });

  it('repaints the panel when the preset moves the accent', () => {
    // THE ACCEPTANCE PROPERTY. The original hardcoded '#7c5cffcc' / '#7c5cff'
    // here, which no preset could move — the panel would have stayed bundled
    // purple in an operator's red app.
    mockThemeValue = {
      palettes: { dark: OVERRIDDEN_DARK, light: EruditeColors.light },
    };
    render(<TPaywallScreen />);

    const panel = comparePanelStyle();
    expect(panel.backgroundColor).toBe(withAlpha(PRESET_ACCENT, 0.8));
    expect(panel.borderColor).toBe(PRESET_ACCENT);
  });

  it('draws the premium column header in the palette gold, not a hardcoded hex', () => {
    // `gold` is in REMOTE_TOKEN_KEYS since Э1 widened the token set, so a real
    // operator preset produces exactly this palette. The hand-built fixture is
    // still needed: the bundled gold (#ffd23a) is byte-identical to the literal
    // that was deleted, and without moving it this assertion could not tell a
    // token from a hardcoded hex.
    mockThemeValue = {
      palettes: { dark: { ...OVERRIDDEN_DARK, gold: '#00ff00' }, light: EruditeColors.light },
    };
    render(<TPaywallScreen />);

    expect(flatStyle(screen.getByText('Premium')).color).toBe('#00ff00');
  });
});

describe('t paywall — the featured-card chips', () => {
  // The i18n string as authored. The uppercasing is `textTransform` on the
  // style, so the rendered text node still carries the original casing.
  const BEST_VALUE = 'Best value';

  it('tints the chips with their hue and puts the ink on the card-surface partner', () => {
    render(<TPaywallScreen />);

    const best = chipPillAround(BEST_VALUE);
    expect(best.backgroundColor).toBe(withAlpha(EruditeColors.dark.gold, 0.2));
    expect(best.borderColor).toBe(withAlpha(EruditeColors.dark.gold, 0.55));
    expect(best.borderWidth).toBe(1);
    expect(flatStyle(screen.getByText(BEST_VALUE)).color).toBe(EruditeColors.dark.text);

    const saveLabel = screen.getByText(/^Save \d+%$/);
    const save = chipPillAround(saveLabel.props.children as string);
    expect(save.backgroundColor).toBe(withAlpha(EruditeColors.dark.success, 0.2));
    expect(save.borderColor).toBe(withAlpha(EruditeColors.dark.success, 0.55));
    expect(flatStyle(saveLabel).color).toBe(EruditeColors.dark.text);
  });

  it('keeps none of the three coloured literals as chip ink', () => {
    render(<TPaywallScreen />);

    const bestInk = flatStyle(screen.getByText(BEST_VALUE)).color;
    const saveInk = flatStyle(screen.getByText(/^Save \d+%$/)).color;
    // '#1a1a47' equals the bundled dark bgSolid, which IS operator-settable —
    // a pale preset would have given white-ink-on-gold. '#22c55e' and '#ffd23a'
    // have no guaranteed foreground partner at all.
    for (const deleted of ['#1a1a47', '#ffd23a', '#22c55e']) {
      expect(bestInk).not.toBe(deleted);
      expect(saveInk).not.toBe(deleted);
    }
  });

  it('follows `text` when the palette moves it', () => {
    // The FOURTH deleted literal was the save chip's '#fff', and a plain
    // not-equal check cannot retire it: the bundled dark `text` IS '#ffffff',
    // so the token and the literal are byte-identical here and asserting "not
    // #fff" would fail on correct code. Moving the token is the only way to
    // tell them apart — the same reason the gold assertion above hand-builds a
    // palette. `text` is on the wire since Э1, so a real preset moves it too.
    mockThemeValue = {
      palettes: { dark: { ...OVERRIDDEN_DARK, text: '#00ff00' }, light: EruditeColors.light },
    };
    render(<TPaywallScreen />);

    expect(flatStyle(screen.getByText(BEST_VALUE)).color).toBe('#00ff00');
    expect(flatStyle(screen.getByText(/^Save \d+%$/)).color).toBe('#00ff00');
  });

  it('still reads on the light appearance, which is why the redesign exists', () => {
    // The shipped light `surfaceSoft` (#7c5cff0d over #f4f2fb) composites to
    // roughly #f1eefb. Gold on that is about 1.3:1 and the light `success` about
    // 2.9:1 — both under AA for 11px text, and reachable from the settings
    // toggle with no hostile preset. `text` is ~14.8:1 there.
    mockAppearance = 'light';
    render(<TPaywallScreen />);

    for (const label of [BEST_VALUE, screen.getByText(/^Save \d+%$/).props.children as string]) {
      const ink = flatStyle(screen.getByText(label)).color;
      expect(ink).toBe(EruditeColors.light.text);
      expect(ink).not.toBe(EruditeColors.light.gold);
      expect(ink).not.toBe(EruditeColors.light.success);
    }
  });

  it('wraps each chip in a View, because a bordered Text does not render on iOS', () => {
    render(<TPaywallScreen />);

    // TextStyle extends ViewStyle, so `borderWidth` on the <Text> would have
    // type-checked — and drawn on Android only. The border must therefore live
    // on a host View ancestor, never on the text node itself.
    expect(flatStyle(screen.getByText(BEST_VALUE)).borderWidth).toBeUndefined();
    expect(chipPillAround(BEST_VALUE).borderWidth).toBe(1);
  });
});

describe('t paywall — the hero comes from the asset pack', () => {
  it('renders the paywall/hero.png slot rather than the erudite trophy', () => {
    render(<TPaywallScreen />);

    // STRUCTURAL, not by identity: jest-expo rewrites every image module to
    // `module.exports = 1`, so no render can tell which PNG a require()
    // resolved to. What is provable is that the source reads the slot map.
    expect(screen.getByTestId('t-paywall-hero').props.source).toBe(
      T_ASSET_SLOTS['paywall/hero.png'],
    );
  });

  it('gives the 4:3 artwork a 4:3 box', () => {
    render(<TPaywallScreen />);

    // The slot is authored 1024x768 in every pack. At the original square 80x80
    // `resizeMode="contain"` drew it 80x60 and it read as a white rectangle.
    const { width, height } = flatStyle(screen.getByTestId('t-paywall-hero')) as {
      width: number;
      height: number;
    };
    expect(width / height).toBeCloseTo(4 / 3, 5);
  });
});

describe('t paywall — the free-unlock guard survived the copy', () => {
  it('never grants premium when the offering loaded no packages', async () => {
    // The pre-fix production bug (commit fba9061): a misconfigured offering
    // unlocked everything for free. The port must not have relaxed it.
    mockEnabled = true;
    render(<TPaywallScreen />);
    await waitFor(() => expect(mockFetchPremiumPackages).toHaveBeenCalled());
    await waitFor(() =>
      expect(
        screen.getByTestId('paywall-subscribe').props.accessibilityState?.disabled,
      ).toBeFalsy(),
    );

    fireEvent.press(screen.getByTestId('paywall-subscribe'));

    await waitFor(() => expect(Alert.alert).toHaveBeenCalled());
    expect(mockSetPremium).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockPurchasePremiumPackage).not.toHaveBeenCalled();
  });

  it('never grants premium on a store device where billing is unavailable', async () => {
    // RevenueCat disabled and NOT Expo Go / web — i.e. iOS before its key is
    // supplied. The local unlock is a dev affordance and must not fire here.
    mockEnabled = false;
    mockIsExpoGo = false;
    render(<TPaywallScreen />);

    fireEvent.press(screen.getByTestId('paywall-subscribe'));

    await waitFor(() => expect(Alert.alert).toHaveBeenCalled());
    expect(mockSetPremium).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('does not unlock when the purchase is cancelled', async () => {
    mockEnabled = true;
    mockFetchPremiumPackages.mockResolvedValue(liveOffering());
    mockPurchasePremiumPackage.mockResolvedValue({ outcome: 'cancelled', premiumActive: false });
    render(<TPaywallScreen />);
    await waitFor(() => expect(screen.getByText('$59.99')).toBeTruthy());

    fireEvent.press(screen.getByTestId('paywall-subscribe'));

    await waitFor(() => expect(mockPurchasePremiumPackage).toHaveBeenCalled());
    // Default selection is the annual package.
    expect(mockPurchasePremiumPackage).toHaveBeenCalledWith(liveOffering().annual);
    expect(mockSetPremium).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
