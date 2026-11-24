import type { LocationSource, MapLocation } from '@/types';

/**
 * Recently selected locations: list rules, de-duplication and safe parsing.
 *
 * Kept free of runtime imports (types only) so the whole module can be tested in
 * Node without a bundler or a storage mock, in the same way as the provider link
 * builders and the geocoding mapping.
 *
 * A recent is a `MapLocation` — the same model the map, the geocoder and the
 * comparison flow use — so nothing here invents a second location shape.
 */

/** How many recents are kept and shown. */
export const MAX_RECENT_LOCATIONS = 5;

/** Bumped only if the stored shape changes incompatibly. */
export const RECENT_SEARCHES_VERSION = 1;

/** One stored location. Order in the list is recency order, newest first. */
export type RecentLocation = MapLocation;

const LATITUDE_LIMIT = 90;
const LONGITUDE_LIMIT = 180;

/** Precision used for the coordinate fallback key: about 1 m. */
const COORDINATE_PRECISION = 5;

const SOURCES: readonly LocationSource[] = ['gps', 'map', 'search'];

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readNonEmpty = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const readNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const normalizeText = (value: string): string =>
  value.toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * De-duplication key.
 *
 * The provider's place id is authoritative when present, so the same OSM place
 * reached by search and by a map tap collapses into one entry. Otherwise the
 * point at ~1 m precision plus the normalized address is the identity, which is
 * as specific as the data allows without inventing an id.
 */
export function recentLocationKey(location: RecentLocation): string {
  const placeId = readNonEmpty(location.placeId);

  if (placeId) {
    return `place:${placeId}`;
  }

  return `point:${location.latitude.toFixed(COORDINATE_PRECISION)},${location.longitude.toFixed(COORDINATE_PRECISION)}|${normalizeText(location.formattedAddress)}`;
}

/** True only for a location that is safe to store and to show. */
export function isStorableRecentLocation(
  location: MapLocation | null | undefined,
): location is RecentLocation {
  if (!location) {
    return false;
  }

  return (
    readNumber(location.latitude) !== null &&
    readNumber(location.longitude) !== null &&
    Math.abs(location.latitude) <= LATITUDE_LIMIT &&
    Math.abs(location.longitude) <= LONGITUDE_LIMIT &&
    readNonEmpty(location.displayName) !== null &&
    readNonEmpty(location.formattedAddress) !== null
  );
}

/**
 * Puts a location at the top of the list, removing any earlier copy.
 *
 * Returns the input array unchanged for a location that cannot be stored, so
 * callers can use reference equality to skip a pointless write.
 */
export function addRecentLocation(
  locations: readonly RecentLocation[],
  location: MapLocation,
  limit: number = MAX_RECENT_LOCATIONS,
): readonly RecentLocation[] {
  if (!isStorableRecentLocation(location)) {
    return locations;
  }

  const placeId = readNonEmpty(location.placeId);

  const clean: RecentLocation = {
    latitude: location.latitude,
    longitude: location.longitude,
    displayName: location.displayName.trim(),
    formattedAddress: location.formattedAddress.trim(),
    ...(placeId ? { placeId } : {}),
    source: location.source,
  };

  const key = recentLocationKey(clean);
  const rest = locations.filter((entry) => recentLocationKey(entry) !== key);

  return [clean, ...rest].slice(0, Math.max(0, limit));
}

/**
 * Appends older entries below newer ones without creating duplicates.
 *
 * Used after hydration: anything selected while storage was still loading is
 * newer than what was on disk, so it must keep its place at the top.
 */
export function mergeRecentLocations(
  newest: readonly RecentLocation[],
  older: readonly RecentLocation[],
  limit: number = MAX_RECENT_LOCATIONS,
): readonly RecentLocation[] {
  const seen = new Set(newest.map(recentLocationKey));
  const merged = [...newest];

  for (const entry of older) {
    if (!isStorableRecentLocation(entry)) {
      continue;
    }

    const key = recentLocationKey(entry);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    merged.push(entry);
  }

  return merged.slice(0, Math.max(0, limit));
}

/** Reads one stored entry, dropping anything that is not a usable location. */
export function readStoredRecentLocation(value: unknown): RecentLocation | null {
  if (!isRecord(value)) {
    return null;
  }

  const latitude = readNumber(value.latitude);
  const longitude = readNumber(value.longitude);
  const displayName = readNonEmpty(value.displayName);
  const formattedAddress = readNonEmpty(value.formattedAddress);

  if (
    latitude === null ||
    longitude === null ||
    Math.abs(latitude) > LATITUDE_LIMIT ||
    Math.abs(longitude) > LONGITUDE_LIMIT ||
    !displayName ||
    !formattedAddress
  ) {
    return null;
  }

  const placeId = readNonEmpty(value.placeId);
  const source =
    typeof value.source === 'string' &&
    (SOURCES as readonly string[]).includes(value.source)
      ? (value.source as LocationSource)
      : 'search';

  return {
    latitude,
    longitude,
    displayName,
    formattedAddress,
    ...(placeId ? { placeId } : {}),
    source,
  };
}

/**
 * Parses the stored payload.
 *
 * Corrupted JSON, an unexpected shape or a single bad entry never throws: bad
 * entries are dropped and the rest are kept, so a partial write cannot brick the
 * section. A bare array is accepted as well, which keeps an older payload
 * readable.
 */
export function parseRecentLocations(
  raw: string | null | undefined,
): RecentLocation[] {
  if (!raw) {
    return [];
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  const candidates = Array.isArray(parsed)
    ? parsed
    : isRecord(parsed) && Array.isArray(parsed.locations)
      ? parsed.locations
      : null;

  if (!candidates) {
    return [];
  }

  // Stored newest first; `addRecentLocation` prepends, so walk backwards to
  // preserve the saved order.
  let result: readonly RecentLocation[] = [];

  for (const candidate of [...candidates].reverse()) {
    const location = readStoredRecentLocation(candidate);

    if (location) {
      result = addRecentLocation(result, location);
    }
  }

  return [...result];
}

/** Payload written to storage. */
export function serializeRecentLocations(
  locations: readonly RecentLocation[],
): string {
  return JSON.stringify({
    version: RECENT_SEARCHES_VERSION,
    locations: locations.slice(0, MAX_RECENT_LOCATIONS),
  });
}
