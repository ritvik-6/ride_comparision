/**
 * Central, typed access to public environment configuration.
 *
 * Only EXPO_PUBLIC_* variables are available at runtime, and their values are
 * inlined into the bundle. Never put secrets here.
 */
const rawApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
const rawAppEnv = process.env.EXPO_PUBLIC_APP_ENV;
const rawGeocodingBaseUrl = process.env.EXPO_PUBLIC_GEOCODING_BASE_URL;

/**
 * Public keyless Photon instance used for place search. It is a free demo
 * server with a fair-use policy, so it is overridable for a self-hosted or
 * compatible host without a code change.
 */
const DEFAULT_GEOCODING_BASE_URL = 'https://photon.komoot.io';

export const env = {
  apiBaseUrl: rawApiBaseUrl?.trim() || undefined,
  appEnv: rawAppEnv?.trim() || (__DEV__ ? 'development' : 'production'),
  geocodingBaseUrl: rawGeocodingBaseUrl?.trim() || DEFAULT_GEOCODING_BASE_URL,
  isDev: __DEV__,
} as const;

/** True when the app has a backend base URL configured. */
export const isApiConfigured = Boolean(env.apiBaseUrl);
