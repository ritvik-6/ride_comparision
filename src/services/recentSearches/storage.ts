import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  parseRecentLocations,
  serializeRecentLocations,
  type RecentLocation,
} from './recentSearches';

/**
 * Storage adapter for recent searches.
 *
 * AsyncStorage is the lightweight, unencrypted key-value store recommended for
 * Expo SDK 58 and it is included in Expo Go, so no development build is needed
 * for this feature. Only this module knows about it: everything else works with
 * `RecentLocation` values, which keeps the store replaceable later.
 *
 * Reads and writes never throw. A storage failure degrades the feature to
 * in-memory recents for the session instead of breaking location selection.
 */

/** Versioned so a future shape change cannot collide with this payload. */
export const RECENT_SEARCHES_STORAGE_KEY = 'ridecompare.recentSearches.v1';

/** Reads the stored recents; anything unreadable becomes an empty list. */
export async function loadStoredRecentLocations(): Promise<RecentLocation[]> {
  try {
    const raw = await AsyncStorage.getItem(RECENT_SEARCHES_STORAGE_KEY);
    return parseRecentLocations(raw);
  } catch {
    // A device with unavailable storage still gets a working session.
    return [];
  }
}

/** Replaces the stored list. Failures are ignored on purpose: the caller keeps
 * its in-memory copy, and the next successful write reconciles storage. */
export async function saveStoredRecentLocations(
  locations: readonly RecentLocation[],
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      RECENT_SEARCHES_STORAGE_KEY,
      serializeRecentLocations(locations),
    );
  } catch {
    // Nothing user-facing to do; recent searches are a convenience, not data
    // the rider would expect a warning about.
  }
}
