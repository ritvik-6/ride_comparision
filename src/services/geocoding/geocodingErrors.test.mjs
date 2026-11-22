import assert from 'node:assert/strict';
import test from 'node:test';

import { RETRYABLE_LOOKUP_ERROR_KINDS, lookupPoint } from './lookupPoint.ts';
import {
  GeocodingError,
  GEOCODING_MESSAGES,
  geocodingErrorForStatus,
  isGeocodingError,
  isRetryableGeocodingErrorKind,
  RETRYABLE_GEOCODING_ERRORS,
} from './types.ts';

/**
 * Error mapping. Both modules are import-free at runtime, so this runs offline
 * and pins the difference between "try again" and "try something else".
 */

const POINT = { latitude: 17.4435, longitude: 78.3772 };

test('403 is a permanent block, not a retryable rejection', () => {
  const error = geocodingErrorForStatus(403);

  assert.ok(isGeocodingError(error));
  assert.equal(error.kind, 'blocked');
  assert.equal(error.status, 403);
  assert.equal(error.message, GEOCODING_MESSAGES.blocked);
  assert.equal(isRetryableGeocodingErrorKind('blocked'), false);
  assert.equal(
    error.message.includes('Retry'),
    false,
    'the copy points at the map instead of promising a retry',
  );
});

test('429 is rate limiting and stays retryable', () => {
  const error = geocodingErrorForStatus(429);

  assert.equal(error.kind, 'rate-limited');
  assert.equal(error.status, 429);
  assert.equal(isRetryableGeocodingErrorKind('rate-limited'), true);
});

test('server errors look like transport failures', () => {
  for (const status of [500, 502, 503]) {
    const error = geocodingErrorForStatus(status);
    assert.equal(error.kind, 'network', `HTTP ${status}`);
    assert.equal(error.status, status);
    assert.equal(isRetryableGeocodingErrorKind('network'), true);
  }
});

test('a malformed request is rejected and not retryable', () => {
  for (const status of [400, 404, 422]) {
    const error = geocodingErrorForStatus(status);
    assert.equal(error.kind, 'rejected', `HTTP ${status}`);
    assert.equal(isRetryableGeocodingErrorKind('rejected'), false);
  }
});

test('cancellation is never offered to the rider as a failure', () => {
  assert.equal(isRetryableGeocodingErrorKind('cancelled'), false);
});

test('the retryable lists in both modules stay identical', () => {
  assert.deepEqual(
    [...RETRYABLE_LOOKUP_ERROR_KINDS].sort(),
    [...RETRYABLE_GEOCODING_ERRORS].sort(),
  );
});

test('a blocked reverse lookup keeps the pin and offers no retry', async () => {
  const outcome = await lookupPoint(
    {
      reverse: async () => {
        throw geocodingErrorForStatus(403);
      },
    },
    POINT,
  );

  assert.equal(outcome.status, 'unaddressed');
  assert.ok(outcome.status === 'unaddressed');
  assert.equal(outcome.retryable, false);
  assert.equal(outcome.message, GEOCODING_MESSAGES.blocked);
  assert.equal(outcome.location.latitude, POINT.latitude);
  assert.equal(outcome.location.longitude, POINT.longitude);
});

test('a timed-out reverse lookup keeps the pin and offers a retry', async () => {
  const outcome = await lookupPoint(
    {
      reverse: async () => {
        throw new GeocodingError('timeout', GEOCODING_MESSAGES.timeout);
      },
    },
    POINT,
  );

  assert.ok(outcome.status === 'unaddressed');
  assert.equal(outcome.retryable, true);
  assert.equal(outcome.message, GEOCODING_MESSAGES.timeout);
});

test('an empty neighbourhood is reported without a retry', async () => {
  const outcome = await lookupPoint({ reverse: async () => null }, POINT);

  assert.ok(outcome.status === 'unaddressed');
  assert.equal(outcome.retryable, false);
});
