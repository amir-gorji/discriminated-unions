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
 *   - count and partition for collection summaries
 *   - is() value-first narrowing + shapeOps.is(...) for filter composition
 *   - A minimal pipe() helper (drop-in compatible with fp-ts, ramda, etc.)
 */

import { createPipeHandlers, count, partition, is } from 'dismatch';

// ── A tiny pipe() — swap this for fp-ts/function pipe if you use it ──────────

function pipe<A>(a: A): A;
function pipe<A, B>(a: A, f1: (a: A) => B): B;
function pipe<A, B, C>(a: A, f1: (a: A) => B, f2: (b: B) => C): C;
function pipe<A, B, C, D>(
  a: A,
  f1: (a: A) => B,
  f2: (b: B) => C,
  f3: (c: C) => D,
): D;
function pipe(value: unknown, ...fns: Array<(x: unknown) => unknown>): unknown {
  return fns.reduce((acc, fn) => fn(acc), value);
}

// ── Domain: geometric shapes ───────────────────────────────────────────────────

type Shape =
  | { type: 'circle'; radius: number }
  | { type: 'rectangle'; width: number; height: number }
  | { type: 'triangle'; base: number; height: number };

interface ShapeReport {
  name: string;
  area: number;
  perimeter: number;
  description: string;
}

// ── Handler factory — bound to 'type' once ────────────────────────────────────

const shapeOps = createPipeHandlers<Shape, 'type'>('type');

const getName = shapeOps.match({
  circle: () => 'Circle',
  rectangle: () => 'Rectangle',
  triangle: () => 'Triangle',
});

const getArea = shapeOps.match({
  circle: ({ radius }) => Math.PI * radius ** 2,
  rectangle: ({ width, height }) => width * height,
  triangle: ({ base, height }) => (base * height) / 2,
});

const getPerimeter = shapeOps.match({
  circle: ({ radius }) => 2 * Math.PI * radius,
  rectangle: ({ width, height }) => 2 * (width + height),
  triangle: ({ base, height }) => {
    // assume right triangle: hypotenuse = √(base² + height²)
    const hyp = Math.sqrt(base ** 2 + height ** 2);
    return base + height + hyp;
  },
});

/**
 * Normalise all dimensions to absolute values without touching other variants.
 */
const normalise = shapeOps.map({
  circle: ({ radius }) => ({ radius: Math.abs(radius) }),
  rectangle: ({ width, height }) => ({
    width: Math.abs(width),
    height: Math.abs(height),
  }),
  triangle: ({ base, height }) => ({
    base: Math.abs(base),
    height: Math.abs(height),
  }),
});

// ── Build a full report in a pipe ─────────────────────────────────────────────

function buildReport(raw: Shape): ShapeReport {
  return pipe(
    raw,
    normalise, // ensure positive dimensions
    (shape): ShapeReport => ({
      name: getName(shape),
      area: getArea(shape),
      perimeter: getPerimeter(shape),
      description: `${getName(shape)} with area ${getArea(shape).toFixed(2)}`,
    }),
  );
}

// ── Batch processing — no wrapper lambdas ─────────────────────────────────────

const catalog: Shape[] = [
  { type: 'circle', radius: 5 },
  { type: 'rectangle', width: 4, height: 6 },
  { type: 'triangle', base: 3, height: 4 },
  { type: 'circle', radius: -7 }, // negative — normalise will fix this
  { type: 'rectangle', width: 10, height: 2 },
];

const reports: ShapeReport[] = catalog.map(buildReport);

// ── Collection helpers — count + partition ────────────────────────────────────

// count() — single-pass tally without intermediate arrays
const totalCircles = count(catalog, 'circle');
const totalRoundOrAxisAligned = count(catalog, ['circle', 'rectangle']);

// partition() — split into matched and rest in one pass
const [circles, nonCircles] = partition(catalog, 'circle');
//      ^? Circle[]            ^? (Rectangle | Triangle)[]

// curried bound forms via createPipeHandlers
const countTriangles = shapeOps.count('triangle');
const splitRectangles = shapeOps.partition('rectangle');
const triangleTally = countTriangles(catalog);
const [rectangles, otherShapes] = splitRectangles(catalog);

// ── is() — value-first narrowing + shapeOps.is(...) for .filter() ────────────

const someShape: Shape = catalog[0];

// value-first single variant — narrows inside the if block
if (is(someShape, 'circle')) {
  someShape.radius; // Circle
}

// value-first multi variant — narrows to a sub-union
if (is(someShape, ['circle', 'rectangle'])) {
  // someShape: Circle | Rectangle
}

// shapeOps.is — variant-first, slots into .filter() with full inference
// and zero call-site generics, since Shape/'type' were bound once above.
const justCircles = catalog.filter(shapeOps.is('circle'));
//                                      ^? Circle[]

const roundOrAxisAligned = catalog.filter(shapeOps.is(['circle', 'rectangle']));
//                                              ^? (Circle | Rectangle)[]

// ── Multiple handler sets on the same factory ─────────────────────────────────

const getShortLabel = shapeOps.match({
  circle: ({ radius }) => `⬤ r=${radius}`,
  rectangle: ({ width, height }) => `▬ ${width}×${height}`,
  triangle: ({ base, height }) => `▲ b=${base} h=${height}`,
});

const getColor = shapeOps.matchWithDefault({
  circle: () => '#4f86f7', // blue for circles
  Default: () => '#f7a24f', // orange for everything else
});

console.log('reports:', reports.map((r) => `${r.name}: area=${r.area.toFixed(2)}`));
console.log('labels:', catalog.map(getShortLabel));
console.log('colors:', catalog.map(getColor));
console.log(`circles in catalog: ${totalCircles}`);
console.log(`circle+rectangle count: ${totalRoundOrAxisAligned}`);
console.log(`triangle count: ${triangleTally}`);
console.log(`partition circles: ${circles.length} matched, ${nonCircles.length} rest`);
console.log(`partition rectangles: ${rectangles.length} matched, ${otherShapes.length} rest`);
console.log(`filtered circles via is(): ${justCircles.length}`);
console.log(`filtered round/axis via is([]): ${roundOrAxisAligned.length}`);
