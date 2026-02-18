# dismatch

Type-safe pattern matching for TypeScript discriminated unions. Zero dependencies. Full type inference. Exhaustive checking at compile time.

Stop writing `switch` statements. Start matching.

## Install

```bash
npm install dismatch
```

## The Problem

TypeScript discriminated unions are powerful, but working with them is tedious:

```ts
type Shape =
  | { type: 'circle'; radius: number }
  | { type: 'rectangle'; width: number; height: number }
  | { type: 'triangle'; base: number; height: number };

// This gets old fast
function area(shape: Shape): number {
  switch (shape.type) {
    case 'circle':
      return Math.PI * shape.radius ** 2;
    case 'rectangle':
      return shape.width * shape.height;
    case 'triangle':
      return (shape.base * shape.height) / 2;
  }
}
```

Add a new variant to `Shape` and the compiler won't tell you about the 14 switch statements you forgot to update.

## The Solution

```ts
import { match } from 'dismatch';

const area = match(shape)({
  circle: ({ radius }) => Math.PI * radius ** 2,
  rectangle: ({ width, height }) => width * height,
  triangle: ({ base, height }) => (base * height) / 2,
});
```

Add a new variant. TypeScript screams at every `match` call that's missing a handler. That's the point.

## API

### `match(union)(handlers)` — Exhaustive Pattern Matching

Every variant must have a handler. Exhaustiveness is enforced at two levels:

- **Compile time** — TypeScript won't compile if any variant is missing a handler.
- **Runtime** — if a value bypasses the type system (e.g. via `any`, a cast, or an unexpected API response), `match` throws rather than silently doing nothing.

```ts
type Result =
  | { type: 'ok'; data: string }
  | { type: 'error'; message: string }
  | { type: 'loading' };

const response: Result = { type: 'ok', data: 'hello' };

const message = match(response)({
  ok: ({ data }) => `Got: ${data}`,
  error: ({ message }) => `Failed: ${message}`,
  loading: () => 'Loading...',
});
// message: "Got: hello"
```

The return type is inferred from your handlers. Return numbers, strings, objects, whatever you want — it just works.

### `matchWithDefault(union)(handlers)` — Match With Fallback

Handle some variants explicitly. Catch the rest with `Default`.

```ts
const label = matchWithDefault(response)({
  error: ({ message }) => `Error: ${message}`,
  Default: () => 'Everything is fine',
});
```

Useful when you only care about specific variants and want a catch-all for the rest.

### `map(union)(handlers)` — Partial Transformation

Transform specific variants. The rest pass through unchanged.

```ts
const doubled = map(shape)({
  circle: ({ type, radius }) => ({ type, radius: radius * 2 }),
});
// If shape is a circle: radius is doubled
// If shape is anything else: returned as-is, untouched
```

Think of it as "update where type matches". Handlers you don't provide default to identity.

### `mapAll(union)(handlers)` — Full Transformation

Like `map`, but every variant must have a handler. No freebies.

```ts
const normalized = mapAll(shape)({
  circle: ({ type, radius }) => ({ type, radius: Math.abs(radius) }),
  rectangle: ({ type, width, height }) => ({ type, width: Math.abs(width), height: Math.abs(height) }),
  triangle: ({ type, base, height }) => ({ type, base: Math.abs(base), height: Math.abs(height) }),
});
```

### `is(union, type)` — Type Guard

Narrows a union to a specific variant. Works in `if` statements, `filter` calls, anywhere TypeScript expects a type predicate.

```ts
import { is } from 'dismatch';

if (is(shape, 'circle')) {
  // TypeScript knows: shape is { type: 'circle'; radius: number }
  console.log(shape.radius);
}

// Works great with array filtering
const circles = shapes.filter((s) => is(s, 'circle'));
// circles: { type: 'circle'; radius: number }[]
```

### `isUnion(value, discriminant?)` — Runtime Validation

Checks whether a value is a valid discriminated union (a non-null object with a string discriminant property). Useful at system boundaries — API responses, form data, anything you can't trust at compile time.

```ts
import { isUnion } from 'dismatch';

isUnion({ type: 'circle', radius: 5 }); // true
isUnion({ name: 'no type field' });      // false
isUnion(null);                            // false
isUnion('string');                        // false

// Custom discriminant
isUnion({ kind: 'click', x: 10 }, 'kind'); // true
isUnion({ type: 'circle' }, 'kind');        // false
```

## Defining Your Unions

Use plain TypeScript types. Any object with a `type` string discriminant works:

```ts
type ApiResponse =
  | { type: 'success'; data: User[] }
  | { type: 'error'; code: number; message: string }
  | { type: 'unauthorized' };
```

