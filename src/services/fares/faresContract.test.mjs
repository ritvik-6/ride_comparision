import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createFareError,
  FARES_COMPARE_PATH,
  fareFailure,
  parseFareComparisonResponse,
  toFareApiFailure,
  toFareRequest,
} from './faresContract.ts';

/**
 * Request mapping, response validation and error copy for the fares endpoint.
 * Run with `npm test`; faresContract has no runtime imports, so Node can load
 * it directly.
 */

const place = (id, name, address, coordinates) => ({
  id,
  name,
  address,
  ...(coordinates ? { coordinates } : {}),
});

const HITECH_CITY = place(
  'hitech-city',
  'Hitech City',
  'HITEC City, Madhapur, Hyderabad',
  { latitude: 17.4435, longitude: 78.3772 },
);

const GACHIBOWLI = place('gachibowli', 'Gachibowli', 'Gachibowli, Hyderabad');

const estimate = (overrides = {}) => ({
  id: 'rapido-bike',
  provider: 'rapido',
  category: 'bike',
  tierLabel: 'Bike',
  fare: 45,
  currency: 'INR',
  etaMinutes: 2,
  available: true,
  ...overrides,
});

const backendResponse = (overrides = {}) => ({
  source: 'demo',
  notice:
    'Fares and ETAs are sample data for this build. They are not live prices from Rapido, Uber or Ola.',
  pickup: { id: 'hitech-city', name: 'Hitech City', address: 'HITEC City', coordinates: null },
  destination: { id: 'airport', name: 'Airport', address: 'Shamshabad', coordinates: null },
  estimates: [estimate()],
  ...overrides,
});

test('the endpoint path matches the FastAPI route', () => {
  assert.equal(FARES_COMPARE_PATH, '/api/v1/fares/compare');
});

test('request carries the ids, names and addresses', () => {
  assert.deepEqual(toFareRequest(HITECH_CITY, GACHIBOWLI), {
    pickup: {
      id: 'hitech-city',
      name: 'Hitech City',
      address: 'HITEC City, Madhapur, Hyderabad',
      coordinates: { latitude: 17.4435, longitude: 78.3772 },
    },
    destination: {
      id: 'gachibowli',
      name: 'Gachibowli',
      address: 'Gachibowli, Hyderabad',
    },
  });
});

test('request omits coordinates for mock places', () => {
  const body = toFareRequest(GACHIBOWLI, GACHIBOWLI);

  assert.equal('coordinates' in body.pickup, false);
  assert.equal('coordinates' in body.destination, false);
});

test('request drops unusable coordinates instead of sending a bad pair', () => {
  const cases = [
    { latitude: 200, longitude: 78.3772 },
    { latitude: 17.4435, longitude: 400 },
    { latitude: Number.NaN, longitude: 78.3772 },
    { latitude: 17.4435 },
  ];

  for (const coordinates of cases) {
    const broken = place('broken', 'Broken', 'Nowhere', coordinates);
    const body = toFareRequest(broken, GACHIBOWLI);

    assert.equal(
      'coordinates' in body.pickup,
      false,
      `expected ${JSON.stringify(coordinates)} to be dropped`,
    );
  }
});

test('request carries the measured road route', () => {
  const body = toFareRequest(HITECH_CITY, GACHIBOWLI, {
    distanceKm: 12.4,
    durationMinutes: 28,
  });

  assert.deepEqual(body.route, { distanceKm: 12.4, durationMinutes: 28 });
});

test('request omits an absent or implausible route rather than sending one', () => {
  const cases = [
    null,
    undefined,
    { distanceKm: 0, durationMinutes: 20 },
    { distanceKm: -4, durationMinutes: 20 },
    { distanceKm: 8, durationMinutes: 0 },
    { distanceKm: 600, durationMinutes: 20 },
    { distanceKm: 20, durationMinutes: 5_000 },
    { distanceKm: Number.NaN, durationMinutes: 20 },
  ];

  for (const route of cases) {
    const body = toFareRequest(HITECH_CITY, GACHIBOWLI, route);

    assert.equal(
      'route' in body,
      false,
      `expected ${JSON.stringify(route)} to be dropped`,
    );
  }
});

test('a request without route metrics keeps the previous payload', () => {
  assert.deepEqual(
    toFareRequest(HITECH_CITY, GACHIBOWLI),
    toFareRequest(HITECH_CITY, GACHIBOWLI, null),
  );
});

test('response maps onto the app fare types', () => {
  const result = parseFareComparisonResponse(
    backendResponse({
      estimates: [
        estimate(),
        estimate({
          id: 'uber-cab',
          provider: 'uber',
          category: 'cab',
          tierLabel: 'Go',
          fare: 210,
          etaMinutes: 7,
          available: true,
        }),
        estimate({
          id: 'rapido-cab',
          provider: 'rapido',
          category: 'cab',
          tierLabel: 'Cab',
          fare: 190,
          etaMinutes: 6,
          available: false,
        }),
      ],
    }),
  );

  assert.equal(result.source, 'demo');
  assert.deepEqual(
    result.estimates.map((item) => item.id),
    ['rapido-bike', 'uber-cab', 'rapido-cab'],
  );
  assert.deepEqual(result.estimates[1], {
    id: 'uber-cab',
    provider: 'uber',
    category: 'cab',
    tierLabel: 'Go',
    fare: 210,
    currency: 'INR',
    etaMinutes: 7,
    available: true,
  });
  assert.equal(result.estimates[2].available, false);
});

