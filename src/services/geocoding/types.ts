import type { Coordinates, MapLocation } from '@/types';

/**
 * Geocoding service contract.
 *
 * The map talks to this interface only, so the provider can be replaced — an
 * adapter for another hosted service, a self-hosted Photon instance, or a proxy
 * through the RideCompare backend — without touching screens or components.
 *
 * This module has no runtime imports, so the error mapping below can be unit
 * tested directly in Node.
 */

export type GeocodingErrorKind =
  /** Superseded by a newer query or tap; never shown to the rider. */
  | 'cancelled'
  /** Our own timeout fired. Retrying is worthwhile. */
  | 'timeout'
  /** DNS, TLS, socket or 5xx failure. Retrying is worthwhile. */
  | 'network'
  /** The provider is throttling us (HTTP 429). Retrying after a pause works. */
  | 'rate-limited'
  /** The provider refuses this client (HTTP 403). Retrying changes nothing. */
  | 'blocked'
  /** The provider did not accept the request (HTTP 400/404). Retrying is futile. */
  | 'rejected'
  /** A 2xx body we could not read as GeoJSON. */
  | 'malformed';

/** A geocoding failure with a message that is safe to show to the user. */
export class GeocodingError extends Error {
  readonly kind: GeocodingErrorKind;

  /** HTTP status when the failure came from a response; absent otherwise. */
  readonly status?: number;

  constructor(kind: GeocodingErrorKind, message: string, status?: number) {
    super(message);
    this.name = 'GeocodingError';
    this.kind = kind;
    this.status = status;
  }
}

/** True when an unknown thrown value is one of our failures. */
export function isGeocodingError(error: unknown): error is GeocodingError {
  return error instanceof GeocodingError;
}

export const GEOCODING_MESSAGES: Record<GeocodingErrorKind, string> = {
  cancelled: 'Search was cancelled.',
  timeout: 'The place search timed out. Check your connection and try again.',
  network:
    "We couldn't reach the place search. Check your connection and try again.",
  'rate-limited':
    'The place search is busy right now. Wait a moment, then try again.',
  blocked:
    'The place search is refusing requests from this app right now. Tap the map to pick a location, or try again later.',
  rejected:
    'The place search would not accept that search. Try fewer or different words.',
  malformed:
    "The place search returned something we couldn't read. Try again.",
};

/**
 * Kinds where the same request may succeed later. Everything else is a
 * permanent answer from the provider, so offering a Retry button would just
 * fail again — the rider needs a different action instead.
 */
export const RETRYABLE_GEOCODING_ERRORS: readonly GeocodingErrorKind[] = [
  'timeout',
  'network',
  'rate-limited',
  'malformed',
];

/** True when retrying the identical request could plausibly work. */
export function isRetryableGeocodingErrorKind(
  kind: GeocodingErrorKind,
): boolean {
  return RETRYABLE_GEOCODING_ERRORS.includes(kind);
}

/**
 * Translates an HTTP failure into the kind the UI reacts to.
 *
 * 403 is deliberately its own kind: the public Photon instance answers 403
 * when it does not accept the caller (for example a generic OkHttp
 * User-Agent), and that is a permanent, app-side problem rather than a blip
 * the rider can retry away.
 */
export function geocodingErrorForStatus(status: number): GeocodingError {
  if (status === 429) {
    return new GeocodingError(
      'rate-limited',
      GEOCODING_MESSAGES['rate-limited'],
      status,
    );
  }

  if (status === 403 || status === 401) {
    return new GeocodingError('blocked', GEOCODING_MESSAGES.blocked, status);
  }

  if (status >= 500) {
    return new GeocodingError('network', GEOCODING_MESSAGES.network, status);
  }

  return new GeocodingError('rejected', GEOCODING_MESSAGES.rejected, status);
}

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
