import type { LocationField, MapLocation } from '@/types';

/**
 * What a location selection does to the route.
 *
 * Kept pure and separate from the screen so the pickup/destination rules are
 * testable without rendering the map: choosing the last missing end completes
 * the route and closes the search sheet, while choosing one end when the other
 * is still empty moves the editor to the empty end.
 */
export interface SelectionDecision {
  /** The field the editor should be on after this selection. */
  nextMode: LocationField;
  /** True once both ends are known. */
  routeComplete: boolean;
}

export function decideSelection(
  field: LocationField,
  pickup: MapLocation | null,
  destination: MapLocation | null,
): SelectionDecision {
  const other = field === 'pickup' ? destination : pickup;

  if (other) {
    return { nextMode: field, routeComplete: true };
  }

  return {
    nextMode: field === 'pickup' ? 'destination' : 'pickup',
    routeComplete: false,
  };
}
