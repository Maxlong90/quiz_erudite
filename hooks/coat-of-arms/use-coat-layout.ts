import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

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
  return useMemo(() => coatQuizMetrics(width, height), [width, height]);
}

/** Metrics for the "By continent" screen. */
export function useCoatContinentMetrics(): CoatContinentMetrics {
  const { width, height } = useWindowDimensions();
  return useMemo(() => coatContinentMetrics(width, height), [width, height]);
}
