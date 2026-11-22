import assert from 'node:assert/strict';
import test from 'node:test';

import { isSamePoint, readPressCoordinates } from './mapPress.ts';

/**
 * Extraction tests for the MapLibre press payload.
 *
 * The package dispatches `lngLat: [longitude, latitude]` (see
 * `GeoJSONUtils.fromLatLng` in its Android source), so longitude must never be
 * read as latitude.
 */

const HITEC = { latitude: 17.4435, longitude: 78.3772 };

test('reads the documented [longitude, latitude] tuple in the right order', () => {
  assert.deepEqual(readPressCoordinates({ lngLat: [78.3772, 17.4435] }), HITEC);
});

test('tolerates a tuple delivered as an object with numeric keys', () => {
  assert.deepEqual(
    readPressCoordinates({ lngLat: { 0: 78.3772, 1: 17.4435 } }),
    HITEC,
  );
});

test('accepts a GeoJSON-style coordinates tuple', () => {
  assert.deepEqual(
    readPressCoordinates({ coordinates: [78.3772, 17.4435] }),
    HITEC,
  );
});

test('accepts a flat object payload', () => {
  assert.deepEqual(
    readPressCoordinates({ longitude: 78.3772, latitude: 17.4435 }),
    HITEC,
  );
  assert.deepEqual(readPressCoordinates({ lng: 78.3772, lat: 17.4435 }), HITEC);
});

test('rejects missing, malformed and out-of-range payloads', () => {
  for (const payload of [
    null,
    undefined,
    'not an event',
    {},
    { lngLat: [78.3772] },
    { lngLat: ['78.3772', '17.4435'] },
    { lngLat: [Number.NaN, 17.4435] },
    { lngLat: [200, 17.4435] },
    { lngLat: [78.3772, 200] },
  ]) {
    assert.equal(readPressCoordinates(payload), null);
  }
});

test('points compare at display precision', () => {
  assert.equal(isSamePoint(HITEC, { latitude: 17.4435001, longitude: 78.3772 }), true);
  assert.equal(isSamePoint(HITEC, { latitude: 17.45, longitude: 78.3772 }), false);
  assert.equal(isSamePoint(null, null), true);
  assert.equal(isSamePoint(HITEC, null), false);
});
