/**
 * Wiring test for the Coat of Arms Play screen's "Other apps" tile.
 *
 * The button must open the PUBLISHER's page (developer id 6787385688), not the
 * single Erudite listing (id6787385686) it was hardcoded to before. It goes
 * through the shared getDeveloperLinks helper and tries the store-app deep link
 * first, falling back to the web URL — exactly like Sport Quiz's Play screen.
 */
import React from 'react';
import { Linking } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';

import { PHONE_WINDOW, pinWindow, unpinWindow } from '../helpers/window';

const DEV_ID = '6787385688';        // publisher (Maryia Pyzhyk)
const ERUDITE_APP_ID = '6787385686'; // a specific app — must NOT be opened here

// --- module boundaries -------------------------------------------------------

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
}));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  // useSafeAreaInsets is now read via the Play height-fit hook (useCoatPlayMetrics).
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('@/components/coat-of-arms/app-background', () => ({
  AppBackground: () => null,
  BG_BASE: '#0B54BC',
  useCoatBgReady: () => true,
}));
jest.mock('@/constants/coat-of-arms/category-icons', () => ({
  CATEGORY_ICON: {
    allCountries: 1,
    byContinents: 2,
    challenge: 3,
    cities: 4,
    bonus: 5,
  },
  useCategoryIconsReady: () => true,
}));
jest.mock('@/constants/flags-quiz/labels', () => ({
  useFQLabels: () => ({
    allCountries: 'All countries',
    byContinents: 'By continents',
    challenge: 'Challenge',
    comingSoon: 'Coming soon',
    otherApps: 'Other apps',
  }),
}));
jest.mock('@/constants/coat-of-arms/labels', () => ({
  useCoaLabels: () => ({ cities: 'Cities', bonusLevel: 'Bonus level' }),
}));

import CoatOfArmsPlay from '@/app/coat-of-arms/play';

beforeEach(() => {
  jest.clearAllMocks();
  // RN's jest preset reports 750x1334 — not a phone — so pin a phone window to
  // exercise the shipped (identity) Play layout.
  pinWindow(PHONE_WINDOW.width, PHONE_WINDOW.height);
  jest.spyOn(Linking, 'openURL').mockResolvedValue(true as unknown as boolean);
});

afterEach(() => {
  (Linking.openURL as jest.Mock).mockRestore();
  unpinWindow();
});

describe('Coat of Arms Play — "Other apps"', () => {
  it('opens the publisher page (developer id), never the single Erudite listing', () => {
    const screen = render(<CoatOfArmsPlay />);

    fireEvent.press(screen.getByText('Other apps'));

    expect(Linking.openURL).toHaveBeenCalledTimes(1);
    const opened = (Linking.openURL as jest.Mock).mock.calls[0][0] as string;
    // The deep link is tried first (it opens straight in the App Store app).
    expect(opened).toBe(`itms-apps://apps.apple.com/developer/id${DEV_ID}`);
    expect(opened).toContain('/developer/');
    expect(opened).not.toContain(ERUDITE_APP_ID);
    expect(opened).not.toContain('/app/');
  });
});
