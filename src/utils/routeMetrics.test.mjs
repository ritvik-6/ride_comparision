import assert from 'node:assert/strict';
import test from 'node:test';

import { boundsOfLineString } from './routeBounds.ts';
import {
  formatDistance,
  formatDuration,
  formatRouteSummary,
  isValidRouteMetrics,
  MAX_ROUTE_DISTANCE_KM,
  MAX_ROUTE_DURATION_MINUTES,
  parseRouteMetricParam,
} from './routeMetrics.ts';

/** Route metric validation, formatting and camera framing. */

test('accepts plausible road metrics', () => {
  assert.equal(isValidRouteMetrics({ distanceKm: 12.4, durationMinutes: 28 }), true);
  assert.equal(isValidRouteMetrics({ distanceKm: 0.2, durationMinutes: 2 }), true);
});

test('rejects missing, zero, negative, non-finite and absurd metrics', () => {
  const cases = [
    null,
    undefined,
    { distanceKm: 0, durationMinutes: 10 },
    { distanceKm: -3, durationMinutes: 10 },
    { distanceKm: 10, durationMinutes: 0 },
    { distanceKm: 10, durationMinutes: -1 },
    { distanceKm: Number.NaN, durationMinutes: 10 },
    { distanceKm: 10, durationMinutes: Number.POSITIVE_INFINITY },
    { distanceKm: MAX_ROUTE_DISTANCE_KM + 1, durationMinutes: 10 },
    { distanceKm: 10, durationMinutes: MAX_ROUTE_DURATION_MINUTES + 1 },
  ];

  for (const value of cases) {
    assert.equal(isValidRouteMetrics(value), false, JSON.stringify(value));
  }
});

test('parses router params without inventing numbers', () => {
  assert.equal(parseRouteMetricParam('12.4'), 12.4);
  assert.equal(parseRouteMetricParam(' 7 '), 7);
  assert.equal(parseRouteMetricParam(undefined), null);
  assert.equal(parseRouteMetricParam(['12.4', '2']), null);
  assert.equal(parseRouteMetricParam(''), null);
  assert.equal(parseRouteMetricParam('far'), null);
});

test('formats distance for both metres and kilometres', () => {
  assert.equal(formatDistance(0.85), '850 m');
  assert.equal(formatDistance(0.999), '999 m');
  assert.equal(formatDistance(12.44), '12.4 km');
  assert.equal(formatDistance(0), '—');
  assert.equal(formatDistance(Number.NaN), '—');
});

test('formats duration with an hour rollover', () => {
  assert.equal(formatDuration(28), '28 min');
  assert.equal(formatDuration(59.6), '1 h 00 min');
  assert.equal(formatDuration(65), '1 h 05 min');
  assert.equal(formatDuration(120), '2 h 00 min');
  assert.equal(formatDuration(0), '—');
});

test('builds one route summary line', () => {
  assert.equal(
    formatRouteSummary({ distanceKm: 12.4, durationMinutes: 28 }),
    '12.4 km · 28 min drive',
  );
});

test('bounds cover the whole route geometry', () => {
  const bounds = boundsOfLineString({
    type: 'LineString',
    coordinates: [
      [78.3772, 17.4435],
      [78.4011, 17.3921],
      [78.4294, 17.2403],
    ],
  });

  assert.ok(bounds);

  const [west, south, east, north] = bounds;

  assert.ok(west < 78.3772 && west > 78.3772 - 0.001);
  assert.ok(south < 17.2403 && south > 17.2403 - 0.001);
  assert.ok(east > 78.4294 && east < 78.4294 + 0.001);
  assert.ok(north > 17.4435 && north < 17.4435 + 0.001);
});

test('a degenerate geometry still yields a fittable box', () => {
  const bounds = boundsOfLineString({
    type: 'LineString',
    coordinates: [
      [78.3772, 17.4435],
      [78.3772, 17.4435],
    ],
  });

  assert.ok(bounds);
  assert.ok(bounds[0] < bounds[2]);
  assert.ok(bounds[1] < bounds[3]);
});

test('unusable geometry yields no bounds so the camera is left alone', () => {
  assert.equal(boundsOfLineString({ type: 'LineString', coordinates: [] }), null);
  assert.equal(
    boundsOfLineString({
      type: 'LineString',
      coordinates: [[Number.NaN, 17.4], [78.4, 17.2]],
    }),
    null,
  );
});
