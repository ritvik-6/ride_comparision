import { useCallback, useEffect, useState } from 'react';

import { fetchFareComparison } from '@/services/fares/faresApi';
import {
  type FareApiFailure,
  toFareApiFailure,
} from '@/services/fares/faresContract';
import type { FareComparisonResult } from '@/types';
import type { ComparisonRoute } from '@/utils/comparisonRoute';

export type FareComparisonStatus = 'loading' | 'success' | 'error';

export interface FareComparisonController {
  status: FareComparisonStatus;
  /** Set only while `status` is `success`. */
  comparison: FareComparisonResult | null;
  /** Set only while `status` is `error`. */
  error: FareApiFailure | null;
  /** Starts a fresh request. Only offered while showing a failure. */
  retry: () => void;
}

/** One settled request, tagged with what it was a result for. */
interface FareLoadResult {
  route: ComparisonRoute;
  attempt: number;
  comparison: FareComparisonResult | null;
  error: FareApiFailure | null;
}

/**
 * Loads the comparison for a route from the backend.
 *
 * `route` must be referentially stable — the comparison screen builds it with
 * `useMemo`, because `useLocalSearchParams` returns a new object on every
 * render and would otherwise re-request on each one.
 *
 * Loading is *derived*, not stored: a result only counts if it belongs to the
 * current route and retry attempt, so a new request shows the loading state
 * immediately without a state update inside the effect. Exactly one request is
 * in flight per route/attempt, and a superseded request cannot write its result
 * because React runs the previous effect's cleanup before starting the next.
 */
export function useFareComparison(
  route: ComparisonRoute | null,
): FareComparisonController {
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<FareLoadResult | null>(null);

  useEffect(() => {
    if (!route) {
      return;
    }

    let active = true;
    const attemptId = attempt;

    fetchFareComparison(route.pickup, route.destination, route.route)
      .then((comparison) => {
        if (active) {
          setLoaded({ route, attempt: attemptId, comparison, error: null });
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setLoaded({
            route,
            attempt: attemptId,
            comparison: null,
            error: toFareApiFailure(caught),
          });
        }
      });

    return () => {
      active = false;
    };
  }, [route, attempt]);

  const settled =
    loaded && loaded.route === route && loaded.attempt === attempt ? loaded : null;
  const status: FareComparisonStatus = settled
    ? settled.error
      ? 'error'
      : 'success'
    : 'loading';

  // Rendered only from the error card, so it cannot fire mid-request.
  const retry = useCallback(() => {
    setAttempt((value) => value + 1);
  }, []);

  return {
    status,
    comparison: settled?.comparison ?? null,
    error: settled?.error ?? null,
    retry,
  };
}