Or use the `Model` helper type for cleaner definitions:

```ts
import type { Model } from 'dismatch';

type Success = Model<'success', { data: User[] }>;
type ApiError = Model<'error', { code: number; message: string }>;
type Unauthorized = Model<'unauthorized', {}>;

type ApiResponse = Success | ApiError | Unauthorized;
```

## Custom Discriminant Property

By default, dismatch uses `type` as the discriminant property. If your unions use a different field — common in API responses that use `status` — pass it as a second argument to any function:

```ts
type ApiResponse<T> =
  | { status: 'success'; data: T }
  | { status: 'error'; message: string; code: number }
  | { status: 'loading' };

const response: ApiResponse<User[]> = await fetchUsers();

// Handlers can be async — the inferred return type becomes Promise<...>
const users = await match(response, 'status')({
  success: async ({ data }) => normalize(data),
  error: ({ message, code }) => Promise.reject(new ApiError(message, code)),
  loading: async () => [],
});
```

Every function in the API accepts the discriminant as an optional extra argument:

```ts
matchWithDefault(response, 'status')({ error: ..., Default: ... });
map(response, 'status')({ error: ... });
mapAll(response, 'status')({ success: ..., error: ..., loading: ... });
is(response, 'success', 'status');
isUnion(response, 'status');
```

TypeScript infers the discriminant from the type, so you keep full type safety regardless of what field name you use.

## Curried by Design

Every function returns a reusable matcher. Bind the data once, apply different handlers later:

```ts
const handleResponse = match(response);

// Use the same bound value with different matchers
const statusCode = handleResponse({
  ok: () => 200,
  error: ({ code }) => code,
  loading: () => 0,
});

const isHealthy = handleResponse({
  ok: () => true,
  error: () => false,
  loading: () => false,
});
```

## Real-World Examples

### State Machines

```ts
type AuthState =
  | { type: 'logged_out' }
  | { type: 'logging_in'; email: string }
  | { type: 'logged_in'; user: User; token: string }
  | { type: 'error'; reason: string };

function renderAuth(state: AuthState) {
  return match(state)({
    logged_out: () => renderLoginForm(),
    logging_in: ({ email }) => renderSpinner(`Signing in ${email}...`),
    logged_in: ({ user }) => renderDashboard(user),
    error: ({ reason }) => renderError(reason),
  });
}
```

### Reducer Actions

```ts
type Action =
  | { type: 'increment'; amount: number }
  | { type: 'decrement'; amount: number }
  | { type: 'reset' };

function reducer(state: number, action: Action): number {
  return match(action)({
    increment: ({ amount }) => state + amount,
    decrement: ({ amount }) => state - amount,
    reset: () => 0,
  });
}
```

### API Response Handling

```ts
type FetchResult<T> =
  | { type: 'pending' }
  | { type: 'fulfilled'; data: T }
  | { type: 'rejected'; error: Error };

function unwrapOr<T>(result: FetchResult<T>, fallback: T): T {
  return matchWithDefault(result)({
    fulfilled: ({ data }) => data,
    Default: () => fallback,
  });
}
```

### Selective Updates

```ts
type Notification =
  | { type: 'email'; subject: string; read: boolean }
  | { type: 'sms'; body: string; read: boolean }
  | { type: 'push'; title: string; read: boolean };

// Mark only emails as read, leave everything else alone
const markEmailsRead = (n: Notification) =>
  map(n)({
    email: ({ type, subject }) => ({ type, subject, read: true }),
  });
```

## Clean Stack Traces

When dismatch throws an error (e.g. you pass a non-union value), the stack trace points directly to your call site — not into minified library internals.

Most libraries don't do this. Without stack trace clearing, you get noise like:

```
Error: Data is not of type discriminated union!
    at Object.<anonymous> (node_modules/some-lib/dist/index.cjs:1:3842)
    at Object.<anonymous> (node_modules/some-lib/dist/index.cjs:1:1205)
    at Object.<anonymous> (node_modules/some-lib/dist/index.cjs:1:892)
    at handleResponse (src/api/users.ts:27:18)
```

The real call site is buried under a wall of minified package frames. With dismatch, the stack starts where you actually made the mistake:

```
Error: Data is not of type discriminated union!
    at handleResponse (src/api/users.ts:27:18)
```

This works via `Error.captureStackTrace` (V8/Node.js). In environments that don't support it the error is still thrown — the stack just isn't trimmed.

## Scripts

```bash
npm run build        # Compile TypeScript
npm test             # Run tests
npm run test:watch   # Run tests in watch mode
npm run ts:ci        # Type check (no emit)
```

## License

MIT (refer to LICENSE file)
