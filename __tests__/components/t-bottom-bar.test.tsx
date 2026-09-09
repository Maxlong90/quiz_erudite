/**
 * components/t/bottom-bar.tsx — the configurable template's own bottom nav.
 *
 * The port that created it changed exactly two things (the six routes and the
 * palette funnel), so this suite covers exactly two jobs plus the behaviour the
 * copy inherited and nothing anywhere pinned.
 *
 *  1. THE ROUTES. Every slot must land inside /t, and each must use the right
 *     verb: the crown PUSHES the paywall (dismissible), everything else
 *     REPLACES (so the bar cannot grow the stack). __tests__/app/t-routes.test.ts
 *     proves the six literals are /t routes backed by real files; this proves
 *     which SLOT each one is wired to, which a source scan cannot see.
 *  2. THE PALETTE IS LIVE. See the scope note below — this is narrower than in
 *     the other /t suites, and deliberately so.
 *
 * WHY THERE IS NO "MOVES WITH THE OPERATOR PRESET" TEST HERE
 * ---------------------------------------------------------
 * Every other /t suite proves its screen repaints by moving a REMOTE_TOKEN_KEY
 * through resolvePalette() and reading it back off a rendered style. This bar
 * reads four tokens — gold, text, textDisabled, border — and NONE of them is in
 * REMOTE_TOKEN_KEYS, so that assertion cannot be written honestly here.
 *
 * The house fixture would not merely fail to prove it, it would PASS while
 * proving nothing. `resolvePalette(EruditeColors.dark, {...BUNDLED_THEME.dark,
 * gold: '…'})` returns EruditeColors.dark BY REFERENCE: lib/theme/resolve.ts:40
 * early-returns the base when all ten remote keys match (they do — the spread is
 * the bundled theme), and even past that gate line 45 copies only
 * REMOTE_TOKEN_KEYS, so a non-remote override never lands. The suite would then
 * assert the bundled value against the bundled value and read like proof.
 *
 * So this file proves the weaker true thing instead — that the palette is
 * resolved LIVE at render rather than frozen at module load — via the APPEARANCE
 * FLIP, since text, textDisabled and border all differ between dark and light.
 * __tests__/app/t-account.test.tsx and t-stats.test.tsx carry the same shape of
 * honest negative for `gold`, `success` and `danger`.
 *
 * Note what that flip does NOT prove: that the bar reads the funnel at all. A
 * TemplateTheme is a pure superset of the palette, so useTemplateTheme() and
 * useThemeColors() return identical values for all four of these tokens and no
 * render assertion can separate them. The funnel is pinned as SOURCE, in
 * __tests__/app/t-no-color-literals.test.ts.
 */
import React from 'react';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fireEvent, render, screen } from '@testing-library/react-native';

// --- controllable mock state -------------------------------------------------

/** null is the REAL loading value of the premium context, and a tested case. */
let mockIsPremium: boolean | null = false;
let mockAppearance: 'dark' | 'light' = 'dark';
/** null = no operator preset, so useThemeColors falls back to the bundled palette. */
let mockThemeValue: unknown = null;

const mockPush = jest.fn();
const mockReplace = jest.fn();

// --- module boundaries -------------------------------------------------------

// The bare stub is correct: this is a leaf component with no effects at all — no
// focus effect, no safe area, no gradient, no status bar.
// The spies are reached through an arrow rather than passed directly: jest
// hoists this factory above the consts above, so a direct reference would freeze
// `undefined` into the router at first require. Same shape t-home.test.tsx uses.
jest.mock('expo-router', () => ({
  router: {
    push: (...args: unknown[]) => mockPush(...args),
    replace: (...args: unknown[]) => mockReplace(...args),
  },
}));

// THE MOCK BOUNDARY is use-app-theme, exactly as in the other /t suites.
// hooks/t/use-template-theme is the thing under test and is never mocked —
// mocking it would make every colour assertion below self-fulfilling.
jest.mock('@/hooks/use-app-theme', () => ({
  ...jest.requireActual('@/hooks/use-app-theme'),
  useAppTheme: () => mockThemeValue,
}));
jest.mock('@/hooks/use-theme-pref', () => ({
  useThemePref: () => ({ theme: mockAppearance, ready: true, setTheme: jest.fn() }),
}));
jest.mock('@/hooks/use-premium', () => ({
  usePremium: () => ({ isPremium: mockIsPremium, setPremium: jest.fn(), resetPremium: jest.fn() }),
}));

