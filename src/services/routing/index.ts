import { env } from '@/config/env';

import { createOsrmProvider } from './osrm';
import type { RoutingProvider } from './types';

/**
 * Routing entry point.
 *
 * Only this module knows which routing backend is in use. The map screen calls
 * `getRoutingProvider()`, so moving to a self-hosted OSRM, another provider or a
 * backend proxy is a change to this file alone.
 */

export {
  isRetryableRoutingError,
  RoutingError,
  ROUTING_MESSAGES,
} from './types';
export type {
  RouteOptions,
  RoutingErrorKind,
  RoutingProvider,
} from './types';
export { OSRM_ATTRIBUTION, OSRM_DEFAULT_BASE_URL } from './osrmMapping';

let provider: RoutingProvider | null = null;

/** Process-wide provider instance, created on first use. */
export function getRoutingProvider(): RoutingProvider {
  if (!provider) {
    provider = createOsrmProvider({ baseUrl: env.routingBaseUrl });
  }

  return provider;
}
