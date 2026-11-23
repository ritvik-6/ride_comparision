import assert from 'node:assert/strict';
import test from 'node:test';

import { shouldUseExpoGoMapFallback } from './mapRuntime.ts';

test('uses the fallback in Expo Go', () => {
  assert.equal(shouldUseExpoGoMapFallback('expo'), true);
});

test('loads the native map outside Expo Go', () => {
  assert.equal(shouldUseExpoGoMapFallback(null), false);
  assert.equal(shouldUseExpoGoMapFallback('standalone'), false);
});
