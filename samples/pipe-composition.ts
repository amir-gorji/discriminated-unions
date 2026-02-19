/**
 * Pipe Composition with createPipeHandlers
 *
 * createPipeHandlers inverts the curry order — `(handlers) => (input) => result`
 * — so the returned functions slot directly into any pipe utility, array method,
 * or higher-order function without wrapper lambdas.
 *
 * Demonstrates:
 *   - createPipeHandlers for handlers-first currying
 *   - Composing match + map steps in a pipeline
 *   - Array.map / Array.filter without boilerplate
 *   - A minimal pipe() helper (drop-in compatible with fp-ts, ramda, etc.)
 */

import { createPipeHandlers, is } from 'dismatch';
import type { Model } from 'dismatch';

// ── A tiny pipe() — swap this for fp-ts/function pipe if you use it ──────────

function pipe<A>(a: A): A;
function pipe<A, B>(a: A, f1: (a: A) => B): B;
function pipe<A, B, C>(a: A, f1: (a: A) => B, f2: (b: B) => C): C;
function pipe<A, B, C, D>(a: A, f1: (a: A) => B, f2: (b: B) => C, f3: (c: C) => D): D;
function pipe(value: unknown, ...fns: Array<(x: unknown) => unknown>): unknown {
  return fns.reduce((acc, fn) => fn(acc), value);
}

// ── Domain: geometric shapes ───────────────────────────────────────────────────

type Circle    = Model<'circle',    { radius: number }>;
type Rectangle = Model<'rectangle', { width: number; height: number }>;
type Triangle  = Model<'triangle',  { base: number; height: number }>;
type Shape     = Circle | Rectangle | Triangle;

// ── Domain: normalised report ─────────────────────────────────────────────────

interface ShapeReport {
  name: string;
  area: number;
  perimeter: number;
  description: string;
}

// ── Handler factory — bound to 'type' once ────────────────────────────────────

const shapeOps = createPipeHandlers<Shape, 'type'>('type');

// Each call to shapeOps.match / shapeOps.map returns a
// `(shape: Shape) => T` function — ready for pipe / array methods.

const getName = shapeOps.match({
  circle:    () => 'Circle',
  rectangle: () => 'Rectangle',
  triangle:  () => 'Triangle',
});

const getArea = shapeOps.match({
  circle:    ({ radius })        => Math.PI * radius ** 2,
  rectangle: ({ width, height }) => width * height,
  triangle:  ({ base, height })  => (base * height) / 2,
});

const getPerimeter = shapeOps.match({
  circle:    ({ radius })        => 2 * Math.PI * radius,
  rectangle: ({ width, height }) => 2 * (width + height),
  triangle:  ({ base, height })  => {
    // assume right triangle: hypotenuse = √(base² + height²)
    const hyp = Math.sqrt(base ** 2 + height ** 2);
    return base + height + hyp;
  },
});

/**
 * Normalise all dimensions to absolute values without touching other variants.
 *
 * map() handler parameters are typed as the variant's Data (without the discriminant).
 * Provide the type literal explicitly in the return to reconstruct the full variant.
 */
const normalise = shapeOps.map({
  circle:    ({ radius })        => ({ type: 'circle'    as const, radius: Math.abs(radius) }),
  rectangle: ({ width, height }) => ({ type: 'rectangle' as const, width:  Math.abs(width),
                                                                    height: Math.abs(height) }),
  triangle:  ({ base, height })  => ({ type: 'triangle'  as const, base:   Math.abs(base),
                                                                    height: Math.abs(height) }),
});

// ── Build a full report in a pipe ─────────────────────────────────────────────

function buildReport(raw: Shape): ShapeReport {
  return pipe(
    raw,
    normalise,                          // ensure positive dimensions
    (shape) => ({
      name:        getName(shape),
      area:        getArea(shape),
      perimeter:   getPerimeter(shape),
      description: `${getName(shape)} with area ${getArea(shape).toFixed(2)}`,
    }),
  );
}

// ── Batch processing — no wrapper lambdas ─────────────────────────────────────

const catalog: Shape[] = [
  { type: 'circle',    radius: 5 },
  { type: 'rectangle', width: 4, height: 6 },
  { type: 'triangle',  base: 3, height: 4 },
  { type: 'circle',    radius: -7 },   // negative — normalise will fix this
  { type: 'rectangle', width: 10, height: 2 },
];

// Apply the full pipeline to every shape — getArea is a plain function reference
const reports: ShapeReport[] = catalog.map(buildReport);

// Filter using is() — no wrapper, correct inferred type
const circles = catalog.filter((s) => is(s, 'circle'));
//    ^? Circle[]

const circleAreas = circles.map(getArea);

// Sort shapes by area descending — again, getArea slots in directly
const byAreaDesc = [...catalog]
  .map(normalise)
  .sort((a, b) => getArea(b) - getArea(a));

// ── Multiple handler sets on the same factory ─────────────────────────────────

/**
 * Different teams / modules can define their own handler sets using the same
 * shapeOps instance — handlers are just plain objects, no coupling.
 */

const getShortLabel = shapeOps.match({
  circle:    ({ radius })        => `⬤ r=${radius}`,
  rectangle: ({ width, height }) => `▬ ${width}×${height}`,
  triangle:  ({ base, height })  => `▲ b=${base} h=${height}`,
});

const getColor = shapeOps.matchWithDefault({
  circle: () => '#4f86f7',           // blue for circles
  Default: () => '#f7a24f',          // orange for everything else
});

console.log(reports.map((r) => `${r.name}: area=${r.area.toFixed(2)}`));
console.log(catalog.map(getShortLabel));
console.log(catalog.map(getColor));
