# dismatch

[![npm](https://img.shields.io/npm/v/dismatch)](https://www.npmjs.com/package/dismatch)
[![license](https://img.shields.io/npm/l/dismatch)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)

Type-safe discriminated unions for TypeScript. Define once, get constructors, type guards, and exhaustive pattern matching — all from a single schema. Zero dependencies. ~2 kB minified.

```ts
import { createUnion, type InferUnion } from 'dismatch';

const Shape = createUnion('type', {
  circle: (radius: number) => ({ radius }),
  rectangle: (width: number, height: number) => ({ width, height }),
});

type Shape = InferUnion<typeof Shape>;

Shape.circle(5); // { type: 'circle', radius: 5 }
Shape.is.circle(shape); // type guard → narrows to circle
Shape.isKnown(apiResponse); // runtime check against declared variants

const area = Shape.match({
  circle: ({ radius }) => Math.PI * radius ** 2,
  rectangle: ({ width, height }) => width * height,
});

area(Shape.circle(5)); // 78.54
```

---

## Table of Contents

- [Install](#install)
- [Comparison](#comparison)
- [Quick Start](#quick-start)
  - [Define a union](#1-define-a-union)
  - [Construct values](#2-construct-values)
  - [Type guards](#3-type-guards)
  - [Pattern matching](#4-pattern-matching)
  - [Metadata](#5-metadata)
- [Standalone Functions](#standalone-functions)
  - [match](#match)
  - [matchWithDefault](#matchwithdefault)
  - [map / mapAll](#map--mapall)
  - [is](#is)
  - [fold](#fold)
  - [count](#count)
  - [partition](#partition)
  - [isUnion](#isunion)
  - [createPipeHandlers](#createpipehandlers)
- [Type Helpers](#type-helpers)
- [Custom Discriminant](#custom-discriminant)
- [Patterns](#patterns)
- [Clean Stack Traces](#clean-stack-traces)
- [Contributing](#contributing)
- [License](#license)

---

## Install

```bash
npm install dismatch
```

---

## Comparison

`dismatch` is purpose-built only for discriminated unions in TypeScript.

| Capability                                | dismatch                | ts-pattern | unionize       | @effect/match     |
| ----------------------------------------- | ----------------------- | ---------- | -------------- | ----------------- |
| Bundle size                               | **~2 kB**               | ~2 kB      | unclear        | large (ecosystem) |
| Zero dependencies                         | Yes                     | Yes        | Yes            | No                |
| Exhaustive matching (compile time)        | Yes                     | Yes        | Yes            | Yes               |
| Schema-aware runtime validation           | **Yes**                 | No         | No             | No                |
| Single + multi-variant narrowing (`is`)   | **Yes**                 | No         | No             | No                |
| Collection folding (`fold`)               | **Yes**                 | No         | No             | No                |
| Collection counters (`count`/`partition`) | **Yes**                 | No         | No             | No                |
| Partial transforms (`map`)                | **Yes**                 | No         | No             | No                |
| Clean stack traces                        | **Yes**                 | No         | No             | No                |
| Payload to handlers                       | **Yes**                 | No         | No             | No                |
| Single-schema union toolkit               | **Yes** (`createUnion`) | No         | Yes (inactive) | No                |
| Maintenance                               | Active                  | Active     | Inactive       | Active            |
| Beyond discriminated unions               | No                      | Yes        | No             | Yes               |

`dismatch` is the most complete discriminated union toolkit in TypeScript with rare features.

---

## Quick Start

### 1. Define a union

`createUnion` takes a discriminant key and a schema of constructor functions. Each constructor returns the data fields — the discriminant is injected automatically.

```ts
import { createUnion, type InferUnion } from 'dismatch';

const Result = createUnion('type', {
  ok: (data: string) => ({ data }),
  error: (message: string) => ({ message }),
  loading: () => ({}),
});

type Result = InferUnion<typeof Result>;
// { type: 'ok'; data: string } | { type: 'error'; message: string } | { type: 'loading' }
```

### 2. Construct values

```ts
const r = Result.ok('hello'); // { type: 'ok', data: 'hello' }
const e = Result.error('fail'); // { type: 'error', message: 'fail' }
const l = Result.loading(); // { type: 'loading' }
```

### 3. Type guards

Per-variant guards narrow the type. Work in `if` blocks and `.filter()`:

```ts
if (Result.is.ok(r)) {
  console.log(r.data); // TypeScript knows: r is { type: 'ok'; data: string }
}

const errors = results.filter(Result.is.error);
```

`isKnown` checks if a value is any declared variant — useful at system boundaries:

```ts
Result.isKnown(apiResponse); // true if type is 'ok' | 'error' | 'loading'
Result.isKnown({ type: 'unknown' }); // false
```

For multi-variant narrowing — to a sub-union of two or more variants — use the standalone `is()` inside `if` blocks, or `createPipeHandlers(...).is(...)` for `.filter()` composition without call-site generics:

```ts
import { is, createPipeHandlers } from 'dismatch';

const resultOps = createPipeHandlers<Result, 'type'>('type');

const results: Result[] = [
  Result.ok('hi'),
  Result.error('no'),
  Result.loading(),
];

const settled = results.filter(resultOps.is(['ok', 'error']));
// settled: ({ type: 'ok'; data: string } | { type: 'error'; message: string })[]
```

> The bound `Result.is.<variant>` helper is **deprecated**. The standalone `is()` is now strictly value-first — for predicate-factory use in `.filter()`, use [`createPipeHandlers(...).is(...)`](#createpipehandlers), which binds the union type once and needs no generics at call sites.

### 4. Pattern matching

All four matchers are bound to the factory and curried **handlers-first** — define once, apply many times:

```ts
// Exhaustive — every variant must have a handler
const label = Result.match({
  ok: ({ data }) => `Data: ${data}`,
  error: ({ message }) => `Error: ${message}`,
  loading: () => 'Loading...',
});

label(r); // 'Data: hello'

// Partial — handle what you need, Default catches the rest
const banner = Result.matchWithDefault({
  error: ({ message }) => `Something went wrong: ${message}`,
  Default: () => 'All good',
});

// Transform — modify specific variants, rest pass through unchanged
// The discriminant is re-injected automatically — no need to return it
const cleared = Result.map({
  error: ({ message }) => ({ message: '' }),
});

// Exhaustive transform — every variant gets a handler
const normalized = Result.mapAll({
  ok: ({ data }) => ({ data: data.trim() }),
  error: ({ message }) => ({ message: message.trim() }),
  loading: () => ({}),
});

// Fold — exhaustive aggregation over a collection
const stats = Result.fold(results, { oks: 0, errors: 0, loadings: 0 })({
  ok: (acc) => ({ ...acc, oks: acc.oks + 1 }),
  error: (acc) => ({ ...acc, errors: acc.errors + 1 }),
  loading: (acc) => ({ ...acc, loadings: acc.loadings + 1 }),
});
// Expect stats = { circles: 2, totalArea: 416.699 }

```

### 5. Metadata

```ts
Result.variants; // readonly ['ok', 'error', 'loading']
Result.discriminant; // 'type'
```

---

## Standalone Functions

You can use dismatch functions directly on any discriminated union — no factory required.

### `match`

Exhaustive pattern matching. TypeScript errors if a variant is missing.

```ts
import { match } from 'dismatch';

type Shape =
  | { type: 'circle'; radius: number }
  | { type: 'rectangle'; width: number; height: number };

const area = match(shape)({
  circle: ({ radius }) => Math.PI * radius ** 2,
  rectangle: ({ width, height }) => width * height,
});
```

### `matchWithDefault`

Partial matching with a `Default` fallback.

```ts
import { matchWithDefault } from 'dismatch';

const banner = matchWithDefault(result)({
  error: ({ message }) => `Error: ${message}`,
  Default: () => 'All good',
});
```

### `map` / `mapAll`

`map` transforms specific variants — unmatched ones pass through (same reference). `mapAll` requires every variant. The discriminant is re-injected automatically — handlers return only the data fields.

```ts
import { map, mapAll } from 'dismatch';

// Only circles grow; rectangles pass through as-is
const bigger = map(shape)({
  circle: ({ radius }) => ({ radius: radius * 2 }),
});

// Every variant must be handled
const normalized = mapAll(shape)({
  circle: ({ radius }) => ({ radius: Math.abs(radius) }),
  rectangle: ({ width, height }) => ({
    width: Math.abs(width),
    height: Math.abs(height),
  }),
});
```

### `fold`

Exhaustive single-pass aggregator over a collection of discriminated union values. Each handler receives `(accumulator, variantData)` and returns the new accumulator. All variants must have handlers.

```ts
import { fold } from 'dismatch';

type Shape =
  | { type: 'circle'; radius: number }
  | { type: 'rectangle'; width: number; height: number };

const shapes: Shape[] = [
  { type: 'circle', radius: 5 },
  { type: 'rectangle', width: 4, height: 6 },
  { type: 'circle', radius: 10 },
];

const stats = fold(shapes, { circles: 0, totalArea: 0 })({
  circle: (acc, { radius }) => ({
    circles: acc.circles + 1,
    totalArea: acc.totalArea + Math.PI * radius ** 2,
  }),
  rectangle: (acc, { width, height }) => ({
    ...acc,
    totalArea: acc.totalArea + width * height,
  }),
});
```

### `is`

Value-first type guard for discriminated unions. Covers single-variant and multi-variant narrowing inside `if` blocks.

```ts
import { is } from 'dismatch';

if (is(shape, 'circle')) {
  shape.radius; // narrowed to circle
}

if (is(shape, ['circle', 'rectangle'])) {
  shape; // narrowed to circle | rectangle
}
```

**Custom discriminant:**

```ts
is(event, 'click', 'kind');
is(event, ['click', 'keydown'], 'kind');
```

For `.filter()`, `.find()`, or pipe composition, use [`createPipeHandlers(...).is(...)`](#createpipehandlers) — variant-first and fully inferred without call-site generics.

### `count`

Counts how many items in a collection match the given variant(s). Single-pass, no intermediate array allocation.

```ts
import { count } from 'dismatch';

type Notification =
  | { type: 'NEW' }
  | { type: 'ACTION_NEEDED' }
  | { type: 'INFO' };

const notifications: Notification[] = [
  { type: 'NEW' },
  { type: 'ACTION_NEEDED' },
  { type: 'NEW' },
  { type: 'INFO' },
];

count(notifications, 'NEW'); // 2
count(notifications, ['NEW', 'ACTION_NEEDED']); // 3

// Custom discriminant
count(events, ['click', 'keydown'], 'kind');
```

### `partition`

Splits a collection into two arrays — items matching the variant(s) and the rest — in one pass with fully narrowed types.

```ts
import { partition } from 'dismatch';

const [circles, rest] = partition(shapes, 'circle');
//      ^? Circle[]   ^? (Rectangle | Triangle)[]

const [actionable, rest] = partition(notifications, [
  'NEW',
  'ACTION_NEEDED',
]);

// Custom discriminant
const [clicks, others] = partition(events, 'click', 'kind');
```

### `isUnion`

Runtime check that a value is a valid discriminated union.

```ts
import { isUnion } from 'dismatch';

isUnion({ type: 'ok', data: 42 }); // true
isUnion(null); // false
isUnion({ kind: 'click' }, 'kind'); // true — custom discriminant
```

### `createPipeHandlers`

Handlers-first curried order for pipe composition. Define handlers once, get back a reusable function. Exposes `match`, `matchWithDefault`, `map`, `mapAll`, `fold`, `count`, `partition`, and `is` — all bound to the union type and discriminant, so no generics are needed at call sites.

```ts
import { createPipeHandlers } from 'dismatch';

type Shape =
  | { type: 'circle'; radius: number }
  | { type: 'rectangle'; width: number; height: number };

const shapeOps = createPipeHandlers<Shape>('type');

const getArea = shapeOps.match({
  circle: ({ radius }) => Math.PI * radius ** 2, // calculate the area, then round in 2 decimal places
  rectangle: ({ width, height }) => width * height,
});

const shapes: Shape[] = [
  { type: 'circle', radius: 1 },
  { type: 'rectangle', width: 2, height: 3 },
];

shapes.map(getArea); // Expect -> [3.14, 6]

// Variant-first type guard — slots directly into .filter(), no generics needed
const circles = shapes.filter(shapeOps.is('circle'));
//    ^? Circle[]

const round = shapes.filter(shapeOps.is(['circle', 'rectangle']));
//    ^? (Circle | Rectangle)[]

// Payload support — pass extra context to every handler
const volume = shapeOps.match<number, { depth: number }>({
  circle: ({ radius }, { depth }) => Math.PI * radius ** 2 * depth,
  rectangle: ({ width, height }, { depth }) => width * height * depth,
});

const shape: Shape = { type: 'rectangle', width: 2, height: 5 };

volume(shape, { depth: 10 }); // Expect -> 100
```

| Use case                                   | Prefer                   |
| ------------------------------------------ | ------------------------ |
| One-off match on a single value            | `match(value)(handlers)` |
| Reuse handlers across many values / arrays | `createPipeHandlers`     |
| Compose in a `pipe` or pass as callback    | `createPipeHandlers`     |

---

## Type Helpers

### `InferUnion<T>`

Extracts the union type from a `createUnion` factory:

```ts
type Shape = InferUnion<typeof Shape>;
```

### `TakeDiscriminant<T>`

Extracts valid discriminant keys from a union type — keys with narrow string values:

```ts
type D = TakeDiscriminant<Shape>; // 'type'
```

### `Folder<T, Acc, Discriminant>`

Handler map type for `fold` — each handler takes `(accumulator, variantData)` and returns the new accumulator:

```ts
import type { Folder } from 'dismatch';

type ShapeFolder = Folder<Shape, number, 'type'>;
// { circle: (acc: number, input: { radius: number }) => number; rectangle: ... }
```

---

## Custom Discriminant

I recommend using `'type'` as your discriminant key. It is the default for all standalone functions, so you never need to pass it explicitly:

```ts
type Animal = { type: 'dog'; name: string } | { type: 'cat'; lives: number };

match(animal)({ dog: ({ name }) => name, cat: () => 'meow' });
is(animal, 'dog');
isUnion(animal);

const Animal = createUnion('type', {
  dog: (name: string) => ({ name }),
  cat: (lives: number) => ({ lives }),
});
```

If you need a different discriminant, all functions accept it as an extra argument:

```ts
type Animal = { kind: 'dog'; name: string } | { kind: 'cat'; lives: number };

match(animal, 'kind')({ dog: ({ name }) => name, cat: () => 'meow' });
is(animal, 'dog', 'kind');
isUnion(animal, 'kind');

const Animal = createUnion('kind', {
  dog: (name: string) => ({ name }),
  cat: (lives: number) => ({ lives }),
});
```

---

## Patterns

### Rendering UI

```ts
function UserList({ state }: { state: FetchState<User[]> }) {
  return match(state)({
    idle:    ()          => <button onClick={fetch}>Load</button>,
    loading: ()          => <Spinner />,
    success: ({ data })  => <ul>{data.map(renderUser)}</ul>,
    failure: ({ error }) => <ErrorBanner message={error} />,
  });
}
```

### Reducer

```ts
type Action =
  | { type: 'increment'; by: number }
  | { type: 'decrement'; by: number }
  | { type: 'reset' };

const reduce = (state: number, action: Action): number =>
  match(action)({
    increment: ({ by }) => state + by,
    decrement: ({ by }) => state - by,
    reset: () => 0,
  });
```

### Pipe Composition

```ts
import { pipe } from 'fp-ts/function'; // or any pipe utility

const shapeOps = createPipeHandlers<Shape>('type');

const result = pipe(
  shape,
  shapeOps.match({
    circle: () => 'round',
    rectangle: () => 'flat',
  }),
);
```

---

## Clean Stack Traces

When dismatch throws, the stack trace points to **your call site** — not library internals:

```
Error: Data is not of type discriminated union!
    at handleResponse (src/api.ts:27:18)   // ← your code, not ours
```

---

## Contributing

```bash
npm test             # run tests
npm run test:package # verify packed exports and tarball contents
npm run test:watch   # watch mode
npm run ts:ci        # type-check
npm run ts:package   # type-check the built package surface
npm run build        # compile to lib/
```

See [`samples/`](./samples) for real-world examples.

---

## License

MIT — see [LICENSE](./LICENSE).
