/** Where a resolved location came from. */
export type LocationSource = 'gps' | 'map' | 'search';

/** A WGS84 coordinate pair. */
export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * One resolved location used by map-first ride planning.
 *
 * Every field is real: coordinates come from the device, a map tap or a
 * geocoder, and the addresses are whatever the provider returned. Nothing in
 * this model is derived from the mock Hyderabad dataset.
 */
export interface MapLocation extends Coordinates {
  /** Short label for the location, e.g. "HITEC City" or "Dropped pin". */
  displayName: string;
  /** Full readable address, e.g. "HITEC City, Madhapur, Hyderabad, Telangana". */
  formattedAddress: string;
  /** Provider place identifier when the source exposes one (e.g. OSM node id). */
  placeId?: string;
  source: LocationSource;
}
