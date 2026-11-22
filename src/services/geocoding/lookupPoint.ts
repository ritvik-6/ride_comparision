import type { Coordinates, MapLocation } from '@/types';

/**
 * Turns a tapped point into a usable location.
 *
 * A reverse-geocoding request can fail in ways that must not hide the rider's
 * tap: the point itself is still known and still useful. This module always
 * returns a location for the tapped coordinate (either with the resolved
 * address, or labelled with its coordinates) and separates that from the
 * message explaining why no address was available, so the UI can show both the
 * pin and a clear warning instead of leaving the previous location on screen.
 *
 * It has no runtime imports so the behaviour can be unit-tested in Node.
 */

/** Shown when the provider had no readable place within its search radius. */
export const NO_ADDRESS_NEAR_POINT =
  'No address found near that point. Tap a road, building or landmark.';

/** Shown when the lookup itself failed (network, timeout, bad response). */
export const ADDRESS_LOOKUP_FAILED =
  "We couldn't reach the address lookup. Showing the exact point instead.";

/** Label used for a pin whose address is unknown. Never an invented address. */
export const DROPPED_PIN_LABEL = 'Dropped pin';

/** The part of the geocoding provider this module needs. */
export interface ReverseGeocoder {
  reverse(
    point: Coordinates,
    options?: { signal?: AbortSignal },
  ): Promise<MapLocation | null>;
}

export type PointLookup =
  | { status: 'resolved'; location: MapLocation }
  | { status: 'unaddressed'; location: MapLocation; message: string }
  | { status: 'cancelled' };

/** Formats a point for display: "17.42390, 78.47380". */
export function describePoint(point: Coordinates): string {
  return `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`;
}

/**
 * A location for a tapped point with no address yet.
 *
 * The address is the coordinate pair itself, which is true and useful, and the
 * label says it is a dropped pin — nothing here claims to be a street address.
 */
export function pendingLocation(point: Coordinates): MapLocation {
  return {
    latitude: point.latitude,
    longitude: point.longitude,
    displayName: DROPPED_PIN_LABEL,
    formattedAddress: describePoint(point),
    source: 'map',
  };
}

const isCancelledError = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  (error as { kind?: unknown }).kind === 'cancelled';

const messageFrom = (error: unknown): string => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return ADDRESS_LOOKUP_FAILED;
};

/**
 * Resolves one tapped point.
 *
 * Cancellation is reported separately so a superseded tap never overwrites the
 * result of a newer one.
 */
export async function lookupPoint(
  geocoder: ReverseGeocoder,
  point: Coordinates,
  signal?: AbortSignal,
): Promise<PointLookup> {
  try {
    const result = await geocoder.reverse(point, signal ? { signal } : {});

    if (signal?.aborted) {
      return { status: 'cancelled' };
    }

    if (!result) {
      return {
        status: 'unaddressed',
        location: pendingLocation(point),
        message: NO_ADDRESS_NEAR_POINT,
      };
    }

    return {
      status: 'resolved',
      location: { ...result, source: 'map' },
    };
  } catch (error) {
    if (isCancelledError(error) || signal?.aborted) {
      return { status: 'cancelled' };
    }

    // Keep the pin where the rider tapped, and say why it has no address.
    return {
      status: 'unaddressed',
      location: pendingLocation(point),
      message: messageFrom(error),
    };
  }
}
