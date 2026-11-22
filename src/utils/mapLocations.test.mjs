import assert from 'node:assert/strict';
import test from 'node:test';

import {
  coordinateKey,
  describeCoordinates,
  fromPlace,
  isValidCoordinates,
  toPlace,
} from './mapLocations.ts';

/**
 * Conversion tests. Run with `npm test`; mapLocations has no runtime imports, so
 * Node's type stripping can load it directly.
 */

const HITEC = {
  latitude: 17.4435,
  longitude: 78.3772,
  displayName: 'HITEC City',
  formattedAddress: 'HITEC City, Madhapur, Hyderabad, Telangana, India',
  placeId: 'photon:N:240109189',
  source: 'search',
};

test('a searched location keeps its provider id and real coordinates', () => {
  const place = toPlace(HITEC);

  assert.equal(place.id, 'photon:N:240109189');
  assert.equal(place.name, 'HITEC City');
  assert.equal(place.address, 'HITEC City, Madhapur, Hyderabad, Telangana, India');
  assert.deepEqual(place.coordinates, {
    latitude: 17.4435,
    longitude: 78.3772,
  });
});

test('a dropped pin without a provider id gets a stable coordinate id', () => {
  const pin = {
    latitude: 17.423912345,
    longitude: 78.473812345,
    displayName: 'Dropped pin',
    formattedAddress: 'Road No. 1, Banjara Hills, Hyderabad',
    source: 'map',
  };

  const first = toPlace(pin);
  const second = toPlace({ ...pin });

  assert.equal(first.id, 'pin:17.42391,78.47381');
  assert.equal(first.id, second.id, 'id must be stable for the same point');
});

test('coordinate-only places are converted with their source preserved', () => {
  const location = fromPlace(
    {
      id: 'current-17.44350,78.37720',
      name: 'HITEC City',
      address: 'HITEC City, Madhapur',
      coordinates: { latitude: 17.4435, longitude: 78.3772 },
    },
    'gps',
  );

  assert.ok(location);
  assert.equal(location.source, 'gps');
  assert.equal(location.placeId, 'current-17.44350,78.37720');
  assert.equal(location.displayName, 'HITEC City');
});

test('mock places without coordinates never become a map location', () => {
  const location = fromPlace(
    { id: 'gachibowli', name: 'Gachibowli', address: 'Gachibowli, Hyderabad' },
    'search',
  );

  assert.equal(location, null);
});

test('out-of-range and half coordinate pairs are rejected', () => {
  for (const coordinates of [
    { latitude: 200, longitude: 78.3772 },
    { latitude: 17.4435, longitude: 400 },
    { latitude: Number.NaN, longitude: 78.3772 },
  ]) {
    assert.equal(
      fromPlace({ id: 'x', name: 'X', address: 'Y', coordinates }, 'map'),
      null,
    );
    assert.equal(isValidCoordinates(coordinates), false);
  }

  assert.equal(isValidCoordinates(null), false);
  assert.equal(isValidCoordinates(undefined), false);
});

test('coordinate helpers describe points consistently', () => {
  assert.equal(
    describeCoordinates({ latitude: 17.4239, longitude: 78.4738 }),
    '17.42390, 78.47380',
  );
  // Differences below the fifth decimal are the same pin.
  assert.equal(
    coordinateKey({ latitude: 17.4239001, longitude: 78.4738009 }),
    coordinateKey({ latitude: 17.4239, longitude: 78.4738 }),
  );
});
