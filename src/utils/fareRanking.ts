import { RIDE_CATEGORIES, RIDE_PROVIDERS } from '@/constants';
import type {
  FareEstimate,
  FareHighlight,
  FareSortMode,
  RideCategoryFilter,
} from '@/types';

/** One row of the comparison list: the quote plus the badges it earned. */
export interface RankedFareEstimate {
  estimate: FareEstimate;
  highlights: readonly FareHighlight[];
}

export interface FareRankingOptions {
  sort?: FareSortMode;
  category?: RideCategoryFilter;
}

/** Position of an id in a metadata list, or the end of the list when unknown. */
function orderOf(items: readonly { id: string }[], id: string): number {
  const index = items.findIndex((item) => item.id === id);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

/**
 * Ids of the available estimates sharing the lowest value of `pick`.
 *
 * Unavailable quotes are never ranked, and every tied id is returned so a tie
 * highlights all of its options instead of an arbitrary one.
 */
export function getLowestIds(
  estimates: readonly FareEstimate[],
  pick: (estimate: FareEstimate) => number,
): readonly string[] {
  const available = estimates.filter((estimate) => estimate.available);

  if (available.length === 0) {
    return [];
  }

  const lowest = Math.min(...available.map(pick));
  return available
    .filter((estimate) => pick(estimate) === lowest)
    .map((estimate) => estimate.id);
}

/** Lowest fare among available options. */
export const getCheapestIds = (estimates: readonly FareEstimate[]) =>
  getLowestIds(estimates, (estimate) => estimate.fare);

/** Lowest ETA among available options. */
export const getFastestIds = (estimates: readonly FareEstimate[]) =>
  getLowestIds(estimates, (estimate) => estimate.etaMinutes);

/** Final deterministic tie-break so equal rows never swap between renders. */
const byId = (a: FareEstimate, b: FareEstimate) =>
  a.id < b.id ? -1 : a.id > b.id ? 1 : 0;

/** Unavailable rides always sink to the bottom, whatever the sort. */
const byAvailability = (a: FareEstimate, b: FareEstimate) =>
  a.available === b.available ? 0 : a.available ? -1 : 1;

const RECOMMENDED = (a: FareEstimate, b: FareEstimate) =>
  byAvailability(a, b) ||
  orderOf(RIDE_PROVIDERS, a.provider) - orderOf(RIDE_PROVIDERS, b.provider) ||
  orderOf(RIDE_CATEGORIES, a.category) - orderOf(RIDE_CATEGORIES, b.category) ||
  byId(a, b);

const LOWEST_FARE = (a: FareEstimate, b: FareEstimate) =>
  byAvailability(a, b) ||
  a.fare - b.fare ||
  a.etaMinutes - b.etaMinutes ||
  byId(a, b);

const FASTEST = (a: FareEstimate, b: FareEstimate) =>
  byAvailability(a, b) ||
  a.etaMinutes - b.etaMinutes ||
  a.fare - b.fare ||
  byId(a, b);

const COMPARATORS: Record<
  FareSortMode,
  (a: FareEstimate, b: FareEstimate) => number
> = {
  recommended: RECOMMENDED,
  'lowest-fare': LOWEST_FARE,
  fastest: FASTEST,
};

/**
 * Filters by category, orders by the selected sort, and attaches the
 * cheapest/fastest badges.
 *
 * Highlighting is decided over the whole comparison, not over the filtered
 * subset: "cheapest" means cheapest among all available rides, so narrowing to
 * a category can leave a category without a badge.
 */
export function rankFareEstimates(
  estimates: readonly FareEstimate[],
  { sort = 'recommended', category = 'all' }: FareRankingOptions = {},
): RankedFareEstimate[] {
  const cheapestIds = getCheapestIds(estimates);
  const fastestIds = getFastestIds(estimates);

  const visible = estimates.filter(
    (estimate) => category === 'all' || estimate.category === category,
  );

  return [...visible]
    .sort(COMPARATORS[sort])
    .map((estimate): RankedFareEstimate => {
      const highlights: FareHighlight[] = [];

      if (cheapestIds.includes(estimate.id)) {
        highlights.push('cheapest');
      }

      if (fastestIds.includes(estimate.id)) {
        highlights.push('fastest');
      }

      return { estimate, highlights };
    });
}
