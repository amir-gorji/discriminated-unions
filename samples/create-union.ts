/**
 * createUnion — Single-definition discriminated unions
 *
 * Shows how createUnion eliminates all boilerplate when working with
 * discriminated unions: one definition gives you constructors, type guards,
 * bound matchers, and the TypeScript type itself.
 *
 * Demonstrates:
 *   - createUnion() for defining a union from a schema
 *   - InferUnion for deriving the TypeScript union type
 *   - Constructors that inject the discriminant automatically
 *   - Curried pipe-friendly guards (.is(variant))
 *   - Schema-aware runtime check (.isKnown)
 *   - Bound match / matchWithDefault / map / mapAll
 */

import { createUnion, is } from 'dismatch';
import type { InferUnion } from 'dismatch';

// ── Define the union ────────────────────────────────────────────────────────

const { circle, rectangle, triangle, ...Shape } = createUnion('type', {
  circle: (radius: number) => ({ radius }),
  rectangle: (width: number, height: number) => ({ width, height }),
  triangle: (base: number, height: number) => ({ base, height }),
});

// Derive the TypeScript type from the runtime definition — one source of truth
type Shape = InferUnion<typeof Shape>;

// ── Constructors ────────────────────────────────────────────────────────────

const c = circle(5); // { type: 'circle', radius: 5 }
const r = rectangle(4, 6); // { type: 'rectangle', width: 4, height: 6 }
const t = triangle(10, 3); // { type: 'triangle', base: 10, height: 3 }

console.log('Constructed:', c, r, t);

// ── Type guards ─────────────────────────────────────────────────────────────

const shapes: Shape[] = [c, r, t, circle(8)];

// Curried factory guard — great as an array filter predicate
const circles = shapes.filter(Shape.is('circle'));
console.log('Circles:', circles);
// [{ type: 'circle', radius: 5 }, { type: 'circle', radius: 8 }]

// if-block narrowing — prefer the standalone is() form
if (is(r, 'rectangle')) {
  console.log('Area:', r.width * r.height);
}

// ── isKnown — runtime membership against the declared schema ────────────────

console.log('isKnown(circle):', Shape.isKnown(c)); // true
console.log('isKnown(hexagon):', Shape.isKnown({ type: 'hexagon' })); // false
console.log('isKnown(null):', Shape.isKnown(null)); // false

// Useful for validating API responses at system boundaries
function handleApiShape(raw: unknown): string {
  if (!Shape.isKnown(raw)) return 'Invalid shape';
  return getArea(raw).toFixed(2);
}
console.log('API valid:', handleApiShape({ type: 'circle', radius: 3 }));
console.log('API invalid:', handleApiShape({ type: 'hexagon' }));

// ── Bound match — exhaustive, handlers-first ────────────────────────────────

const getArea = Shape.match({
  circle: ({ radius }) => Math.PI * radius ** 2,
  rectangle: ({ width, height }) => width * height,
  triangle: ({ base, height }) => (base * height) / 2,
});

console.log('Areas:', shapes.map(getArea));
// [78.54, 24, 15, 201.06]

// ── Bound matchWithDefault ──────────────────────────────────────────────────

const getPerimeter = Shape.matchWithDefault({
  circle: ({ radius }) => 2 * Math.PI * radius,
  Default: () => NaN, // only circles have a simple perimeter formula here
});

console.log('Circle perimeter:', getPerimeter(c).toFixed(2)); // 31.42
console.log('Rect perimeter:', getPerimeter(r)); // NaN

// ── Bound map — partial transform, unmatched pass through ───────────────────

const doubleCircles = Shape.map({
  circle: ({ radius }) => ({ radius: radius * 2 }),
});

const doubled = shapes.map(doubleCircles);
console.log('Doubled circles:', doubled);
// circle radii are doubled; rectangle and triangle unchanged (same reference)

// ── Bound mapAll — exhaustive transform ─────────────────────────────────────

const scale = Shape.mapAll({
  circle: ({ radius }) => ({ radius: radius * 3 }),
  rectangle: ({ width, height }) => ({ width: width * 3, height: height * 3 }),
  triangle: ({ base, height }) => ({ base: base * 3, height: height * 3 }),
});

console.log('Scaled:', shapes.map(scale));

// ── Metadata ────────────────────────────────────────────────────────────────

console.log('Variants:', Shape.variants); // ['circle', 'rectangle', 'triangle']
console.log('Discriminant:', Shape.discriminant); // 'type'
