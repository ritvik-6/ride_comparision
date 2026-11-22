import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildOsrmRouteUrl,
  isValidPoint,
  OSRM_DEFAULT_BASE_URL,
  parseOsrmRoute,
  toDistanceKm,
  toDurationMinutes,
} from './osrmMapping.ts';

/**
 * OSRM URL and response handling.
 *
 * OSRM expects `{longitude},{latitude}` pairs — the opposite order to the app's
 * model — so these tests pin the conversion as well as the parse contract.
 */

const HITECH = { latitude: 17.4435, longitude: 78.3772 };
const AIRPORT = { latitude: 17.2403, longitude: 78.4294 };

const okResponse = (overrides = {}) => ({
  code: 'Ok',
  routes: [
    {
      distance: 12_430.6,
      duration: 1_685.2,
      geometry: {
        type: 'LineString',
        coordinates: [
          [78.3772, 17.4435],
          [78.4011, 17.3921],
          [78.4294, 17.2403],
        ],
      },
      ...overrides,
    },
  ],
});

test('url uses longitude,latitude order', () => {
  const url = buildOsrmRouteUrl(OSRM_DEFAULT_BASE_URL, HITECH, AIRPORT);

  assert.ok(
    url.includes('/route/v1/driving/78.377200,17.443500;78.429400,17.240300'),
    url,
  );
  assert.ok(url.startsWith(`${OSRM_DEFAULT_BASE_URL}/route/v1/driving/`));
});

test('url asks for a drawable, minimal geometry', () => {
  const url = buildOsrmRouteUrl(OSRM_DEFAULT_BASE_URL, HITECH, AIRPORT);

  assert.ok(url.includes('overview=full'));
  assert.ok(url.includes('geometries=geojson'));
  assert.ok(url.includes('alternatives=false'));
  assert.ok(url.includes('steps=false'));
});

test('url tolerates a trailing slash on the base url', () => {
  assert.equal(
    buildOsrmRouteUrl('https://osrm.example.com/', HITECH, AIRPORT).startsWith(
      'https://osrm.example.com/route/v1/driving/',
    ),
    true,
  );
});

test('url refuses invalid coordinates instead of building a bad request', () => {
  assert.throws(
    () => buildOsrmRouteUrl(OSRM_DEFAULT_BASE_URL, { latitude: 200, longitude: 78 }, AIRPORT),
    RangeError,
  );
  assert.throws(
    () => buildOsrmRouteUrl(OSRM_DEFAULT_BASE_URL, HITECH, { latitude: 17, longitude: Number.NaN }),
    RangeError,
  );
});

test('coordinate validation matches the app bounds', () => {
  assert.equal(isValidPoint(HITECH), true);
  assert.equal(isValidPoint(null), false);
  assert.equal(isValidPoint({ latitude: 17.4 }), false);
  assert.equal(isValidPoint({ latitude: 91, longitude: 78 }), false);
  assert.equal(isValidPoint({ latitude: 17, longitude: -181 }), false);
});

test('parses distance, duration and the road geometry', () => {
  const result = parseOsrmRoute(okResponse());

  assert.equal(result.status, 'ok');

  if (result.status !== 'ok') {
    return;
  }

  assert.equal(result.plan.distanceMeters, 12_430.6);
  assert.equal(result.plan.durationSeconds, 1_685.2);
  assert.equal(result.plan.distanceKm, 12.4);
  assert.equal(result.plan.durationMinutes, 28);
  assert.deepEqual(result.plan.geometry, {
    type: 'LineString',
    coordinates: [
      [78.3772, 17.4435],
      [78.4011, 17.3921],
      [78.4294, 17.2403],
    ],
  });
});

test('rounds to the precision the UI shows', () => {
  assert.equal(toDistanceKm(849), 0.8);
  assert.equal(toDistanceKm(850), 0.9);
  assert.equal(toDistanceKm(12_430.6), 12.4);
  assert.equal(toDurationMinutes(1_685.2), 28);
  // A very short route never shows "0 min".
  assert.equal(toDurationMinutes(20), 1);
});

test('an unroutable pair is reported as no-route, not malformed', () => {
  assert.deepEqual(parseOsrmRoute({ code: 'NoRoute', routes: [] }), {
    status: 'no-route',
  });
  assert.deepEqual(parseOsrmRoute({ code: 'Ok', routes: [] }), {
    status: 'no-route',
  });
});

test('a broken payload is malformed so nothing is drawn or priced', () => {
  const cases = [
    null,
    [],
    'nope',
    {},
    { code: 12, routes: [] },
    { code: 'Ok' },
    { code: 'Ok', routes: [null] },
    okResponse({ distance: 0 }),
    okResponse({ distance: -5 }),
    okResponse({ distance: 'far' }),
    okResponse({ duration: 0 }),
    okResponse({ geometry: { type: 'Point', coordinates: [78, 17] } }),
    okResponse({ geometry: { type: 'LineString', coordinates: [[78.3, 17.4]] } }),
    okResponse({
      geometry: {
        type: 'LineString',
        coordinates: [
          [78.3772, 17.4435],
          [78.4294, 200],
        ],
      },
    }),
    okResponse({
      geometry: {
        type: 'LineString',
        coordinates: [
          [78.3772, 17.4435],
          [Number.NaN, 17.24],
        ],
      },
    }),
  ];

  for (const payload of cases) {
    assert.deepEqual(
      parseOsrmRoute(payload),
      { status: 'malformed' },
      `expected ${JSON.stringify(payload)} to be rejected`,
    );
  }
});
