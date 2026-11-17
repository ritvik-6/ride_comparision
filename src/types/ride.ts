/** Supported ride-hailing platforms. */
export type RideProvider = 'rapido' | 'uber' | 'ola';

export interface RideProviderMeta {
  id: RideProvider;
  name: string;
  shortName: string;
  tagline: string;
  /** Ride categories the provider is known for, e.g. "Bike", "Auto". */
  categories: readonly string[];
  /** Used for provider identity accents, not for app chrome. */
  brandColor: string;
}

export interface GeoPoint {
  latitude: number;
  longitude: number;
  address?: string;
}

/** A single bookable option returned for a route. */
export interface RideOption {
  id: string;
  provider: RideProvider;
  /** Vehicle tier as named by the provider, e.g. "Bike", "Mini", "Auto". */
  category: string;
  fare: number;
  currency: string;
  etaMinutes: number;
  distanceKm: number;
  surgeMultiplier?: number;
  deepLink?: string;
}

/** The result of comparing every provider for one search. */
export interface FareComparison {
  origin: GeoPoint;
  destination: GeoPoint;
  options: RideOption[];
  cheapestOptionId?: string;
  fastestOptionId?: string;
  /** ISO timestamp of when the quotes were retrieved. */
  fetchedAt: string;
}
