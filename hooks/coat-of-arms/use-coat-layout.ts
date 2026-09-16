import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  coatContinentMetrics,
  coatQuizMetrics,
  type CoatContinentMetrics,
  type CoatQuizMetrics,
} from '@/lib/coat-of-arms/layout';

/**
 * Live bindings for the Coat of Arms gameplay metrics.
 *
 * The arithmetic itself lives in lib/coat-of-arms/layout.ts as pure functions so
 * it can be unit-tested without a renderer; these hooks are only the wire from the
 * LIVE window size to that arithmetic. `useWindowDimensions` subscribes to
 * `Dimensions.change`, so a screen using these re-lays-out as the user drags an
 * iPad split-view divider — which is the entire point of the change.
 *
 * Call them ABOVE any early return in a screen (both gameplay screens return a
 * loader while content hydrates) or you have a Rules-of-Hooks violation.
 */

/** Metrics for the "All countries" screen. */
export function useCoatQuizMetrics(): CoatQuizMetrics {
  const { width, height } = useWindowDimensions();
  // The height fit subtracts the safe-area insets, so the coat gives up exactly
  // the right amount of room for the pinned answer grid on a notched device.
  const insets = useSafeAreaInsets();
  return useMemo(
    () => coatQuizMetrics(width, height, insets),
    // Key on the scalar inset values — the insets object identity can change every
    // render even when the numbers don't.
    [width, height, insets.top, insets.bottom],
  );
}

/** Metrics for the "By continent" screen. */
export function useCoatContinentMetrics(): CoatContinentMetrics {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return useMemo(
    () => coatContinentMetrics(width, height, insets),
    [width, height, insets.top, insets.bottom],
  );
}
