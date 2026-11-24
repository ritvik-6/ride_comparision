import assert from 'node:assert/strict';
import test from 'node:test';

import { shouldUseExpoGoMapFallback } from './mapRuntime.ts';

test('uses the fallback when the Expo Go native module is available', () => {
  assert.equal(
    shouldUseExpoGoMapFallback({
      isRunningInExpoGo: true,
      executionEnvironment: 'bare',
      appOwnership: null,
    }),
    true,
  );
});

test('uses the fallback for StoreClient with Expo ownership', () => {
  assert.equal(
    shouldUseExpoGoMapFallback({
      isRunningInExpoGo: false,
      executionEnvironment: 'storeClient',
      appOwnership: 'expo',
    }),
    true,
  );
});

test('uses the fallback for StoreClient with null ownership in Expo Go', () => {
  assert.equal(
    shouldUseExpoGoMapFallback({
      isRunningInExpoGo: true,
      executionEnvironment: 'storeClient',
      appOwnership: null,
    }),
    true,
  );
});

test('loads the native map in development clients', () => {
  assert.equal(
    shouldUseExpoGoMapFallback({
      isRunningInExpoGo: false,
      executionEnvironment: 'storeClient',
      appOwnership: null,
    }),
    false,
  );
});

test('loads the native map in standalone builds', () => {
  assert.equal(
    shouldUseExpoGoMapFallback({
      isRunningInExpoGo: false,
      executionEnvironment: 'standalone',
      appOwnership: null,
    }),
    false,
  );
});

test('loads the native map in bare builds', () => {
  assert.equal(
    shouldUseExpoGoMapFallback({
      isRunningInExpoGo: false,
      executionEnvironment: 'bare',
      appOwnership: null,
    }),
    false,
  );
});
