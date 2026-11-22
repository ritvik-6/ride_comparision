import type { Coordinates, MapLocation } from '@/types';

/**
 * Geocoding service contract.
 *
 * The map talks to this interface only, so the provider can be replaced —
 * another hosted service, a self-hosted Photon instance, or a proxy through the
 * RideCompare backend — without touching screens or components.
 */

export type GeocodingErrorKind =
  | 'cancelled'
  | 'timeout'
  | 'network'
  | 'rate-limited'
  | 'rejected'
  | 'malformed';

/** A geocoding failure with a message that is safe to show to the user. */
export class GeocodingError extends Error {
  readonly kind: GeocodingErrorKind;

  constructor(kind: GeocodingErrorKind, message: string) {
    super(message);
    this.name = 'GeocodingError';
    this.kind = kind;
  }
}

/** True when an unknown thrown value is one of our failures. */
export function isGeocodingError(error: unknown): error is GeocodingError {
  return error instanceof GeocodingError;
}

export const GEOCODING_MESSAGES: Record<GeocodingErrorKind, string> = {
  cancelled: 'Search was cancelled.',
  timeout: 'The place search took too long. Check your connection and try again.',
  network: "We couldn't reach the place search. Check your connection and try again.",
  'rate-limited':
    'The place search is busy right now. Wait a moment, then try again.',
  rejected: 'The place search rejected that request. Try different words.',
  malformed: "The place search returned something we couldn't read. Try again.",
};

export interface SuggestOptions {
  /** Preferred search centre, normally the current map view. */
  bias?: Coordinates | null;
  /** Maximum suggestions to return. */
  limit?: number;
  /** Cancels the request, e.g. when the query changes again. */
  signal?: AbortSignal;
}

export interface ReverseOptions {
  signal?: AbortSignal;
}

export interface GeocodingProvider {
  /** Short identifier used in logs and tests, e.g. "photon". */
  readonly id: string;
  /** Attribution that must be visible wherever results are shown. */
  readonly attribution: string;
  /** Autocomplete suggestions for a partial query. */
  suggest(query: string, options?: SuggestOptions): Promise<MapLocation[]>;
  /** Nearest readable place for a coordinate, or null when nothing is near. */
  reverse(
    point: Coordinates,
    options?: ReverseOptions,
  ): Promise<MapLocation | null>;
}
