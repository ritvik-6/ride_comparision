import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildProviderLink,
  buildUberLink,
  getLinkHost,
} from './providerLinks.ts';

/**
 * URL construction tests. Run with `npm test` (Node's built-in runner), which
 * needs no extra dependencies: providerLinks has no runtime imports to resolve.
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

const AIRPORT = place(
  'airport',
  'Rajiv Gandhi International Airport',
  'Shamshabad, Hyderabad',
  { latitude: 17.2403, longitude: 78.4294 },
);

const MOCK_NO_COORDINATES = place(
  'gachibowli',
  'Gachibowli',
  'Gachibowli, Hyderabad',
);

const readParams = (url) => new URL(url).searchParams;

test('Uber link carries both locations when coordinates exist', () => {
  const { url, includesRoute } = buildUberLink(HITECH_CITY, AIRPORT);
  const params = readParams(url);

  assert.equal(includesRoute, true);
  assert.ok(url.startsWith('https://m.uber.com/looking?'));
  assert.equal(url.includes('uber://'), false);

  assert.deepEqual(JSON.parse(params.get('pickup')), {
    latitude: 17.4435,
    longitude: 78.3772,
    addressLine1: 'Hitech City',
    addressLine2: 'HITEC City, Madhapur, Hyderabad',
  });

  assert.deepEqual(JSON.parse(params.get('drop[0]')), {
    latitude: 17.2403,
    longitude: 78.4294,
    addressLine1: 'Rajiv Gandhi International Airport',
    addressLine2: 'Shamshabad, Hyderabad',
  });
});

test('Uber link omits credentials and product parameters it was not given', () => {
  const { url } = buildUberLink(HITECH_CITY, AIRPORT);
  const params = readParams(url);

  assert.deepEqual([...params.keys()].sort(), ['drop[0]', 'pickup']);
  assert.equal(params.has('client_id'), false);
  assert.equal(params.has('product_id'), false);
});

test('Uber falls back to the general experience when coordinates are missing', () => {
  for (const [pickup, destination] of [
    [MOCK_NO_COORDINATES, AIRPORT],
    [HITECH_CITY, MOCK_NO_COORDINATES],
    [MOCK_NO_COORDINATES, MOCK_NO_COORDINATES],
  ]) {
    const link = buildProviderLink({ provider: 'uber', pickup, destination });

    assert.equal(link.url, 'https://m.uber.com/');
    assert.equal(link.includesRoute, false);
    assert.equal(link.kind, 'website');
  }
});

test('Uber rejects out-of-range and half coordinate pairs', () => {
  const cases = [
    { latitude: 200, longitude: 78.3772 },
    { latitude: 17.4435, longitude: 400 },
    { latitude: Number.NaN, longitude: 78.3772 },
    { latitude: 17.4435 },
    { longitude: 78.3772 },
  ];

  for (const coordinates of cases) {
    const pickup = place('broken', 'Broken place', 'Nowhere', coordinates);
    const { url, includesRoute } = buildUberLink(pickup, AIRPORT);

    assert.equal(url, 'https://m.uber.com/');
    assert.equal(includesRoute, false);
  }
});

test('Ola always opens the official booking page without affiliate tokens', () => {
  for (const [pickup, destination] of [
    [HITECH_CITY, AIRPORT],
    [MOCK_NO_COORDINATES, AIRPORT],
  ]) {
    const link = buildProviderLink({ provider: 'ola', pickup, destination });

    assert.equal(link.url, 'https://book.olacabs.com/');
    assert.equal(link.kind, 'website');
    assert.equal(link.includesRoute, false);
    assert.equal(link.url.includes('utm_source'), false);
  }
});

test('Rapido always opens its official website', () => {
  const link = buildProviderLink({
    provider: 'rapido',
    pickup: HITECH_CITY,
    destination: AIRPORT,
  });

  assert.equal(link.url, 'https://www.rapido.bike/');
  assert.equal(link.kind, 'website');
  assert.equal(link.includesRoute, false);
});

test('every provider link is https and names the provider', () => {
  for (const provider of ['rapido', 'uber', 'ola']) {
    const link = buildProviderLink({
      provider,
      pickup: HITECH_CITY,
      destination: AIRPORT,
    });

    assert.ok(link.url.startsWith('https://'), `${provider} must use https`);
    assert.ok(link.name.length > 0);
  }
});

test('error copy can name the host', () => {
  assert.equal(getLinkHost('https://m.uber.com/looking?pickup=%7B%7D'), 'm.uber.com');
  assert.equal(getLinkHost('https://book.olacabs.com/'), 'book.olacabs.com');
});
