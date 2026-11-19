import type { GeoPoint, Place, RideProvider } from '@/types';

/**
 * Provider hand-off links.
 *
 * Only documented, official HTTPS destinations are built here. Nothing in this
 * module fabricates partner credentials: Uber's `client_id`, Ola's affiliate
 * `utm_source` token and Rapido's internal deep links all require partner
 * onboarding, so they are deliberately absent.
 *
 * The module deliberately has no runtime imports — only erased type imports — so
 * URL construction can be unit-tested directly in Node without a bundler.
 */

export type ProviderLinkKind = 'ride-request' | 'website';

export interface ProviderLink {
  provider: RideProvider;
  /** Provider display name, e.g. "Uber". */
  name: string;
  /** HTTPS URL handed to React Native's Linking. */
  url: string;
  /**
   * `ride-request` when the trip could be attached to the URL,
   * `website` when only the provider's general entry point is used.
   */
  kind: ProviderLinkKind;
  /** True when both places had usable coordinates in the URL. */
  includesRoute: boolean;
}

export interface ProviderLinkInput {
  provider: RideProvider;
  pickup: Place;
  destination: Place;
}

/** General Uber mobile experience, no route attached. */
const UBER_RIDER_HOME = 'https://m.uber.com/';

/**
 * Uber's documented universal ride-request deep link. It is the recommended
 * format for linking from a non-native app and falls back to mobile web when
 * the Uber app is not installed.
 * https://developer.uber.com/docs/riders/ride-requests/tutorials/deep-links/introduction
 */
const UBER_RIDE_REQUEST = 'https://m.uber.com/looking';

/** Ola's public India booking page. No affiliate tracking parameters are added. */
const OLA_BOOKING = 'https://book.olacabs.com/';

/** Rapido's official website. Rapido publishes no third-party ride deep link. */
const RAPIDO_HOME = 'https://www.rapido.bike/';

const UBER_HOME_LATITUDE = 90;
const UBER_HOME_LONGITUDE = 180;

const PROVIDER_NAMES: Record<RideProvider, string> = {
  rapido: 'Rapido',
  uber: 'Uber',
  ola: 'Ola',
};

/** Shown next to the estimates and repeated in the confirmation dialog. */
export const PROVIDER_LINK_DISCLOSURE =
  "Continue opens the provider's own app or website, where you confirm the actual fare and complete the booking. RideCompare doesn't book rides.";

/** The location shape Uber documents for its `pickup` and `drop` parameters. */
interface UberLocation {
  latitude: number;
  longitude: number;
  addressLine1: string;
  addressLine2: string;
}

/** True only for a complete, in-range position. */
const hasCoordinates = (
  place: Place,
): place is Place & { coordinates: GeoPoint } => {
  const point = place.coordinates;

  return (
    point !== undefined &&
    Number.isFinite(point.latitude) &&
    Number.isFinite(point.longitude) &&
    Math.abs(point.latitude) <= UBER_HOME_LATITUDE &&
    Math.abs(point.longitude) <= UBER_HOME_LONGITUDE
  );
};

const toUberLocation = (place: Place): UberLocation | null => {
  if (!hasCoordinates(place)) {
    return null;
  }

  const { coordinates: point } = place;

  return {
    latitude: point.latitude,
    longitude: point.longitude,
    addressLine1: place.name,
    addressLine2: place.address,
  };
};

/**
 * Builds an Uber ride-request link.
 *
 * Coordinates and readable addresses are only attached when both places have a
 * valid position. Otherwise the general Uber experience opens, because a link
 * with half a route would pre-fill a wrong pickup or drop-off.
 *
 * `client_id` is part of the documented format but is only issued to Uber
 * developer accounts, so it is not added until a real one is provisioned.
 */
export function buildUberLink(
  pickup: Place,
  destination: Place,
): { url: string; includesRoute: boolean } {
  const pickupLocation = toUberLocation(pickup);
  const dropLocation = toUberLocation(destination);

  if (!pickupLocation || !dropLocation) {
    return { url: UBER_RIDER_HOME, includesRoute: false };
  }

  const params = [
    `pickup=${encodeURIComponent(JSON.stringify(pickupLocation))}`,
    // The key is bracket-nested, so it is encoded for a predictable URL.
    `drop%5B0%5D=${encodeURIComponent(JSON.stringify(dropLocation))}`,
  ].join('&');

  return { url: `${UBER_RIDE_REQUEST}?${params}`, includesRoute: true };
}

/** Resolves the provider, URL and capabilities for one ride option. */
export function buildProviderLink({
  provider,
  pickup,
  destination,
}: ProviderLinkInput): ProviderLink {
  const name = PROVIDER_NAMES[provider];

  switch (provider) {
    case 'uber': {
      const link = buildUberLink(pickup, destination);

      return {
        provider,
        name,
        url: link.url,
        kind: link.includesRoute ? 'ride-request' : 'website',
        includesRoute: link.includesRoute,
      };
    }

    case 'ola':
      // Ola's documented deep link requires an affiliate token we do not have.
      return {
        provider,
        name,
        url: OLA_BOOKING,
        kind: 'website',
        includesRoute: false,
      };

    case 'rapido':
      // No verified public ride deep link exists for third-party apps.
      return {
        provider,
        name,
        url: RAPIDO_HOME,
        kind: 'website',
        includesRoute: false,
      };
  }
}

/** Host shown in error copy, e.g. "m.uber.com". */
export function getLinkHost(url: string): string {
  return url.replace(/^https?:\/\//, '').split('/')[0] ?? url;
}
