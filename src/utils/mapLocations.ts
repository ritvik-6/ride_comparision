import type {
  Coordinates,
  LocationSource,
  MapLocation,
  Place,
} from '@/types';

/**
 * Bridges the map location model and the existing `Place` shape.
 *
 * The comparison screen, provider links and the backend contract all speak
 * `Place`, so map selections are converted on the way out instead of changing
 * those contracts. Coordinates are always real here: a location that has no
 * usable position never becomes a `MapLocation`, so nothing downstream needs to
 * invent one.
 */

const LATITUDE_LIMIT = 90;
const LONGITUDE_LIMIT = 180;

/** Fixed precision used for generated ids, so equal points compare equal. */
const COORDINATE_PRECISION = 5;

const NUMBER_FORMATTER = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: COORDINATE_PRECISION,
  maximumFractionDigits: COORDINATE_PRECISION,
});

/** True only for a complete, finite, in-range coordinate pair. */
export function isValidCoordinates(
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

/** Stable key for a coordinate, used for ids and de-duplication. */
export function coordinateKey(point: Coordinates): string {
  return `${point.latitude.toFixed(COORDINATE_PRECISION)},${point.longitude.toFixed(COORDINATE_PRECISION)}`;
}

/** Human-readable fallback label for a point with no address: "17.42390, 78.47380". */
export function describeCoordinates(point: Coordinates): string {
  return `${NUMBER_FORMATTER.format(point.latitude)}, ${NUMBER_FORMATTER.format(point.longitude)}`;
}

/** Id used when a location has no provider identifier of its own. */
function fallbackPlaceId(location: MapLocation): string {
  return `pin:${coordinateKey(location)}`;
}

/**
 * Converts a map location into the `Place` shape used by the comparison flow.
 *
 * The id is the provider place id when there is one, so reverse-geocoded and
 * searched places keep a stable identity across screens, and the same demo fare
 * is returned for the same place.
 */
export function toPlace(location: MapLocation): Place {
  return {
    id: location.placeId ?? fallbackPlaceId(location),
    name: location.displayName,
    address: location.formattedAddress,
    coordinates: {
      latitude: location.latitude,
      longitude: location.longitude,
    },
  };
}

/**
 * Converts a legacy `Place` that carries coordinates into a map location.
 * Returns null for the coordinate-less mock places, because a map pin cannot be
 * placed at a fabricated position.
 */
export function fromPlace(
  place: Place,
  source: LocationSource,
): MapLocation | null {
  const point = place.coordinates;

  if (!point || !isValidCoordinates(point)) {
    return null;
  }

  return {
    latitude: point.latitude,
    longitude: point.longitude,
    displayName: place.name,
    formattedAddress: place.address,
    placeId: place.id,
    source,
  };
}
