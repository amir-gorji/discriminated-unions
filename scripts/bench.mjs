#!/usr/bin/env node
/**
 * Micro-benchmarks for runtime-affecting roadmap features (PRD §6 release gates).
 *
 * Compares:
 *   - count(items, variant)             vs items.filter(p).length
 *   - partition(items, variant)         vs two .filter() passes
 *
 * Uses no external deps — a hand-rolled timer with warmup + N iterations
 * is enough to detect order-of-magnitude regressions, which is the bar for
 * a "negligible runtime overhead" note in the changelog.
 *
 * Run after `npm run build`.
 */
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lib = await import(pathToFileURL(path.join(rootDir, 'lib/index.mjs')).href);

const { count, partition } = lib;

// ── Fixture: 100k items across 4 variants ───────────────────────────────────
const N = 100_000;
const items = new Array(N);
for (let i = 0; i < N; i++) {
  const r = i % 4;
  if (r === 0) items[i] = { type: 'circle', radius: i };
  else if (r === 1) items[i] = { type: 'rectangle', width: i, height: i };
  else if (r === 2) items[i] = { type: 'triangle', base: i, height: i };
  else items[i] = { type: 'hexagon', side: i };
}

function bench(label, fn, iterations = 50) {
  // warmup
  for (let i = 0; i < 5; i++) fn();
  const t0 = performance.now();
  for (let i = 0; i < iterations; i++) fn();
  const t1 = performance.now();
  const total = t1 - t0;
  const perOp = total / iterations;
  return { label, iterations, total, perOp };
}

const cases = [
  bench('count(items, "circle")', () => count(items, 'circle')),
  bench(
    'items.filter(s => s.type === "circle").length',
    () => items.filter((s) => s.type === 'circle').length,
  ),
  bench(
    'count(items, ["circle","rectangle"])',
    () => count(items, ['circle', 'rectangle']),
  ),
  bench(
    'items.filter(s => s.type === "circle" || s.type === "rectangle").length',
    () =>
      items.filter((s) => s.type === 'circle' || s.type === 'rectangle')
        .length,
  ),
  bench('partition(items, "circle")', () => partition(items, 'circle')),
  bench(
    'two-filter equivalent',
    () => [
      items.filter((s) => s.type === 'circle'),
      items.filter((s) => s.type !== 'circle'),
    ],
  ),
];

console.log(`\nDismatch micro-bench — ${N.toLocaleString()} items × ${cases[0].iterations} iterations\n`);
const longest = Math.max(...cases.map((c) => c.label.length));
for (const { label, perOp } of cases) {
  console.log(`  ${label.padEnd(longest)}  ${perOp.toFixed(3)} ms/op`);
}
console.log('');
