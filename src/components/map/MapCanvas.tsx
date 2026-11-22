import {
  Camera,
  Map,
  Marker,
  type CameraRef,
  type PressEvent,
  type PressEventWithFeatures,
} from '@maplibre/maplibre-react-native';
import type { LineString } from 'geojson';
import { useMemo, type Ref } from 'react';
import { StyleSheet, type NativeSyntheticEvent } from 'react-native';

import {
  HYDERABAD_CENTER,
  HYDERABAD_CITY_ZOOM,
  MAP_COMPASS_TOP_OFFSET,
  MAP_MAX_ZOOM,
  MAP_MIN_ZOOM,
  MAP_STYLE_URL,
} from '@/constants/map';
import { spacing } from '@/theme';
import type { Coordinates, LocationField, MapLocation } from '@/types';
import { readPressCoordinates } from '@/utils/mapPress';
import {
  DestinationMarker,
  PendingMarker,
  PickupMarker,
} from './MapMarkers';
import { RoutePolyline } from './RoutePolyline';

export interface MapCanvasProps {
  /** The style finished loading and the map can be shown. */
  onReady: () => void;
  /** The style could not be loaded; the screen shows a recoverable error. */
  onError: () => void;
  /** A tap anywhere on the map, in real coordinates. */
  onPressLocation: (point: Coordinates) => void;
  /** A tap on an existing marker, so that location can be replaced. */
  onPressMarker: (field: LocationField) => void;
  /** The settled camera centre, used to bias place search near the view. */
  onRegionChange: (centre: Coordinates) => void;
  pickup: MapLocation | null;
  destination: MapLocation | null;
  /** Tapped point whose address is still being resolved. */
  pendingPoint: Coordinates | null;
  /** Road geometry of the calculated route, drawn beneath the markers. */
  routeGeometry: LineString | null;
  /** The field a tap or search will fill; its marker is highlighted. */
  activeField: LocationField;
  /** Lets the screen move the camera to a searched place. */
  cameraRef: Ref<CameraRef>;
  /** Top safe-area inset, so ornaments clear the status bar. */
  topInset: number;
  /** Distance from the bottom edge to clear the floating panel. */
  bottomInset: number;
}

/**
 * Native MapLibre canvas.
 *
 * `androidView="texture"` is deliberate. MapLibre's default Android
 * `GLSurfaceView` can draw over ordinary React Native views, which would hide
 * the floating header and panels; the TextureView variant composites with the
 * rest of the view hierarchy.
 */
export function MapCanvas({
  onReady,
  onError,
  onPressLocation,
  onPressMarker,
  onRegionChange,
  pickup,
  destination,
  pendingPoint,
  routeGeometry,
  activeField,
  cameraRef,
  topInset,
  bottomInset,
}: MapCanvasProps) {
  // Keeps native ornaments clear of the header and the bottom panel.
  const ornamentBottom = bottomInset + spacing.md;
  // Below the floating header card, which ends around topInset + 76.
  const compassTop = topInset + MAP_COMPASS_TOP_OFFSET;

  const initialViewState = useMemo(
    () => ({
      center: HYDERABAD_CENTER,
      zoom: HYDERABAD_CITY_ZOOM,
    }),
    [],
  );

  // While a tapped point is resolving, only the pending pin is drawn for that
  // end of the route, so the marker never looks like it ignored the tap.
  const replacing = pendingPoint !== null;
  const showPickup = pickup !== null && !(replacing && activeField === 'pickup');
  const showDestination =
    destination !== null && !(replacing && activeField === 'destination');

  const handlePress = (
    event: NativeSyntheticEvent<PressEvent | PressEventWithFeatures>,
  ) => {
    // Validated in one place: MapLibre reports [longitude, latitude], and an
    // unexpected payload must not throw inside the native event handler.
    const coordinates = readPressCoordinates(event.nativeEvent);

    if (!coordinates) {
      if (__DEV__) {
        console.warn('[map] unrecognised press payload', event.nativeEvent);
      }

      return;
    }

    onPressLocation(coordinates);
  };

  return (
    <Map
      style={styles.map}
      mapStyle={MAP_STYLE_URL}
      androidView="texture"
      attribution
      attributionPosition={{ bottom: ornamentBottom, right: spacing.md }}
      logo
      logoPosition={{ bottom: ornamentBottom, left: spacing.md }}
      compass
      // The header sits over the default top-right slot.
      compassPosition={{ top: compassTop, right: spacing.md }}
      onPress={handlePress}
      onRegionDidChange={(event) => {
        // Same `[longitude, latitude]` shape as a press, validated the same way.
        const centre = readPressCoordinates({
          lngLat: event.nativeEvent.center,
        });

        if (centre) {
          onRegionChange(centre);
        }
      }}
      onDidFinishLoadingStyle={onReady}
      onDidFinishLoadingMap={onReady}
      onDidFailLoadingMap={onError}
    >
      <Camera
        ref={cameraRef}
        initialViewState={initialViewState}
        minZoom={MAP_MIN_ZOOM}
        maxZoom={MAP_MAX_ZOOM}
      />

      {routeGeometry ? <RoutePolyline geometry={routeGeometry} /> : null}

      {showPickup && pickup ? (
        <Marker
          id="pickup"
          lngLat={[pickup.longitude, pickup.latitude]}
          anchor="center"
          onPress={() => onPressMarker('pickup')}
        >
          <PickupMarker selected={activeField === 'pickup'} />
        </Marker>
      ) : null}

      {pendingPoint ? (
        <Marker
          id="pending"
          lngLat={[pendingPoint.longitude, pendingPoint.latitude]}
          anchor="center"
        >
          <PendingMarker />
        </Marker>
      ) : null}

      {showDestination && destination ? (
        <Marker
          id="destination"
          lngLat={[destination.longitude, destination.latitude]}
          anchor="center"
          // Nudged up so a shared coordinate still shows both markers.
          offset={[0, -14]}
          onPress={() => onPressMarker('destination')}
        >
          <DestinationMarker selected={activeField === 'destination'} />
        </Marker>
      ) : null}
    </Map>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
});
