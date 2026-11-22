import { GeoJSONSource, Layer } from '@maplibre/maplibre-react-native';
import type { Feature, LineString } from 'geojson';
import { useMemo } from 'react';

import { colors } from '@/theme';

export interface RoutePolylineProps {
  geometry: LineString;
}

/**
 * The calculated driving route, drawn under the pickup and destination markers.
 *
 * A white casing under the accent line keeps the route legible over both the
 * pale land colours and the darker road fills of the Liberty style, which is
 * cheaper than a blur and reads well at any zoom.
 *
 * The source is a single GeoJSON LineString: the geometry comes straight from the
 * routing service in `[longitude, latitude]` order, so it is passed through
 * untouched and never re-projected here.
 */
export function RoutePolyline({ geometry }: RoutePolylineProps) {
  // Wrapped in a Feature because a bare geometry is not accepted by every
  // MapLibre Native build; a Feature is understood everywhere.
  const data = useMemo<Feature<LineString>>(
    () => ({ type: 'Feature', properties: {}, geometry }),
    [geometry],
  );

  return (
    <GeoJSONSource id="route-line" data={data}>
      <Layer
        id="route-line-casing"
        type="line"
        layout={{ 'line-cap': 'round', 'line-join': 'round' }}
        paint={{
          'line-color': colors.textInverse,
          'line-width': 10,
          'line-opacity': 0.9,
        }}
      />
      <Layer
        id="route-line"
        type="line"
        layout={{ 'line-cap': 'round', 'line-join': 'round' }}
        paint={{ 'line-color': colors.accent, 'line-width': 5 }}
      />
    </GeoJSONSource>
  );
}
