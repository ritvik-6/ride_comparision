import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ADDRESS_LOOKUP_FAILED,
  DROPPED_PIN_LABEL,
  describePoint,
  lookupPoint,
  NO_ADDRESS_NEAR_POINT,
  pendingLocation,
} from './lookupPoint.ts';

/**
 * Reverse-geocoding behaviour. A fake provider keeps this deterministic and
 * offline.
 */

const POINT = { latitude: 17.4239, longitude: 78.4738 };

const providerReturning = (result) => ({
  reverse: async () => result,
});

const providerThrowing = (error) => ({
  reverse: async () => {
    throw error;
  },
});

test('a resolved address is used and tagged as a map selection', async () => {
  const outcome = await lookupPoint(
    providerReturning({
      latitude: 17.4239,
      longitude: 78.4738,
      displayName: 'Road No. 1',
      formattedAddress: 'Road No. 1, Banjara Hills, Hyderabad',
      placeId: 'photon:W:1',
      source: 'search',
    }),
    POINT,
  );

  assert.equal(outcome.status, 'resolved');
  assert.ok(outcome.status === 'resolved');
  assert.equal(outcome.location.displayName, 'Road No. 1');
  assert.equal(outcome.location.source, 'map', 'a tap is a map selection');
  assert.equal(outcome.location.placeId, 'photon:W:1');
});

test('no nearby place keeps the tapped pin with a clear reason', async () => {
  const outcome = await lookupPoint(providerReturning(null), POINT);

  assert.equal(outcome.status, 'unaddressed');
  assert.ok(outcome.status === 'unaddressed');
  assert.equal(outcome.message, NO_ADDRESS_NEAR_POINT);
  assert.deepEqual(outcome.location, pendingLocation(POINT));
  assert.equal(outcome.location.displayName, DROPPED_PIN_LABEL);
  assert.equal(outcome.location.formattedAddress, describePoint(POINT));
});

test('a failed lookup still returns the tapped point', async () => {
  const outcome = await lookupPoint(
    providerThrowing(new Error('The place search took too long.')),
    POINT,
  );

  assert.equal(outcome.status, 'unaddressed');
  assert.ok(outcome.status === 'unaddressed');
  assert.equal(outcome.message, 'The place search took too long.');
  assert.equal(outcome.location.latitude, POINT.latitude);
  assert.equal(outcome.location.longitude, POINT.longitude);
});

test('an error without a message falls back to the lookup copy', async () => {
  const outcome = await lookupPoint(providerThrowing('weird'), POINT);

  assert.ok(outcome.status === 'unaddressed');
  assert.equal(outcome.message, ADDRESS_LOOKUP_FAILED);
});

test('a cancelled lookup reports cancellation and changes nothing', async () => {
  const cancelled = await lookupPoint(
    providerThrowing(Object.assign(new Error('cancelled'), { kind: 'cancelled' })),
    POINT,
  );

  assert.deepEqual(cancelled, { status: 'cancelled' });

  const controller = new AbortController();
  controller.abort();

  const preAborted = await lookupPoint(providerReturning(null), POINT, controller.signal);
  assert.deepEqual(preAborted, { status: 'cancelled' });
});

test('the coordinate label is formatted consistently', () => {
  assert.equal(describePoint(POINT), '17.42390, 78.47380');
});