test('response keeps the server values rather than recomputing them', () => {
  const result = parseFareComparisonResponse(
    backendResponse({
      estimates: [estimate({ fare: 47, etaMinutes: 11 })],
    }),
  );

  assert.equal(result.estimates[0].fare, 47);
  assert.equal(result.estimates[0].etaMinutes, 11);
});

test('unused envelope fields and unknown estimate keys are tolerated', () => {
  const result = parseFareComparisonResponse(
    backendResponse({
      serverTime: '2026-01-01T00:00:00Z',
      estimates: [{ ...estimate(), surgeMultiplier: 1.2 }],
    }),
  );

  assert.equal(result.estimates.length, 1);
  assert.equal(result.estimates[0].fare, 45);
});

test('an empty estimate list is valid', () => {
  const result = parseFareComparisonResponse(backendResponse({ estimates: [] }));

  assert.deepEqual(result.estimates, []);
});

test('malformed responses throw a malformed failure', () => {
  const cases = {
    'not an object': 'nope',
    null: null,
    array: [],
    'missing estimates': { source: 'demo' },
    'estimates not an array': backendResponse({ estimates: {} }),
    'unknown source': backendResponse({ source: 'live' }),
    'missing source': { estimates: [] },
    'estimate not an object': backendResponse({ estimates: ['rapido-bike'] }),
    'unknown provider': backendResponse({ estimates: [estimate({ provider: 'lyft' })] }),
    'unknown category': backendResponse({ estimates: [estimate({ category: 'suv' })] }),
    'empty id': backendResponse({ estimates: [estimate({ id: '' })] }),
    'missing tierLabel': backendResponse({ estimates: [estimate({ tierLabel: undefined })] }),
    'fare as string': backendResponse({ estimates: [estimate({ fare: '45' })] }),
    'negative fare': backendResponse({ estimates: [estimate({ fare: -5 })] }),
    'fractional fare': backendResponse({ estimates: [estimate({ fare: 45.5 })] }),
    'NaN fare': backendResponse({ estimates: [estimate({ fare: Number.NaN })] }),
    'eta as string': backendResponse({ estimates: [estimate({ etaMinutes: '2' })] }),
    'negative eta': backendResponse({ estimates: [estimate({ etaMinutes: -1 })] }),
    'empty currency': backendResponse({ estimates: [estimate({ currency: '' })] }),
    'available as string': backendResponse({ estimates: [estimate({ available: 'true' })] }),
  };

  for (const [label, payload] of Object.entries(cases)) {
    assert.throws(
      () => parseFareComparisonResponse(payload),
      (error) => {
        assert.equal(error.name, 'FareApiError', label);
        assert.equal(error.kind, 'malformed', label);
        assert.equal(error.canRetry, true, label);
        return true;
      },
      label,
    );
  }
});

test('HTTP status maps to retryable and non-retryable copy', () => {
  const server = toFareApiFailure({ status: 500 });
  const unavailable = toFareApiFailure({ status: 503 });
  const rejected = toFareApiFailure({ status: 422 });
  const badRequest = toFareApiFailure({ status: 400 });
  const notFound = toFareApiFailure({ status: 404 });

  assert.equal(server.kind, 'server');
  assert.equal(server.canRetry, true);
  assert.equal(server.status, 500);

  assert.equal(unavailable.kind, 'server');
  assert.equal(rejected.kind, 'rejected');
  assert.equal(rejected.canRetry, false);
  assert.equal(badRequest.kind, 'rejected');
  assert.equal(notFound.kind, 'server');
});

test('transport failures map to unreachable or timeout', () => {
  const network = toFareApiFailure(new TypeError('Network request failed'));

  const timeout = toFareApiFailure(
    Object.assign(new Error('aborted'), { name: 'AbortError' }),
  );

  assert.equal(network.kind, 'unreachable');
  assert.equal(network.canRetry, true);

  assert.equal(timeout.kind, 'timeout');
  assert.equal(timeout.canRetry, true);
});

test('a missing base URL is reported as unconfigured, not unreachable', () => {
  // apiRequest signals "no base URL" with status 0.
  const failure = toFareApiFailure({
    status: 0,
    message: 'EXPO_PUBLIC_API_BASE_URL is not configured.',
  });

  assert.equal(failure.kind, 'unconfigured');
  assert.equal(failure.canRetry, false);
});

test('unknown throwables fall back to unreachable', () => {
  for (const thrown of [undefined, null, 'boom', 42, {}]) {
    const failure = toFareApiFailure(thrown);

    assert.equal(failure.kind, 'unreachable');
    assert.ok(failure.title.length > 0);
    assert.ok(failure.message.length > 0);
  }
});

test('a FareApiError is passed through with its own kind', () => {
  const thrown = createFareError('unconfigured');
  const failure = toFareApiFailure(thrown);

  assert.ok(thrown instanceof Error);
  assert.equal(thrown.name, 'FareApiError');
  assert.equal(failure.kind, 'unconfigured');
  assert.equal(failure.canRetry, false);
});

test('every failure has copy and never claims live fares', () => {
  const kinds = [
    'unconfigured',
    'unreachable',
    'timeout',
    'rejected',
    'server',
    'malformed',
  ];

  for (const kind of kinds) {
    const failure = fareFailure(kind);

    assert.ok(failure.title.length > 0, kind);
    assert.ok(failure.message.length > 0, kind);
    assert.equal(
      /live (fare|price)/i.test(`${failure.title} ${failure.message}`),
      false,
      `${kind} must not describe demo data as live`,
    );
  }
});
