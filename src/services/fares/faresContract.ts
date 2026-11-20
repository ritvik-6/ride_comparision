import type {
  FareComparisonResult,
  FareEstimate,
  FareQuoteSource,
  Place,
  RideCategory,
  RideProvider,
} from '@/types';

/**
 * Wire contract for the fare comparison endpoint.
 *
 * Request mapping, response validation and error normalisation live here, apart
 * from the network call and from the UI. Every value that reaches the comparison
 * screen is validated first: a malformed body becomes a `malformed` failure
 * rather than a screen full of `NaN` fares.
 *
 * Like `providerLinks`, this module has no runtime imports (only erased type
 * imports), so it can be unit-tested directly in Node without a bundler.
 */

/** Path on the FareCompare backend. The origin comes from `env.apiBaseUrl`. */
export const FARES_COMPARE_PATH = '/api/v1/fares/compare';

const PROVIDERS: readonly RideProvider[] = ['rapido', 'uber', 'ola'];
const CATEGORIES: readonly RideCategory[] = ['bike', 'auto', 'cab'];
const SOURCES: readonly FareQuoteSource[] = ['demo', 'provider-api'];

const LATITUDE_BOUND = 90;
const LONGITUDE_BOUND = 180;

export interface FareRequestCoordinates {
  latitude: number;
  longitude: number;
}

export interface FareRequestPlace {
  id: string;
  name: string;
  address: string;
  coordinates?: FareRequestCoordinates;
}

/** Body of `POST /api/v1/fares/compare`. */
export interface FareCompareRequest {
  pickup: FareRequestPlace;
  destination: FareRequestPlace;
}

/** True only for a complete, in-range position. */
const hasUsableCoordinates = (
  place: Place,
): place is Place & { coordinates: FareRequestCoordinates } => {
  const point = place.coordinates;

  return (
    point !== undefined &&
    Number.isFinite(point.latitude) &&
    Number.isFinite(point.longitude) &&
    Math.abs(point.latitude) <= LATITUDE_BOUND &&
    Math.abs(point.longitude) <= LONGITUDE_BOUND
  );
};

const toRequestPlace = (place: Place): FareRequestPlace => {
  const request: FareRequestPlace = {
    id: place.id,
    name: place.name,
    address: place.address,
  };

  // Sent for completeness only — the backend echoes them and never derives a
  // fare from them. A half or out-of-range pair is dropped so it cannot turn a
  // valid route into a 422.
  if (hasUsableCoordinates(place)) {
    request.coordinates = {
      latitude: place.coordinates.latitude,
      longitude: place.coordinates.longitude,
    };
  }

  return request;
};

/** Maps the two selected places onto the backend request schema. */
export function toFareRequest(
  pickup: Place,
  destination: Place,
): FareCompareRequest {
  return {
    pickup: toRequestPlace(pickup),
    destination: toRequestPlace(destination),
  };
}

/** Why a comparison could not be shown. */
export type FareApiErrorKind =
  | 'unconfigured'
  | 'unreachable'
  | 'timeout'
  | 'rejected'
  | 'server'
  | 'malformed';

export interface FareApiFailure {
  kind: FareApiErrorKind;
  /** Short heading for the error card. */
  title: string;
  /** Full explanation, including what the rider can do next. */
  message: string;
  /** False when trying the same request again cannot help. */
  canRetry: boolean;
  /** HTTP status when a response was received. */
  status?: number;
}

/** Normalised failure that can also be thrown as a real `Error`. */
export type FareApiError = Error & FareApiFailure;

const ERROR_COPY: Record<
  FareApiErrorKind,
  { title: string; message: string; canRetry: boolean }
> = {
  unconfigured: {
    title: 'No server configured',
    message:
      'This build has no API base URL, so fares cannot be fetched. Set EXPO_PUBLIC_API_BASE_URL in .env — http://10.0.2.2:8000 for the Android emulator — and restart the dev server.',
    canRetry: false,
  },
  unreachable: {
    title: "Can't reach the server",
    message:
      "The RideCompare backend didn't respond. Start it with uvicorn app.main:app --port 8000, and check that the base URL points to this machine's address.",
    canRetry: true,
  },
  timeout: {
    title: 'The request timed out',
    message:
      'The RideCompare backend took too long to answer. Check your connection and try again.',
    canRetry: true,
  },
  rejected: {
    title: 'These locations were rejected',
    message:
      'The server would not compare this route. Go back and select the pickup and destination again.',
    canRetry: false,
  },
  server: {
    title: 'The server hit an error',
    message:
      'RideCompare could not compare fares for this route. Try again in a moment.',
    canRetry: true,
  },
  malformed: {
    title: 'Unexpected response',
    message:
      'The server sent something this app could not read, so no fares are shown rather than guessing. Try again, or check the backend version.',
    canRetry: true,
  },
};

