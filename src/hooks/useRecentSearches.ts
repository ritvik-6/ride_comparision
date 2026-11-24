import { useCallback, useEffect, useSyncExternalStore } from 'react';

import {
  addRecentSearch,
  clearRecentSearches,
  ensureRecentSearchesLoaded,
  getRecentSearchesSnapshot,
  subscribeToRecentSearches,
  type RecentLocation,
} from '@/services/recentSearches';
import type { MapLocation } from '@/types';

export interface RecentSearchesController {
  /** Newest first, at most `MAX_RECENT_LOCATIONS`. */
  recents: readonly RecentLocation[];
  /** Records a location; unusable locations are ignored. */
  add: (location: MapLocation) => void;
  /** Removes every stored recent. */
  clear: () => void;
}

/**
 * Reads and writes the shared recent-search list.
 *
 * Every caller sees the same list, so recording a destination on the map is
 * immediately visible on the home screen. Loading from storage happens once, on
 * first mount, and never blocks rendering: the list simply starts empty and
 * fills in when the read resolves.
 */
export function useRecentSearches(): RecentSearchesController {
  const recents = useSyncExternalStore(
    subscribeToRecentSearches,
    getRecentSearchesSnapshot,
    getRecentSearchesSnapshot,
  );

  useEffect(() => {
    void ensureRecentSearchesLoaded();
  }, []);

  const add = useCallback((location: MapLocation) => addRecentSearch(location), []);
  const clear = useCallback(() => clearRecentSearches(), []);

  return { recents, add, clear };
}
