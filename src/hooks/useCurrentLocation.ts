import { useCallback, useEffect, useRef, useState } from 'react';

import {
  CurrentLocationError,
  LOCATION_MESSAGES,
  resolveCurrentPlace,
} from '@/services/location/currentLocation';
import type { Place } from '@/types';

export type CurrentLocationStatus = 'idle' | 'locating' | 'error';

export interface CurrentLocationController {
  status: CurrentLocationStatus;
  /** Set when locating failed; null while idle or locating. */
  error: CurrentLocationError | null;
  /** Requests permission and resolves the device place. Null when it fails. */
  requestLocation: () => Promise<Place | null>;
}

/**
 * Runs the permission, GPS and reverse-geocoding flow on demand.
 *
 * Nothing runs on mount, so the system permission dialog only appears from a
 * user gesture, and a second tap while a request is in flight is ignored.
 */
export function useCurrentLocation(): CurrentLocationController {
  const [status, setStatus] = useState<CurrentLocationStatus>('idle');
  const [error, setError] = useState<CurrentLocationError | null>(null);
  const inFlight = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
    };
  }, []);

  const requestLocation = useCallback(async (): Promise<Place | null> => {
    if (inFlight.current) {
      return null;
    }

    inFlight.current = true;
    setStatus('locating');
    setError(null);

    try {
      const place = await resolveCurrentPlace();

      if (mounted.current) {
        setStatus('idle');
      }

      return place;
    } catch (caught) {
      const failure =
        caught instanceof CurrentLocationError
          ? caught
          : new CurrentLocationError('unavailable', LOCATION_MESSAGES.unavailable);

      if (mounted.current) {
        setError(failure);
        setStatus('error');
      }

      return null;
    } finally {
      inFlight.current = false;
    }
  }, []);

  return { status, error, requestLocation };
}
