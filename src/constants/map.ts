/**
 * Map configuration shared by the map screen and its components.
 *
 * The style is a public OpenFreeMap vector style built from OpenStreetMap data,
 * so no API key or provider account is involved.
 */
export const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

/** Hyderabad city centre as [longitude, latitude], the map's initial camera. */
export const HYDERABAD_CENTER: [number, number] = [78.4867, 17.385];

/** City-level zoom: the whole urban area is visible without GPS. */
export const HYDERABAD_CITY_ZOOM = 10.5;

/**
 * Vertical offset of the native compass below the top safe-area inset. The
 * floating header card ends around 76dp, so the compass starts under it.
 */
export const MAP_COMPASS_TOP_OFFSET = 96;

/** Zoom the camera settles at after a location is chosen. */
export const MAP_SELECTED_ZOOM = 15.5;

/** Zoom limits that keep users inside usable OpenStreetMap detail levels. */
export const MAP_MIN_ZOOM = 3;
export const MAP_MAX_ZOOM = 18;

/** Attribution required by OpenStreetMap and OpenFreeMap. */
export const MAP_ATTRIBUTION =
  '© OpenStreetMap contributors · Tiles by OpenFreeMap';
