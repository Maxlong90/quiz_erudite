/**
 * app/t/account.tsx — the configurable template's account screen.
 *
 * The shipped app/account.tsx has no test coverage of its own, and this port did
 * two different things to its eight colour literals, so the suite has three jobs:
 *
 *  1. THE OAUTH BUTTONS DO NOT MOVE. This is the point of the file. Six hexes
 *     left the screen for constants/t/oauth-brand.ts precisely BECAUSE they must
 *     never become operator data — Apple's HIG allows black or white for Sign in
 *     with Apple, Google fixes the `G` at #4285F4 on white, and a preset that
 *     recoloured either would ship a guideline violation. A negative is easy to
 *     pass vacuously, so each reading pairs with a positive that proves the
 *     screen really did repaint around them.
 *  2. THE SCREEN REPAINTS WITH AN OPERATOR PRESET. The surface is small: of the
 *     tokens this screen touches (text, textFaint, surfaceSoft, borderStrong,
 *     onAccent, gold, accent, accentSoft), only `accent` and `accentSoft` are in
 *     REMOTE_TOKEN_KEYS today. That is the whole positive surface, which is
 *     exactly why the negative above carries the file.
 *  3. THE BEHAVIOUR THE COPY INHERITED, because nothing pinned it before and a
 *     port is when a `> 3` becomes a `>= 3` or a stray `disabled` lands on the
 *     wrong Pressable.
 *
 * As in the other /t suites, @/hooks/use-app-theme is the mock boundary;
 * hooks/t/use-template-theme is the thing under test and is never mocked —
 * mocking the funnel would make every colour assertion self-fulfilling.
 *
 * ADDRESSING NOTES. i18n/strings.ts maps BOTH 'account.tab.login' and
 * 'account.login.cta' to 'Log in', and getByText throws on a duplicate: the CTA
 * is therefore addressed by 'Create account' (its signup-mode label), which is
 * unique. The two hint strings are full sentences, so 'Sign up' stays an
 * unambiguous handle for the tab.
 *
 * WHY `apple.mark` IS PINNED ON THE CONSTANT AND NOT ON A RENDER: the Apple
 * glyph's <Text> is EMPTY in the shipped screen and was copied verbatim (see
 * app/t/account.tsx's docblock), so `styles.appleIcon` paints no addressable
 * node. The module-level assertion below is the only thing that can hold that
 * value, and it also keeps all six pinned if the buttons ever stop rendering.
 */
import React from 'react';
import { Alert, StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

// --- controllable mock state -------------------------------------------------

/** null = no operator preset, so useThemeColors falls back to the bundled palette. */
let mockThemeValue: unknown = null;
/** The app-selected appearance, NOT the OS one. Both are exercised below. */
let mockAppearance: 'dark' | 'light' = 'dark';
let mockIsPremium: boolean | null = false;

// --- module boundaries -------------------------------------------------------

// A bare stub is enough: this screen never imports `router` — the t-scoped
// BottomBar it renders is the only thing that does.
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
  useThemePref: () => ({ theme: mockAppearance, ready: true, setTheme: jest.fn() }),
}));
jest.mock('@/hooks/use-locale', () => ({ useLocale: () => ({ locale: 'en' }) }));

