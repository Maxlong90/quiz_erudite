/**
 * QuestionImage (components/sport-quiz/question-image.tsx) — the loading state
 * behind the Sport Quiz question picture.
 *
 * The contract these lock in:
 *  - the neon frame is NEVER empty: a skeleton covers it from the first frame;
 *  - but a warm file:// image (which decodes in a frame or two) must never flash
 *    a spinner — the spinner only appears once a load is genuinely slow;
 *  - a FAILED load clears the placeholder too, so a dead URL can't spin forever;
 *  - the expo-image cache contract the warm-ahead hooks rely on stays intact.
 *
 * expo-image is mocked to a prop-forwarding host node so both the load callbacks
 * can be driven and the cache props asserted.
 */
import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';

jest.mock('expo-image', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');
  return {
    Image: (props: Record<string, unknown>) =>
      ReactModule.createElement(View, { ...props, testID: 'expo-image' }),
  };
});

jest.mock('expo-linear-gradient', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');
  return {
    LinearGradient: (props: Record<string, unknown>) =>
      ReactModule.createElement(View, props),
  };
});

// eslint-disable-next-line import/first -- component under test loads AFTER its mocks
import { QuestionImage } from '@/components/sport-quiz/question-image';

const URI = 'file:///docs/snapshot-images-sport-quiz/abc_image';

/** Push fake time forward inside act so state updates flush. */
function advance(ms: number) {
  act(() => {
    jest.advanceTimersByTime(ms);
  });
}

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('QuestionImage', () => {
  it('covers the frame immediately, with no spinner during the grace period', () => {
    const { queryByTestId } = render(<QuestionImage uri={URI} loadingLabel="Loading…" />);

    // The skeleton is there from frame one — the frame is never bare.
    expect(queryByTestId('question-image-placeholder')).not.toBeNull();
    // But nothing is spinning yet.
    expect(queryByTestId('question-image-spinner')).toBeNull();

    advance(100);
    expect(queryByTestId('question-image-spinner')).toBeNull();
  });

  it('never flashes a spinner for a one-frame load (the warm-cache case)', () => {
    const { getByTestId, queryByTestId } = render(
      <QuestionImage uri={URI} loadingLabel="Loading…" />,
    );

    // A file:// image already in the decode cache lands almost immediately.
    fireEvent(getByTestId('expo-image'), 'loadEnd');
    advance(1000);

    // The load-bearing assertion: a fast load shows NOTHING transient. If the
    // spinner were undelayed, every question would blink one at you.
    expect(queryByTestId('question-image-spinner')).toBeNull();
    expect(queryByTestId('question-image-placeholder')).toBeNull();
  });

  it('shows the spinner once the load is genuinely slow', () => {
    const { queryByTestId } = render(<QuestionImage uri={URI} loadingLabel="Loading…" />);

    advance(300);

    expect(queryByTestId('question-image-spinner')).not.toBeNull();
    expect(queryByTestId('question-image-placeholder')).not.toBeNull();
  });

  it('clears skeleton and spinner when a slow load finally lands', () => {
    const { getByTestId, queryByTestId } = render(
      <QuestionImage uri={URI} loadingLabel="Loading…" />,
    );

    advance(300);
    expect(queryByTestId('question-image-spinner')).not.toBeNull();

    fireEvent(getByTestId('expo-image'), 'loadEnd');

    expect(queryByTestId('question-image-spinner')).toBeNull();
    expect(queryByTestId('question-image-placeholder')).toBeNull();
  });

  it('clears on a FAILED load — a dead URL must not spin forever', () => {
    const { getByTestId, queryByTestId } = render(
      <QuestionImage uri="https://api.test/gone.png" loadingLabel="Loading…" />,
    );

    advance(300);
    expect(queryByTestId('question-image-spinner')).not.toBeNull();

    // onLoadEnd fires on failure as well as success — that is exactly why the
    // component listens to it rather than onLoad.
    fireEvent(getByTestId('expo-image'), 'loadEnd');

    expect(queryByTestId('question-image-placeholder')).toBeNull();
  });

  it('keeps the expo-image cache contract the warm-ahead hooks depend on', () => {
    const { getByTestId } = render(<QuestionImage uri={URI} />);

    const props = getByTestId('expo-image').props;
    // memory-disk is what useWarmLevelImages prefetches into — a mismatch here
    // would silently make every warm a no-op.
    expect(props.cachePolicy).toBe('memory-disk');
    expect(props.recyclingKey).toBe(URI);
    expect(props.contentFit).toBe('contain');
    expect(props.transition).toBeGreaterThan(0);
  });

  it('starts a fresh loading state when remounted under a new key', () => {
    const { View } = require('react-native');
    // Wrapped in a parent exactly like the quiz screen renders it, so the key
    // change remounts the component rather than the whole tree root.
    const scene = (uri: string) => (
      <View>
        <QuestionImage key={uri} uri={uri} loadingLabel="Loading…" />
      </View>
    );

    const { getByTestId, queryByTestId, rerender } = render(scene(URI));
    fireEvent(getByTestId('expo-image'), 'loadEnd');
    expect(queryByTestId('question-image-placeholder')).toBeNull();

    // Next question: the caller swaps the key, so the component remounts and the
    // loading state must come back rather than showing the previous picture.
    rerender(scene('file:///docs/snapshot-images-sport-quiz/def_image'));

    expect(queryByTestId('question-image-placeholder')).not.toBeNull();
  });

  it('renders children inside the frame (the Legends reveal-grid slot)', () => {
    const { Text } = require('react-native');
    const { queryByText } = render(
      <QuestionImage uri={URI}>
        <Text>overlay</Text>
      </QuestionImage>,
    );

    expect(queryByText('overlay')).not.toBeNull();
  });
});
