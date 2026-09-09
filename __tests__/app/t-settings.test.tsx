/**
 * app/t/settings.tsx — the configurable template's settings screen.
 *
 * The shipped app/settings.tsx has no test coverage of its own, and this port
 * changed two things (the palette funnel, and one route literal), so the suite
 * has three jobs:
 *
 *  1. THE DEV RESET LANDS INSIDE /t. This is the point of the file, and it is a
 *     BUG FIX rather than a mechanical rewrite: the shipped screen ends its wipe
 *     with router.replace('/splash'), which drops a TEMPLATE player onto the
 *     ERUDITE splash. It never crashed — app/index.tsx redirects `/` to
 *     /t/splash on a template build — so the leak was invisible off-device, and
 *     nothing but an explicit assertion would have caught it. The suite pins
 *     both halves: that '/t/splash' is called AND that '/splash' is not.
 *  2. THE ROW ICON REPAINTS WITH AN OPERATOR PRESET. Every token this screen
 *     touches — text, textFaint, surface, surfaceSoft, border, borderSoft,
 *     textDisabled, danger, onAccent, accentSoft — is in REMOTE_TOKEN_KEYS since
 *     Э1 widened the set, so the whole screen is operator-repaintable now. The
 *     suite asserts exactly the Row icon's `accentSoft`, the cheapest
 *     single-prop proof, which conveniently lives in the Row sub-component so
 *     the assertion doubles as proof that call site was ported. The screen's
 *     other three funnel call sites (the screen body, SectionLabel, Divider)
 *     are covered by the SOURCE scan in
 *     __tests__/app/t-no-color-literals.test.ts, not by any render here.
 *  3. THE BEHAVIOUR THE COPY INHERITED — the two modals and the outbound links —
 *     because nothing pinned it before and the modals are the ONLY growth this
 *     subtask adds to the literals guard's import walk. A test that actually
 *     mounts them is what makes that growth real rather than nominal.
 *
 * As in the other /t suites, @/hooks/use-app-theme is the mock boundary;
 * hooks/t/use-template-theme is the thing under test and is never mocked.
 *
 * ADDRESSING NOTE: 'Appearance' is BOTH the row label and the modal title
 * (i18n/strings.ts maps settings.appearance and settings.appearanceModal.title
 * to the same English string), and getByText throws on a duplicate — so the open
 * appearance sheet is addressed by its 'Light' option instead. Same trap on
 * 'English', which is the language row's value AND a modal option; 'Русский' is
 * unambiguous.
 */
import React from 'react';
import { Alert, Linking, Share } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

// --- controllable mock state -------------------------------------------------

/** null = no operator preset, so useThemeColors falls back to the bundled palette. */
let mockThemeValue: unknown = null;

const mockReplace = jest.fn();
const mockChangeLocale = jest.fn();
const mockResetLocale = jest.fn().mockResolvedValue(undefined);
const mockResetPremium = jest.fn().mockResolvedValue(undefined);
const mockSetTheme = jest.fn();
const mockClearCache = jest.fn().mockResolvedValue(undefined);

// --- module boundaries -------------------------------------------------------

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: (...args: unknown[]) => mockReplace(...args) },
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
  useThemePref: () => ({ theme: 'dark', ready: true, setTheme: mockSetTheme }),
}));

// The screen destructures all three of these off useLocale().
jest.mock('@/hooks/use-locale', () => ({
  useLocale: () => ({
    locale: 'en',
    changeLocale: (...args: unknown[]) => mockChangeLocale(...args),
    resetLocale: (...args: unknown[]) => mockResetLocale(...args),
  }),
}));

// Also what the t-scoped BottomBar this screen renders calls — without it every
// render throws for want of a PremiumProvider.
jest.mock('@/hooks/use-premium', () => ({
  usePremium: () => ({
    isPremium: false,
    setPremium: jest.fn(),
    resetPremium: (...args: unknown[]) => mockResetPremium(...args),
  }),
}));

