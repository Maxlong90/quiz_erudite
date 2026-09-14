/**
 * The clip guards on the Italy Quiz action button.
 *
 * The locked-city caption is two lines now — a requirement over a city name —
 * and the two ways it used to lose its tail are both structural, so both can be
 * pinned here rather than left to a screenshot: the title must honour as many
 * lines as the label asks for AND shrink to fit (which is what survives a 360dp
 * phone and a system font scale of 1.5, because autoshrink measures the already
 * scaled text), and the absolutely-positioned padlock must have its width
 * reserved in the flex layout, or the centred label simply runs underneath it.
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';

jest.mock('expo-linear-gradient', () => {
  const ReactModule = require('react');
  const { View: RNView } = require('react-native');
  return {
    LinearGradient: ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactModule.createElement(RNView, props, children),
  };
});
jest.mock('@expo/vector-icons', () => {
  const { View: RNView } = require('react-native');
  return { Ionicons: RNView };
});

const { GlossyButton } = require('@/components/italy-quiz/glossy-button');

const LONG_TWO_LINER = 'Пройдите ещё 5 кругов\nНеаполь и Везувий';

it('gives a multi-line label as many lines as it asks for, and shrinks them', () => {
  render(<GlossyButton label={LONG_TWO_LINER} locked onPress={() => {}} />);

  const title = screen.getByText(LONG_TWO_LINER);
  expect(title.props.numberOfLines).toBe(2);
  expect(title.props.adjustsFontSizeToFit).toBe(true);
  expect(title.props.minimumFontScale).toBeLessThan(1);
  // A lineHeight here would clip line 2's descenders under Android's
  // adjustsFontSizeToFit: the line box stays put while the glyphs shrink.
  expect(StyleSheet.flatten(title.props.style).lineHeight).toBeUndefined();
});

it('bounds system font enlargement so the shrink floor still fits the pill', () => {
  render(<GlossyButton label={LONG_TWO_LINER} locked onPress={() => {}} />);
  const title = screen.getByText(LONG_TWO_LINER);

  // adjustsFontSizeToFit shrinks relative to the ALREADY system-scaled size, so
  // the real floor is minimumFontScale × fontSize × systemScale. Measured on the
  // 360dp place card (~162dp of text at the two-line size), the widest line —
  // Russian «Пройдите ещё 5 кругов» — needs 0.827 of that size. If this product
  // ever climbs above it, the caption starts losing its tail again.
  const floor = title.props.minimumFontScale * title.props.maxFontSizeMultiplier;
  expect(title.props.maxFontSizeMultiplier).toBeGreaterThan(1); // still allows enlargement
  expect(floor).toBeLessThanOrEqual(0.827);
});

it('still gives a single-line label exactly one line', () => {
  render(<GlossyButton label="Круг 1" onPress={() => {}} />);
  expect(screen.getByText('Круг 1').props.numberOfLines).toBe(1);
});

/**
 * The button's own surface: the first ancestor of the label that carries the
 * pill's own styling. Found by walking up rather than by a fixed number of
 * `.parent` hops, which would count composite wrappers RNTL may add or drop.
 */
function surfacePadding(): number {
  let node = screen.getByText(LONG_TWO_LINER).parent;
  while (node) {
    const style = StyleSheet.flatten(node.props.style) ?? {};
    if (style.borderRadius === 18 && style.flexDirection === 'row') {
      return style.paddingHorizontal;
    }
    node = node.parent;
  }
  throw new Error('button surface not found');
}

it('reserves the padlock’s gutter on BOTH sides, so the label stays centred', () => {
  const { unmount } = render(
    <GlossyButton label={LONG_TWO_LINER} locked fontSize={20} onPress={() => {}} />,
  );
  const lockedPadding = surfacePadding();
  unmount();

  render(<GlossyButton label={LONG_TWO_LINER} fontSize={20} onPress={() => {}} />);
  const openPadding = surfacePadding();

  // The 20dp icon sits 16dp from the rim, so the reserve has to clear 36dp —
  // and it is applied to both sides, so the text column does not slide left.
  expect(lockedPadding - openPadding).toBeGreaterThanOrEqual(32);
});
