import type { LocationSearchState } from '@/types';

type RouteFieldState = Pick<LocationSearchState, 'query' | 'place'>;

/**
 * Explains why a comparison cannot run yet.
 *
 * A field counts as complete only when a Place was chosen from the suggestions,
 * so typed text alone does not pass validation.
 */
export function validateRoute(
  pickup: RouteFieldState,
  destination: RouteFieldState,
): string | null {
  const missingPickup = pickup.place === null;
  const missingDestination = destination.place === null;

  if (missingPickup && missingDestination) {
    return 'Select a pickup and a destination to compare rides.';
  }

  if (missingPickup) {
    return pickup.query.trim().length > 0
      ? 'Choose a pickup from the suggestions.'
      : 'Add a pickup location to continue.';
  }

  if (missingDestination) {
    return destination.query.trim().length > 0
      ? 'Choose a destination from the suggestions.'
      : 'Add a destination to continue.';
  }

  return null;
}
