// Regenerates tests/fixtures/demo_fares_parity.json from the app's own
// TypeScript implementation.
//
//   node backend/tests/fixtures/generate_demo_fares_parity.mjs
//
// The fixture is what the Python port is tested against, so the expected numbers
// come from executing src/services/fares/demoFares.ts rather than from a
// hand-transcription of it. Run this again if the app's demo offers change.

import { readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import ts from 'typescript';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../../..');
const sourcePath = path.join(repoRoot, 'src/services/fares/demoFares.ts');
const fixturePath = path.join(here, 'demo_fares_parity.json');

/** Route id pairs. Includes Unicode and emoji to exercise UTF-16 hashing. */
const ROUTES = [
  ['hitech-city', 'airport'],
  ['gachibowli', 'secunderabad'],
  ['madhapur', 'jubilee-hills'],
  ['banjara-hills', 'kukatpally'],
  ['begumpet', 'charminar'],
  ['airport', 'hitech-city'],
  ['lb-nagar', 'hussain-sagar'],
  ['kondapur', 'financial-district'],
  ['ameerpet', 'madhapur'],
  ['secunderabad', 'kukatpally'],
  ['a', 'b'],
  ['', ''],
  ['hitech-city', 'hitech-city'],
  ['unicode-Ω-ü', 'emoji-🚕-🙂'],
  [`long-${'x'.repeat(200)}`, 'hitech-city'],
  ['HITECH-CITY', 'Airport'],
  ['0', '0'],
];

const source = await readFile(sourcePath, 'utf8');

// `import type` is erased by the transpiler, but the CURRENCY import is a value
// import from the app's path alias, which Node cannot resolve.
const withoutAlias = source.replace(
  /^import \{ CURRENCY \} from '@\/constants';$/m,
  "const CURRENCY = 'INR';",
);

if (withoutAlias === source) {
  throw new Error('Could not rewrite the CURRENCY import; has demoFares.ts changed?');
}

const { outputText } = ts.transpileModule(withoutAlias, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
  fileName: 'demoFares.ts',
});

const modulePath = path.join(
  tmpdir(),
  `ridecompare-demo-fares-${process.pid}.mjs`,
);

// stableHash is module-private in the app. Re-exporting it from the compiled
// copy lets the fixture record the hash directly, so the Python port can be
// checked against the real function rather than inference from rounded fares.
await writeFile(modulePath, `${outputText}\nexport { stableHash };\n`, 'utf8');

const { getDemoFareComparison, stableHash, DEMO_ESTIMATES_NOTICE } = await import(
  pathToFileURL(modulePath).href
);

const routes = ROUTES.map(([pickupId, destinationId]) => {
  const result = getDemoFareComparison(
    { id: pickupId, name: 'Pickup', address: 'Pickup address' },
    { id: destinationId, name: 'Destination', address: 'Destination address' },
  );

  return {
    pickupId,
    destinationId,
    // The route seed, computed with the app's own stableHash over the same
    // "<pickup>-><destination>" string getDemoFareComparison builds.
    seed: stableHash(`${pickupId}->${destinationId}`),
    estimates: result.estimates.map((estimate) => ({
      id: estimate.id,
      provider: estimate.provider,
      category: estimate.category,
      tierLabel: estimate.tierLabel,
      fare: estimate.fare,
      currency: estimate.currency,
      etaMinutes: estimate.etaMinutes,
      available: estimate.available,
    })),
    source: result.source,
  };
});

const fixture = {
  generatedBy:
    'node backend/tests/fixtures/generate_demo_fares_parity.mjs (executes src/services/fares/demoFares.ts)',
  notice: DEMO_ESTIMATES_NOTICE,
  // Raw stableHash inputs: ASCII, Unicode, emoji (surrogate pairs), lengths.
  hashes: [
    '',
    'a',
    'hitech-city->airport',
    'Ω-ü',
    '🚕',
    'emoji-🚕-🙂->hitech-city',
    'x'.repeat(500),
    'Ünïcode straße 東京',
  ].map((value) => ({ value, hash: stableHash(value) })),
  routes,
};

await writeFile(fixturePath, `${JSON.stringify(fixture, null, 2)}\n`, 'utf8');

console.log(`Wrote ${routes.length} routes to ${path.relative(repoRoot, fixturePath)}`);
