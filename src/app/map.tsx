import type { CameraRef } from '@maplibre/maplibre-react-native';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  MapCanvas,
  MapHeader,
  MapNotice,
  MapSearchPanel,
  MapStatusOverlay,
  RouteSummaryPanel,
} from '@/components/map';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import {
  HYDERABAD_CENTER,
  HYDERABAD_CITY_ZOOM,
  MAP_ATTRIBUTION,
  MAP_SELECTED_ZOOM,
} from '@/constants/map';
import { useCurrentLocation } from '@/hooks/useCurrentLocation';
import { usePlaceSuggestions } from '@/hooks/usePlaceSuggestions';
import { getGeocodingProvider } from '@/services/geocoding';
import { lookupPoint } from '@/services/geocoding/lookupPoint';
import {
  openAppSettings,
  readGrantedCurrentPlace,
} from '@/services/location/currentLocation';
import { colors, layout, spacing } from '@/theme';
import type { Coordinates, LocationField, MapLocation } from '@/types';
import { toComparisonParams } from '@/utils/comparisonRoute';
import { fromPlace, toPlace } from '@/utils/mapLocations';
import { decideSelection } from '@/utils/mapSelection';

type MapStatus = 'loading' | 'ready' | 'error';
type PinStatus = 'idle' | 'resolving' | 'error';

const HYDERABAD_CENTRE: Coordinates = {
  latitude: HYDERABAD_CENTER[1],
  longitude: HYDERABAD_CENTER[0],
};

/**
 * Map-first ride planning.
 *
 * The map is the primary surface: tap anywhere to drop a pin, or search for a
 * real place. When location permission was already granted, the device position
 * silently becomes the pickup so the rider only has to choose a destination.
 * Permission is never requested without a tap on "Use current location".
 */
