import type { MapLocation } from '@/types';

import {
  addRecentLocation,
  mergeRecentLocations,
  type RecentLocation,
} from './recentSearches';
import {
  loadStoredRecentLocations,
  saveStoredRecentLocations,
} from './storage';

/**
 * One shared recent-search store for the whole app.
 *
 * The home screen and the map screen both read and write here, so they can never
 * disagree about what was selected last, and there is no second copy of the list
 * to keep in sync. It is a plain module-level store with `useSyncExternalStore`
 * rather than a new state library: the state is one array and three operations.
 */

let snapshot: readonly RecentLocation[] = [];
const listeners = new Set<() => void>();
let hydration: Promise<void> | null = null;

const emit = (): void => {
  for (const listener of listeners) {
    listener();
  }
};

/** Current list, newest first. Stable reference until the list changes. */
export function getRecentSearchesSnapshot(): readonly RecentLocation[] {
  return snapshot;
}

export function subscribeToRecentSearches(listener: () => void): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

const sameList = (
  a: readonly RecentLocation[],
  b: readonly RecentLocation[],
): boolean => a.length === b.length && a.every((entry, index) => entry === b[index]);

/**
 * Loads the persisted list once.
 *
 * Hydration is idempotent and shared, so mounting both screens does not read
 * storage twice. Anything selected while the read was in flight stays above the
 * stored entries instead of being replaced by them.
 */
export function ensureRecentSearchesLoaded(): Promise<void> {
  hydration ??= loadStoredRecentLocations().then((stored) => {
    if (stored.length === 0) {
      return;
    }

    const merged = mergeRecentLocations(snapshot, stored);

    if (sameList(merged, snapshot)) {
      return;
    }

    snapshot = merged;
    emit();
  });

  return hydration;
}

/** Records a selection, newest first, and persists the new list. */
export function addRecentSearch(location: MapLocation): void {
  const next = addRecentLocation(snapshot, location);

  if (next === snapshot) {
    return;
  }

  snapshot = next;
  emit();
  void saveStoredRecentLocations(next);
}

/** Removes every recent, in memory and on disk. */
export function clearRecentSearches(): void {
  if (snapshot.length === 0) {
    return;
  }

  snapshot = [];
  emit();
  void saveStoredRecentLocations(snapshot);
}
