import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard } from 'react-native';

import { searchPlaces } from '@/utils/searchPlaces';
import type { LocationField, LocationSearchState, Place } from '@/types';

/**
 * Tapping a row blurs the input before the press completes on Android, so the
 * panel stays mounted briefly instead of closing under the user's finger.
 */
const BLUR_DELAY_MS = 180;

interface FieldState {
  query: string;
  place: Place | null;
  focused: boolean;
}

type FieldsState = Record<LocationField, FieldState>;

const EMPTY_FIELD: FieldState = { query: '', place: null, focused: false };

export interface RouteSearchController {
  pickup: LocationSearchState;
  destination: LocationSearchState;
  /** Updates the text and drops any previously selected place. */
  changeText: (field: LocationField, value: string) => void;
  /** Attaches a place from the suggestions and closes the panel. */
  selectPlace: (field: LocationField, place: Place) => void;
  focusField: (field: LocationField) => void;
  blurField: (field: LocationField) => void;
  clearField: (field: LocationField) => void;
  /** Exchanges the text and selected place of both fields. */
  swap: () => void;
  dismissSuggestions: () => void;
}

/**
 * Owns pickup/destination text, the selected Place for each and the live
 * suggestion lists. Each field searches independently against local data.
 */
export function useRouteSearch(
  locations: readonly Place[],
): RouteSearchController {
  const [fields, setFields] = useState<FieldsState>({
    pickup: EMPTY_FIELD,
    destination: EMPTY_FIELD,
  });
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelBlur = useCallback(() => {
    if (blurTimer.current !== null) {
      clearTimeout(blurTimer.current);
      blurTimer.current = null;
    }
  }, []);

  useEffect(() => cancelBlur, [cancelBlur]);

  const patchField = useCallback(
    (field: LocationField, patch: Partial<FieldState>) => {
      setFields((prev) => ({ ...prev, [field]: { ...prev[field], ...patch } }));
    },
    [],
  );

  const changeText = useCallback(
    (field: LocationField, value: string) => {
      cancelBlur();
      setFields((prev) => ({
        ...prev,
        [field]: { query: value, place: null, focused: true },
      }));
    },
    [cancelBlur],
  );

  const selectPlace = useCallback(
    (field: LocationField, place: Place) => {
      cancelBlur();
      Keyboard.dismiss();
      // Choosing a place ends the search, so no panel stays open.
      setFields((prev) => {
        const updated: FieldState = {
          query: place.name,
          place,
          focused: false,
        };

        return {
          pickup:
            field === 'pickup' ? updated : { ...prev.pickup, focused: false },
          destination:
            field === 'destination'
              ? updated
              : { ...prev.destination, focused: false },
        };
      });
    },
    [cancelBlur],
  );

  const focusField = useCallback(
    (field: LocationField) => {
      cancelBlur();
      setFields((prev) => ({
        pickup: { ...prev.pickup, focused: field === 'pickup' },
        destination: { ...prev.destination, focused: field === 'destination' },
      }));
    },
    [cancelBlur],
  );

  const blurField = useCallback(
    (field: LocationField) => {
      cancelBlur();
      blurTimer.current = setTimeout(() => {
        blurTimer.current = null;
        patchField(field, { focused: false });
      }, BLUR_DELAY_MS);
    },
    [cancelBlur, patchField],
  );

  const clearField = useCallback(
    (field: LocationField) => {
      cancelBlur();
      patchField(field, { query: '', place: null });
    },
    [cancelBlur, patchField],
  );

  const swap = useCallback(() => {
    cancelBlur();
    Keyboard.dismiss();
    setFields((prev) => ({
      pickup: { ...prev.destination, focused: false },
      destination: { ...prev.pickup, focused: false },
    }));
  }, [cancelBlur]);

  const dismissSuggestions = useCallback(() => {
    cancelBlur();
    setFields((prev) => ({
      pickup: { ...prev.pickup, focused: false },
      destination: { ...prev.destination, focused: false },
    }));
  }, [cancelBlur]);

  const suggestions = useMemo(
    () => ({
      pickup: searchPlaces(locations, fields.pickup.query),
      destination: searchPlaces(locations, fields.destination.query),
    }),
    [locations, fields.pickup.query, fields.destination.query],
  );

  const toSearchState = useCallback(
    (field: FieldState, matches: readonly Place[]): LocationSearchState => ({
      query: field.query,
      place: field.place,
      focused: field.focused,
      suggestions: matches,
      isSelected: field.place !== null,
    }),
    [],
  );

  return {
    pickup: toSearchState(fields.pickup, suggestions.pickup),
    destination: toSearchState(fields.destination, suggestions.destination),
    changeText,
    selectPlace,
    focusField,
    blurField,
    clearField,
    swap,
    dismissSuggestions,
  };
}
