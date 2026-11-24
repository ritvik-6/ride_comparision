export {
  MAX_RECENT_LOCATIONS,
  RECENT_SEARCHES_VERSION,
  addRecentLocation,
  isStorableRecentLocation,
  mergeRecentLocations,
  parseRecentLocations,
  readStoredRecentLocation,
  recentLocationKey,
  serializeRecentLocations,
} from './recentSearches';
export type { RecentLocation } from './recentSearches';
export {
  addRecentSearch,
  clearRecentSearches,
  ensureRecentSearchesLoaded,
  getRecentSearchesSnapshot,
  subscribeToRecentSearches,
} from './store';
export {
  RECENT_SEARCHES_STORAGE_KEY,
  loadStoredRecentLocations,
  saveStoredRecentLocations,
} from './storage';
