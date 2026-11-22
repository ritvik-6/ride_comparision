import type { Coordinates, MapLocation } from '@/types';

import {
  buildPhotonReverseUrl,
  buildPhotonSearchUrl,
  parsePhotonResponse,
  PHOTON_ATTRIBUTION,
  PHOTON_DEFAULT_BASE_URL,
  PHOTON_MIN_QUERY_LENGTH,
  PHOTON_RESULT_LIMIT,
} from './photonMapping';
import {
  GeocodingError,
  GEOCODING_MESSAGES,
  type GeocodingProvider,
  type ReverseOptions,
  type SuggestOptions,
} from './types';

/**
 * Photon geocoding adapter.
 *
 * Photon is an OpenStreetMap geocoder built for search-as-you-type and it also
 * reverse geocodes, so one provider covers both needs with no API key. The
 * public instance at photon.komoot.io is a free demo server: komoot asks for
 * fair use, throttles heavy traffic and gives no availability guarantee, so the
 * base URL is configurable (self-hosted instance or a compatible host) and the
 * whole adapter sits behind `GeocodingProvider`.
 *
 * The adapter also keeps request volume low, which is part of respecting that
 * policy: no request for short queries, one request per debounced pause, an
 * in-flight request cancelled when the query changes, and a result cache.
 */

/** Requests are abandoned after this long so a stalled network cannot hang the UI. */
const REQUEST_TIMEOUT_MS = 8_000;

/** Suggestions are cached per query; the map session rarely exceeds this. */
const CACHE_LIMIT = 40;

interface PhotonProviderOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

const trimQuery = (query: string): string => query.replace(/\s+/g, ' ').trim();

const cacheKey = (query: string, bias: Coordinates | null | undefined): string => {
  const normalized = trimQuery(query).toLowerCase();

  if (!bias) {
    return normalized;
  }

  // Bias is coarse on purpose: panning a few metres must not re-query.
  return `${normalized}@${bias.latitude.toFixed(2)},${bias.longitude.toFixed(2)}`;
};

function toGeocodingError(
  error: unknown,
  signal: AbortSignal,
  externalSignal?: AbortSignal,
): GeocodingError {
  if (externalSignal?.aborted) {
    return new GeocodingError('cancelled', GEOCODING_MESSAGES.cancelled);
  }

  if (error instanceof GeocodingError) {
    return error;
  }

  // Our own timeout aborted the request, not the caller.
  if (signal.aborted) {
    return new GeocodingError('timeout', GEOCODING_MESSAGES.timeout);
  }

  return new GeocodingError('network', GEOCODING_MESSAGES.network);
}

function statusToError(status: number): GeocodingError {
  if (status === 429) {
    return new GeocodingError('rate-limited', GEOCODING_MESSAGES['rate-limited']);
  }

  if (status >= 500) {
    return new GeocodingError('network', GEOCODING_MESSAGES.network);
  }

  return new GeocodingError('rejected', GEOCODING_MESSAGES.rejected);
}

export function createPhotonProvider({
  baseUrl = PHOTON_DEFAULT_BASE_URL,
  fetchImpl = fetch,
}: PhotonProviderOptions = {}): GeocodingProvider {
  const cache = new Map<string, MapLocation[]>();

  const remember = (key: string, locations: MapLocation[]) => {
    if (cache.size >= CACHE_LIMIT) {
      const oldest = cache.keys().next();

      if (!oldest.done) {
        cache.delete(oldest.value);
      }
    }

    cache.set(key, locations);
  };

  const request = async (
    url: string,
    externalSignal?: AbortSignal,
  ): Promise<MapLocation[]> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const forwardAbort = () => controller.abort();

    if (externalSignal) {
      if (externalSignal.aborted) {
        clearTimeout(timer);
        throw new GeocodingError('cancelled', GEOCODING_MESSAGES.cancelled);
      }

      externalSignal.addEventListener('abort', forwardAbort);
    }

    try {
      const response = await fetchImpl(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw statusToError(response.status);
      }

      let payload: unknown;

      try {
        payload = await response.json();
      } catch {
        throw new GeocodingError('malformed', GEOCODING_MESSAGES.malformed);
      }

      const locations = parsePhotonResponse(payload);

      if (locations === null) {
        throw new GeocodingError('malformed', GEOCODING_MESSAGES.malformed);
      }

      return locations;
    } catch (error) {
      throw toGeocodingError(error, controller.signal, externalSignal);
    } finally {
      clearTimeout(timer);
      externalSignal?.removeEventListener('abort', forwardAbort);
    }
  };

  return {
    id: 'photon',
    attribution: PHOTON_ATTRIBUTION,

    async suggest(query, options: SuggestOptions = {}) {
      const trimmed = trimQuery(query);

      // Short queries are not worth a request, and the panel stays empty.
      if (trimmed.length < PHOTON_MIN_QUERY_LENGTH) {
        return [];
      }

      const key = cacheKey(trimmed, options.bias);
      const cached = cache.get(key);

      if (cached) {
        return cached;
      }

      const url = buildPhotonSearchUrl(baseUrl, trimmed, {
        bias: options.bias ?? null,
        limit: options.limit ?? PHOTON_RESULT_LIMIT,
      });

      const locations = await request(url, options.signal);
      remember(key, locations);

      return locations;
    },

    async reverse(point, options: ReverseOptions = {}) {
      const url = buildPhotonReverseUrl(baseUrl, point);
      const locations = await request(url, options.signal);

      // Nothing within the search radius is a normal outcome, not an error.
      return locations[0] ?? null;
    },
  };
}
