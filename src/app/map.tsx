import { lazy, Suspense, useState } from 'react';
import { isRunningInExpoGo } from 'expo';
import Constants from 'expo-constants';

import { ExpoGoMapFallback } from '@/components/map/ExpoGoMapFallback';
import { shouldUseExpoGoMapFallback } from '@/utils/mapRuntime';

export default function MapRoute() {
  const useExpoGoFallback = shouldUseExpoGoMapFallback({
    isRunningInExpoGo: isRunningInExpoGo(),
    executionEnvironment: Constants.executionEnvironment,
    appOwnership: Constants.appOwnership,
  });

  if (useExpoGoFallback) {
    return <ExpoGoMapFallback />;
  }

  return <StandaloneMapRoute />;
}

function StandaloneMapRoute() {
  const [MapLibreMapScreen] = useState(() =>
    lazy(() => import('@/screens/MapLibreMapRoute')),
  );

  return (
    <Suspense fallback={null}>
      <MapLibreMapScreen />
    </Suspense>
  );
}
