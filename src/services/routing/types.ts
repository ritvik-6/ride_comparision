import type { Coordinates, RoutePlan } from '@/types';

/**
 * Why a route could not be calculated.
 *
 * `no-route` is a real answer from the router (no drivable path between the two
 * points), while the rest are transport or input problems. They are kept apart
 * because only one of them is worth retrying.
 */
export type RoutingErrorKind =
  | 'cancelled'
  | 'invalid-coordinates'
  | 'no-route'
  | 'malformed'
  | 'network'
  | 'rate-limited'
  | 'rejected'
  | 'timeout';

/** Rider-facing copy for each failure. No status codes or URLs leak here. */
export const ROUTING_MESSAGES: Record<RoutingErrorKind, string> = {
  cancelled: 'Route calculation was cancelled.',
  'invalid-coordinates':
    'A route needs a valid pickup and destination position. Choose both points again.',
  'no-route':
    'No drivable route was found between these points. Move one of them and try again.',
  malformed:
    'The routing service sent a response this app could not read, so no route is shown.',
  network:
    "The routing service could not be reached. Check your connection and try again.",
  'rate-limited':
    'The routing service is busy right now. Wait a moment and try again.',
  rejected: 'The routing service rejected this request.',
  timeout: 'The routing service took too long to answer. Try again.',
};

/** Normalised routing failure, safe to show to a rider. */
export class RoutingError extends Error {
  readonly kind: RoutingErrorKind;

  constructor(kind: RoutingErrorKind, message = ROUTING_MESSAGES[kind]) {
    super(message);
    this.name = 'RoutingError';
    this.kind = kind;
  }
}

/** True when trying the same request again could succeed. */
export function isRetryableRoutingError(error: RoutingError): boolean {
  return (
    error.kind === 'timeout' ||
    error.kind === 'network' ||
    error.kind === 'rate-limited'
  );
}

/**
 * A routing backend.
 *
 * The map screen depends on this interface only, so replacing OSRM with a
 * self-hosted OSRM, GraphHopper or a backend proxy means writing one adapter and
 * changing the factory in `./index.ts`.
 */
export interface RoutingProvider {
  readonly id: string;
  /** Attribution shown with the drawn route. */
  readonly attribution: string;
  /**
   * Calculates a driving route between two positions.
   *
   * @throws {RoutingError} on any failure, including `cancelled`.
   */
  route(
    pickup: Coordinates,
    destination: Coordinates,
    options?: RouteOptions,
  ): Promise<RoutePlan>;
}

export interface RouteOptions {
  /** Aborting this signal rejects with a `cancelled` error. */
  signal?: AbortSignal;
}
