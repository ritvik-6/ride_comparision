import assert from 'node:assert/strict';
import test from 'node:test';

import {
  addRecentLocation,
  isStorableRecentLocation,
  MAX_RECENT_LOCATIONS,
  mergeRecentLocations,
  parseRecentLocations,
  readStoredRecentLocation,
  recentLocationKey,
  serializeRecentLocations,
} from './recentSearches.ts';

/**
 * Recent-search list tests. Run with `npm test` (Node's built-in runner); the
 * module has no runtime imports, so no bundler or storage mock is needed.
 */

const location = (overrides = {}) => ({
  latitude: 17.4435,
  longitude: 78.3772,
  displayName: 'HITEC City',
  formattedAddress: 'HITEC City, Madhapur, Hyderabad, Telangana, India',
  source: 'search',
  ...overrides,
});

const withId = (id, overrides = {}) => location({ placeId: id, ...overrides });

test('a new location goes to the top of the list', () => {
  const first = addRecentLocation([], location());
  const second = addRecentLocation(first, location({
    latitude: 17.2403,
    longitude: 78.4294,
    displayName: 'Rajiv Gandhi International Airport',
    formattedAddress: 'Shamshabad, Hyderabad, Telangana, India',
  }));

  assert.equal(second.length, 2);
  assert.equal(second[0].displayName, 'Rajiv Gandhi International Airport');
  assert.equal(second[1].displayName, 'HITEC City');
});

test('the list never exceeds the maximum', () => {
  let list = [];

  for (let index = 0; index < MAX_RECENT_LOCATIONS + 4; index += 1) {
    list = addRecentLocation(
      list,
      location({
        placeId: `place-${index}`,
        latitude: 17.4 + index / 100,
        displayName: `Place ${index}`,
        formattedAddress: `Place ${index}, Hyderabad`,
      }),
    );
  }

  assert.equal(list.length, MAX_RECENT_LOCATIONS);
  // Newest first, oldest dropped.
  assert.equal(list[0].displayName, `Place ${MAX_RECENT_LOCATIONS + 3}`);
  assert.equal(list.some((entry) => entry.displayName === 'Place 0'), false);
});

test('a repeated place id is moved to the top instead of duplicated', () => {
  const first = withId('photon:node:1', { displayName: 'HITEC City' });
  const second = withId('photon:node:2', { displayName: 'Gachibowli' });
  const list = addRecentLocation(addRecentLocation([], first), second);

  const bumped = addRecentLocation(list, {
    ...first,
    // A later visit resolves the same OSM place from a slightly different tap.
    latitude: 17.44351,
    longitude: 78.37721,
  });

  assert.equal(bumped.length, 2);
  assert.equal(bumped[0].placeId, 'photon:node:1');
  assert.equal(bumped[1].placeId, 'photon:node:2');
});

test('without a place id the normalized point and address identify a location', () => {
  const list = addRecentLocation([], location());
  const repeat = addRecentLocation(
    list,
    location({ formattedAddress: '  hitec city,   madhapur, hyderabad, telangana, india ' }),
  );

  // Same normalised identity, so one entry: the newest selection replaces the
  // older copy rather than being appended after it.
  assert.equal(repeat.length, 1);
  assert.equal(
    repeat[0].formattedAddress,
    'hitec city,   madhapur, hyderabad, telangana, india',
  );
});

test('different points without place ids stay separate', () => {
  const list = addRecentLocation(
    addRecentLocation([], location()),
    location({ latitude: 17.45 }),
  );

  assert.equal(list.length, 2);
  assert.equal(recentLocationKey(list[0]) === recentLocationKey(list[1]), false);
});

test('a place id wins over coordinates', () => {
  const a = withId('photon:node:9', { latitude: 17.1, longitude: 78.1 });
  const b = withId('photon:node:9', { latitude: 17.9, longitude: 78.9 });

  assert.equal(recentLocationKey(a), recentLocationKey(b));
});

test('unusable locations are never stored', () => {
  const invalid = [
    location({ latitude: Number.NaN }),
    location({ longitude: Number.POSITIVE_INFINITY }),
    location({ latitude: 200 }),
    location({ longitude: 400 }),
    location({ displayName: '   ' }),
    location({ formattedAddress: '' }),
  ];

  for (const candidate of invalid) {
    assert.equal(isStorableRecentLocation(candidate), false);
    assert.equal(addRecentLocation([], candidate).length, 0);
  }
});

