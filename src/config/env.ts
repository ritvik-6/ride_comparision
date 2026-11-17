/**
 * Central, typed access to public environment configuration.
 *
 * Only EXPO_PUBLIC_* variables are available at runtime, and their values are
 * inlined into the bundle. Never put secrets here.
 */
const rawApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
const rawAppEnv = process.env.EXPO_PUBLIC_APP_ENV;

export const env = {
  apiBaseUrl: rawApiBaseUrl?.trim() || undefined,
  appEnv: rawAppEnv?.trim() || (__DEV__ ? 'development' : 'production'),
  isDev: __DEV__,
} as const;

/** True when the app has a backend base URL configured. */
export const isApiConfigured = Boolean(env.apiBaseUrl);
