import type { Coordinates } from '@/types';

/**
 * Reads a coordinate pair out of a MapLibre press event payload.
 *
 * MapLibre's Android and iOS implementations both dispatch
 * `nativeEvent.lngLat` as a `[longitude, latitude]` tuple (see
 * `NativePressEvent` in the package and `GeoJSONUtils.fromLatLng` in its
 * Android source), which is also what the published `PressEvent` type says.
 *
 * The payload is still validated and normalised here rather than destructured
 * inline: a single bad destructure would throw inside the native event handler
 * and silently kill the whole tap flow, so unknown shapes return null and its
 * callers can report the problem instead.
 */

const LATITUDE_LIMIT = 90;
const LONGITUDE_LIMIT = 180;

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null;

const readNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

/** Accepts both `[lng, lat]` arrays and `{ 0: lng, 1: lat }` objects. */
const readPair = (value: unknown): [number, number] | null => {
  if (Array.isArray(value)) {
    const longitude = readNumber(value[0]);
    const latitude = readNumber(value[1]);

    return longitude === null || latitude === null
      ? null
      : [longitude, latitude];
  }

  if (isRecord(value)) {
    const longitude = readNumber(value[0]);
    const latitude = readNumber(value[1]);

    return longitude === null || latitude === null
      ? null
      : [longitude, latitude];
  }

  return null;
};

const toCoordinates = (
  longitude: number,
  latitude: number,
): Coordinates | null => {
  if (
    Math.abs(latitude) > LATITUDE_LIMIT ||
    Math.abs(longitude) > LONGITUDE_LIMIT
  ) {
    return null;
  }

  return { latitude, longitude };
};

/**
 * Returns the tapped position, or null when the payload is not a usable
 * coordinate. Longitude always comes first in MapLibre payloads.
 */
export function readPressCoordinates(payload: unknown): Coordinates | null {
  if (!isRecord(payload)) {
    return null;
  }

  // The documented shape: nativeEvent.lngLat = [longitude, latitude].
  const pair =
    readPair(payload.lngLat) ?? readPair(payload.coordinates);

  if (pair) {
    return toCoordinates(pair[0], pair[1]);
  }

  // Defensive fallbacks for a flat object payload.
  const longitude = readNumber(payload.longitude) ?? readNumber(payload.lng);
  const latitude = readNumber(payload.latitude) ?? readNumber(payload.lat);

  if (longitude === null || latitude === null) {
    return null;
  }

  return toCoordinates(longitude, latitude);
}

/** True when two positions are the same point at display precision. */
export function isSamePoint(
  a: Coordinates | null | undefined,
  b: Coordinates | null | undefined,
): boolean {
  if (!a || !b) {
    return a === b;
  }

  return (
    Math.abs(a.latitude - b.latitude) < 1e-5 &&
    Math.abs(a.longitude - b.longitude) < 1e-5
  );
}
