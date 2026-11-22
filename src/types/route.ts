import type { LineString } from 'geojson';

/**
 * Road distance and driving time for a route.
 *
 * These come from the routing service, never from a straight-line estimate: a
 * route that could not be calculated has metrics of `null`, so no fare is ever
 * priced against a fabricated distance.
 */
export interface RouteMetrics {
  /** Road distance in kilometres, rounded to 100 m. */
  distanceKm: number;
  /** Estimated driving time in whole minutes, at least 1. */
  durationMinutes: number;
}

/** A calculated driving route, including the road geometry to draw. */
export interface RoutePlan extends RouteMetrics {
  /** The road path as a GeoJSON LineString, in [longitude, latitude] order. */
  geometry: LineString;
  /** Unrounded distance, kept for callers that need more precision. */
  distanceMeters: number;
  /** Unrounded duration, kept for callers that need more precision. */
  durationSeconds: number;
}
