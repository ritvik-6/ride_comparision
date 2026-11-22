import { env } from '@/config/env';

import { createPhotonProvider } from './photon';
import type { GeocodingProvider } from './types';

/**
 * Geocoding entry point.
 *
 * Only this module knows which provider is in use. Screens and hooks call
 * `getGeocodingProvider()`, so switching to a keyed service, a self-hosted
 * Photon instance or a backend proxy means changing this file and nothing else.
 */

export {
  GeocodingError,
  GEOCODING_MESSAGES,
  isGeocodingError,
} from './types';
export type {
  GeocodingErrorKind,
  GeocodingProvider,
  ReverseOptions,
  SuggestOptions,
} from './types';
export {
  PHOTON_ATTRIBUTION,
  PHOTON_MIN_QUERY_LENGTH,
  PHOTON_RESULT_LIMIT,
} from './photonMapping';

let provider: GeocodingProvider | null = null;

/** Process-wide provider instance, created on first use. */
export function getGeocodingProvider(): GeocodingProvider {
  if (!provider) {
    provider = createPhotonProvider({ baseUrl: env.geocodingBaseUrl });
  }

  return provider;
}