test('adding an unusable location returns the same list reference', () => {
  const list = addRecentLocation([], location());

  assert.equal(addRecentLocation(list, location({ latitude: Number.NaN })), list);
});

test('stored payloads round-trip in order', () => {
  const list = addRecentLocation(
    addRecentLocation([], location()),
    withId('photon:node:2', { placeId: 'photon:node:2', displayName: 'Gachibowli' }),
  );

  const parsed = parseRecentLocations(serializeRecentLocations(list));

  assert.deepEqual(parsed, list);
  assert.equal(parsed[0].displayName, 'Gachibowli');
});

test('serialization keeps only the newest entries', () => {
  const list = Array.from({ length: MAX_RECENT_LOCATIONS + 2 }, (_, index) =>
    location({
      placeId: `place-${index}`,
      latitude: 17.4 + index / 100,
      displayName: `Place ${index}`,
    }),
  );

  const parsed = parseRecentLocations(serializeRecentLocations(list));

  assert.equal(parsed.length, MAX_RECENT_LOCATIONS);
});

test('corrupted payloads resolve to an empty list instead of throwing', () => {
  const corrupted = [
    null,
    undefined,
    '',
    'not json',
    '{',
    'null',
    '42',
    '"a string"',
    '{}',
    '{"version":1}',
    '{"version":1,"locations":"nope"}',
  ];

  for (const payload of corrupted) {
    assert.deepEqual(parseRecentLocations(payload), []);
  }
});

test('a valid entry survives alongside corrupted neighbours', () => {
  const payload = JSON.stringify({
    version: 1,
    locations: [
      null,
      { latitude: 'x', longitude: 'y', displayName: 'Broken', formattedAddress: 'Broken' },
      location(),
      { latitude: 300, longitude: 78, displayName: 'Out of range', formattedAddress: 'X' },
      { displayName: 'No coordinates', formattedAddress: 'X' },
    ],
  });

  const parsed = parseRecentLocations(payload);

  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].displayName, 'HITEC City');
});

test('duplicate stored entries collapse when parsed', () => {
  const payload = JSON.stringify({
    version: 1,
    locations: [withId('same'), withId('same', { displayName: 'HITEC City again' })],
  });

  const parsed = parseRecentLocations(payload);

  assert.equal(parsed.length, 1);
  // The first (newest) stored copy wins.
  assert.equal(parsed[0].displayName, 'HITEC City');
});

test('an unknown or missing source defaults to search', () => {
  const payload = JSON.stringify({
    version: 1,
    locations: [
      location({ placeId: 'a', source: 'telepathy' }),
      (() => {
        const { source, ...rest } = location({ placeId: 'b' });
        return rest;
      })(),
      location({ placeId: 'c', source: 'gps' }),
    ],
  });

  const parsed = parseRecentLocations(payload);

  assert.deepEqual(
    parsed.map((entry) => entry.source),
    ['search', 'search', 'gps'],
  );
});

test('a bare array payload is still read', () => {
  const parsed = parseRecentLocations(JSON.stringify([location()]));

  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].displayName, 'HITEC City');
});

test('only known fields are read from a stored entry', () => {
  const parsed = readStoredRecentLocation({
    ...location(),
    injected: 'ignored',
  });

  assert.deepEqual(parsed, location());
  assert.equal('injected' in (parsed ?? {}), false);
});

test('merging keeps newer in-memory entries above older stored ones', () => {
  const inMemory = addRecentLocation([], withId('new', { displayName: 'New' }));
  const stored = addRecentLocation(
    addRecentLocation([], withId('old', { displayName: 'Old' })),
    withId('new', { displayName: 'New, stale copy' }),
  );

  const merged = mergeRecentLocations(inMemory, stored);

  assert.deepEqual(
    merged.map((entry) => entry.displayName),
    ['New', 'Old'],
  );
});

test('merge also enforces the maximum', () => {
  const inMemory = Array.from({ length: MAX_RECENT_LOCATIONS }, (_, index) =>
    withId(`new-${index}`, { displayName: `New ${index}` }),
  );
  const stored = [withId('old-1', { displayName: 'Old 1' })];

  const merged = mergeRecentLocations(inMemory, stored);

  assert.equal(merged.length, MAX_RECENT_LOCATIONS);
  assert.equal(merged.some((entry) => entry.displayName === 'Old 1'), false);
});
