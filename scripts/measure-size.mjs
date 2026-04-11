#!/usr/bin/env node
/**
 * Measures the canonical bundle-size metric for dismatch:
 *   minified whole main-entry bundle, non-gzipped (PRD §1, §9).
 *
 * Reports two numbers:
 *   1. CANONICAL — the minified whole main-entry bundle, produced by feeding
 *      `src/index.ts` through esbuild with `--bundle --minify`. This is the
 *      number that the PRD §9 cap of 3.0 KB applies to.
 *   2. PUBLISHED — the actual `lib/index.mjs` and `lib/index.js` shipped to
 *      npm (informational only). ESM keeps whitespace so downstream bundlers
 *      can preserve `/*#__PURE__*` annotations and tree-shake safely.
 */
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';

const CAP_BYTES = 3 * 1024; // PRD §9: ≤ 3.0 KB main-entry minified

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const entry = path.join(rootDir, 'src/index.ts');

// ── 1. Canonical metric ────────────────────────────────────────────────────
const result = await esbuild.build({
  entryPoints: [entry],
  bundle: true,
  minify: true,
  format: 'esm',
  target: 'es2020',
  write: false,
  treeShaking: true,
});

const canonicalBytes = result.outputFiles[0].contents.length;
const canonicalKb = (canonicalBytes / 1024).toFixed(2);
const canonicalStatus = canonicalBytes <= CAP_BYTES ? '✓' : '✗';

console.log(`\nDismatch bundle size — cap ${(CAP_BYTES / 1024).toFixed(1)} KB (PRD §9)\n`);
console.log(`Canonical (esbuild --bundle --minify, non-gzipped):`);
console.log(`  ${canonicalStatus} src/index.ts → ${canonicalBytes} B (${canonicalKb} KB)\n`);

// ── 2. Published artifacts (informational) ─────────────────────────────────
console.log(`Published artifacts (informational):`);
const publishedTargets = [
  { label: 'lib/index.mjs (ESM, ws preserved)', file: path.join(rootDir, 'lib/index.mjs') },
  { label: 'lib/index.js  (CJS, fully minified)', file: path.join(rootDir, 'lib/index.js') },
];
for (const { label, file } of publishedTargets) {
  if (!existsSync(file)) {
    console.log(`    ${label}: missing — run \`npm run build\` to generate`);
    continue;
  }
  const bytes = statSync(file).size;
  const kb = (bytes / 1024).toFixed(2);
  console.log(`    ${label}: ${bytes} B (${kb} KB)`);
}
console.log('');

if (canonicalBytes > CAP_BYTES) {
  console.error(`Canonical bundle ${canonicalBytes} B exceeds cap ${CAP_BYTES} B.`);
  process.exit(1);
}
