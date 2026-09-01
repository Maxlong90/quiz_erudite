/**
 * Splash screen theming (app/splash.tsx).
 *
 * The animated wordmark/tagline and the SPLASH_DURATION_MS -> /language handoff
 * are shared, but the backdrop + palette switch on the build-time APP_SLUG:
 *  - default (erudite): dark gradient, white glowing letters, <Stars/>, StatusBar light;
 *  - logo-quiz: light BG_BASE + AppBackground mesh, dark-grey QUI/ES, purple ZZZ,
 *    grey tagline, no stars, StatusBar dark.
 * These tests lock in that branch so a future edit can't silently regress either
 * theme (or the shared wordmark colours).
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';

// --- controllable build slug -------------------------------------------------

let mockAppSlug = 'erudite-quiz';
jest.mock('@/api/client', () => ({
  get APP_SLUG() {
    return mockAppSlug;
  },
}));

// --- module boundaries -------------------------------------------------------

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  router: { replace: (...args: unknown[]) => mockReplace(...args) },
}));

// Return the key verbatim so the tagline is queryable by its string key.
jest.mock('@/hooks/use-translation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// Trim native/visual-only modules. LinearGradient just passes children through
// (default branch), StatusBar records the style it was asked to render, and the
// SVG mesh is replaced by a queryable marker.
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

let statusBarStyle: string | undefined;
jest.mock('expo-status-bar', () => ({
  StatusBar: ({ style }: { style?: string }) => {
    statusBarStyle = style;
    return null;
  },
}));

jest.mock('@/components/logo-quiz/app-background', () => {
  const { View } = require('react-native');
  return {
    BG_BASE: '#AEC1F5',
    AppBackground: () => <View testID="app-background" />,
  };
});

// App-selected appearance. The erudite splash now follows the theme preference
// (dark keeps the glowing wordmark + stars; light reuses the pale variants), so
// drive it here rather than depending on a ThemePrefProvider. Defaults to dark.
let mockTheme: 'dark' | 'light' = 'dark';
jest.mock('@/hooks/use-theme-pref', () => ({
  useThemePref: () => ({ theme: mockTheme, ready: true, setTheme: jest.fn() }),
}));

// Locale drives the Logo Quiz tagline (useLQLabels). Fixed to English so the
// logo-quiz splash renders the 'Train Your Brain!' tagline; the erudite splash
// ignores it (keeps the t('splash.tagline') key).
jest.mock('@/hooks/use-locale', () => ({
  useLocale: () => ({ locale: 'en' }),
}));

// The logo-quiz splash prefetches brand logos on mount. Stub the content layer so
// the render never touches the real cache/network — the theming assertions here
// don't depend on the preload, which is verified separately.
jest.mock('@/lib/content-cache', () => ({
  loadCachedSnapshot: jest.fn(async () => null),
  syncContent: jest.fn(async () => null),
}));
jest.mock('@/lib/logo-quiz/content', () => ({
  buildLevels: jest.fn(() => []),
  LOGO_QUIZ_SLUG: 'logo-quiz',
}));
jest.mock('expo-image', () => ({
  Image: { prefetch: jest.fn(() => Promise.resolve()) },
}));

import SplashScreen from '@/app/splash';

function colorOf(node: { props: { style: unknown } }): string | undefined {
  return (StyleSheet.flatten(node.props.style) as { color?: string } | undefined)?.color;
}

beforeEach(() => {
  jest.clearAllMocks();
  statusBarStyle = undefined;
  mockTheme = 'dark';
});

describe('SplashScreen theming', () => {
  it('erudite (default slug): dark palette, stars, light status bar', () => {
    mockAppSlug = 'erudite-quiz';
    const { getByText, getAllByText, queryByTestId } = render(<SplashScreen />);

    // Shared wordmark + tagline still render.
    expect(getByText('splash.tagline')).toBeTruthy();

    // Dark theme: white QUI letters, purple ZZZ accents.
    expect(colorOf(getByText('Q'))).toBe('#fff');
    getAllByText('Z').forEach((z) => expect(colorOf(z)).toBe('#a78bff'));

    // No logo-quiz mesh; erudite keeps its own <Stars/> backdrop.
    expect(queryByTestId('app-background')).toBeNull();
    expect(statusBarStyle).toBe('light');
  });

  it('erudite (light theme): pale wordmark, dark status bar, no stars', () => {
    mockAppSlug = 'erudite-quiz';
    mockTheme = 'light';
    const { getByText, getAllByText, queryByTestId } = render(<SplashScreen />);

    expect(getByText('splash.tagline')).toBeTruthy();

    // Light theme reuses the pale wordmark variants (dark-grey QUI/ES, purple ZZZ).
    expect(colorOf(getByText('Q'))).toBe('#4A4A5E');
    getAllByText('Z').forEach((z) => expect(colorOf(z)).toBe('#7C5CFF'));

    // No logo-quiz mesh; the dark-tuned <Stars/> are gated off in light.
    expect(queryByTestId('app-background')).toBeNull();
    expect(statusBarStyle).toBe('dark');
  });

  it('logo-quiz slug: light palette, mesh background, dark status bar', () => {
    mockAppSlug = 'logo-quiz';
    const { getByText, getAllByText, getByTestId } = render(<SplashScreen />);

    // Logo Quiz renders its own localized tagline, not the shared t('splash.tagline').
    expect(getByText('Train Your Brain!')).toBeTruthy();

    // Light theme: dark-grey QUI/ES, purple ZZZ.
    expect(colorOf(getByText('Q'))).toBe('#4A4A5E');
    getAllByText('Z').forEach((z) => expect(colorOf(z)).toBe('#7C5CFF'));

    // Logo Quiz brand mesh is present; StatusBar flips to dark for the pale bg.
    expect(getByTestId('app-background')).toBeTruthy();
    expect(statusBarStyle).toBe('dark');
  });
});
