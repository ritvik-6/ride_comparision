import assert from 'node:assert/strict';
import test from 'node:test';

import { decideSelection } from './mapSelection.ts';

/** Selection rules for the pickup/destination bar. */

const place = (name) => ({
  latitude: 17.4435,
  longitude: 78.3772,
  displayName: name,
  formattedAddress: `${name}, Hyderabad`,
  source: 'map',
});

const PICKUP = place('HITEC City');
const DESTINATION = place('Charminar');

test('choosing pickup when no destination exists moves on to destination', () => {
  assert.deepEqual(decideSelection('pickup', null, null), {
    nextMode: 'destination',
    routeComplete: false,
  });
});

test('choosing destination when no pickup exists moves back to pickup', () => {
  assert.deepEqual(decideSelection('destination', null, null), {
    nextMode: 'pickup',
    routeComplete: false,
  });
});

test('choosing the missing end completes the route', () => {
  assert.deepEqual(decideSelection('destination', PICKUP, null), {
    nextMode: 'destination',
    routeComplete: true,
  });

  assert.deepEqual(decideSelection('pickup', null, DESTINATION), {
    nextMode: 'pickup',
    routeComplete: true,
  });
});

test('replacing an end of a complete route keeps the current field', () => {
  assert.deepEqual(decideSelection('pickup', PICKUP, DESTINATION), {
    nextMode: 'pickup',
    routeComplete: true,
  });

  assert.deepEqual(decideSelection('destination', PICKUP, DESTINATION), {
    nextMode: 'destination',
    routeComplete: true,
  });
});
