import { useCallback, useEffect, useRef, useState } from 'react';

import {
  getRoutingProvider,
  isRetryableRoutingError,
  RoutingError,
  ROUTING_MESSAGES,
} from '@/services/routing';
import type { Coordinates, RoutePlan } from '@/types';

export type RoutePlanStatus = 'idle' | 'loading' | 'success' | 'error';

export interface RoutePlanController {
  /** `idle` until both ends of the route are known. */
  status: RoutePlanStatus;
  /** Set only while `status` is `success`. */
  plan: RoutePlan | null;
  /** Safe to render message; set only while `status` is `error`. */
  error: string | null;
  /** False when repeating the same request cannot help. */
  canRetry: boolean;
  retry: () => void;
}

/** One settled attempt, tagged with the endpoints it belongs to. */
interface SettledRoute {
  key: string;
  attempt: number;
  plan: RoutePlan | null;
  error: RoutingError | null;
}

/** Endpoint identity at ~1 m precision, so camera moves do not re-request. */
const pointKey = (point: Coordinates): string =>
  `${point.latitude.toFixed(5)},${point.longitude.toFixed(5)}`;

/**
 * Calculates the driving route for the current pickup and destination.
 *
 * A route is requested once both endpoints and the attempt are settled, and only
 * when an endpoint actually changes: the key is derived from the coordinates, so
 * re-rendering the screen never re-requests. A superseded request is aborted, and
 * its result is ignored even if it resolves first.
 *
 * When routing fails, `plan` stays `null` and `error` explains why. Nothing here
 * substitutes a straight-line distance or a made-up duration — the comparison
 * screen is told there is no route, and the fare request omits the metrics.
 */
export function useRoutePlan(
  pickup: Coordinates | null,
  destination: Coordinates | null,
): RoutePlanController {
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<SettledRoute | null>(null);

  const key =
    pickup && destination
      ? `${pointKey(pickup)}>${pointKey(destination)}`
      : null;

  // The effect is keyed on the derived string, so the points are read from a
  // ref rather than captured — otherwise every re-render would restart it.
  const endpoints = useRef({ pickup, destination });

  useEffect(() => {
    endpoints.current = { pickup, destination };
  }, [pickup, destination]);

  useEffect(() => {
    if (!key) {
      return;
    }

    const start = endpoints.current.pickup;
    const end = endpoints.current.destination;

    if (!start || !end) {
      return;
    }

    const controller = new AbortController();
    let active = true;
    const attemptId = attempt;

    getRoutingProvider()
      .route(start, end, { signal: controller.signal })
      .then((plan) => {
        if (active) {
          setSettled({ key, attempt: attemptId, plan, error: null });
        }
      })
      .catch((caught: unknown) => {
        if (!active) {
          return;
        }

        // Aborting on cleanup is the user changing the route, not a failure.
        if (caught instanceof RoutingError && caught.kind === 'cancelled') {
          return;
        }

        setSettled({
          key,
          attempt: attemptId,
          plan: null,
          error:
            caught instanceof RoutingError
              ? caught
              : new RoutingError('network', ROUTING_MESSAGES.network),
        });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [key, attempt]);

  // Loading is derived: an attempt for another route or a stale retry does not
  // count, so a changed route shows the loading state without an extra render.
  const current =
    settled && settled.key === key && settled.attempt === attempt
      ? settled
      : null;

  const status: RoutePlanStatus =
    key === null ? 'idle' : current === null ? 'loading' : current.error ? 'error' : 'success';

  const retry = useCallback(() => {
    setAttempt((value) => value + 1);
  }, []);

  return {
    status,
    plan: current?.plan ?? null,
    error: current?.error?.message ?? null,
    canRetry: current?.error ? isRetryableRoutingError(current.error) : false,
    retry,
  };
}