export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraRef | null>(null);

  const [status, setStatus] = useState<MapStatus>('loading');
  // Remounting the canvas is how a failed style load is retried.
  const [attempt, setAttempt] = useState(0);

  const [pickup, setPickup] = useState<MapLocation | null>(null);
  const [destination, setDestination] = useState<MapLocation | null>(null);
  const [mode, setMode] = useState<LocationField>('pickup');
  const [searchOpen, setSearchOpen] = useState(true);
  const [query, setQuery] = useState('');
  const [focusToken, setFocusToken] = useState(0);

  const [panelHeight, setPanelHeight] = useState(0);
  const [bias, setBias] = useState<Coordinates>(HYDERABAD_CENTRE);

  const [pinStatus, setPinStatus] = useState<PinStatus>('idle');
  const [pinMessage, setPinMessage] = useState('');
  /** Tapped point drawn immediately, before its address resolves. */
  const [pendingPoint, setPendingPoint] = useState<Coordinates | null>(null);
  const lastPin = useRef<Coordinates | null>(null);
  const pinRequest = useRef<AbortController | null>(null);
  /** When a marker was last tapped, so the same gesture is not read as a map tap. */
  const markerPressAt = useRef(0);

  const gpsChecked = useRef(false);

  const {
    status: locatingStatus,
    error: locationError,
    requestLocation,
  } = useCurrentLocation();
  const { suggestions, status: suggestionsStatus, error, retry } =
    usePlaceSuggestions({ query, bias, enabled: searchOpen });

  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/');
  }, []);

  const handleReady = useCallback(() => setStatus('ready'), []);
  const handleError = useCallback(() => setStatus('error'), []);

  const handleRetry = useCallback(() => {
    setStatus('loading');
    setAttempt((current) => current + 1);
  }, []);

  const flyTo = useCallback((point: Coordinates, zoom: number) => {
    cameraRef.current?.flyTo({
      center: [point.longitude, point.latitude],
      zoom,
      duration: 800,
    });
  }, []);

  /**
   * Silent GPS pickup.
   *
   * Runs once, only after the map style is ready so the camera can move. It uses
   * `readGrantedCurrentPlace`, which reads an existing permission and never
   * prompts; if permission was never granted, nothing happens and the rider
   * chooses both ends themselves.
   */
  useEffect(() => {
    if (status !== 'ready' || gpsChecked.current) {
      return;
    }

    gpsChecked.current = true;
    let active = true;

    void (async () => {
      const place = await readGrantedCurrentPlace();

      if (!active || !place) {
        return;
      }

      const location = fromPlace(place, 'gps');

      if (!location) {
        return;
      }

      setPickup((current) => current ?? location);
      setMode('destination');
      flyTo(location, MAP_SELECTED_ZOOM - 2);
    })();

    return () => {
      active = false;
    };
  }, [status, flyTo]);

  /**
   * Stores a location and settles the panel state for it.
   *
   * The summary replaces the search sheet as soon as both ends are known; if
   * the other end is still empty the active field flips to it, so the rider is
   * never left with a panel that would overwrite the point they just chose.
   */
  const commitSelection = useCallback(
    (field: LocationField, location: MapLocation) => {
      const decision = decideSelection(field, pickup, destination);

      if (field === 'pickup') {
        setPickup(location);
      } else {
        setDestination(location);
      }

      setBias({
        latitude: location.latitude,
        longitude: location.longitude,
      });
      setMode(decision.nextMode);

      if (decision.routeComplete) {
        setSearchOpen(false);
        setQuery('');
      }
    },
    [destination, pickup],
  );

  /**
   * Reverse geocodes a tapped point, then stores it for the active field.
   *
   * The pin is placed on the tapped coordinate immediately and the address is
   * filled in when it arrives, so a slow or offline lookup never looks like the
   * tap was ignored. When no address can be resolved the point is kept and
   * labelled with its coordinates, with a message explaining why.
   */
  const handlePressLocation = useCallback(
    async (point: Coordinates) => {
      // A marker tap opens the editor; it must not also drop a pin on itself.
      if (Date.now() - markerPressAt.current < 400) {
        return;
      }

      pinRequest.current?.abort();

      const controller = new AbortController();
      pinRequest.current = controller;
      lastPin.current = point;

      setPendingPoint(point);
      setPinStatus('resolving');
      setPinMessage('Finding the address for this point…');

      const outcome = await lookupPoint(
        getGeocodingProvider(),
        point,
        controller.signal,
      );

      // A newer tap (or a cleared route) owns the screen now.
      if (
        outcome.status === 'cancelled' ||
        pinRequest.current !== controller
      ) {
        return;
      }

      setPendingPoint(null);
      commitSelection(mode, outcome.location);

      if (outcome.status === 'resolved') {
        setPinStatus('idle');
        setPinMessage('');
      } else {
        setPinStatus('error');
        setPinMessage(outcome.message);
      }
    },
    [commitSelection, mode],
  );

  const handleRetryPin = useCallback(() => {
    if (lastPin.current) {
      void handlePressLocation(lastPin.current);
    }
  }, [handlePressLocation]);

  const handleSelectSuggestion = useCallback(
    (location: MapLocation) => {
      const other = mode === 'pickup' ? destination : pickup;

      commitSelection(mode, { ...location, source: 'search' });
      flyTo(location, MAP_SELECTED_ZOOM);
      setPendingPoint(null);
      setPinStatus('idle');

      // Continue straight into the other field's search.
      if (!other) {
        setFocusToken((current) => current + 1);
      }
    },
    [commitSelection, destination, flyTo, mode, pickup],
  );

  const handleModeChange = useCallback((field: LocationField) => {
    setMode(field);
    setQuery('');
    setFocusToken((current) => current + 1);
  }, []);

  /** Opens the search sheet for one specific end of the route. */
  const handleEdit = useCallback((field: LocationField) => {
    setMode(field);
    setQuery('');
    setSearchOpen(true);
    setFocusToken((current) => current + 1);
  }, []);

  const handlePressMarker = useCallback(
    (field: LocationField) => {
      markerPressAt.current = Date.now();
      handleEdit(field);
    },
    [handleEdit],
  );

  const handleUseCurrentLocation = useCallback(async () => {
    const place = await requestLocation();

    if (!place) {
      return;
    }

    const location = fromPlace(place, 'gps');

    if (!location) {
      return;
    }

    commitSelection('pickup', location);
    flyTo(location, MAP_SELECTED_ZOOM - 2);
  }, [commitSelection, flyTo, requestLocation]);

  const handleClear = useCallback(() => {
    pinRequest.current?.abort();
    setPickup(null);
    setDestination(null);
    setMode('pickup');
    setQuery('');
    setSearchOpen(true);
    setPendingPoint(null);
    setPinStatus('idle');
    setPinMessage('');
    flyTo(HYDERABAD_CENTRE, HYDERABAD_CITY_ZOOM);
  }, [flyTo]);

  const handleRegionChange = useCallback((centre: Coordinates) => {
    setBias((current) =>
      current.latitude === centre.latitude && current.longitude === centre.longitude
        ? current
        : centre,
    );
  }, []);

  const handleConfirm = useCallback(() => {
    if (!pickup || !destination) {
      return;
    }

    router.push({
      pathname: '/compare',
      params: toComparisonParams(toPlace(pickup), toPlace(destination)),
    });
  }, [destination, pickup]);

  // MapLibre's React Native renderer has no web implementation.
  if (Platform.OS === 'web') {
    return (
      <Screen contentStyle={styles.webContent}>
        <Card style={styles.webCard}>
          <AppText variant="subtitle">Map unavailable on web</AppText>
          <AppText variant="bodyMuted">
            The interactive map uses native rendering. Open RideCompare on an
            Android or iOS build to plan a ride on the map.
          </AppText>
          <AppText variant="caption" style={styles.webAttribution}>
            {MAP_ATTRIBUTION}
          </AppText>
        </Card>
      </Screen>
    );
  }

  const showSummary = Boolean(pickup && destination) && !searchOpen;
  const locating = locatingStatus === 'locating';

  return (
    <View style={styles.root}>
      <MapCanvas
        key={attempt}
        onReady={handleReady}
        onError={handleError}
        onPressLocation={(point) => {
          void handlePressLocation(point);
        }}
        onPressMarker={handlePressMarker}
        onRegionChange={handleRegionChange}
        pickup={pickup}
        destination={destination}
        pendingPoint={pendingPoint}
        activeField={mode}
        cameraRef={cameraRef}
        topInset={insets.top}
        bottomInset={panelHeight}
      />

      {status === 'ready' ? null : (
        <MapStatusOverlay state={status} onRetry={handleRetry} />
      )}

      <MapHeader onBack={goBack} topInset={insets.top} />

      {pinStatus === 'idle' ? null : (
        <MapNotice
          state={pinStatus === 'error' ? 'error' : 'resolving'}
          message={pinMessage}
          bottomOffset={panelHeight}
          {...(pinStatus === 'error' ? { onRetry: handleRetryPin } : {})}
        />
      )}

      {/* The panel describes selections on a map that must be loaded first. */}
      {status === 'ready' ? (
        <View style={styles.panel} pointerEvents="box-none">
          <View style={styles.panelColumn}>
            {showSummary && pickup && destination ? (
              <RouteSummaryPanel
                pickup={pickup}
                destination={destination}
                onEdit={handleEdit}
                onClear={handleClear}
                onConfirm={handleConfirm}
                bottomInset={insets.bottom}
                attribution={MAP_ATTRIBUTION}
                onHeightChange={setPanelHeight}
              />
            ) : (
              <MapSearchPanel
                mode={mode}
                onModeChange={handleModeChange}
                pickup={pickup}
                destination={destination}
                query={query}
                onQueryChange={setQuery}
                suggestions={suggestions}
                status={suggestionsStatus}
                errorMessage={error}
                onRetry={retry}
                onSelectSuggestion={handleSelectSuggestion}
                onUseCurrentLocation={handleUseCurrentLocation}
                locating={locating}
                locationError={
                  locationError
                    ? {
                        message: locationError.message,
                        canOpenSettings: locationError.canOpenSettings,
                      }
                    : null
                }
                onOpenSettings={openAppSettings}
                onDismiss={() => setSearchOpen(false)}
                canDismiss={Boolean(pickup && destination)}
                focusToken={focusToken}
                bottomInset={insets.bottom}
                attribution={getGeocodingProvider().attribution}
                onHeightChange={setPanelHeight}
              />
            )}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
  },
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  panelColumn: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  webContent: {
    justifyContent: 'center',
    paddingTop: spacing['5xl'],
  },
  webCard: {
    gap: spacing.sm,
  },
  webAttribution: {
    marginTop: spacing.sm,
  },
});
