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

const DEV_ID = '6787385688';        // publisher (Maryia Pyzhyk)
const ERUDITE_APP_ID = '6787385686'; // a specific app — must NOT be opened here

// --- module boundaries -------------------------------------------------------

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
}));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View };
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
  jest.spyOn(Linking, 'openURL').mockResolvedValue(true as unknown as boolean);
});

afterEach(() => {
  (Linking.openURL as jest.Mock).mockRestore();
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
