/**
 * Structure guard for the Italy Quiz help sheet.
 *
 * Jest does not run Yoga, so nothing here can assert a measured height — and
 * the bug this file exists to prevent WAS a measured-height bug (a percentage
 * `maxHeight` under an Android Modal whose owner height is still undefined on
 * the first pass, which makes `flexShrink` inert and leaves the ScrollView's
 * frame as tall as its content). What CAN be locked down is the shape that made
 * the bug impossible: a numeric height, a CTA outside the scroll area, an
 * indicator that is not switched off, and fades that follow the real geometry.
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render, screen, within } from '@testing-library/react-native';

jest.mock('@/hooks/use-locale', () => ({ useLocale: () => ({ locale: 'ru' }) }));
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

const { HelpModal } = require('@/components/italy-quiz/help-modal');

/** Report a viewport and a content size, the way a real layout pass would. */
function measure(viewport: number, content: number) {
  const scroll = screen.getByTestId('italy-help-scroll');
  fireEvent(scroll, 'layout', { nativeEvent: { layout: { height: viewport } } });
  fireEvent(scroll, 'contentSizeChange', 320, content);
  return scroll;
}

function scrollTo(y: number, viewport: number, content: number) {
  fireEvent.scroll(screen.getByTestId('italy-help-scroll'), {
    nativeEvent: {
      contentOffset: { y },
      layoutMeasurement: { height: viewport },
      contentSize: { height: content },
    },
  });
}

beforeEach(() => {
  render(<HelpModal visible onClose={() => {}} />);
});

it('caps the card with a NUMBER, never a percentage', () => {
  const height = StyleSheet.flatten(screen.getByTestId('italy-help-card').props.style).height;
  // A percentage — or a numeric maxHeight, which hits the same Yoga guard —
  // is exactly what stopped the sheet from scrolling. See help-modal.tsx.
  expect(typeof height).toBe('number');
  expect(height).toBeGreaterThan(0);
});

it('keeps the close button outside the scrolling copy', () => {
  const scroll = screen.getByTestId('italy-help-scroll');
  expect(within(scroll).queryByText('Понятно')).toBeNull();
  expect(screen.getByText('Понятно')).toBeTruthy();
});

it('leaves the scroll indicator on — it is the only signal there is more', () => {
  expect(screen.getByTestId('italy-help-scroll').props.showsVerticalScrollIndicator).not.toBe(
    false,
  );
});

it('shows no fade before anything has been measured', () => {
  expect(screen.queryByTestId('italy-help-fade-top')).toBeNull();
  expect(screen.queryByTestId('italy-help-fade-bottom')).toBeNull();
});

it('fades only the edge the copy actually continues past', () => {
  measure(400, 900);
  // At the top: more below, nothing above.
  expect(screen.queryByTestId('italy-help-fade-top')).toBeNull();
  expect(screen.getByTestId('italy-help-fade-bottom')).toBeTruthy();

  // Halfway: both.
  scrollTo(200, 400, 900);
  expect(screen.getByTestId('italy-help-fade-top')).toBeTruthy();
  expect(screen.getByTestId('italy-help-fade-bottom')).toBeTruthy();

  // At the end: nothing below any more.
  scrollTo(500, 400, 900);
  expect(screen.getByTestId('italy-help-fade-top')).toBeTruthy();
  expect(screen.queryByTestId('italy-help-fade-bottom')).toBeNull();
});

it('shows no fade at all when the copy happens to fit', () => {
  // A shorter translation is not a bug, and must not be decorated like one.
  measure(400, 300);
  expect(screen.queryByTestId('italy-help-fade-top')).toBeNull();
  expect(screen.queryByTestId('italy-help-fade-bottom')).toBeNull();
});
