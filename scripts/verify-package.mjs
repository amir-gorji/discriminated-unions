import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const pkg = JSON.parse(
  readFileSync(path.join(rootDir, 'package.json'), 'utf8'),
);

const expectedExports = [
  'UnknownVariantError',
  'count',
  'createPipeHandlers',
  'createUnion',
  'fold',
  'foldAsync',
  'foldWithDefault',
  'foldWithDefaultAsync',
  'is',
  'isUnion',
  'map',
  'mapAll',
  'mapAsync',
  'match',
  'matchAllAsync',
  'matchAsync',
  'matchWithDefault',
  'matchWithDefaultAsync',
  'partition',
].sort();

const requiredFiles = [
  pkg.main,
  pkg.module,
  pkg.types,
  pkg.exports['.'].import.types,
  pkg.exports['.'].require.types,
  pkg.exports['./remote-data'].import.types,
  pkg.exports['./remote-data'].require.types,
];

for (const file of requiredFiles) {
  assert.ok(
    existsSync(path.join(rootDir, file)),
    `Missing built file: ${file}`,
  );
}

const packOutput = execFileSync(
  'npm',
  [
    'pack',
    '--dry-run',
    '--json',
    '--ignore-scripts',
    '--cache',
    '/tmp/dismatch-npm-cache',
  ],
  {
    cwd: rootDir,
    encoding: 'utf8',
  },
);

const [packInfo] = JSON.parse(packOutput);
const packedFiles = new Set(packInfo.files.map((file) => file.path));

for (const file of [
  'lib/index.js',
  'lib/index.mjs',
  'lib/index.d.ts',
  'lib/index.d.mts',
  'lib/remote-data.js',
  'lib/remote-data.mjs',
  'lib/remote-data.d.ts',
  'lib/remote-data.d.mts',
]) {
  assert.ok(packedFiles.has(file), `Missing packed file: ${file}`);
}

const require = createRequire(import.meta.url);
const cjs = require(path.join(rootDir, pkg.main));
const esm = await import(pathToFileURL(path.join(rootDir, pkg.module)).href);

assert.deepEqual(
  Object.keys(cjs).sort(),
  expectedExports,
  'CJS exports do not match the documented public API',
);
assert.deepEqual(
  Object.keys(esm).sort(),
  expectedExports,
  'ESM exports do not match the documented public API',
);
assert.deepEqual(
  Object.keys(cjs).sort(),
  Object.keys(esm).sort(),
  'CJS and ESM exports are out of sync',
);

const expectedRemoteDataExports = ['RemoteData'];

const rdCjs = require(
  path.join(rootDir, pkg.exports['./remote-data'].require.default),
);
const rdEsm = await import(
  pathToFileURL(path.join(rootDir, pkg.exports['./remote-data'].import.default))
    .href
);

const rdCjsRuntime = Object.keys(rdCjs).sort();
const rdEsmRuntime = Object.keys(rdEsm).sort();

assert.deepEqual(
  rdCjsRuntime,
  expectedRemoteDataExports,
  'remote-data CJS exports do not match the documented public API',
);
assert.deepEqual(
  rdEsmRuntime,
  expectedRemoteDataExports,
  'remote-data ESM exports do not match the documented public API',
);
assert.deepEqual(
  rdCjsRuntime,
  rdEsmRuntime,
  'remote-data CJS and ESM exports are out of sync',
);

console.log('Packed package surface verified.');
