import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildPhotonReverseUrl,
  buildPhotonSearchUrl,
  parsePhotonFeature,
  parsePhotonResponse,
  parsePhotonReverseResponse,
  photonRequestHeaders,
  PHOTON_MIN_QUERY_LENGTH,
  PHOTON_RESULT_LIMIT,
  PHOTON_REVERSE_LIMIT,
  PHOTON_USER_AGENT,
  scoreReverseFeature,
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

test('reverse URL asks for several candidates within one kilometre', () => {
  const params = searchParams(
    buildPhotonReverseUrl('https://photon.komoot.io', {
      latitude: 17.4239,
      longitude: 78.4738,
    }),
  );

  assert.equal(params.get('lat'), '17.4239');
  assert.equal(params.get('lon'), '78.4738');
  // One candidate was often an unusable feature (a way, a platform, a line);
  // several let the ranking pick a real street or landmark.
  assert.equal(params.get('limit'), String(PHOTON_REVERSE_LIMIT));
  assert.ok(PHOTON_REVERSE_LIMIT > 1);
  assert.equal(params.get('radius'), '1');
  assert.equal(params.get('lang'), 'en');
});

test('every request identifies the app and never looks like a bare HTTP client', () => {
  const headers = photonRequestHeaders();

  assert.equal(headers.Accept, 'application/json');
  assert.equal(headers['User-Agent'], PHOTON_USER_AGENT);
  // Regression guard for the bug this fixed: photokomoot answers 403 to
  // `okhttp/*`, which is what expo/fetch inherited when no agent was set.
  assert.equal(/^okhttp\//i.test(PHOTON_USER_AGENT), false);
  assert.match(PHOTON_USER_AGENT, /^RideCompare\//);
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

/** Properties as the public Photon instance returns them near Madhapur. */
const road = {
  osm_type: 'W',
  osm_id: 1209035335,
  osm_key: 'highway',
  type: 'street',
  name: 'HITEC City Road',
  locality: 'Madhapur',
  district: 'Ward 104 Kondapur',
  state: 'Telangana',
  country: 'India',
};

const unnamedPlatform = {
  osm_type: 'N',
  osm_id: 555,
  type: 'house',
  name: 'Platform 2',
};

const namedBuilding = {
  osm_type: 'W',
  osm_id: 777,
  type: 'house',
  name: 'Cyber Towers',
  street: 'HITEC City Road',
  locality: 'Madhapur',
  state: 'Telangana',
  country: 'India',
};

const reverseCollection = (features) => ({ type: 'FeatureCollection', features });

const pointFeature = (properties, coordinates = [78.3772, 17.4435]) => ({
  type: 'Feature',
  geometry: { type: 'Point', coordinates },
  properties,
});

test('reverse parsing prefers a street with its locality over a bare name', () => {
  const locations = parsePhotonReverseResponse(
    reverseCollection([
      pointFeature(unnamedPlatform, [78.3773, 17.4436]),
      pointFeature(road), // farther in the list, but the better answer
    ]),
  );

  assert.ok(locations);
  assert.equal(locations.length, 2);
  assert.equal(locations[0].displayName, 'HITEC City Road');
  assert.equal(
    locations[0].formattedAddress,
    'HITEC City Road, Madhapur, Telangana, India',
  );
  assert.equal(locations[1].displayName, 'Platform 2');
});

test('reverse ranking is stable for equal candidates', () => {
  const [first, second] = parsePhotonReverseResponse(
    reverseCollection([
      pointFeature({ ...road, osm_id: 1, name: 'Road One' }),
      pointFeature({ ...road, osm_id: 2, name: 'Road Two' }),
    ]),
  );

  // Equal scores keep the server's own distance order, so the same point
  // always resolves to the same place.
  assert.equal(first.displayName, 'Road One');
  assert.equal(second.displayName, 'Road Two');
});

test('a landmark outranks a road with fewer address parts', () => {
  assert.ok(scoreReverseFeature(pointFeature(namedBuilding)) > 0);
  assert.ok(
    scoreReverseFeature(pointFeature(namedBuilding)) >
      scoreReverseFeature(pointFeature(unnamedPlatform)),
  );
});

test('reverse parsing reports an unreadable payload instead of guessing', () => {
  assert.equal(parsePhotonReverseResponse({ nope: true }), null);
  assert.equal(parsePhotonReverseResponse(null), null);
  assert.deepEqual(parsePhotonReverseResponse(reverseCollection([])), []);
  assert.deepEqual(
    parsePhotonReverseResponse(reverseCollection([pointFeature({})])),
    [],
    'a feature with no name or address is dropped, never invented',
  );
});