jest.mock('@/hooks/use-content-cache', () => ({ useContentCache: () => ({ snapshot: null }) }));
// Imported directly by the screen (not through a hook), so the reset path needs
// it stubbed to keep the wipe assertion about AsyncStorage alone.
jest.mock('@/lib/content-cache', () => ({ clearCache: (...args: unknown[]) => mockClearCache(...args) }));

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
// Props are SPREAD onto the View so `color` survives — the Row icon's colour is
// the one operator-settable value on this screen, and a mock that dropped props
// would make that assertion untestable.
jest.mock('@/components/ui/icon-symbol', () => {
  const { View } = require('react-native');
  const ReactModule = require('react');
  return {
    IconSymbol: (props: { name: string }) =>
      ReactModule.createElement(View, { ...props, testID: `icon-${props.name}` }),
  };
});

/* eslint-disable import/first -- the screen must load AFTER its mocks */
import TSettingsScreen from '@/app/t/settings';
import { EruditeColors } from '@/constants/theme';
import { BUNDLED_THEME } from '@/lib/theme/bundled';
import { resolvePalette } from '@/lib/theme/resolve';
/* eslint-enable import/first */

// --- fixtures and helpers ----------------------------------------------------

/** The only settable token this screen paints with, moved through the REAL overlay. */
const PRESET_ACCENT_SOFT = '#00ff88';
const OVERRIDDEN_DARK = resolvePalette(EruditeColors.dark, {
  ...BUNDLED_THEME.dark,
  accentSoft: PRESET_ACCENT_SOFT,
});

function usePreset() {
  mockThemeValue = { palettes: { dark: OVERRIDDEN_DARK, light: EruditeColors.light } };
}

/**
 * Press the dev reset and run the destructive branch of its confirmation. The
 * Alert is spied rather than rendered, so the button's own onPress is pulled out
 * of the recorded call and invoked — that is the only path to handleReset().
 */
async function confirmDestructiveReset() {
  fireEvent.press(screen.getByTestId('dev-reset'));

  const buttons = alertSpy.mock.calls[0][2] as { style?: string; onPress?: () => void }[];
  const destructive = buttons.find((button) => button.style === 'destructive');
  expect(destructive).toBeDefined();

  destructive!.onPress!();
}

let alertSpy: jest.SpyInstance;
let openUrlSpy: jest.SpyInstance;
let shareSpy: jest.SpyInstance;

beforeEach(async () => {
  jest.clearAllMocks();
  mockThemeValue = null;
  await AsyncStorage.clear();
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  openUrlSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' } as never);
});

afterEach(() => {
  alertSpy.mockRestore();
  openUrlSpy.mockRestore();
  shareSpy.mockRestore();
});

describe('the reset lands inside /t', () => {
  it('sends the player to the TEMPLATE splash, never the Erudite one', async () => {
    // THE assertion of this file. The negative half is not redundant: on a
    // template build app/index.tsx redirects `/` to /t/splash, so a missed port
    // does not dead-end — it silently bounces the player through the WRONG
    // brand's splash, which is visible only on a device.
    render(<TSettingsScreen />);
    await confirmDestructiveReset();

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/t/splash'));
    expect(mockReplace).not.toHaveBeenCalledWith('/splash');
  });

  it('wipes the gameplay namespace and the onboarding flag, and nothing else', async () => {
    // Pins the QUIZ_PREFIX filter. A port that widened the wipe to "everything"
    // would pass every other assertion in this file while destroying unrelated
    // keys, so the SURVIVING key is the load-bearing half here.
    await AsyncStorage.multiSet([
      ['quiz.stats.v1', '{}'],
      ['quiz.seen.v1', '[]'],
      ['onboarding.seen.v1', 'true'],
      ['app.locale.v1', 'en'],
    ]);

    render(<TSettingsScreen />);
    await confirmDestructiveReset();
    await waitFor(() => expect(mockReplace).toHaveBeenCalled());

    const remaining = await AsyncStorage.getAllKeys();
    expect(remaining).toContain('app.locale.v1');
    expect(remaining).not.toContain('quiz.stats.v1');
    expect(remaining).not.toContain('quiz.seen.v1');
    // 'onboarding.seen.v1' is the key hooks/use-onboarding.ts reads and
    // app/t/splash.tsx branches on, so clearing it is what makes /t/splash
    // genuinely route a reset player onward to /t/onboarding rather than /t.
    expect(remaining).not.toContain('onboarding.seen.v1');
  });

  it('clears the content cache and the locale and premium flags alongside it', async () => {
    render(<TSettingsScreen />);
    await confirmDestructiveReset();

    await waitFor(() => expect(mockClearCache).toHaveBeenCalled());
    expect(mockResetLocale).toHaveBeenCalled();
    expect(mockResetPremium).toHaveBeenCalled();
  });
});

