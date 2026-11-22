import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildPhotonReverseUrl,
  buildPhotonSearchUrl,
  parsePhotonFeature,
  parsePhotonResponse,
  PHOTON_MIN_QUERY_LENGTH,
  PHOTON_RESULT_LIMIT,
} from './photonMapping.ts';

/**
 * Mapping tests. `photonMapping` has no runtime imports, so these run in Node
 * with no bundler and no network.
 */

const searchParams = (url) => new URL(url).searchParams;

const feature = (overrides = {}) => ({
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [78.3772, 17.4435] },
  properties: {
    name: 'HITEC City',
    district: 'Madhapur',
    city: 'Hyderabad',
    state: 'Telangana',
    country: 'India',
    osm_type: 'N',
    osm_id: 240109189,
    ...overrides,
  },
});

test('search URL carries the query, limit and language', () => {
  const url = buildPhotonSearchUrl('https://photon.komoot.io', 'hitec city');
  const params = searchParams(url);

  assert.ok(url.startsWith('https://photon.komoot.io/api?'));
  assert.equal(params.get('q'), 'hitec city');
  assert.equal(params.get('limit'), String(PHOTON_RESULT_LIMIT));
  assert.equal(params.get('lang'), 'en');
  assert.equal(params.has('lat'), false, 'no bias unless one is given');
});

test('search URL adds a location bias and clamps the limit', () => {
  const params = searchParams(
    buildPhotonSearchUrl('https://example.test/', '  gachibowli  ', {
      bias: { latitude: 17.4435, longitude: 78.3772 },
      limit: 50,
    }),
  );

  assert.equal(params.get('q'), 'gachibowli', 'query is trimmed');
  assert.equal(params.get('limit'), '10', 'limit never exceeds the server cap');
  assert.equal(params.get('lat'), '17.4435');
  assert.equal(params.get('lon'), '78.3772');
  assert.equal(params.get('zoom'), '13');
});

test('a trailing slash on the base URL does not double up', () => {
  const url = buildPhotonSearchUrl('https://photon.example///', 'madhapur');

  assert.ok(url.startsWith('https://photon.example/api?'));
});

test('reverse URL asks for one nearby result', () => {
  const params = searchParams(
    buildPhotonReverseUrl('https://photon.komoot.io', {
      latitude: 17.4239,
      longitude: 78.4738,
    }),
  );

  assert.equal(params.get('lat'), '17.4239');
  assert.equal(params.get('lon'), '78.4738');
  assert.equal(params.get('limit'), '1');
  assert.equal(params.get('lang'), 'en');
});

test('a feature becomes a search-sourced location with an OSM id', () => {
  const location = parsePhotonFeature(feature());

  assert.ok(location);
  assert.equal(location.displayName, 'HITEC City');
  assert.equal(location.formattedAddress, 'Madhapur, Hyderabad, Telangana, India');
  assert.equal(location.latitude, 17.4435);
  assert.equal(location.longitude, 78.3772);
  assert.equal(location.placeId, 'photon:N:240109189');
  assert.equal(location.source, 'search');
});

test('street addresses keep house number before street', () => {
  const location = parsePhotonFeature(
    feature({
      name: undefined,
      housenumber: '3',
      street: 'Olympischer Platz',
      district: undefined,
      city: 'Berlin',
      state: 'Berlin',
      country: 'Germany',
    }),
  );

  assert.ok(location);
  assert.equal(location.displayName, '3 Olympischer Platz');
  assert.equal(location.formattedAddress, '3 Olympischer Platz, Berlin, Germany');
});

test('duplicate address parts are collapsed', () => {
  const location = parsePhotonFeature(
    feature({
      name: 'Secunderabad',
      district: undefined,
      city: 'Secunderabad',
      state: 'Telangana',
      country: 'India',
    }),
  );

  assert.ok(location);
  assert.equal(
    location.formattedAddress,
    'Secunderabad, Telangana, India',
    'the city is named once',
  );
});

test('unusable features are dropped instead of invented', () => {
  assert.equal(parsePhotonFeature(null), null);
  assert.equal(parsePhotonFeature({ properties: {} }), null, 'no geometry');
  assert.equal(
    parsePhotonFeature({
      geometry: { type: 'Point', coordinates: [200, 17.4] },
      properties: { name: 'Broken' },
    }),
    null,
    'out-of-range longitude',
  );
  assert.equal(
    parsePhotonFeature({
      geometry: { type: 'Point', coordinates: [78.3, 17.4] },
      properties: {},
    }),
    null,
    'no name and no address',
  );
});

test('collections are parsed, de-duplicated and ordered', () => {
  const locations = parsePhotonResponse({
    type: 'FeatureCollection',
    features: [
      feature(),
      feature({ osm_id: 999 }),
      feature(), // duplicate OSM id
      { type: 'Feature', geometry: null, properties: {} },
    ],
  });

  assert.ok(locations);
  assert.equal(locations.length, 2);
  assert.deepEqual(
    locations.map((location) => location.placeId),
    ['photon:N:240109189', 'photon:N:999'],
  );
});

test('an empty collection is an empty result, a bad payload is not', () => {
  assert.deepEqual(parsePhotonResponse({ features: [] }), []);
  assert.equal(parsePhotonResponse({ nope: true }), null);
  assert.equal(parsePhotonResponse('not json'), null);
  assert.equal(parsePhotonResponse(null), null);
});

test('the minimum query length keeps short typing off the network', () => {
  assert.equal(PHOTON_MIN_QUERY_LENGTH, 3);
});
