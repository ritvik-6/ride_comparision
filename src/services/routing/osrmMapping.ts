import type { Coordinates, RoutePlan } from '@/types';

/**
 * OSRM wire format: URL construction and response parsing.
 *
 * This module has no runtime imports and no network code, so it can be unit
 * tested directly and the provider adapter stays a thin transport wrapper.
 *
 * OSRM takes `{longitude},{latitude}` pairs, whereas the app's model is
 * `{latitude, longitude}` — the order is converted here, once, so no caller can
 * transpose them.
 */

/** Public OSRM demo server. Overridable via EXPO_PUBLIC_ROUTING_BASE_URL. */
export const OSRM_DEFAULT_BASE_URL = 'https://router.project-osrm.org';

export const OSRM_ATTRIBUTION =
  'Route by OSRM · © OpenStreetMap contributors';

/** Precision used in the URL: ~11 cm, well beyond what any fare needs. */
const COORDINATE_PRECISION = 6;

const LATITUDE_LIMIT = 90;
const LONGITUDE_LIMIT = 180;

/** One parse outcome; `no-route` is an answer, not a failure of the service. */
export type OsrmRouteResult =
  | { status: 'ok'; plan: RoutePlan }
  | { status: 'no-route' }
  | { status: 'malformed' };

/** True only for a complete, finite, in-range position. */
export function isValidPoint(
  point: Coordinates | null | undefined,
): point is Coordinates {
  return (
    point !== null &&
    point !== undefined &&
    Number.isFinite(point.latitude) &&
    Number.isFinite(point.longitude) &&
    Math.abs(point.latitude) <= LATITUDE_LIMIT &&
    Math.abs(point.longitude) <= LONGITUDE_LIMIT
  );
}

const formatPoint = (point: Coordinates): string =>
  `${point.longitude.toFixed(COORDINATE_PRECISION)},${point.latitude.toFixed(COORDINATE_PRECISION)}`;

/**
 * Builds the OSRM route URL for a driving route.
 *
 * `overview=full` and `geometries=geojson` are what make the response drawable:
 * the full road path comes back as a LineString rather than a simplified or
 * encoded polyline. `alternatives=false` and `steps=false` keep the payload
 * small, which is part of using a free shared service politely.
 *
 * @throws {RangeError} when a point is not a usable coordinate.
 */
export function buildOsrmRouteUrl(
  baseUrl: string,
  pickup: Coordinates,
  destination: Coordinates,
): string {
  if (!isValidPoint(pickup) || !isValidPoint(destination)) {
    throw new RangeError('OSRM needs two valid, in-range coordinates.');
  }

  const base = baseUrl.replace(/\/+$/, '');
  const path = `${formatPoint(pickup)};${formatPoint(destination)}`;

  return `${base}/route/v1/driving/${path}?overview=full&geometries=geojson&alternatives=false&steps=false`;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

/** Validates one `[longitude, latitude]` pair from the geometry. */
const readPosition = (value: unknown): [number, number] | null => {
  if (!Array.isArray(value) || value.length < 2) {
    return null;
  }

  const [longitude, latitude] = value;

  if (!isFiniteNumber(longitude) || !isFiniteNumber(latitude)) {
    return null;
  }

  if (
    Math.abs(latitude) > LATITUDE_LIMIT ||
    Math.abs(longitude) > LONGITUDE_LIMIT
  ) {
    return null;
  }

  return [longitude, latitude];
};

/** Whole minutes, rounded up so a 20-second route never shows "0 min". */
export const toDurationMinutes = (seconds: number): number =>
  Math.max(1, Math.round(seconds / 60));

/** Kilometres rounded to 100 m, the precision the UI shows. */
export const toDistanceKm = (meters: number): number =>
  Math.round(meters / 100) / 10;

/**
 * Parses an OSRM `/route` response into a `RoutePlan`.
 *
 * Anything unexpected is `malformed` rather than a partially filled plan: a
 * route with a valid distance but broken geometry would draw nothing while still
 * pricing the trip, which is exactly the invented number this app avoids.
 */
export function parseOsrmRoute(payload: unknown): OsrmRouteResult {
  if (!isRecord(payload)) {
    return { status: 'malformed' };
  }

  const { code, routes } = payload;

  if (code !== 'Ok') {
    // OSRM reports an unroutable pair with `NoRoute` and no routes.
    return typeof code === 'string' ? { status: 'no-route' } : { status: 'malformed' };
  }

  // `Ok` with no routes array is a broken response, not an answer.
  if (!Array.isArray(routes)) {
    return { status: 'malformed' };
  }

  if (routes.length === 0) {
    return { status: 'no-route' };
  }

  const first: unknown = routes[0];

  if (!isRecord(first)) {
    return { status: 'malformed' };
  }

  const { distance, duration, geometry } = first;

  if (!isFiniteNumber(distance) || distance <= 0) {
    return { status: 'malformed' };
  }

  if (!isFiniteNumber(duration) || duration <= 0) {
    return { status: 'malformed' };
  }

  if (!isRecord(geometry) || geometry.type !== 'LineString') {
    return { status: 'malformed' };
  }

  const positions = geometry.coordinates;

  if (!Array.isArray(positions) || positions.length < 2) {
    return { status: 'malformed' };
  }

  const coordinates: [number, number][] = [];

  for (const position of positions) {
    const pair = readPosition(position);

    if (!pair) {
      return { status: 'malformed' };
    }

    coordinates.push(pair);
  }

  return {
    status: 'ok',
    plan: {
      geometry: { type: 'LineString', coordinates },
      distanceMeters: distance,
      durationSeconds: duration,
      distanceKm: toDistanceKm(distance),
      durationMinutes: toDurationMinutes(duration),
    },
  };
}
