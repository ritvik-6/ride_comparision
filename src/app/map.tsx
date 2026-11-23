import { lazy, Suspense } from 'react';
import Constants from 'expo-constants';

import { ExpoGoMapFallback } from '@/components/map/ExpoGoMapFallback';
import { shouldUseExpoGoMapFallback } from '@/utils/mapRuntime';

const MapLibreMapScreen = lazy(
  () => import('@/screens/MapLibreMapScreen'),
);

export default function MapRoute() {
  if (shouldUseExpoGoMapFallback(Constants.appOwnership)) {
    return <ExpoGoMapFallback />;
  }

  return (
    <Suspense fallback={null}>
      <MapLibreMapScreen />
    </Suspense>
  );
}
