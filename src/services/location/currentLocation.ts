import * as Location from 'expo-location';
import { Linking } from 'react-native';

import type { Place } from '@/types';

/** Time allowed for a GPS fix before we stop waiting. */
const POSITION_TIMEOUT_MS = 15_000;
/** Reverse geocoding is on-device but can still stall on some builds. */
const GEOCODE_TIMEOUT_MS = 8_000;

export type CurrentLocationErrorCode =
  | 'services-disabled'
  | 'permission-denied'
  | 'permission-blocked'
  | 'timeout'
  | 'unavailable'
  | 'geocode-failed';

export const LOCATION_MESSAGES = {
  servicesDisabled:
    'Location is turned off. Turn on GPS in your device settings, then try again.',
  permissionDenied:
    'Location permission is needed to fill your pickup point. You can also search for it manually.',
  permissionBlocked:
    'Location permission is blocked. Turn it on in Android settings to use your current location.',
  timeout:
    "We couldn't get a location fix in time. Move somewhere with a clearer signal and try again.",
  unavailable:
    "We couldn't determine your location. Try again, or search for your pickup manually.",
  geocodeFailed:
    "We found your position but couldn't turn it into an address. Search for your pickup manually.",
} as const;

/** A location failure with a message that is safe to show to the user. */
export class CurrentLocationError extends Error {
  readonly code: CurrentLocationErrorCode;
  /** True when the only fix is enabling the permission in system settings. */
  readonly canOpenSettings: boolean;

  constructor(code: CurrentLocationErrorCode, message: string) {
    super(message);
    this.name = 'CurrentLocationError';
    this.code = code;
    this.canOpenSettings = code === 'permission-blocked';
  }
}

class TimeoutError extends Error {}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError('timeout')), ms);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

const clean = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
};

/** Joins address parts, dropping empties and case-insensitive duplicates. */
const joinParts = (parts: readonly (string | null)[]): string => {
  const seen = new Set<string>();

  return parts
    .filter((part): part is string => {
      if (part === null) {
        return false;
      }

      const key = part.toLowerCase();
      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .join(', ');
};

/** Derives a readable label and full address, or null when nothing usable came back. */
function buildAddress(
  geocoded: Location.LocationGeocodedAddress,
): { name: string; address: string } | null {
  const streetLine =
    joinParts([clean(geocoded.streetNumber), clean(geocoded.street)]) || null;

  // formattedAddress is Android-only, so iOS falls back to composing the parts.
  const formatted = clean(geocoded.formattedAddress);

  const short = joinParts([
    streetLine,
    clean(geocoded.name),
    clean(geocoded.district) ?? clean(geocoded.subregion) ?? clean(geocoded.city),
  ]);

  const full =
    formatted ??
    joinParts([
      short,
      clean(geocoded.city),
      clean(geocoded.region),
      clean(geocoded.postalCode),
      clean(geocoded.country),
    ]);

  if (short.length === 0 && full.length === 0) {
    return null;
  }

  return {
    name: short.length > 0 ? short : full,
    address: full.length > 0 ? full : short,
  };
}

/**
 * Turns a GPS fix into a Place.
 *
 * Throws `geocode-failed` when no readable address comes back, because a
 * coordinate with no address must never be presented as a resolved pickup.
 */
async function placeFromPosition(
  position: Location.LocationObject,
): Promise<Place> {
  const { latitude, longitude } = position.coords;

  let results: Location.LocationGeocodedAddress[];

  try {
    results = await withTimeout(
      Location.reverseGeocodeAsync({ latitude, longitude }),
      GEOCODE_TIMEOUT_MS,
    );
  } catch {
    throw new CurrentLocationError('geocode-failed', LOCATION_MESSAGES.geocodeFailed);
  }

  const first = results[0];
  const built = first ? buildAddress(first) : null;

  if (!built) {
    throw new CurrentLocationError('geocode-failed', LOCATION_MESSAGES.geocodeFailed);
  }

  return {
    id: `current-${latitude.toFixed(5)},${longitude.toFixed(5)}`,
    name: built.name,
    address: built.address,
    coordinates: { latitude, longitude },
  };
}

/**
 * Resolves the device position into a searchable Place.
 *
 * Permission is requested here, which only happens because the caller is
 * responding to a user tap. Coordinates are kept on the Place so later stages
 * do not need to geocode again.
 */
export async function resolveCurrentPlace(): Promise<Place> {
  let servicesEnabled: boolean;

  try {
    servicesEnabled = await Location.hasServicesEnabledAsync();
  } catch {
    throw new CurrentLocationError('unavailable', LOCATION_MESSAGES.unavailable);
  }

  if (!servicesEnabled) {
    throw new CurrentLocationError(
      'services-disabled',
      LOCATION_MESSAGES.servicesDisabled,
    );
  }

  let permission: Location.LocationPermissionResponse;

  try {
    permission = await Location.requestForegroundPermissionsAsync();
  } catch {
    throw new CurrentLocationError('unavailable', LOCATION_MESSAGES.unavailable);
  }

  if (permission.status !== 'granted') {
    throw permission.canAskAgain
      ? new CurrentLocationError('permission-denied', LOCATION_MESSAGES.permissionDenied)
      : new CurrentLocationError('permission-blocked', LOCATION_MESSAGES.permissionBlocked);
  }

  let position: Location.LocationObject;

  try {
    position = await withTimeout(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      POSITION_TIMEOUT_MS,
    );
  } catch (error) {
    throw error instanceof TimeoutError
      ? new CurrentLocationError('timeout', LOCATION_MESSAGES.timeout)
      : new CurrentLocationError('unavailable', LOCATION_MESSAGES.unavailable);
  }

  return placeFromPosition(position);
}

/**
 * Reads the device position without ever prompting for permission.
 *
 * The map screen calls this on mount so a rider who already granted location
 * gets their pickup filled in automatically. When permission was never granted,
 * GPS is off, or no address resolves, it quietly returns null and the rider
 * picks a point themselves: no dialog, no invented address.
 */
export async function readGrantedCurrentPlace(): Promise<Place | null> {
  try {
    const permission = await Location.getForegroundPermissionsAsync();

    if (permission.status !== 'granted') {
      return null;
    }

    if (!(await Location.hasServicesEnabledAsync())) {
      return null;
    }

    const position = await withTimeout(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      POSITION_TIMEOUT_MS,
    );

    return await placeFromPosition(position);
  } catch {
    // Best effort only: the manual flows surface real errors.
    return null;
  }
}

/** Opens this app's system settings page, where a blocked permission can be enabled. */
export async function openAppSettings(): Promise<void> {
  try {
    await Linking.openSettings();
  } catch {
    // Nothing else can be done programmatically; the user can open settings manually.
  }
}