// Props are SPREAD onto the View so `color` and `size` survive into the tree. A
// `() => null` stub would make every tint assertion below vacuously true.
jest.mock('@/components/ui/icon-symbol', () => {
  const { View } = require('react-native');
  const ReactModule = require('react');
  return {
    IconSymbol: (props: { name: string }) =>
      ReactModule.createElement(View, { ...props, testID: `icon-${props.name}` }),
  };
});

/* eslint-disable import/first -- the component must load AFTER its mocks */
import { BottomBar } from '@/components/t/bottom-bar';
import { EruditeColors } from '@/constants/theme';
import { REMOTE_TOKEN_KEYS } from '@/lib/theme/contract';
/* eslint-enable import/first */

// --- helpers -----------------------------------------------------------------

const ROOT = join(__dirname, '..', '..');

/** The five slots that are always on screen, in render order. */
const ALWAYS_PRESENT = ['shop-button', 'home-button', 'stats-button', 'settings-button'];

/**
 * Descends from a Pressable to the first node carrying a `color`, rather than
 * hopping a fixed number of children: a fixed path breaks the moment the mock or
 * the component's wrapping changes. Searching for "carries a colour" rather than
 * for the expected VALUE keeps the assertion honest.
 */
function tintOf(testID: string): string {
  const stack: any[] = [screen.getByTestId(testID)];
  while (stack.length > 0) {
    const node = stack.shift();
    if (typeof node?.props?.color === 'string') return node.props.color;
    stack.push(...(node?.children ?? []).filter((child: unknown) => typeof child !== 'string'));
  }
  throw new Error(`no descendant of ${testID} carries a colour`);
}

/** Collapse a node's (possibly nested, possibly conditional) style prop. */
function flatStyle(node: { props: { style?: unknown } }): Record<string, unknown> {
  return Object.assign({}, ...[node.props.style].flat(Infinity).filter(Boolean));
}

beforeEach(() => {
  jest.clearAllMocks();
  mockIsPremium = false;
  mockAppearance = 'dark';
  mockThemeValue = null;
});