// Also what the t-scoped BottomBar this screen renders calls — without it every
// render throws for want of a PremiumProvider.
jest.mock('@/hooks/use-premium', () => ({
  usePremium: () => ({ isPremium: mockIsPremium, setPremium: jest.fn(), resetPremium: jest.fn() }),
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
import TAccountScreen from '@/app/t/account';
import { OAUTH_BRAND } from '@/constants/t/oauth-brand';
import { EruditeColors } from '@/constants/theme';
import { BUNDLED_THEME } from '@/lib/theme/bundled';
import { resolvePalette } from '@/lib/theme/resolve';
/* eslint-enable import/first */

// --- fixtures and helpers ----------------------------------------------------

/**
 * The two settable tokens this screen actually paints with, moved through the
 * REAL overlay rather than assembled by hand — a hand-built palette would prove
 * the test can build an object, not that the wire format reaches a pixel.
 */
const PRESET_ACCENT = '#ff0055';
const PRESET_ACCENT_SOFT = '#00ff88';
const OVERRIDDEN_DARK = resolvePalette(EruditeColors.dark, {
  ...BUNDLED_THEME.dark,
  accent: PRESET_ACCENT,
  accentSoft: PRESET_ACCENT_SOFT,
});

function usePreset() {
  mockThemeValue = { palettes: { dark: OVERRIDDEN_DARK, light: EruditeColors.light } };
}

/** Collapse a node's (possibly nested, possibly conditional) style prop. */
function flatStyle(node: { props: { style?: unknown } }): Record<string, unknown> {
  return Object.assign({}, ...[node.props.style].flat(Infinity).filter(Boolean));
}

/**
 * Walks UP from a node to the first ancestor carrying a background, rather than
 * hopping a fixed number of `.parent`s: a fixed count breaks the moment a mock or
 * the component's own wrapping changes.
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

function colorOf(text: string): string | undefined {
  return StyleSheet.flatten(screen.getByText(text).props.style)?.color;
}

/**
 * Every colour the two OAuth buttons paint with, read back off the render.
 * `apple.mark` is absent by necessity — see the docblock.
 */
function oauthPaint() {
  return {
    appleBg: backgroundBehind(screen.getByText('Continue with Apple')).backgroundColor,
    appleInk: flatStyle(screen.getByText('Continue with Apple')).color,
    googleBg: backgroundBehind(screen.getByText('Continue with Google')).backgroundColor,
    googleInk: flatStyle(screen.getByText('Continue with Google')).color,
    googleMark: flatStyle(screen.getByText('G')).color,
  };
}

/**
 * The expected reading, written as the EXACT strings from app/account.tsx:272-277
 * rather than as OAUTH_BRAND.*. Asserting against the constant would only prove
 * the screen is self-consistent with whatever the constant happens to say; these
 * literals are what make the extraction provably byte-exact against the shipped
 * screen it was lifted from.
 */
const SHIPPED_OAUTH_PAINT = {
  appleBg: '#000',
  appleInk: '#fff',
  googleBg: '#fff',
  googleInk: '#1a1a1a',
  googleMark: '#4285F4',
};

/** Fill the form past the `canSubmit` gate: >3 chars of email, >=6 of password. */
function fillValidCredentials() {
  fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'player@example.com');
  fireEvent.changeText(screen.getByPlaceholderText('••••••••'), 'hunter2');
}

let alertSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  mockThemeValue = null;
  mockAppearance = 'dark';
  mockIsPremium = false;
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

afterEach(() => {
  alertSpy.mockRestore();
});

describe('the OAuth buttons are brand-mandated, not operator data', () => {
  it('pins all six brand values on the constant itself', () => {
    // The only place `apple.mark` can be held: its <Text> is empty in the
    // shipped screen and was copied verbatim, so it paints no addressable node.
    // This also keeps the other five pinned if the buttons stop rendering.
    expect(OAUTH_BRAND).toEqual({
      apple: { bg: '#000', fg: '#fff', mark: '#fff' },
      google: { bg: '#fff', fg: '#1a1a1a', mark: '#4285F4' },
    });
  });

  it('paints them from the vendor spec on the bundled palette', () => {
    render(<TAccountScreen />);
    expect(oauthPaint()).toEqual(SHIPPED_OAUTH_PAINT);
  });

  it('leaves them untouched under an operator preset that repaints everything else', () => {
    // THE assertion of this file, and the positive half is what stops it passing
    // vacuously: if the screen had failed to repaint at all, "nothing changed"
    // would look like success.
    usePreset();
    render(<TAccountScreen />);

    expect(oauthPaint()).toEqual(SHIPPED_OAUTH_PAINT);
    expect(backgroundBehind(screen.getByText('Create account')).backgroundColor).toBe(
      PRESET_ACCENT,
    );
  });

  it('leaves them untouched in light appearance', () => {
    // The sharpest of the three. Mapping the Apple label to `c.text` would pass a
    // dark-only suite, because dark `text` is also #fff — and would fail here,
    // where light `text` is #1c1740. The paired positive is the switch link,
    // whose accentSoft genuinely differs between appearances.
    mockAppearance = 'light';
    render(<TAccountScreen />);

    expect(oauthPaint()).toEqual(SHIPPED_OAUTH_PAINT);
    expect(colorOf('Already have an account? Log in')).toBe(EruditeColors.light.accentSoft);
  });
});

describe('the screen repaints with an operator preset', () => {
  it('draws the segmented control, the CTA and the switch link from the bundled palette', () => {
    render(<TAccountScreen />);

    expect(colorOf('Sign up')).toBe(EruditeColors.dark.accent);
    expect(backgroundBehind(screen.getByText('Create account')).backgroundColor).toBe(
      EruditeColors.dark.accent,
    );
    expect(colorOf('Already have an account? Log in')).toBe(EruditeColors.dark.accentSoft);
  });

  it('moves all three with the preset', () => {
    usePreset();
    render(<TAccountScreen />);

    expect(colorOf('Sign up')).toBe(PRESET_ACCENT);
    expect(backgroundBehind(screen.getByText('Create account')).backgroundColor).toBe(
      PRESET_ACCENT,
    );
    expect(colorOf('Already have an account? Log in')).toBe(PRESET_ACCENT_SOFT);
  });
});

describe('the premium badge', () => {
  it('keeps the shipped gold wash and border byte-for-byte', () => {
    // The port replaced '#ffd23a22' / '#ffd23a66' with withAlpha(c.gold, 0.133)
    // and 0.4. withAlpha ROUNDS rather than truncates, so 0.133 -> 22 and
    // 0.4 -> 66 exactly; asserting the literal strings is what proves the swap
    // was byte-exact rather than merely approximate. Both live on one node, so
    // one flattened style holds them.
    mockIsPremium = true;
    render(<TAccountScreen />);

    const badge = backgroundBehind(screen.getByText('Premium active'));
    expect(badge.backgroundColor).toBe('#ffd23a22');
    expect(badge.borderColor).toBe('#ffd23a66');
    expect(colorOf('Premium active')).toBe(EruditeColors.dark.gold);
  });

  it('does NOT move with the preset, because gold is not settable yet', () => {
    // A deliberate asymmetry, pinned rather than left implicit: `gold` is absent
    // from REMOTE_TOKEN_KEYS, so no operator can move this badge today even
    // though it now reads a token. When the wire widens, this test turns red and
    // the widening shows up as a deliberate edit here instead of a silent
    // repaint. Same shape as the note in __tests__/app/t-stats.test.tsx.
    mockIsPremium = true;
    usePreset();
    render(<TAccountScreen />);

    const badge = backgroundBehind(screen.getByText('Premium active'));
    expect(badge.backgroundColor).toBe('#ffd23a22');
    expect(colorOf('Premium active')).toBe(EruditeColors.dark.gold);
  });

  it('is absent for a free player', () => {
    mockIsPremium = false;
    render(<TAccountScreen />);
    expect(screen.queryByText('Premium active')).toBeNull();
  });
});

describe('the behaviour the copy inherited', () => {
  it('keeps the submit gate shut on an empty form', () => {
    // The gate is `email.trim().length > 3 && password.length >= 6`. A
    // one-character port slip in either bound is otherwise invisible.
    render(<TAccountScreen />);

    fireEvent.press(screen.getByText('Create account'));
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('opens the gate once both fields pass their bounds', () => {
    render(<TAccountScreen />);
    fillValidCredentials();

    fireEvent.press(screen.getByText('Create account'));
    expect(alertSpy).toHaveBeenCalledWith('Almost there', expect.any(String));
  });

  it.each([['Continue with Apple'], ['Continue with Google']])(
    '%s stays pressable while the form is empty',
    (label) => {
      // The seam refactor rewrote exactly these two Pressables' style props, so
      // `disabled` migrating onto them from the CTA above is a plausible
      // fat-finger — and one that would look like nothing on screen.
      render(<TAccountScreen />);

      fireEvent.press(screen.getByText(label));
      expect(alertSpy).toHaveBeenCalledWith('Almost there', expect.any(String));
    },
  );

  it('switches to the login mode from the segmented control', () => {
    render(<TAccountScreen />);
    // 'Sign up' is unique in signup mode; 'Log in' is the tab. After the switch
    // BOTH the tab and the CTA read 'Log in' (i18n/strings.ts maps
    // account.tab.login and account.login.cta to the same English string), which
    // is why the assertion counts nodes instead of fetching one.
    fireEvent.press(screen.getByText('Log in'));

    expect(screen.getAllByText('Log in')).toHaveLength(2);
    expect(screen.getByText("Don't have an account? Sign up")).toBeTruthy();
  });
});
