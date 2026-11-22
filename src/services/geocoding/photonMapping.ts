import type { Coordinates, MapLocation } from '@/types';

/**
 * Photon request building and response parsing.
 *
 * Kept free of runtime imports (types only) so the mapping can be unit-tested
 * directly in Node without a bundler, in the same way as the provider link
 * builders.
 *
 * Photon returns GeoJSON whose `properties` follow the GeocodeJSON spec:
 * https://github.com/komoot/photon/blob/master/docs/api-v1.md
 */

export const PHOTON_DEFAULT_BASE_URL = 'https://photon.komoot.io';

/** Attribution shown next to the search results. */
export const PHOTON_ATTRIBUTION = 'Search by Photon · © OpenStreetMap';

/** Queries shorter than this are not sent; autocomplete needs some signal. */
export const PHOTON_MIN_QUERY_LENGTH = 3;

/** Suggestions requested per keystroke burst. */
export const PHOTON_RESULT_LIMIT = 6;

/** The server also caps this; asking for more is pointless. */
const PHOTON_MAX_LIMIT = 10;

/** Photon accepts one preferred language per request. */
const PHOTON_LANGUAGE = 'en';

/** How far from the tapped point a reverse result may come from, in km. */
const PHOTON_REVERSE_RADIUS_KM = 1;

const LATITUDE_LIMIT = 90;
const LONGITUDE_LIMIT = 180;

const trimBaseUrl = (baseUrl: string): string => baseUrl.replace(/\/+$/, '');

const readString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const readNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

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

/**
 * Builds an autocomplete URL.
 *
 * A bias point makes nearby matches win over famous far-away ones, which is
 * what a rider looking at a Hyderabad map expects from "airport".
 */
export function buildPhotonSearchUrl(
  baseUrl: string,
  query: string,
  options: { bias?: Coordinates | null; limit?: number } = {},
): string {
  const limit = Math.min(
    Math.max(1, Math.trunc(options.limit ?? PHOTON_RESULT_LIMIT)),
    PHOTON_MAX_LIMIT,
  );

  const params = new URLSearchParams({
    q: query.trim(),
    limit: String(limit),
    lang: PHOTON_LANGUAGE,
  });

  const bias = options.bias;

  if (bias) {
    params.set('lat', String(bias.latitude));
    params.set('lon', String(bias.longitude));
    // Roughly city zoom, so the bias is a nudge rather than a hard filter.
    params.set('zoom', '13');
  }

  return `${trimBaseUrl(baseUrl)}/api?${params.toString()}`;
}

/** Builds a reverse geocoding URL for one point. */
export function buildPhotonReverseUrl(
  baseUrl: string,
  point: Coordinates,
): string {
  const params = new URLSearchParams({
    lat: String(point.latitude),
    lon: String(point.longitude),
    limit: '1',
    radius: String(PHOTON_REVERSE_RADIUS_KM),
    lang: PHOTON_LANGUAGE,
  });

  return `${trimBaseUrl(baseUrl)}/reverse?${params.toString()}`;
}

interface GeoJsonPointGeometry {
  type: string;
  coordinates: unknown;
}

const readPoint = (geometry: unknown): Coordinates | null => {
  if (typeof geometry !== 'object' || geometry === null) {
    return null;
  }

  const { type, coordinates } = geometry as Partial<GeoJsonPointGeometry>;

  if (type !== 'Point' || !Array.isArray(coordinates) || coordinates.length < 2) {
    return null;
  }

  const longitude = readNumber(coordinates[0]);
  const latitude = readNumber(coordinates[1]);

  // A half or out-of-range pair is dropped rather than shown as a place.
  if (longitude === null || latitude === null) {
    return null;
  }

  if (
    Math.abs(latitude) > LATITUDE_LIMIT ||
    Math.abs(longitude) > LONGITUDE_LIMIT
  ) {
    return null;
  }

  return { latitude, longitude };
};

interface PhotonProperties {
  name: string | null;
  street: string | null;
  housenumber: string | null;
  locality: string | null;
  district: string | null;
  city: string | null;
  county: string | null;
  state: string | null;
  postcode: string | null;
  country: string | null;
  osmId: string | null;
  osmType: string | null;
}

const readProperties = (properties: unknown): PhotonProperties => {
  const source =
    typeof properties === 'object' && properties !== null
      ? (properties as Record<string, unknown>)
      : {};

  const osmId = readNumber(source.osm_id);

  return {
    name: readString(source.name),
    street: readString(source.street),
    housenumber: readString(source.housenumber),
    locality: readString(source.locality),
    district: readString(source.district),
    city: readString(source.city),
    county: readString(source.county),
    state: readString(source.state),
    postcode: readString(source.postcode),
    country: readString(source.country),
    osmId: osmId === null ? null : String(osmId),
    osmType: readString(source.osm_type),
  };
};

/** Converts one Photon GeoJSON feature into a map location. */
export function parsePhotonFeature(feature: unknown): MapLocation | null {
  if (typeof feature !== 'object' || feature === null) {
    return null;
  }

  const { geometry, properties } = feature as {
    geometry?: unknown;
    properties?: unknown;
  };

  const point = readPoint(geometry);

  if (!point) {
    return null;
  }

  const fields = readProperties(properties);
  // "3 Olympischer Platz" reads as one address line, so no comma here.
  const streetLine =
    fields.housenumber && fields.street
      ? `${fields.housenumber} ${fields.street}`
      : (fields.housenumber ?? fields.street);
  const area = fields.locality ?? fields.district ?? fields.county;

  const formattedAddress =
    joinParts([
      streetLine,
      area,
      fields.city,
      fields.state,
      fields.postcode,
      fields.country,
    ]) || fields.name;

  const displayName =
    fields.name ?? streetLine ?? fields.city ?? fields.state ?? null;

  // A point with no name and no address parts is unusable: we never invent one.
  if (!formattedAddress || !displayName) {
    return null;
  }

  const placeId =
    fields.osmId && fields.osmType
      ? `photon:${fields.osmType}:${fields.osmId}`
      : undefined;

  return {
    latitude: point.latitude,
    longitude: point.longitude,
    displayName,
    formattedAddress,
    ...(placeId ? { placeId } : {}),
    source: 'search',
  };
}

/**
 * Parses a Photon GeoJSON collection.
 * Returns null when the payload is not a feature collection at all, so the
 * caller can distinguish "nothing matched" from "we could not read this".
 */
export function parsePhotonResponse(payload: unknown): MapLocation[] | null {
  if (typeof payload !== 'object' || payload === null) {
    return null;
  }

  const { features } = payload as { features?: unknown };

  if (!Array.isArray(features)) {
    return null;
  }

  const seen = new Set<string>();
  const locations: MapLocation[] = [];

  for (const feature of features) {
    const location = parsePhotonFeature(feature);

    if (!location) {
      continue;
    }

    // Photon can return the same OSM object twice for split ways.
    const key =
      location.placeId ??
      `${location.latitude.toFixed(5)},${location.longitude.toFixed(5)}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    locations.push(location);
  }

  return locations;
}
