# dismatch

[![npm](https://img.shields.io/npm/v/dismatch)](https://www.npmjs.com/package/dismatch)
[![license](https://img.shields.io/npm/l/dismatch)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![bundle size](https://img.shields.io/bundlephobia/minzip/dismatch)](https://bundlephobia.com/package/dismatch)

Type-safe discriminated unions for TypeScript. Define once, get constructors, type guards, and exhaustive pattern matching — all from a single schema. Zero dependencies. ~1.8 kB minified.

```ts
import { createUnion, is, type InferUnion } from 'dismatch';

const Shape = createUnion('type', {
  circle: (radius: number) => ({ radius }),
  rectangle: (width: number, height: number) => ({ width, height }),
});

type Shape = InferUnion<typeof Shape>;

Shape.circle(5); // { type: 'circle', radius: 5 }
is(shape, 'circle'); // type guard → narrows to circle
Shape.isKnown(apiResponse); // runtime check against declared variants

const area = Shape.match({
  circle: ({ radius }) => Math.PI * radius ** 2,
  rectangle: ({ width, height }) => width * height,
});

area(Shape.circle(5)); // 78.54
```

---

## Table of Contents

- [dismatch](#dismatch)
  - [Table of Contents](#table-of-contents)
  - [Install](#install)
  - [Comparison](#comparison)
    - [Why dismatch?](#why-dismatch)
  - [Quick Start](#quick-start)
    - [1. Define a union](#1-define-a-union)
    - [2. Construct values](#2-construct-values)
    - [3. Type guards](#3-type-guards)
    - [4. Pattern matching](#4-pattern-matching)
    - [5. Metadata](#5-metadata)
  - [Standalone Functions](#standalone-functions)
    - [`match`](#match)
    - [`matchWithDefault`](#matchwithdefault)
    - [`map` / `mapAll`](#map--mapall)
    - [`fold`](#fold)
    - [`foldWithDefault`](#foldwithdefault)
    - [`is`](#is)
    - [`count`](#count)
    - [`partition`](#partition)
    - [`isUnion`](#isunion)
    - [`createPipeHandlers`](#createpipehandlers)
  - [Type Helpers](#type-helpers)
    - [`InferUnion<T>`](#inferuniont)
    - [`TakeDiscriminant<T>`](#takediscriminantt)
    - [`Folder<T, Acc, Discriminant>`](#foldert-acc-discriminant)
    - [`FolderWithDefault<T, Acc, Discriminant>`](#folderwithdefaultt-acc-discriminant)
  - [Custom Discriminant](#custom-discriminant)
  - [Patterns](#patterns)
    - [Rendering UI](#rendering-ui)
    - [Reducer](#reducer)
    - [Pipe Composition](#pipe-composition)
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
| Bundle size                               | **~1.8 kB**             | ~2 kB      | unclear        | large (ecosystem) |
| Zero dependencies                         | Yes                     | Yes        | Yes            | No                |
| Exhaustive matching (compile time)        | Yes                     | Yes        | Yes            | Yes               |
| Schema-aware runtime validation           | **Yes**                 | No         | No             | No                |
| Single + multi-variant narrowing (`is`)   | **Yes**                 | No         | No             | No                |
| Collection folding (`fold`)               | **Yes**                 | No         | No             | No                |
| Collection counters (`count`/`partition`) | **Yes**                 | No         | No             | No                |
| Partial transforms (`map`)                | **Yes**                 | No         | No             | No                |
| Clean stack traces                        | **Yes**                 | No         | No             | No                |
| Passing payload to handlers               | **Yes**                 | No         | No             | No                |
| Single-schema union toolkit               | **Yes** (`createUnion`) | No         | Yes (inactive) | No                |
| Maintenance                               | Active                  | Active     | Inactive       | Active            |
| Beyond discriminated unions               | No                      | Yes        | No             | Yes               |

`dismatch` is the most complete discriminated union toolkit in TypeScript with rare features.

### Why dismatch?

**ts-pattern matches any pattern. dismatch manages discriminated unions.**

Most TypeScript apps live and breathe `{ type: 'x' } | { type: 'y' }`. For that world, dismatch replaces an entire category of hand-written boilerplate with a single schema — constructors, guards, matchers, transforms, and collection ops — in 1.8 kB.

**The everyday match — zero ceremony:**

```ts
// ts-pattern
const label = match(state)
  .with({ type: 'loading' }, () => 'Loading…')
  .with({ type: 'error' }, ({ error }) => error.message)
  .exhaustive();

// dismatch — the variant name *is* the pattern
const label = match(state)({
  loading: () => 'Loading…',
  error: ({ error }) => error.message,
});
```

No `.with()`, no `{ type: '…' }` wrappers, no `.exhaustive()`. Exhaustiveness is enforced by TypeScript itself — not an opt-in method call.

**Reusable matchers — define once, apply everywhere:**

```ts
// ts-pattern — every match is inline, one-shot, wrapped in a function
const getArea = (shape: Shape): number =>
  match(shape)
    .with({ type: 'circle' }, ({ radius }) => Math.PI * radius ** 2)
    .with({ type: 'rectangle' }, ({ width, height }) => width * height)
    .exhaustive();

// dismatch — handlers-first, returns a reusable function directly
const getArea = Shape.match({
  circle: ({ radius }) => Math.PI * radius ** 2,
  rectangle: ({ width, height }) => width * height,
});

shapes.map(getArea); // just works
shapes.filter(Shape.is('circle')); // narrowed to Circle[]
```

No other library lets you define handlers once and get back a typed, reusable function. This is the killer differentiator.

**Things no TypeScript library offers — except dismatch:**

| Capability                    | What it saves you                                                                                                               |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `is(['ok', 'error'])`         | Multi-variant narrowing to a proper sub-union — no manual type guards                                                           |
| `map({ error: ... })`         | Partial transforms where unmatched variants pass through unchanged — no `...spread`, no identity fallbacks                      |
| `fold(items, init)(handlers)` | Exhaustive aggregation in one pass — no `reduce` + `match` + `.exhaustive()` sandwich                                           |
| `count(items, 'error')`       | Variant-aware counting without `.filter().length` and the throwaway array                                                       |
| `partition(items, 'ok')`      | Split with narrowed types on _both_ sides — no two-pass `.filter()`                                                             |
| `createUnion(...)`            | One schema produces constructors, guards, matchers, transforms, metadata. Others give you matching; the rest you write by hand. |

> Instead of being a swiss-army knife, dismatch chose to be a scalpel for the one thing TypeScript developers do most.

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

Use the standalone `is()` for `if`-block narrowing, and the bound curried `.is(variant)` predicate factory for `.filter()` composition — both narrow the type:

```ts
import { is } from 'dismatch';

if (is(r, 'ok')) {
  console.log(r.data); // TypeScript knows: r is { type: 'ok'; data: string }
}

const errors = results.filter(Result.is('error'));
//    ^? { type: 'error'; message: string }[]
```

`isKnown` checks if a value is any declared variant — useful at system boundaries:

```ts
Result.isKnown(apiResponse); // true if type is 'ok' | 'error' | 'loading'
Result.isKnown({ type: 'unknown' }); // false
```

Both forms accept a single variant or an array of variants for sub-union narrowing:

```ts
if (is(r, ['ok', 'error'])) {
  r; // narrowed to { type: 'ok'; ... } | { type: 'error'; ... }
}

const settled = results.filter(Result.is(['ok', 'error']));
// settled: ({ type: 'ok'; data: string } | { type: 'error'; message: string })[]
```

> **Removed in 2.0.0**: the per-variant `Result.is.ok` / `Result.is.error` bound guards and the old `narrow` export are gone. Use `is(value, 'variant')` for narrowing and `Result.is('variant')` (or standalone `createPipeHandlers(...).is(...)`) for predicate-factory use.

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

To see why `fold` exists, compare three ways to aggregate over a collection of shapes:

**With such a data:**

```ts
type Shape =
  | { type: 'circle'; radius: number }
  | { type: 'rectangle'; width: number; height: number };

const shapes: Shape[] = [
  { type: 'circle', radius: 5 },
  { type: 'rectangle', width: 4, height: 6 },
  { type: 'circle', radius: 10 },
];
```

**Plain TypeScript — manual `reduce` with a `switch`:**

```ts
const stats = shapes.reduce(
  (acc, shape) => {
    switch (shape.type) {
      case 'circle':
        return {
          circles: acc.circles + 1,
          totalArea: acc.totalArea + Math.PI * shape.radius ** 2,
        };
      case 'rectangle':
        return {
          ...acc,
          totalArea: acc.totalArea + shape.width * shape.height,
        };
    }
  },
  { circles: 0, totalArea: 0 },
);
```

**Not exhaustive** — adding a new variant won't cause a compile error. The accumulator type has to be repeated or inferred loosely.

**ts-pattern — `reduce` + `match` + `.exhaustive()`:**

```ts
const stats = shapes.reduce(
  (acc, shape) =>
    match(shape)
      .with({ type: 'circle' }, ({ radius }) => ({
        circles: acc.circles + 1,
        totalArea: acc.totalArea + Math.PI * radius ** 2,
      }))
      .with({ type: 'rectangle' }, ({ width, height }) => ({
        ...acc,
        totalArea: acc.totalArea + width * height,
      }))
      .exhaustive(),
  { circles: 0, totalArea: 0 },
);
```

Exhaustive, but three layers of indirection (`reduce` → `match` → `.exhaustive()`) for a single operation.

**dismatch — `fold`:**

```ts
import { fold } from 'dismatch';

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

Exhaustive, single-pass, and purpose-built — no `reduce` wrapper, no `.exhaustive()` call, no `{ type: '…' }` noise.

### `foldWithDefault`

Partial collection aggregation with a required `Default` fallback. Unlike `fold`, not every variant needs a handler — unhandled variants route to `Default`, which receives the full union item so you can inspect which variant fell through.

```ts
import { foldWithDefault } from 'dismatch';

type Notification =
  | { type: 'push'; urgent: boolean; message: string }
  | { type: 'email'; subject: string }
  | { type: 'sms'; from: string };

const urgentCount = foldWithDefault(
  notifications,
  0,
)({
  push: (acc, { urgent }) => acc + (urgent ? 1 : 0),
  Default: (acc, item) => acc, // email and sms fall through here
});
```

`Default` receives the full union item — you can branch on `item.type` to handle specific unmatched variants:

```ts
const log = foldWithDefault(
  notifications,
  [] as string[],
)({
  push: (acc, { message }) => [...acc, `[PUSH] ${message}`],
  Default: (acc, item) => {
    if (item.type === 'email') return [...acc, `[EMAIL] ${item.subject}`];
    return acc; // sms silently skipped
  },
});
```

**Custom discriminant:**

```ts
foldWithDefault(
  events,
  0,
  'kind',
)({
  click: (acc, { x, y }) => acc + 1,
  Default: (acc) => acc,
});
```

> **Note:** `foldWithDefault` is standalone-only — it is not available on `createPipeHandlers` or `createUnion` in v2.2.

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

Counts how many items in a collection match the given variant(s). Single-pass, no intermediate array allocation. No TypeScript library offers a variant-aware counter — this is unique to dismatch.

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

Splits a collection into two arrays — items matching the variant(s) and the rest — in one pass with fully narrowed types. No TypeScript library offers variant-aware partitioning with narrowed types on both sides — this is unique to dismatch.

```ts
import { partition } from 'dismatch';

const [circles, rest] = partition(shapes, 'circle');
//      ^? Circle[]   ^? (Rectangle | Triangle)[]

const [actionable, rest] = partition(notifications, ['NEW', 'ACTION_NEEDED']);

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

Handler map type for `fold` — each handler takes `(accumulator, variantData)` and returns the new accumulator.

> Most of the time you won't need to import this. TypeScript infers the handler types when you pass them inline to `fold`. Reach for `Folder` only when you need to define or annotate a handler object separately from the call site.

```ts
import type { Folder } from 'dismatch';

type ShapeFolder = Folder<Shape, number, 'type'>;
// { circle: (acc: number, input: { radius: number }) => number; rectangle: ... }
```

### `FolderWithDefault<T, Acc, Discriminant>`

Handler map type for `foldWithDefault` — variant handlers are optional and `Default` is required. `Default` receives the full union item `T` (not stripped data) so you can inspect which variant fell through.

> Same as `Folder` — you rarely need this explicitly. It's there for when you pre-define a `foldWithDefault` handler object and want TypeScript to check it at the definition site rather than at the call site.

```ts
import type { FolderWithDefault } from 'dismatch';

type NotificationFolder = FolderWithDefault<Notification, number, 'type'>;
// {
//   push?: (acc: number, input: { urgent: boolean; message: string }) => number;
//   email?: (acc: number, input: { subject: string }) => number;
//   sms?: (acc: number, input: { from: string }) => number;
//   Default: (acc: number, item: Notification) => number;
// }
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

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines, principles, and the PR workflow.

```bash
npm test             # run tests
npm run test:package # verify packed exports and tarball contents
npm run test:watch   # watch mode
npm run ts:ci        # type-check
npm run ts:package   # type-check the built package surface
npm run build        # compile to lib/
npm run size         # measure minified bundle size
```

See [`samples/`](./samples) for real-world examples.

---

## License

MIT — see [LICENSE](./LICENSE).