/** A failure object carrying the copy for its kind. */
export function fareFailure(
  kind: FareApiErrorKind,
  status?: number,
): FareApiFailure {
  const copy = ERROR_COPY[kind];

  return {
    kind,
    title: copy.title,
    message: copy.message,
    canRetry: copy.canRetry,
    ...(status === undefined ? {} : { status }),
  };
}

/** Throws-friendly failure: still an `Error`, so stacks and logs stay useful. */
export function createFareError(
  kind: FareApiErrorKind,
  status?: number,
): FareApiError {
  const failure = fareFailure(kind, status);

  return Object.assign(new Error(failure.message), failure, {
    name: 'FareApiError',
  });
}

const isFareApiError = (value: unknown): value is FareApiError =>
  value instanceof Error && value.name === 'FareApiError';

const readStatus = (value: unknown): number | undefined => {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }

  const status = (value as { status?: unknown }).status;

  return typeof status === 'number' ? status : undefined;
};

const isAbortError = (value: unknown): boolean =>
  typeof value === 'object' &&
  value !== null &&
  (value as { name?: unknown }).name === 'AbortError';

/**
 * Turns anything thrown by the API layer into display copy.
 *
 * `apiRequest` throws `ApiError` with the HTTP status for a bad response, and
 * lets `fetch` rejections and its abort timeout through unchanged, so the
 * mapping is structural rather than instanceof-based.
 */
export function toFareApiFailure(error: unknown): FareApiFailure {
  if (isFareApiError(error)) {
    const { kind, status } = error;

    return fareFailure(kind, status);
  }

  const status = readStatus(error);

  if (status === 0) {
    // `apiRequest` reports a missing base URL with status 0.
    return fareFailure('unconfigured', 0);
  }

  if (status !== undefined) {
    return fareFailure(
      status === 400 || status === 422 ? 'rejected' : 'server',
      status,
    );
  }

  if (isAbortError(error)) {
    return fareFailure('timeout');
  }

  return fareFailure('unreachable');
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const malformed = (): FareApiError => createFareError('malformed');

const isProvider = (value: unknown): value is RideProvider =>
  typeof value === 'string' && PROVIDERS.includes(value as RideProvider);

const isCategory = (value: unknown): value is RideCategory =>
  typeof value === 'string' && CATEGORIES.includes(value as RideCategory);

const isSource = (value: unknown): value is FareQuoteSource =>
  typeof value === 'string' && SOURCES.includes(value as FareQuoteSource);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0;

const isNonNegativeInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0;

function parseEstimate(value: unknown): FareEstimate {
  if (!isRecord(value)) {
    throw malformed();
  }

  const { id, provider, category, tierLabel, fare, currency, etaMinutes } = value;
  const { available } = value;

  if (!isNonEmptyString(id)) {
    throw malformed();
  }

  if (!isProvider(provider) || !isCategory(category)) {
    throw malformed();
  }

  if (!isNonEmptyString(tierLabel)) {
    throw malformed();
  }

  if (!isNonNegativeInteger(fare) || !isNonNegativeInteger(etaMinutes)) {
    throw malformed();
  }

  if (!isNonEmptyString(currency) || typeof available !== 'boolean') {
    throw malformed();
  }

  return {
    id,
    provider,
    category,
    tierLabel,
    fare,
    currency,
    etaMinutes,
    available,
  };
}

/**
 * Validates an untrusted response and maps it onto the app's fare types.
 *
 * The estimates are checked field by field because they are the numbers the
 * rider reads; `pickup`, `destination` and `notice` are not used by the screen
 * and are ignored, so the backend can grow them without breaking this client.
 *
 * @throws {FareApiError} with kind `malformed` on anything unexpected.
 */
export function parseFareComparisonResponse(
  payload: unknown,
): FareComparisonResult {
  if (!isRecord(payload)) {
    throw malformed();
  }

  const { source, estimates } = payload;

  if (!isSource(source) || !Array.isArray(estimates)) {
    throw malformed();
  }

  return { source, estimates: estimates.map(parseEstimate) };
}