describe('every slot navigates inside /t', () => {
  it.each([
    ['home-button', '/t', "the shared bar sent this to '/', which redirects to /t/splash"],
    ['shop-button', '/t/shop', 'the template shop, not the erudite one'],
    ['stats-button', '/t/stats', 'the template stats'],
    ['settings-button', '/t/settings', 'the template settings'],
  ])('%s replaces to %s (%s)', (testID, route) => {
    render(<BottomBar current={null} />);
    fireEvent.press(screen.getByTestId(testID));

    // BOTH halves matter. Asserting only `replace` would pass for a bar that
    // ALSO pushed, and push-versus-replace is the difference between a stack
    // that grows on every nav tap and one that does not.
    expect(mockReplace).toHaveBeenCalledWith(route);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('pushes the paywall from the crown, rather than replacing', () => {
    // The one deliberate asymmetry in the bar: the paywall is dismissible back
    // onto whatever opened it.
    render(<BottomBar current={null} />);
    fireEvent.press(screen.getByTestId('crown-button'));

    expect(mockPush).toHaveBeenCalledWith('/t/paywall');
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('replaces to the template account once the player is subscribed', () => {
    mockIsPremium = true;
    render(<BottomBar current={null} />);
    fireEvent.press(screen.getByTestId('account-button'));

    expect(mockReplace).toHaveBeenCalledWith('/t/account');
    expect(mockPush).not.toHaveBeenCalled();
  });
});

describe('the leftmost slot forks on the premium state', () => {
  it.each([
    [null, 'crown-button', 'account-button', 'still loading — the crown is the safe default'],
    [false, 'crown-button', 'account-button', 'a free player is offered premium'],
    [true, 'account-button', 'crown-button', 'a subscriber gets their account'],
  ] as const)('isPremium=%s shows %s, not %s (%s)', (isPremium, shown, hidden, _why) => {
    // The loading case is the one worth pinning: the bar branches on plain
    // truthiness, so null and false must behave identically. Elsewhere in this
    // codebase that distinction bites — app/t/shop.tsx reads `isPremium !== true`
    // precisely so a card is not hidden on every cold start.
    mockIsPremium = isPremium;
    render(<BottomBar current={null} />);

    expect(screen.getByTestId(shown)).toBeTruthy();
    expect(screen.queryByTestId(hidden)).toBeNull();
  });

  it.each([null, false, true] as const)('keeps five slots at isPremium=%s', (isPremium) => {
    // The symmetry the fork exists to preserve: whichever way it goes, the row
    // still holds five buttons and the layout does not jump on sign-in.
    mockIsPremium = isPremium;
    render(<BottomBar current={null} />);

    const leftmost = isPremium ? 'account-button' : 'crown-button';
    for (const testID of [leftmost, ...ALWAYS_PRESENT]) {
      expect(screen.getByTestId(testID)).toBeTruthy();
    }
  });
});

describe('the slot already on screen is inert', () => {
  it.each([
    ['home', 'home-button'],
    ['shop', 'shop-button'],
    ['stats', 'stats-button'],
    ['settings', 'settings-button'],
    ['premium', 'crown-button'],
  ] as const)('current=%s neither navigates nor ripples', (current, testID) => {
    // The shared bar documents this behaviour in a comment and NOTHING in the
    // repo pinned it — t-home.test.tsx only checks accessibilityState on the
    // single home slot. Tapping the active icon must not re-navigate.
    render(<BottomBar current={current} />);
    fireEvent.press(screen.getByTestId(testID));

    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
    expect(screen.getByTestId(testID).props.accessibilityState?.disabled).toBe(true);
  });

  it('leaves the account slot inert for a subscriber already on it', () => {
    mockIsPremium = true;
    render(<BottomBar current="account" />);
    fireEvent.press(screen.getByTestId('account-button'));

    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });
});

describe('the palette is resolved live, through the template funnel', () => {
  it.each(['dark', 'light'] as const)('tints an idle slot from the %s palette', (appearance) => {
    // The two appearances disagree on textDisabled, which is what makes this a
    // real check that the palette is read at RENDER rather than a restatement of
    // one constant.
    //
    // What it does NOT prove, despite the temptation to claim it: that BarButton
    // reads the funnel rather than useThemeColors() directly. A TemplateTheme is
    // a pure superset, so both hooks return the same value for this token and
    // the rendered pixel is identical either way — verified by reverting that
    // call site and watching this file stay green. The funnel rule in
    // __tests__/app/t-no-color-literals.test.ts is the only thing that sees it.
    mockAppearance = appearance;
    render(<BottomBar current="home" />);

    expect(tintOf('shop-button')).toBe(EruditeColors[appearance].textDisabled);
  });

  it.each(['dark', 'light'] as const)('draws the row hairline from %s border', (appearance) => {
    mockAppearance = appearance;
    render(<BottomBar current="home" />);

    expect(flatStyle(screen.getByTestId('bottom-bar')).borderTopColor).toBe(
      EruditeColors[appearance].border,
    );
  });

  it('brightens the slot on screen and leaves its siblings dimmed', () => {
    render(<BottomBar current="stats" />);

    expect(tintOf('stats-button')).toBe(EruditeColors.dark.text);
    expect(tintOf('shop-button')).toBe(EruditeColors.dark.textDisabled);
  });

  it.each(['premium', 'home'] as const)('keeps the crown gold while current=%s', (current) => {
    // BOTH cases, because gold here is a brand colour rather than a state: one
    // case alone would pass for a crown that merely happened to be active.
    render(<BottomBar current={current} />);

    expect(tintOf('crown-button')).toBe(EruditeColors.dark.gold);
  });
});

describe('markers that delete themselves when the world changes', () => {
  it('reads no token an operator can move — asserted, not assumed', () => {
    // Goes RED when task Э1 widens REMOTE_TOKEN_KEYS, and at that point asks for
    // the real preset-repaint assertion every other /t suite carries. Until then
    // it is the standing justification for the scope note at the top of this file.
    const barTokens = ['gold', 'text', 'textDisabled', 'border'];
    const settable = barTokens.filter((token) =>
      (REMOTE_TOKEN_KEYS as readonly string[]).includes(token),
    );
    expect(settable).toEqual([]);
  });

  it('declares the same key union as the shared bar it was copied from', () => {
    // BottomBarKey is RE-DECLARED rather than re-exported, because a re-export
    // is an import-walk edge that would pin the shared bar inside the /t closure
    // forever (see the component's own docblock). The cost is type drift, and
    // package.json ships no `tsc --noEmit` script — so this source comparison is
    // what catches it.
    const unionOf = (file: string) =>
      /export type BottomBarKey\s*=([^;]+);/
        .exec(readFileSync(join(ROOT, file), 'utf8'))?.[1]
        .replace(/\s+/g, ' ')
        .trim();

    // The stringContaining half is the anti-vacuity guard: rename the type in
    // either file and the regex yields undefined, and undefined === undefined
    // would otherwise pass while proving nothing.
    expect({
      shared: unionOf('components/bottom-bar.tsx'),
      scoped: unionOf('components/t/bottom-bar.tsx'),
    }).toEqual({
      shared: expect.stringContaining('|'),
      scoped: unionOf('components/bottom-bar.tsx'),
    });
  });
});
