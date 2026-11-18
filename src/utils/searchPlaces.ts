import type { Place } from '@/types';

/** Number of suggestions kept on screen at once. */
export const MAX_SUGGESTIONS = 6;

/** Lowercases and collapses whitespace so matching ignores case and spacing. */
const normalize = (value: string) =>
  value.toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * Case-insensitive local search over a place list.
 *
 * Every word typed must appear somewhere in the place name or address, so both
 * "jubilee hills" and "hills jubilee" match, and a broad term like "hyderabad"
 * still narrows the list. An empty query returns the leading places, which the
 * UI presents as popular localities.
 */
export function searchPlaces(
  places: readonly Place[],
  query: string,
  limit: number = MAX_SUGGESTIONS,
): Place[] {
  const tokens = normalize(query)
    .split(' ')
    .filter((token) => token.length > 0);

  if (tokens.length === 0) {
    return places.slice(0, limit);
  }

  return places
    .filter((place) => {
      const haystack = normalize(`${place.name} ${place.address}`);
      return tokens.every((token) => haystack.includes(token));
    })
    .slice(0, limit);
}
