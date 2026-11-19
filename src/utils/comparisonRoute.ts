import type { Place } from '@/types';
import { parseCoordinateParam } from '@/utils/coordinates';

/**
 * Search params carried from the home screen to the comparison route.
 * The index signature matches Expo Router's param type, which accepts plain
 * string maps only.
 *
 * Coordinates are optional: mock places have none, while places resolved from
 * the device do. They are carried so provider hand-off links can use the real
 * position when it exists.
 */
export interface ComparisonParams extends Record<string, string | undefined> {
  pickupId: string;
  pickupName: string;
  pickupAddress: string;
  pickupLatitude?: string;
  pickupLongitude?: string;
  destinationId: string;
  destinationName: string;
  destinationAddress: string;
  destinationLatitude?: string;
  destinationLongitude?: string;
}

export interface ComparisonRoute {
  pickup: Place;
  destination: Place;
}

/**
 * Flattens both places into router params.
 *
 * Expo Router params are strings, so the full Place objects cannot be passed
 * directly; the id, name and address are enough to rebuild them. Nothing here
 * is trusted on the way back in — the comparison screen validates it.
 */
export function toComparisonParams(
  pickup: Place,
  destination: Place,
): ComparisonParams {
  const params: ComparisonParams = {
    pickupId: pickup.id,
    pickupName: pickup.name,
    pickupAddress: pickup.address,
    destinationId: destination.id,
    destinationName: destination.name,
    destinationAddress: destination.address,
  };

  if (pickup.coordinates) {
    params.pickupLatitude = String(pickup.coordinates.latitude);
    params.pickupLongitude = String(pickup.coordinates.longitude);
  }

  if (destination.coordinates) {
    params.destinationLatitude = String(destination.coordinates.latitude);
    params.destinationLongitude = String(destination.coordinates.longitude);
  }

  return params;
}

const readParam = (
  params: Record<string, string | string[] | undefined>,
  key: string,
): string | null => {
  const value = params[key];

  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const readPlace = (
  params: Record<string, string | string[] | undefined>,
  prefix: 'pickup' | 'destination',
): Place | null => {
  const id = readParam(params, `${prefix}Id`);
  const name = readParam(params, `${prefix}Name`);
  const address = readParam(params, `${prefix}Address`);

  if (!id || !name || !address) {
    return null;
  }

  const place: Place = { id, name, address };

  // A half or out-of-range pair is dropped rather than passed to a provider.
  const latitude = parseCoordinateParam(
    params[`${prefix}Latitude`],
    'latitude',
  );
  const longitude = parseCoordinateParam(
    params[`${prefix}Longitude`],
    'longitude',
  );

  if (latitude !== null && longitude !== null) {
    place.coordinates = { latitude, longitude };
  }

  return place;
};

/**
 * Rebuilds the route from router params.
 * Returns null when any part is missing or empty, so the screen can show a
 * recoverable "route missing" state instead of rendering half a trip.
 */
export function parseComparisonParams(
  params: Record<string, string | string[] | undefined>,
): ComparisonRoute | null {
  const pickup = readPlace(params, 'pickup');
  const destination = readPlace(params, 'destination');

  if (!pickup || !destination) {
    return null;
  }

  return { pickup, destination };
}
