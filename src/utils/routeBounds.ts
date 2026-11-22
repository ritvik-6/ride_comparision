import type { LineString } from 'geojson';

/** `[west, south, east, north]`, the order MapLibre's `fitBounds` expects. */
export type Bounds = [number, number, number, number];

/**
 * Bounding box of a route geometry.
 *
 * Returns `null` for an empty or unusable geometry so the caller can skip the
 * camera move instead of fitting the map to `[0, 0]`. A route that spans a single
 * point gets a small box, which still centres the camera on it.
 */
export function boundsOfLineString(geometry: LineString): Bounds | null {
  const positions = geometry.coordinates;

  if (!Array.isArray(positions) || positions.length === 0) {
    return null;
  }

  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;

  for (const position of positions) {
    const longitude = position?.[0];
    const latitude = position?.[1];

    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
      return null;
    }

    west = Math.min(west, longitude);
    east = Math.max(east, longitude);
    south = Math.min(south, latitude);
    north = Math.max(north, latitude);
  }

  // A degenerate box (one point, or a perfectly straight vertical route) cannot
  // be fitted by MapLibre; a tiny margin makes it a valid box.
  const margin = 1e-4;

  return [
    west - margin,
    south - margin,
    east + margin,
    north + margin,
  ];
}
