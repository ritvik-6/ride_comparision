import type { Coordinates, RoutePlan } from '@/types';

import {
  buildOsrmRouteUrl,
  OSRM_ATTRIBUTION,
  OSRM_DEFAULT_BASE_URL,
  parseOsrmRoute,
} from './osrmMapping';
import {
  RoutingError,
  ROUTING_MESSAGES,
  type RouteOptions,
  type RoutingProvider,
} from './types';

/**
 * OSRM routing adapter.
 *
 * OSRM is open source and its demo server at router.project-osrm.org needs no
 * API key, which makes it the right first implementation. It is a free shared
 * service: the OSRM project asks users not to hammer it, throttles heavy traffic
 * and offers no availability guarantee. The adapter therefore keeps traffic low
 * (one request per completed route, none while an end is still being chosen), and
 * the base URL is configurable so a self-hosted instance can replace it without
 * touching this file.
 */

/** A stalled request must not leave the map waiting without a route. */
const REQUEST_TIMEOUT_MS = 9_000;

interface OsrmProviderOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

function toRoutingError(
  error: unknown,
  signal: AbortSignal,
  externalSignal?: AbortSignal,
): RoutingError {
  if (externalSignal?.aborted) {
    return new RoutingError('cancelled');
  }

  if (error instanceof RoutingError) {
    return error;
  }

  // Our timer fired, not the caller.
  if (signal.aborted) {
    return new RoutingError('timeout');
  }

  return new RoutingError('network');
}

function statusToError(status: number): RoutingError {
  if (status === 429) {
    return new RoutingError('rate-limited');
  }

  if (status >= 500) {
    return new RoutingError('network');
  }

  return new RoutingError('rejected');
}

export function createOsrmProvider({
  baseUrl = OSRM_DEFAULT_BASE_URL,
  fetchImpl = fetch,
}: OsrmProviderOptions = {}): RoutingProvider {
  return {
    id: 'osrm',
    attribution: OSRM_ATTRIBUTION,

    async route(pickup, destination, options: RouteOptions = {}) {
      let url: string;

      try {
        url = buildOsrmRouteUrl(baseUrl, pickup, destination);
      } catch {
        throw new RoutingError('invalid-coordinates');
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      const externalSignal = options.signal;

      const forwardAbort = () => controller.abort();

      if (externalSignal) {
        if (externalSignal.aborted) {
          clearTimeout(timer);
          throw new RoutingError('cancelled');
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
          throw new RoutingError('malformed');
        }

        const result = parseOsrmRoute(payload);

        if (result.status === 'no-route') {
          throw new RoutingError('no-route');
        }

        if (result.status === 'malformed') {
          throw new RoutingError('malformed');
        }

        return result.plan;
      } catch (error) {
        throw toRoutingError(error, controller.signal, externalSignal);
      } finally {
        clearTimeout(timer);
        externalSignal?.removeEventListener('abort', forwardAbort);
      }
    },
  } satisfies RoutingProvider;
}

/** Re-exported so callers can show the provider's message without a lookup. */
export { ROUTING_MESSAGES };

export type { Coordinates, RoutePlan };
