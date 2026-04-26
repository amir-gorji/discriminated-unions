# dismatch

[![npm](https://img.shields.io/npm/v/dismatch)](https://www.npmjs.com/package/dismatch)
[![license](https://img.shields.io/npm/l/dismatch)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![bundle size](https://img.shields.io/bundlephobia/minzip/dismatch)](https://bundlephobia.com/package/dismatch)

Type-safe discriminated unions for TypeScript. Define once, get constructors, type guards, exhaustive pattern matching, async dispatch, and runtime validation — all from a single schema. Zero dependencies. ~1.4 kB gzipped.

```ts
import { createUnion, is, type InferUnion } from 'dismatch';

const Shape = createUnion({
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

> **`switch` gives you exhaustiveness. `dismatch` gives you exhaustiveness plus reusable typed matchers, `map`, `fold`, `partition`, `count`, `is`, runtime validation, and async — all from a single schema.**

---

## Reusable matchers — define once, apply everywhere

The killer differentiator: handlers-first matching returns a typed, reusable function. Other libraries make every match one-shot.

```ts
// dismatch — handlers-first, returns a reusable function directly
const getArea = Shape.match({
  circle: ({ radius }) => Math.PI * radius ** 2,
  rectangle: ({ width, height }) => width * height,
});

shapes.map(getArea); // just works
shapes.filter(Shape.is('circle')); // narrowed to Circle[]

// ts-pattern — every match is inline, one-shot, wrapped in a function
const getArea = (shape: Shape): number =>
  match(shape)
    .with({ type: 'circle' }, ({ radius }) => Math.PI * radius ** 2)
    .with({ type: 'rectangle' }, ({ width, height }) => width * height)
    .exhaustive();
```

No wrapper lambdas, no `.exhaustive()`, no `{ type: '…' }` noise. Exhaustiveness is enforced by TypeScript itself — adding a variant breaks every unhandled call site at compile time.

---

> **Already have union types?** If your discriminated unions are already declared, skip `createUnion`.
>
> ```ts
> // Reusable handlers bound to your type — define once, use many times
> const shapeOps = createPipeHandlers<Shape>('type');
> const getArea = shapeOps.match({
>   circle: ({ radius }) => Math.PI * radius ** 2,
>   rectangle: ({ width, height }) => width * height,
> });
> shapes.map(getArea);
>
> // Or use standalone functions directly on any value
> const area = match(shape)({
>   circle: ({ radius }) => Math.PI * radius ** 2,
>   rectangle: ({ width, height }) => width * height,
> });
> ```
>
> See [Pipe Composition](#pipe-composition) and [Standalone Functions](#standalone-functions) for the full API.

---

## Async matching

Async handlers in TypeScript normally infer to `Promise<A> | Promise<B>` instead of `Promise<A | B>` — forcing manual `await` + cast. `matchAsync` (and friends) unify the result.

```ts
import { matchAsync, matchAllAsync, foldAsync } from 'dismatch';

// Single value — returns Promise<AdminProfile | GuestProfile>
const profile = await matchAsync(user)({
  admin: async ({ id }) => fetchAdminProfile(id),
  guest: async ({ id }) => fetchGuestProfile(id),
  banned: async ({ reason }) => ({ reason }) as const,
});

// Parallel over a collection — Promise.all under the hood, order preserved
const profiles = await matchAllAsync(users)({
  admin: async ({ id }) => fetchAdminProfile(id),
  guest: async ({ id }) => fetchGuestProfile(id),
  banned: async ({ reason }) => ({ reason }) as const,
});

// Sequential async fold — accumulator threads through `await`
const total = await foldAsync(
  events,
  0,
)({
  click: async (acc, { x }) => acc + x,
  key: async (acc) => acc + 1,
});
```

Mixing sync and async handlers is fine — the result still unifies to `Promise<R>`. See [Standalone Functions](#standalone-functions) for the full async surface (`matchAsync`, `matchWithDefaultAsync`, `matchAllAsync`, `mapAsync`, `foldAsync`).

---

## Install

```bash
npm install dismatch
```

---

## Table of Contents

- [Reusable matchers](#reusable-matchers--define-once-apply-everywhere)
- [Async matching](#async-matching)
- [Install](#install)
- [Comparison](#comparison)
- [Quick Start](#quick-start)
- [Standalone Functions](#standalone-functions)
- [Pipe Composition](#pipe-composition)
- [Type Helpers](#type-helpers)
- [Custom Discriminant](#custom-discriminant)
- [Patterns](#patterns)
- [RemoteData](#remotedata)
- [Runtime Errors & Clean Stack Traces](#runtime-errors--clean-stack-traces)
- [Contributing](#contributing)
- [License](#license)

---

## Comparison

> **`ts-pattern` matches any pattern. `dismatch` manages discriminated unions — and is the only one with first-class async.**

| Capability                                          |          dismatch          |      ts-pattern       | unionize  |    @effect/match     |
| --------------------------------------------------- | :------------------------: | :-------------------: | :-------: | :------------------: |
| **Footprint**                                       |                            |                       |           |                      |
| Size, minified (full main entry, not gzipped)     |        **~3.4 kB**         |        ~7.7 kB        | unclear   |    ecosystem-tied    |
| Zero dependencies                                   |             ✓              |           ✓           |     ✓     |          ✗           |
| Per-function tree-shaking                           |             ✓              |        partial        |     —     |       partial        |
| Active maintenance                                  |             ✓              |           ✓           | ✗ (2018)  |          ✓           |
| **Compile-time correctness**                        |                            |                       |           |                      |
| Exhaustive matching for DUs                         |             ✓              | ✓ via `.exhaustive()` |     ✓     |          ✓           |
| No `{ type: '…' }` / `.with()` ceremony per branch  |             ✓              |           ✗           |     ✓     |          ✗           |
| Reusable, curried handlers (define once, reuse)     |             ✓              |     ✗ (one-shot)      |     ✓     |       partial        |
| Sub-union narrowing on `.filter()` / `.find()`      |             ✓              |           ✗           |     ✗     |          ✗           |
| Payload threaded through every handler              |             ✓              |           ✗           |     ✗     |          ✗           |
| **Async — unique to dismatch**                      |                            |                       |           |                      |
| `matchAsync` — single value, unified `Promise<R>`   |           **✓**            |           ✗           |     ✗     |          ✗           |
| `matchWithDefaultAsync` — partial async             |           **✓**            |           ✗           |     ✗     |          ✗           |
| `matchAllAsync` — parallel, order-preserved         |           **✓**            |           ✗           |     ✗     |          ✗           |
| `foldAsync` — sequential aggregation                |           **✓**            |           ✗           |     ✗     |          ✗           |
| `foldWithDefaultAsync`                              |           **✓**            |           ✗           |     ✗     |          ✗           |
| `mapAsync` — async partial transform                |           **✓**            |           ✗           |     ✗     |          ✗           |
| Mixed sync + async handlers still unify             |           **✓**            |           ✗           |     ✗     |          ✗           |
| **Variant-aware collections**                       |                            |                       |           |                      |
| `fold` — exhaustive single-pass aggregation         |             ✓              |           ✗           |     ✗     |          ✗           |
| `foldWithDefault` — partial aggregation             |             ✓              |           ✗           |     ✗     |          ✗           |
| `count` by variant(s)                               |             ✓              |           ✗           |     ✗     |          ✗           |
| `partition` (both sides narrowed)                   |             ✓              |           ✗           |     ✗     |          ✗           |
| `map` partial transform (discriminant kept)         |             ✓              |           ✗           |     ✗     |          ✗           |
| `mapAll` exhaustive transform                       |             ✓              |           ✗           |     ✗     |          ✗           |
| **Runtime & schema**                                |                            |                       |           |                      |
| `createUnion` — one schema, full toolkit            |             ✓              |           ✗           | ✓ (stale) |          ✗           |
| `isKnown` — schema-membership check                 |             ✓              |           ✗           |     ✗     | via `@effect/schema` |
| Named `UnknownVariantError` (`.variant`, `.known`)  |             ✓              |           ✗           |     ✗     |          ✗           |
| Clean stack traces (point at your call site)        |             ✓              |           ✗           |     ✗     |          ✗           |
| Companion async-state union (`dismatch/remote-data`)|             ✓              |           ✗           |     ✗     |          ✗           |

> **Need regex, wildcards, nested object patterns, or class-instance matching?** Use `ts-pattern` — those aren't DU problems. For the 90% of TypeScript code where unions look like `{ type: 'x' } | { type: 'y' }`, `dismatch` is the scalpel.

**You don't pay for what you don't use.** Every standalone function is independently tree-shakable. The gzipped figure above is worst-case (everything imported); a project that only uses `match` and `is` ships well under 1 kB. ESM, `sideEffects: false`, and zero internal cross-references mean modern bundlers (esbuild, rollup, vite, webpack 5+) drop unused exports automatically.

---

## Quick Start

### 1. Define a union

`createUnion` has two forms:

- `createUnion(schema)` — uses the default discriminant key `'type'`
- `createUnion(discriminant, schema)` — lets you use a different key such as `'kind'`

The **discriminant** is the string-tag property that tells `dismatch` which variant a value is. In `{ type: 'ok', data: '...' }`, the discriminant key is `type`, and the active variant is `'ok'`. Constructors return only the data fields — `createUnion` injects the discriminant automatically.

```ts
import { createUnion, type InferUnion } from 'dismatch';

const Result = createUnion({
  ok: (data: string) => ({ data }),
  error: (message: string) => ({ message }),
  loading: () => ({}),
});

type Result = InferUnion<typeof Result>;
// { type: 'ok'; data: string } | { type: 'error'; message: string } | { type: 'loading' }
```

If your union already uses a different tag key, pass it explicitly:

```ts
const Event = createUnion('kind', {
  click: (x: number) => ({ x }),
  key: (code: string) => ({ code }),
});

type Event = InferUnion<typeof Event>;
// { kind: 'click'; x: number } | { kind: 'key'; code: string }
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

### 4. Pattern matching

All matchers are bound to the factory and curried **handlers-first** — define once, apply many times:

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

// Async — handlers may return Promise<R>; result unifies to Promise<R>
const fetchLabel = Result.matchAsync({
  ok: async ({ data }) => `Data: ${data}`,
  error: async ({ message }) => `Error: ${message}`,
  loading: async () => 'Loading...',
});

await fetchLabel(r); // Promise<string>

// Transform — modify specific variants, rest pass through unchanged
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

### `matchAsync`

Exhaustive async pattern matching. Handlers may return either `R` or `Promise<R>`. The result is unified to `Promise<R>` — never `Promise<A> | Promise<B>`.

```ts
import { matchAsync } from 'dismatch';

const profile = await matchAsync(user)({
  admin: async ({ id }) => fetchAdminProfile(id),
  guest: async ({ id }) => fetchGuestProfile(id),
  banned: ({ reason }) => ({ kind: 'banned', reason }), // sync handler is fine too
});
```

### `matchWithDefaultAsync`

Partial async matching with an async-or-sync `Default` fallback.

```ts
import { matchWithDefaultAsync } from 'dismatch';

const status = await matchWithDefaultAsync(result)({
  ok: async ({ data }) => `Loaded ${data.length} items`,
  Default: () => 'Idle',
});
```

### `matchAllAsync`

Parallel per-item async dispatch over a collection. Each item runs through its variant handler concurrently via `Promise.all`. Order is preserved. Use this when handlers are independent (no shared accumulator).

```ts
import { matchAllAsync } from 'dismatch';

const profiles = await matchAllAsync(users)({
  admin: async ({ id }) => fetchAdminProfile(id),
  guest: async ({ id }) => fetchGuestProfile(id),
});
//    ^? (AdminProfile | GuestProfile)[]
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

### `mapAsync`

Async partial transform. Like `map`, but handlers may return a Promise. Unmatched variants pass through unchanged. Result is `Promise<T>`.

```ts
import { mapAsync } from 'dismatch';

const enriched = await mapAsync(shape)({
  circle: async ({ radius }) => ({ radius: await fetchScaled(radius) }),
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
// stats: { circles: 2, totalArea: 24 + Math.PI * (25 + 100) }
```

Exhaustive, single-pass, and purpose-built — no `reduce` wrapper, no `.exhaustive()` call, no `{ type: '…' }` noise. Compare to the alternatives:

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

### `foldAsync`

Sequential async fold. Each handler may return `Acc` or `Promise<Acc>`. The accumulator threads through `await`, so handlers run strictly in array order. For parallel per-item dispatch (independent handlers), use [`matchAllAsync`](#matchallasync).

```ts
import { foldAsync } from 'dismatch';

const total = await foldAsync(
  events,
  0,
)({
  click: async (acc, { x }) => acc + (await scoreClick(x)),
  key: (acc) => acc + 1,
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

For `.filter()`, `.find()`, or pipe composition, use [`createPipeHandlers(...).is(...)`](#pipe-composition) — variant-first and fully inferred without call-site generics.

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

### `UnknownVariantError`

Thrown by exhaustive matchers (`match`, `matchAsync`, `fold`, etc.) when a runtime value carries a variant that no handler covers and no `Default` fallback is provided. This is a strict superset of what a native `switch` can detect — `switch` silently falls through to `default`; dismatch throws with the specific variant name and the set of known handlers.

```ts
import { match, UnknownVariantError } from 'dismatch';

try {
  match(apiResponse)({
    ok: ({ data }) => data,
    error: ({ message }) => `Error: ${message}`,
  });
} catch (e) {
  if (e instanceof UnknownVariantError) {
    console.error(`Got "${e.variant}", expected one of: ${e.known.join(', ')}`);
    // e.variant: string — the unknown tag at runtime
    // e.known:   readonly string[] — handler keys that were registered
  }
}
```

`matchWithDefault` / `matchWithDefaultAsync` / `foldWithDefault` never throw this — they route to `Default` instead.

---

## Pipe Composition

`createPipeHandlers` returns the same set of operations in **handlers-first** curried order — you define handlers once, get back a reusable function bound to the union type and discriminant. No generics needed at call sites. Exposes `match`, `matchWithDefault`, `matchAsync`, `matchWithDefaultAsync`, `matchAllAsync`, `map`, `mapAll`, `mapAsync`, `fold`, `foldWithDefault`, `foldAsync`, `count`, `partition`, and `is`.

```ts
import { createPipeHandlers } from 'dismatch';

type Shape =
  | { type: 'circle'; radius: number }
  | { type: 'rectangle'; width: number; height: number };

const shapeOps = createPipeHandlers<Shape>('type');

const getArea = shapeOps.match({
  circle: ({ radius }) => Math.PI * radius ** 2,
  rectangle: ({ width, height }) => width * height,
});

const shapes: Shape[] = [
  { type: 'circle', radius: 1 },
  { type: 'rectangle', width: 2, height: 3 },
];

shapes.map(getArea); // [3.14, 6]

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

volume(shape, { depth: 10 }); // 100
```

**Compose inside a `pipe`:**

```ts
import { pipe } from 'fp-ts/function'; // or any pipe utility

const result = pipe(
  shape,
  shapeOps.match({
    circle: () => 'round',
    rectangle: () => 'flat',
  }),
);
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

### `Folder<T, Acc, Discriminant>` / `FolderWithDefault<T, Acc, Discriminant>`

Handler map types for `fold` / `foldWithDefault`. Most of the time you don't need to import these — TypeScript infers handler types when you pass them inline. Reach for them only when you need to define a handler object separately from the call site.

```ts
import type { Folder, FolderWithDefault } from 'dismatch';

type ShapeFolder = Folder<Shape, number, 'type'>;
type NotificationFolder = FolderWithDefault<Notification, number, 'type'>;
```

### `AsyncMatcher` / `AsyncMatcherWithDefault` / `AsyncMapper` / `AsyncFolder` / `AsyncFolderWithDefault`

Async counterparts to `Matcher`, `Mapper`, etc. Each handler may return either the sync result or a `Promise` of it. Use these only when defining a handler object away from the call site.

```ts
import type { AsyncMatcher } from 'dismatch';

type FetchProfile = AsyncMatcher<User, Profile, 'type'>;
```

---

## Custom Discriminant

I recommend using `'type'` when you control the shape of the union. In `dismatch`, the discriminant is just the property that stores the variant tag. So in `{ type: 'dog', name: 'Rex' }`, the discriminant key is `type`, and the active variant is `'dog'`.

`'type'` is the library default, so you can usually omit it entirely:

```ts
type Animal = { type: 'dog'; name: string } | { type: 'cat'; lives: number };

match(animal)({ dog: ({ name }) => name, cat: () => 'meow' });
is(animal, 'dog');
isUnion(animal);

const Animal = createUnion({
  dog: (name: string) => ({ name }),
  cat: (lives: number) => ({ lives }),
});
```

If your data already uses a different property name, pass that key explicitly:

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

---

## RemoteData

`dismatch/remote-data` ships a ready-made remote data union — `Idle | Loading | Refreshing<T> | Ok<T> | Failed<E>` — with constructors already wired up.

```ts
import { RemoteData, type RemoteData as RD } from 'dismatch/remote-data';
import { match } from 'dismatch';

type State = RD<User[]>;

let state: State = RemoteData.idle();
state = RemoteData.loading();
state = RemoteData.ok(users);

const content = match(state)({
  idle: () => 'Click to load',
  loading: () => 'Loading…',
  refreshing: ({ data }) => `Refreshing ${data.length} items…`,
  ok: ({ data }) => `Loaded ${data.length} items`,
  failed: ({ error }) => `Error: ${error.message}`,
});
```

---

## Runtime Errors & Clean Stack Traces

When dismatch throws, the stack trace points to **your call site** — not library internals:

```
UnknownVariantError: dismatch: unknown variant "weird" (known: ok, error, loading)
    at handleResponse (src/api.ts:27:18)   // ← your code, not ours
```

Two thrown error shapes:

- `UnknownVariantError` — exhaustive matcher hit a runtime variant with no handler. Catchable by class; carries `.variant` and `.known`. See [`UnknownVariantError`](#unknownvarianterror).
- Plain `Error('Not a union')` — input value is not a valid discriminated union (null, primitive, array, missing/non-string discriminant property).

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
