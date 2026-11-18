import type { Place } from '@/types';

import { HYDERABAD_LOCATIONS } from './locations';

/** Recents are picked by id so tapping one stores the same Place used by search. */
const RECENT_PLACE_IDS = ['hitech-city', 'gachibowli', 'airport'] as const;

/**
 * Local sample data for the home screen, drawn from the searchable dataset.
 * Nothing here is fetched, and no fares are implied.
 */
export const RECENT_DESTINATIONS: readonly Place[] = RECENT_PLACE_IDS.flatMap(
  (id) => {
    const place = HYDERABAD_LOCATIONS.find((candidate) => candidate.id === id);
    return place ? [place] : [];
  },
);
