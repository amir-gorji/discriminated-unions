import {
  Folder,
  FolderWithDefault,
  InferUnionFromSchema,
  Mapper,
  MapperAll,
  Matcher,
  MatcherWithDefault,
  ReservedUnionKeys,
  SampleUnion,
  TakeDiscriminant,
  UnionSchema,
  UnionFactory,
} from './types';

declare global {
  interface ErrorConstructor {
    captureStackTrace?: (
      targetObject: object,
      constructorOpt?: Function,
    ) => void;
  }
}

// ── Internal helpers ───────────────────────────────────────────────────────

const DEFAULT_DISCRIMINANT = 'type';

function fail(message: string, caller: Function): never {
  const err = new Error(message);
  Error.captureStackTrace?.(err, caller);
  throw err;
}

function ensureUnion(
  input: unknown,
  discriminant: PropertyKey,
  caller: Function,
): asserts input is SampleUnion<typeof discriminant> {
  if (!isUnion(input, discriminant)) fail('Not a union', caller);
}

function reduce<
  T extends SampleUnion<Discriminant>,
  Acc,
  Discriminant extends PropertyKey,
>(
  items: readonly T[],
  initial: Acc,
  handlers: Record<string, ((acc: Acc, input: any) => Acc) | undefined>,
  discriminant: Discriminant,
  fallback: ((acc: Acc, item: T) => Acc) | undefined,
  caller: Function,
): Acc {
  let acc = initial;
  for (const item of items) {
    ensureUnion(item, discriminant, caller);
    const key = item[discriminant] as string;
    const handler = Object.hasOwn(handlers, key) ? handlers[key] : undefined;
    if (handler) acc = handler(acc, item);
    else if (fallback) acc = fallback(acc, item);
    else fail('No handler', caller);
  }
  return acc;
}

function dispatch<
  T extends SampleUnion<Discriminant>,
  Result,
  Discriminant extends PropertyKey,
  Payload extends any = never,
