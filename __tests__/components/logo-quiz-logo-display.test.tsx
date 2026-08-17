/**
 * Unit tests for LogoDisplay (components/logo-quiz/logo-display.tsx).
 *
 * The component picks its renderer by whether a `blurRadius` is passed:
 *  - a LOCKED premium tile (blurRadius set) must render through RN's Image so the
 *    blur reliably re-applies from the source bitmap — this is the paywall guard,
 *    since expo-image will NOT re-blur an already-cached un-blurred entry;
 *  - a PLAYABLE tile (no blurRadius) stays on expo-image (memory-disk cache) for
 *    instant paint and carries no blur;
 *  - no artwork → the '?' placeholder.
 *
 * These lock in the regression fix: locked premium logos must not leak through
 * un-blurred. expo-image is mocked to a marker host node so the two render paths
 * are distinguishable; RN's Image is left real so its blurRadius prop is asserted.
 */
import React from 'react';
import { Image as RNImage } from 'react-native';
import { render } from '@testing-library/react-native';

// Mark the expo-image path with a testable host node so we can tell which
// renderer LogoDisplay chose. Props are forwarded so blurRadius (if ever passed)
// would be visible too.
jest.mock('expo-image', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');
  return {
    Image: (props: Record<string, unknown>) =>
      ReactModule.createElement(View, { ...props, testID: 'expo-image' }),
  };
});

// eslint-disable-next-line import/first -- component under test loads AFTER its mock
import { LogoDisplay } from '@/components/logo-quiz/logo-display';

describe('LogoDisplay', () => {
  it('renders a LOCKED premium tile through RN Image WITH blurRadius (paywall guard)', () => {
    const { UNSAFE_getByType, queryByTestId } = render(
      <LogoDisplay imageUri="file:///logo-premium.png" size={120} blurRadius={14} />,
    );

    // Locked → RN Image with the blur applied…
    const img = UNSAFE_getByType(RNImage);
    expect(img.props.blurRadius).toBe(14);
    expect(img.props.source).toEqual({ uri: 'file:///logo-premium.png' });
    expect(img.props.resizeMode).toBe('contain');

    // …and NOT the expo-image (un-blurred cache) path.
    expect(queryByTestId('expo-image')).toBeNull();
  });

  it('renders a PLAYABLE tile through expo-image WITHOUT any blur', () => {
    const { getByTestId, UNSAFE_queryByType } = render(
      <LogoDisplay imageUri="file:///logo-free.png" size={120} />,
    );

    // Unlocked → expo-image cached path, no RN Image, no blur anywhere.
    const expoImg = getByTestId('expo-image');
    expect(expoImg.props.blurRadius).toBeUndefined();
    expect(expoImg.props.cachePolicy).toBe('memory-disk');
    expect(expoImg.props.recyclingKey).toBe('file:///logo-free.png');
    expect(UNSAFE_queryByType(RNImage)).toBeNull();
  });

  it('shows the "?" placeholder when there is no artwork', () => {
    const { getByText, queryByTestId, UNSAFE_queryByType } = render(
      <LogoDisplay imageUri={null} size={120} />,
    );

    expect(getByText('?')).toBeTruthy();
    expect(queryByTestId('expo-image')).toBeNull();
    expect(UNSAFE_queryByType(RNImage)).toBeNull();
  });
});
