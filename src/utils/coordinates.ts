import type { GeoPoint } from '@/types';

/**
 * Coordinate helper for the comparison route params.
 *
 * Mock places carry no coordinates, so anything that consumes a position has to
 * cope with them being absent; a malformed or half pair is dropped entirely
 * rather than rebuilt into a Place.
 */

const LATITUDE_BOUND = 90;
const LONGITUDE_BOUND = 180;

/** Reads one coordinate from router params, or null when it is not usable. */
export function parseCoordinateParam(
  value: string | string[] | undefined,
  bound: keyof Omit<GeoPoint, 'address'>,
): number | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  const limit = bound === 'latitude' ? LATITUDE_BOUND : LONGITUDE_BOUND;

  return Math.abs(parsed) <= limit ? parsed : null;
}
