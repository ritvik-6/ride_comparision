import type { RideProvider } from './ride';

/** Vehicle tiers compared across every provider. */
export type RideCategory = 'bike' | 'auto' | 'cab';

/** Where a set of estimates came from. Only demo data exists today. */
export type FareQuoteSource = 'demo' | 'provider-api';

/**
 * One provider/tier quote for a route.
 *
 * The shape is intentionally close to what an authorised provider quote
 * endpoint would return, so a real source can replace the demo service without
 * changing the comparison screen.
 */
export interface FareEstimate {
  id: string;
  provider: RideProvider;
  category: RideCategory;
  /** The provider's own tier name, e.g. "Moto", "Mini", "Go". */
  tierLabel: string;
  fare: number;
  currency: string;
  etaMinutes: number;
  /** False when the provider does not serve this tier on this route. */
  available: boolean;
}

/** Every quote produced for one pickup/destination pair. */
export interface FareComparisonResult {
  estimates: readonly FareEstimate[];
  source: FareQuoteSource;
}