>(
  union: T,
  handlers: Record<
    string,
    ((input: any, payload: Payload) => Result) | undefined
  >,
  discriminant: Discriminant,
  fallback?: (payload: Payload) => Result,
  payload?: Payload,
): Result {
  const key = union[discriminant] as string;
  const fn = Object.hasOwn(handlers, key) ? handlers[key] : undefined;
  if (fn) return fn(union, payload!);
  if (fallback) return fallback(payload!);
  return fail('No handler', dispatch);
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Checks whether a value is a valid discriminated union — a non-null, non-array
 * object with a string discriminant property.
 * Useful at system boundaries like API responses or form data.
 *
 * @param input - The value to check
 * @param discriminant - The property to look for. Defaults to `'type'`.
 * @returns `true` if `input` is an object with a string value at the discriminant key
 *
 * @example
 * ```ts
 * isUnion({ type: 'circle', radius: 5 }); // true
 * isUnion({ name: 'not a union' });        // false
 * isUnion({ status: 'ok' }, 'status');     // true
 * ```
 */
export function isUnion<Discriminant extends PropertyKey>(
  input: unknown,
  discriminant: Discriminant = DEFAULT_DISCRIMINANT as Discriminant,
): input is SampleUnion<Discriminant> {
  return (
    !!input &&
    typeof input === 'object' &&
    !Array.isArray(input) &&
    typeof (input as Record<PropertyKey, unknown>)[discriminant] === 'string'
  );
}

/**
 * Value-first type guard for discriminated unions. Narrows inside `if` blocks.
 *
 * ```ts
 * if (is(shape, 'circle')) shape.radius;              // single variant
 * if (is(shape, ['circle', 'rectangle'])) shape;      // sub-union
 * is(event, ['click', 'keydown'], 'kind');            // custom discriminant
 * ```
 *
 * For `.filter()` and pipe composition, use `createPipeHandlers(...).is(...)`,
 * which binds the union type once and needs no generics at call sites.
 *
 * @param union - The discriminated union value to check
 * @param variants - A single variant name, or an array of variant names
 * @param discriminant - The property used to tell variants apart. Defaults to `'type'`.
 */
// Multi variant — must precede single so `is(x, ['a','b'])` binds here
export function is<
  T extends SampleUnion<Discriminant>,
  U extends T[Discriminant],
  Discriminant extends PropertyKey = 'type',
>(
  union: T,
  variants: readonly U[],
  discriminant?: Discriminant,
): union is Extract<T, { [K in Discriminant]: U }>;

// Single variant
export function is<
  T extends SampleUnion<Discriminant>,
  U extends T[Discriminant],
  Discriminant extends PropertyKey = 'type',
>(
  union: T,
  variant: U,
  discriminant?: Discriminant,
): union is Extract<T, { [K in Discriminant]: U }>;

// Untyped fallback — plain boolean when the call can't be proven typesafe
// (e.g. tests, runtime validation of external data)
export function is(
  union: unknown,
  variants: string | readonly string[],
  discriminant?: PropertyKey,
): boolean;

export function is(
  union: unknown,
  variants: string | readonly string[],
  discriminant: PropertyKey = DEFAULT_DISCRIMINANT,
): boolean {
  if (!isUnion(union, discriminant)) return false;
  const v = (union as any)[discriminant] as string;
  return typeof variants === 'string' ? v === variants : variants.includes(v);
}

/**
 * Partially transforms a discriminated union. Variants without a handler pass through unchanged.
 *
 * @param input - The discriminated union value to transform
 * @param discriminant - The property used to tell variants apart. Defaults to `'type'`.
 * @returns A curried function that accepts a partial handler map and returns the (possibly transformed) value
 * @throws {Error} If `input` is not a valid discriminated union
 *
 * @example
 * ```ts
 * const result = map(circle)({
 *   circle: ({ radius }) => ({ radius: radius * 2 }),
 * });
 * // rectangles pass through unchanged
 * ```
 */
export function map<
  T extends SampleUnion<Discriminant>,
  Discriminant extends PropertyKey = 'type',
  Payload extends any = never,
>(
  input: T,
  discriminant: Discriminant = DEFAULT_DISCRIMINANT as Discriminant,
  payload?: Payload,
): (mapper: Mapper<T, Discriminant, Payload>) => T {
  ensureUnion(input, discriminant, map);
  return (mapper) => {
    const result = dispatch(
      input,
      mapper as unknown as Record<
        string,
        ((input: any, payload: Payload) => T) | undefined
      >,
      discriminant,
      () => input,
      payload,
    );
    return result === input
      ? result
      : { ...result, [discriminant]: input[discriminant] };
  };
}

/**
 * Fully transforms a discriminated union. Every variant must have a handler — unlike {@link map}, nothing passes through by default.
 *
 * @param input - The discriminated union value to transform
 * @param discriminant - The property used to tell variants apart. Defaults to `'type'`.
 * @returns A curried function that accepts a full handler map and returns the transformed value
 * @throws {Error} If `input` is not a valid discriminated union
 *
 * @example
 * ```ts
 * const result = mapAll(shape)({
 *   circle: ({ radius }) => ({ radius: radius * 2 }),
 *   rectangle: ({ width, height }) => ({ width: width * 2, height: height * 2 }),
 * });
 * ```
 */
export function mapAll<
  T extends SampleUnion<Discriminant>,
  Discriminant extends PropertyKey = 'type',
  Payload extends any = never,
>(
  input: T,
  discriminant: Discriminant = DEFAULT_DISCRIMINANT as Discriminant,
  payload?: Payload,
): (mapper: MapperAll<T, Discriminant, Payload>) => T {
  ensureUnion(input, discriminant, mapAll);
  return (mapper) => ({
    ...dispatch(
      input,
      mapper as unknown as Record<string, (input: any, payload: Payload) => T>,
      discriminant,
      undefined,
      payload,
    ),
    [discriminant]: input[discriminant],
  });
}

/**
 * Exhaustive pattern matching on a discriminated union. Every variant must have a handler.
 * If a new variant is added to the union, TypeScript will error at every unhandled `match` call.
 *
 * @param input - The discriminated union value to match against
 * @param discriminant - The property used to tell variants apart. Defaults to `'type'`.
 * @returns A curried function that accepts a handler map and returns the matched handler's result
 * @throws {Error} If `input` is not a valid discriminated union
 *
 * @example
 * ```ts
 * const area = match(shape)({
 *   circle: ({ radius }) => Math.PI * radius ** 2,
 *   rectangle: ({ width, height }) => width * height,
 * });
 * ```
 */
export function match<
  T extends SampleUnion<Discriminant>,
  Discriminant extends PropertyKey = 'type',
  Payload extends any = never,
>(
  input: T,
  discriminant: Discriminant = DEFAULT_DISCRIMINANT as Discriminant,
  payload?: Payload,
): <Result>(mapper: Matcher<T, Result, Discriminant, Payload>) => Result {
  ensureUnion(input, discriminant, match);
  return <Result>(matcher: Matcher<T, Result, Discriminant, Payload>) =>
    dispatch<T, Result, Discriminant, Payload>(
      input,
      matcher as unknown as Record<
        string,
        (input: any, payload: Payload) => Result
      >,
      discriminant,
      undefined,
      payload,
    );
}

/**
 * Pattern matching with a fallback. Handle specific variants explicitly; `Default` catches the rest.
 *
 * **Design limitation:** The `Default` handler does not receive the triggering variant —
 * it cannot determine which variant fell through. When no `Payload` is used, `Default`
 * receives no arguments at all. To inspect the unmatched variant inside `Default`, either
 * switch to exhaustive {@link match}, or pass the original value as `payload`.
 *
 * @param input - The discriminated union value to match against
 * @param discriminant - The property used to tell variants apart. Defaults to `'type'`.
 * @returns A curried function that accepts a partial handler map (with required `Default`) and returns the result
 * @throws {Error} If `input` is not a valid discriminated union
 *
 * @example
 * ```ts
 * const label = matchWithDefault(shape)({
 *   circle: ({ radius }) => `Circle r=${radius}`,
 *   Default: () => 'Some other shape', // ← no access to which variant triggered Default
 * });
 * ```
 */
export function matchWithDefault<
  T extends SampleUnion<Discriminant>,
  Discriminant extends PropertyKey = 'type',
  Payload extends any = never,
>(
  input: T,
  discriminant: Discriminant = DEFAULT_DISCRIMINANT as Discriminant,
  payload?: Payload,
): <U>(matcher: MatcherWithDefault<T, U, Discriminant, Payload>) => U {
  ensureUnion(input, discriminant, matchWithDefault);
  return <U>(matcher: MatcherWithDefault<T, U, Discriminant, Payload>) =>
    dispatch<T, U, Discriminant, Payload>(
      input,
      matcher as unknown as Record<string, (input: any, payload: Payload) => U>,
      discriminant,
      (matcher as any).Default,
      payload,
    );
}

/**
 * Exhaustive single-pass aggregator over a collection of discriminated union values.
 * Each handler receives `(accumulator, variantData)` and returns the new accumulator.
 * All variants must have handlers — TypeScript errors on missing variants.
 *
 * @param items - The array of discriminated union values to fold over
 * @param initial - The initial accumulator value
 * @param discriminant - The property used to tell variants apart. Defaults to `'type'`.
 * @returns A curried function that accepts an exhaustive handler map and returns the final accumulator
 *
 * @example
 * ```ts
 * const stats = fold(shapes, { circles: 0, rects: 0 })({
 *   circle: (acc, { radius }) => ({ ...acc, circles: acc.circles + 1 }),
 *   rectangle: (acc, { width, height }) => ({ ...acc, rects: acc.rects + 1 }),
 * });
 * ```
 */
export function fold<
  T extends SampleUnion<Discriminant>,
  Acc,
  Discriminant extends PropertyKey = 'type',
>(
  items: readonly T[],
  initial: Acc,
  discriminant: Discriminant = DEFAULT_DISCRIMINANT as Discriminant,
): (handlers: Folder<T, Acc, Discriminant>) => Acc {
  return (handlers) =>
    reduce(items, initial, handlers as any, discriminant, undefined, fold);
}

/**
 * Partial single-pass aggregator over a collection of discriminated union values,
 * with a required `Default` fallback for unhandled variants.
 * Unhandled variants route to `Default`, which receives the full union item.
 *
 * @param items - The array of discriminated union values to fold over
 * @param initial - The initial accumulator value
 * @param discriminant - The property used to tell variants apart. Defaults to `'type'`.
 * @returns A curried function that accepts a partial handler map (with required `Default`) and returns the final accumulator
 *
 * @example
 * ```ts
 * const urgentCount = foldWithDefault(notifications, 0)({
 *   push: (acc, { urgent }) => acc + (urgent ? 1 : 0),
 *   Default: (acc, item) => acc,
 * });
 * ```
 */
export function foldWithDefault<
  T extends SampleUnion<Discriminant>,
  Acc,
  Discriminant extends PropertyKey = 'type',
>(
  items: readonly T[],
  initial: Acc,
  discriminant: Discriminant = DEFAULT_DISCRIMINANT as Discriminant,
): (handlers: FolderWithDefault<T, Acc, Discriminant>) => Acc {
  return (handlers) =>
    reduce(
      items,
      initial,
      handlers as any,
      discriminant,
      handlers.Default,
      foldWithDefault,
    );
}

/**
 * Counts how many items in a collection match the given variant(s).
 * Single-pass, no intermediate array allocation.
 * Items that are not valid discriminated unions are silently skipped.
 *
 * @param items - The array of values to count
 * @param variants - A single variant name or array of variant names to count
 * @param discriminant - The property used to tell variants apart. Defaults to `'type'`.
 * @returns The number of matching items (non-union items do not contribute to the count)
 *
 * @example
 * ```ts
 * count(notifications, 'ACTION_NEEDED');         // 3
 * count(notifications, ['ACTION_NEEDED', 'NEW']); // 5
 * ```
 */
export function count<
  T extends SampleUnion<Discriminant>,
  Discriminant extends PropertyKey = 'type',
>(
  items: readonly T[],
  variants: T[Discriminant] | readonly T[Discriminant][],
  discriminant: Discriminant = DEFAULT_DISCRIMINANT as Discriminant,
): number {
  const keySet = new Set(([] as string[]).concat(variants as any));
  let n = 0;
  for (const item of items) {
    if (!isUnion(item, discriminant)) continue;
    if (keySet.has(item[discriminant] as string)) n++;
  }
  return n;
}

/**
 * Splits a collection of discriminated union values into two arrays:
 * items matching the given variant(s) and the rest.
 * Single-pass with fully narrowed tuple types.
 * Items that are not valid discriminated unions are silently skipped and do not appear in either tuple element.
 *
 * @param items - The array of values to partition
 * @param variants - A single variant name or array of variant names to match
 * @param discriminant - The property used to tell variants apart. Defaults to `'type'`.
 * @returns A tuple `[matched, rest]` with narrowed types (non-union items are excluded from both)
 *
 * @example
 * ```ts
 * const [circles, rest] = partition(shapes, 'circle');
 * const [actionNeeded, rest] = partition(notifications, ['ACTION_NEEDED']);
 * ```
 */
export function partition<
  T extends SampleUnion<Discriminant>,
  Discriminant extends PropertyKey = 'type',
  U extends T[Discriminant] = T[Discriminant],
>(
  items: readonly T[],
  variants: U | readonly U[],
  discriminant: Discriminant = DEFAULT_DISCRIMINANT as Discriminant,
): [
  Extract<T, { [K in Discriminant]: U }>[],
  Exclude<T, { [K in Discriminant]: U }>[],
] {
  const keySet = new Set(([] as string[]).concat(variants as any));
  const matched: any[] = [];
  const rest: any[] = [];
  for (const item of items) {
    if (!isUnion(item, discriminant)) continue;
    if (keySet.has(item[discriminant] as string)) {
      matched.push(item);
    } else {
      rest.push(item);
    }
  }
  return [matched, rest];
}

/**
 * Creates a pipe-friendly handler factory bound to a specific discriminant key.
 * Returns an object whose methods follow the reversed-curry shape `(handlers) => (input) => result`,
 * making them composable inside FP `pipe` utilities without wrapper lambdas.
 *
 * @param discriminant - The property used to tell variants apart (e.g. `'type'` or `'kind'`)
 * @returns An object with handler-first utilities including `match`, `matchWithDefault`,
 *   `map`, `mapAll`, `fold`, `foldWithDefault`, `count`, `partition`, and `is` — each returning a reusable
 *   function that accepts the input value
 *
 * @example
 * ```ts
 * const shapeOps = createPipeHandlers<Shape, 'type'>('type');
 *
 * // use directly:
 * const area = shapeOps.match({
 *   circle: ({ radius }) => Math.PI * radius ** 2,
 *   rectangle: ({ width, height }) => width * height,
 *   triangle: ({ base, height }) => (base * height) / 2,
 * })(shape);
 *
 * // or compose inside a pipe:
 * pipe(shape, shapeOps.match(handlers));
 *
 * // variant-first type guard — no generics needed at call site:
 * shapes.filter(shapeOps.is('circle'));                // Circle[]
 * shapes.filter(shapeOps.is(['circle', 'rectangle'])); // (Circle | Rectangle)[]
 * ```
 */
export function createPipeHandlers<
  T extends SampleUnion<Discriminant>,
  Discriminant extends TakeDiscriminant<T> = TakeDiscriminant<T>,
>(discriminant: Discriminant) {
  return {
    match:
      <U, Payload extends any = never>(
        handlers: Matcher<T, U, Discriminant, Payload>,
      ) =>
      (
        input: T,
        ...args: [Payload] extends [never] ? [] : [payload: Payload]
      ): U =>
        match(input, discriminant, args[0] as Payload)(handlers),

    matchWithDefault:
      <U, Payload extends any = never>(
        handlers: MatcherWithDefault<T, U, Discriminant, Payload>,
      ) =>
      (
        input: T,
        ...args: [Payload] extends [never] ? [] : [payload: Payload]
      ): U =>
        matchWithDefault(input, discriminant, args[0] as Payload)(handlers),

    map:
      <Payload extends any = never>(
        handlers: Mapper<T, Discriminant, Payload>,
      ) =>
      (
        input: T,
        ...args: [Payload] extends [never] ? [] : [payload: Payload]
      ): T =>
        map(input, discriminant, args[0] as Payload)(handlers),

    mapAll:
      <Payload extends any = never>(
        handlers: MapperAll<T, Discriminant, Payload>,
      ) =>
      (
        input: T,
        ...args: [Payload] extends [never] ? [] : [payload: Payload]
      ): T =>
        mapAll(input, discriminant, args[0] as Payload)(handlers),

    fold:
      <Acc>(items: readonly T[], initial: Acc) =>
      (handlers: Folder<T, Acc, Discriminant>): Acc =>
        fold(items, initial, discriminant)(handlers),

    foldWithDefault:
      <Acc>(items: readonly T[], initial: Acc) =>
      (handlers: FolderWithDefault<T, Acc, Discriminant>): Acc =>
        foldWithDefault(items, initial, discriminant)(handlers),

    count:
      (variants: T[Discriminant] | readonly T[Discriminant][]) =>
      (items: readonly T[]): number =>
        count(items, variants, discriminant),

    partition:
      <U extends T[Discriminant]>(variants: U | readonly U[]) =>
      (
        items: readonly T[],
      ): [
        Extract<T, { [K in Discriminant]: U }>[],
        Exclude<T, { [K in Discriminant]: U }>[],
      ] =>
        partition(items, variants, discriminant),

    is:
      <U extends T[Discriminant]>(variants: U | readonly U[]) =>
      (input: T): input is Extract<T, { [K in Discriminant]: U }> =>
        is(input, variants as string | readonly string[], discriminant),
  };
}

/**
 * Creates a fully-typed discriminated union factory from a single schema definition.
 * Derives constructors, type guards, bound matchers, and metadata — eliminating
 * all boilerplate that normally comes with discriminated unions.
 *
 * @param discriminant - The property name used as the discriminant (e.g. `'type'`, `'kind'`)
 * @param schema - An object mapping variant names to constructor functions.
 *   Each function receives the variant's data arguments and returns the data portion
 *   (without the discriminant — it is injected automatically).
 * @returns A union factory object with constructors, `.is` guards, `.isKnown`,
 *   bound `.match` / `.matchWithDefault` / `.map` / `.mapAll`, and metadata
 *
 * @example
 * ```ts
 * const Shape = createUnion('type', {
 *   circle:    (radius: number)                => ({ radius }),
 *   rectangle: (width: number, height: number) => ({ width, height }),
 *   triangle:  (base: number,  height: number) => ({ base, height }),
 * });
 *
 * type Shape = InferUnion<typeof Shape>;
 *
 * Shape.circle(5)                   // { type: 'circle', radius: 5 }
 * shapes.filter(Shape.is('circle')) // curried predicate — Circle[]
 * Shape.isKnown(x)                  // true if x.type is a declared variant
 *
 * const getArea = Shape.match({
 *   circle:    ({ radius })        => Math.PI * radius ** 2,
 *   rectangle: ({ width, height }) => width * height,
 *   triangle:  ({ base, height })  => (base * height) / 2,
 * });
 * ```
 */
const RESERVED_UNION_KEYS = new Set<string>([
  'is',
  'isKnown',
  'match',
  'matchWithDefault',
  'map',
  'mapAll',
  'fold',
  'foldWithDefault',
  'count',
  'partition',
  'variants',
  'discriminant',
  '_union',
]);

export function createUnion<D extends string, Schema extends UnionSchema<D>>(
  discriminant: D,
  schema: string extends keyof Schema
    ? Schema
    : [keyof Schema & string & ReservedUnionKeys] extends [never]
      ? Schema
      : never,
): UnionFactory<D, Schema> {
  type Union = InferUnionFromSchema<D, Schema>;

  const keys = Object.keys(schema) as (keyof Schema & string)[];

  for (const key of keys) {
    if (RESERVED_UNION_KEYS.has(key))
      throw new Error(`createUnion: "${key}" is reserved`);
  }

  const constructors: any = {};

  for (const key of keys) {
    constructors[key] = (...args: any[]) => ({
      ...schema[key](...args),
      [discriminant]: key,
    });
  }

  return Object.assign(constructors, {
    ...createPipeHandlers<Union, any>(discriminant as any),
    isKnown: (x: unknown): boolean =>
      isUnion(x, discriminant) && (x as any)[discriminant] in schema,
    variants: [...keys] as ReadonlyArray<keyof Schema & string>,
    discriminant,
  });
}