describe('the settings rows repaint with an operator preset', () => {
  it('draws the row icon from the bundled accentSoft by default', () => {
    render(<TSettingsScreen />);
    expect(screen.getByTestId('icon-globe').props.color).toBe(EruditeColors.dark.accentSoft);
  });

  it('moves it with the preset', () => {
    // The one settable token on this screen, and it lives inside the Row
    // sub-component — so this doubles as proof that Row's own funnel call site
    // was ported, not just the screen body's.
    usePreset();
    render(<TSettingsScreen />);

    expect(screen.getByTestId('icon-globe').props.color).toBe(PRESET_ACCENT_SOFT);
  });
});

describe('the two modals the port annexed', () => {
  // These components are the ONLY growth this subtask adds to the literals
  // guard's import walk; mounting them here is what makes that growth real.
  it('opens the language sheet and reports the pick', () => {
    render(<TSettingsScreen />);
    fireEvent.press(screen.getByText('Language'));

    expect(screen.getByText('Choose language')).toBeTruthy();
    // 'English' is the row's current value AND a modal option; 'Русский' is not.
    fireEvent.press(screen.getByText('Русский'));
    expect(mockChangeLocale).toHaveBeenCalledWith('ru');
  });

  it('opens the appearance sheet and reports the pick', () => {
    render(<TSettingsScreen />);
    // The row label, unique until the sheet opens and adds a second 'Appearance'.
    fireEvent.press(screen.getByText('Appearance'));

    // Addressed by the option rather than the title, which is now ambiguous.
    fireEvent.press(screen.getByText('Light'));
    expect(mockSetTheme).toHaveBeenCalledWith('light');
  });
});

describe('the outbound links the copy inherited', () => {
  it.each([
    ['Privacy policy', 'https://quizzzes.com/privacy'],
    ['Terms of use', 'https://quizzzes.com/terms'],
  ])('%s opens %s', (label, url) => {
    // These three (plus the support address) stay on quizzzes.com because
    // ContentSnapshot['app'] carries no field to read them from — unlike the
    // store links below, which ARE already operator-aware.
    render(<TSettingsScreen />);
    fireEvent.press(screen.getByText(label));

    expect(openUrlSpy).toHaveBeenCalledWith(url);
  });

  it('shares the store link when recommending', async () => {
    render(<TSettingsScreen />);
    fireEvent.press(screen.getByText('Recommend to a friend'));

    await waitFor(() => expect(shareSpy).toHaveBeenCalled());
    // getStoreLinks is left REAL (it is pure, snapshot-driven, and has safe
    // fallbacks), so this pins that the helper still feeds the share message
    // rather than a hardcoded URL. The store is matched as a UNION rather than
    // named: getStoreLinks branches on Platform.OS, which jest-expo reports as
    // 'ios', and pinning one storefront would make this suite fail if the preset
    // ever ran under the android variant of the same config.
    const { message } = shareSpy.mock.calls[0][0] as { message: string };
    expect(message).toMatch(/https:\/\/(apps\.apple\.com|play\.google\.com)\//);
    expect(message).toContain('I’ve been playing Quizzes');
  });

  it.each([['Restore purchases'], ['Sign in']])('%s explains it is not wired yet', (label) => {
    render(<TSettingsScreen />);
    fireEvent.press(screen.getByText(label));

    expect(alertSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.any(Array),
    );
  });
});
