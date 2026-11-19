import type { Place } from '@/types';

/**
 * Search params carried from the home screen to the comparison route.
 * The index signature matches Expo Router's param type, which accepts plain
 * string maps only.
 */
export interface ComparisonParams extends Record<string, string> {
  pickupId: string;
  pickupName: string;
  pickupAddress: string;
  destinationId: string;
  destinationName: string;
  destinationAddress: string;
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
  return {
    pickupId: pickup.id,
    pickupName: pickup.name,
    pickupAddress: pickup.address,
    destinationId: destination.id,
    destinationName: destination.name,
    destinationAddress: destination.address,
  };
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

  return { id, name, address };
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
