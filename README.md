# dismatch

[![npm](https://img.shields.io/npm/v/dismatch)](https://www.npmjs.com/package/dismatch)
[![license](https://img.shields.io/npm/l/dismatch)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)

Type-safe pattern matching for TypeScript discriminated unions. Zero dependencies. Full type inference. Exhaustiveness enforced at compile time.

```ts
const area = match(shape)({
  circle:    ({ radius })        => Math.PI * radius ** 2,
  rectangle: ({ width, height }) => width * height,
  triangle:  ({ base, height })  => (base * height) / 2,
});
```

## Table of Contents

- [Install](#install)
- [Why dismatch](#why-dismatch)
- [API Reference](#api-reference)
  - [match](#match)
  - [matchWithDefault](#matchwithdefault)
  - [map](#map)
  - [mapAll](#mapall)
  - [is](#is)
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

## Why dismatch

TypeScript discriminated unions are expressive, but switch/if-else chains on them are brittle. Add a new variant and the compiler stays silent while your 12 unhandled cases become silent bugs:

```ts
// ❌ Before — silent gaps, no compile-time safety
function area(shape: Shape): number {
  switch (shape.type) {
    case 'circle':    return Math.PI * shape.radius ** 2;
    case 'rectangle': return shape.width * shape.height;
    // added 'triangle' to Shape last week — nobody noticed
  }
}
```

```ts
// ✅ After — TypeScript errors at every unhandled call site
function area(shape: Shape): number {
  return match(shape)({
    circle:    ({ radius })        => Math.PI * radius ** 2,
    rectangle: ({ width, height }) => width * height,
    triangle:  ({ base, height })  => (base * height) / 2,
    // forget triangle → TypeScript error here
  });
}
```

Add a new variant. TypeScript immediately flags every `match` call that hasn't been updated. No runtime surprises.

---

## API Reference

### `match`

Exhaustive pattern matching. Every variant must have a handler — TypeScript errors at compile time if one is missing, and throws at runtime if an unexpected value slips through (e.g. via `any` or an unchecked API response).

```ts
import { match } from 'dismatch';

type Result =
  | { type: 'ok'; data: string }
  | { type: 'error'; message: string }
  | { type: 'loading' };

const label = match(result)({
  ok:      ({ data })    => `Data: ${data}`,
  error:   ({ message }) => `Error: ${message}`,
  loading: ()            => 'Loading…',
});
```

Handlers receive the variant's properties. The return type is inferred from all handlers — it can be a string, number, JSX element, Promise, another union, anything.

**Curried:** `match(value)` returns a reusable function. Bind once, apply different handler sets:

```ts
const handle = match(result);

const statusCode = handle({ ok: () => 200,  error: () => 500, loading: () => 202 });
const isHealthy  = handle({ ok: () => true, error: () => false, loading: () => false });
```

---

### `matchWithDefault`

Partial matching with a required `Default` fallback. Handle the variants you care about; `Default` catches everything else.

```ts
import { matchWithDefault } from 'dismatch';

const banner = matchWithDefault(result)({
  error:   ({ message }) => `Something went wrong: ${message}`,
  Default: ()            => 'All good',
});
```

Use `matchWithDefault` when you genuinely don't need to handle every case. Prefer `match` everywhere else — exhaustive matching catches bugs at compile time when new variants are added.

---

### `map`

Transform specific variants. The rest pass through **unchanged** (same object reference).

```ts
import { map } from 'dismatch';

// Only circles grow; rectangles and triangles are returned as-is
const bigger = map(shape)({
  circle: ({ radius }) => ({ type: 'circle' as const, radius: radius * 2 }),
});
```

Handlers receive the variant's **data fields** (not including the discriminant key). The return must include the full object — provide the `type` literal explicitly so the result is a valid union variant. Variants without a handler are identity-passed (same object reference).

---

### `mapAll`

Like `map`, but every variant must have a handler. TypeScript errors if any are missing.

```ts
import { mapAll } from 'dismatch';

const normalized = mapAll(shape)({
  circle:    ({ radius })        => ({ type: 'circle'    as const, radius: Math.abs(radius) }),
  rectangle: ({ width, height }) => ({ type: 'rectangle' as const, width:  Math.abs(width),
                                                                    height: Math.abs(height) }),
  triangle:  ({ base, height })  => ({ type: 'triangle'  as const, base:   Math.abs(base),
                                                                    height: Math.abs(height) }),
});
```

Use `mapAll` when transforming the whole union and you want the same exhaustiveness guarantee as `match`.

---

### `is`

Type guard that narrows a union to a specific variant. Works in `if` blocks, `.filter()`, and anywhere TypeScript expects a type predicate.

```ts
import { is } from 'dismatch';

if (is(shape, 'circle')) {
  console.log(shape.radius); // TypeScript knows: shape is { type: 'circle'; radius: number }
}

// Array filtering — inferred element type is the narrowed variant
const circles = shapes.filter((s) => is(s, 'circle'));
//    ^? { type: 'circle'; radius: number }[]
```

---

### `isUnion`

Runtime check that a value is a valid discriminated union (a non-null object with a string discriminant property). Useful at system boundaries — API responses, user input, external data.

```ts
import { isUnion } from 'dismatch';

isUnion({ type: 'ok', data: 42 }); // true
isUnion(null);                      // false
isUnion('hello');                   // false
isUnion({ name: 'no type field' }); // false

// Custom discriminant
isUnion({ kind: 'click', x: 10 }, 'kind'); // true
```

---

### `createPipeHandlers`

Creates a handler factory **bound to a discriminant key**. Returns `match`, `matchWithDefault`, `map`, and `mapAll` in **handlers-first** curried order — `(handlers) => (input) => result` — making them directly composable inside any `pipe` utility without wrapper lambdas.

```ts
import { createPipeHandlers } from 'dismatch';

const shapeOps = createPipeHandlers<Shape, 'type'>('type');

// Define handlers once — get back a reusable (shape: Shape) => number
const getArea = shapeOps.match({
  circle:    ({ radius })        => Math.PI * radius ** 2,
  rectangle: ({ width, height }) => width * height,
  triangle:  ({ base, height })  => (base * height) / 2,
});

getArea(circle);    // 78.54…
getArea(rectangle); // 24

// Apply to an entire array — no wrapper lambdas
const areas = shapes.map(getArea);

// Compose directly in a pipe
import { pipe } from 'fp-ts/function';

const result = pipe(
  shape,
  shapeOps.match({
    circle:    () => 'round',
    rectangle: () => 'flat',
    triangle:  () => 'pointy',
  }),
);
```

Regular `match(value)(handlers)` is great for one-off decisions. `createPipeHandlers` shines when you need to **reuse the same handler set** across many values or **compose** operations in a pipeline:

| Use case | Prefer |
|---|---|
| One-off match on a single value | `match(value)(handlers)` |
| Apply the same handler set to an array or stream | `createPipeHandlers` |
| Compose multiple operations in a `pipe` | `createPipeHandlers` |
| Pass a handler as a callback / higher-order function | `createPipeHandlers` |

See the [`samples/`](./samples) directory for end-to-end real-world examples.

---

## Type Helpers

### `Model<DiscriminantValue, Data?, Discriminant?>`

Constructs a single variant type. Both `Data` and `Discriminant` are optional — `Data` defaults to `{}` and `Discriminant` defaults to `'type'`.

```ts
import type { Model } from 'dismatch';

// Minimal — empty data payload, 'type' discriminant
type Idle    = Model<'idle'>;
// → { type: 'idle' }

// With data fields
type Success = Model<'success', { data: User[] }>;
// → { type: 'success'; data: User[] }

type Failure = Model<'failure', { error: string; retries: number }>;
// → { type: 'failure'; error: string; retries: number }

type FetchState = Idle | Success | Failure;
```

With a custom discriminant key:

```ts
type DogVariant = Model<'dog', { name: string }, 'kind'>;
// → { kind: 'dog'; name: string }
```

### `UnionByArray<T, Discriminant?>`

Derives a union type from a tuple of `Model` types. Useful when you define variants as a tuple (for iteration, schema generation, or documentation) and need the union type from it.

```ts
import type { Model, UnionByArray } from 'dismatch';

type Variants = [
  Model<'circle',    { radius: number }>,
  Model<'rectangle', { width: number; height: number }>,
];

type Shape = UnionByArray<Variants>;
// → Model<'circle', { radius: number }> | Model<'rectangle', { width: number; height: number }>
```

### `TakeDiscriminant<T>`

Extracts valid discriminant key candidates from a union type — keys whose value types are narrow (non-wide) strings. Used internally by `createPipeHandlers` to constrain the discriminant argument.

```ts
import type { TakeDiscriminant } from 'dismatch';

type D = TakeDiscriminant<Shape>; // 'type'
type A = TakeDiscriminant<Animal>; // 'kind'
```

---

## Custom Discriminant

All functions accept an optional discriminant parameter (default: `'type'`). Pass your field name as a second argument to match unions that use `kind`, `status`, `tag`, or any other key:

```ts
type Animal =
  | { kind: 'dog';  name: string }
  | { kind: 'cat';  lives: number }
  | { kind: 'bird'; canFly: boolean };

const sound = match(animal, 'kind')({
  dog:  ({ name })   => `${name} barks`,
  cat:  ()           => 'meow',
  bird: ({ canFly }) => canFly ? 'tweet' : 'squawk',
});
```

Every function in the API follows the same signature:

```ts
matchWithDefault(animal, 'kind')({ dog: ..., Default: ... });
map(animal,      'kind')({ cat: ... });
mapAll(animal,   'kind')({ dog: ..., cat: ..., bird: ... });
is(animal, 'dog',  'kind');
isUnion(animal,    'kind');
```

With `createPipeHandlers`, pass the discriminant once at creation — all returned functions inherit it:

```ts
const animalOps = createPipeHandlers<Animal, 'kind'>('kind');

const describe = animalOps.match({
  dog:  ({ name })   => `Dog: ${name}`,
  cat:  ({ lives })  => `Cat with ${lives} lives`,
  bird: ({ canFly }) => `Bird (${canFly ? 'flies' : 'flightless'})`,
});

describe(dog);  // 'Dog: Rex'
describe(bird); // 'Bird (flies)'
```

---

## Patterns

### Rendering UI

Use `match` to map every state to a view — exhaustively, without else branches. Adding a new state variant forces you to update every render site at compile time:

```ts
type FetchState<T> =
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'success'; data: T; stale: boolean }
  | { type: 'failure'; error: string };

function UserList({ state }: { state: FetchState<User[]> }) {
  return match(state)({
    idle:    ()             => <button onClick={fetch}>Load users</button>,
    loading: ()             => <Spinner />,
    success: ({ data })     => <ul>{data.map(renderUser)}</ul>,
    failure: ({ error })    => <ErrorBanner message={error} />,
  });
}
```

### Reducer / State Machine

```ts
type Action =
  | { type: 'increment'; by: number }
  | { type: 'decrement'; by: number }
  | { type: 'reset' };

const reduce = (state: number, action: Action): number =>
  match(action)({
    increment: ({ by }) => state + by,
    decrement: ({ by }) => state - by,
    reset:     ()       => 0,
  });
```

### Selective State Transitions with `map`

```ts
type Notification =
  | { type: 'email'; subject: string; read: boolean }
  | { type: 'sms';   body: string;    read: boolean }
  | { type: 'push';  title: string;   read: boolean };

// Mark only emails as read — SMS and push pass through as the same object reference
const markEmailRead = (n: Notification): Notification =>
  map(n)({
    email: ({ subject }) => ({ type: 'email' as const, subject, read: true }),
  });
```

### Batch Operations with `createPipeHandlers`

```ts
const shapeOps = createPipeHandlers<Shape, 'type'>('type');

// Build the matcher once
const getArea = shapeOps.match({
  circle:    ({ radius })        => Math.PI * radius ** 2,
  rectangle: ({ width, height }) => width * height,
  triangle:  ({ base, height })  => (base * height) / 2,
});

// Apply to any collection — no wrapper lambdas, no ceremony
const areas         = shapes.map(getArea);
const totalArea     = areas.reduce((sum, a) => sum + a, 0);
const largestIndex  = areas.indexOf(Math.max(...areas));
```

### Pipe Composition

```ts
import { pipe } from 'fp-ts/function'; // or any pipe utility

const shapeOps = createPipeHandlers<Shape, 'type'>('type');

const describeArea = pipe(
  shape,
  shapeOps.match({
    circle:    ({ radius })        => Math.PI * radius ** 2,
    rectangle: ({ width, height }) => width * height,
    triangle:  ({ base, height })  => (base * height) / 2,
  }),
  (area) => `Area: ${area.toFixed(2)} sq units`,
);
```

---

## Clean Stack Traces

When dismatch throws (e.g. an unvalidated API response bypasses the type system), the stack trace points to **your call site** — not into minified library internals.

```
// ❌ Typical library — your code is buried under framework frames
Error: Data is not of type discriminated union!
    at validate  (node_modules/dismatch/dist/index.cjs:1:892)
    at match     (node_modules/dismatch/dist/index.cjs:1:1205)
    at handleResponse (src/api.ts:27:18)

// ✅ dismatch — stack starts where you made the call
Error: Data is not of type discriminated union!
    at handleResponse (src/api.ts:27:18)
```

Powered by `Error.captureStackTrace` (V8/Node.js). In environments without it the error still throws — the stack just isn't trimmed.

---

## Contributing

```bash
npm test             # run the test suite
npm run test:watch   # watch mode
npm run ts:ci        # type-check without emitting
npm run build        # compile to lib/
```

---

## License

MIT — see [LICENSE](./LICENSE).
