import { CURRENCY } from '@/constants';
import type {
  FareComparisonResult,
  FareEstimate,
  Place,
  RideCategory,
  RideProvider,
} from '@/types';

interface DemoOffer {
  provider: RideProvider;
  category: RideCategory;
  /** The provider's own name for the tier. */
  tierLabel: string;
  baseFare: number;
  baseEtaMinutes: number;
  available: boolean;
}

/**
 * Hand-written sample offers. These are not live prices and are not derived
 * from distance, GPS or any provider API — they exist so the comparison screen
 * has realistic-looking content until authorised provider quotes are wired up.
 */
const DEMO_OFFERS: readonly DemoOffer[] = [
  {
    provider: 'rapido',
    category: 'bike',
    tierLabel: 'Bike',
    baseFare: 45,
    baseEtaMinutes: 2,
    available: true,
  },
  {
    provider: 'rapido',
    category: 'auto',
    tierLabel: 'Auto',
    baseFare: 85,
    baseEtaMinutes: 4,
    available: true,
  },
  {
    // Rapido is included for bikes and autos; its cab tier is not offered here.
    provider: 'rapido',
    category: 'cab',
    tierLabel: 'Cab',
    baseFare: 190,
    baseEtaMinutes: 6,
    available: false,
  },
  {
    provider: 'uber',
    category: 'bike',
    tierLabel: 'Moto',
    baseFare: 52,
    baseEtaMinutes: 3,
    available: true,
  },
  {
    provider: 'uber',
    category: 'auto',
    tierLabel: 'Auto',
    baseFare: 95,
    baseEtaMinutes: 5,
    available: true,
  },
  {
    provider: 'uber',
    category: 'cab',
    tierLabel: 'Go',
    baseFare: 210,
    baseEtaMinutes: 7,
    available: true,
  },
  {
    provider: 'ola',
    category: 'bike',
    tierLabel: 'Bike',
    baseFare: 49,
    baseEtaMinutes: 3,
    available: true,
  },
  {
    provider: 'ola',
    category: 'auto',
    tierLabel: 'Auto',
    baseFare: 90,
    baseEtaMinutes: 5,
    available: true,
  },
  {
    provider: 'ola',
    category: 'cab',
    tierLabel: 'Mini',
    baseFare: 205,
    baseEtaMinutes: 8,
    available: true,
  },
] as const;

/** Copy shown wherever demo estimates appear. */
export const DEMO_ESTIMATES_NOTICE =
  'Fares and ETAs on this screen are sample data for this build. They are not live prices from Rapido, Uber or Ola.';

/** FNV-1a. Gives each route a stable variation without measuring anything. */
function stableHash(value: string): number {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return hash >>> 0;
}

const roundToFive = (value: number) => Math.round(value / 5) * 5;

/**
 * Builds the demo comparison for one route.
 *
 * Values are deterministic: the same pickup and destination always produce the
 * same estimates, and the route ids only spread the sample numbers so two
 * routes do not look identical. There is no distance, GPS or time-based
 * calculation involved, and no availability lookup.
 */
export function getDemoFareComparison(
  pickup: Place,
  destination: Place,
): FareComparisonResult {
  const seed = stableHash(`${pickup.id}->${destination.id}`);
  const fareFactor = 0.92 + (seed % 21) / 100;
  const etaOffset = seed % 4;

  const estimates: FareEstimate[] = DEMO_OFFERS.map((offer) => ({
    id: `${offer.provider}-${offer.category}`,
    provider: offer.provider,
    category: offer.category,
    tierLabel: offer.tierLabel,
    fare: roundToFive(offer.baseFare * fareFactor),
    currency: CURRENCY,
    etaMinutes: offer.baseEtaMinutes + etaOffset,
    available: offer.available,
  }));

  return { estimates, source: 'demo' };
}
