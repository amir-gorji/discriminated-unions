import { clearStackTrace } from './helpers';
import {
  Folder,
  InferUnionFromSchema,
  Mapper,
  MapperAll,
  Matcher,
  MatcherWithDefault,
  SampleUnion,
  TakeDiscriminant,
  UnionSchema,
  UnionFactory,
} from './types';

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
  discriminant: Discriminant = 'type' as Discriminant,
): input is SampleUnion<Discriminant> {
  return !!(
    input &&
    typeof input === 'object' &&
    !Array.isArray(input) &&
    typeof (input as Record<PropertyKey, unknown>)[discriminant] === 'string'
  );
}

/**
 * Type guard that narrows a discriminated union to a specific variant.
 * Invalid inputs return `false`.
 *
 * @param union - The discriminated union value to check
 * @param type - The variant value to match against
 * @param discriminant - The property used to tell variants apart. Defaults to `'type'`.
 * @returns `true` if the discriminant property equals `type`, narrowing to that variant
 *
 * @example
 * ```ts
 * if (is(shape, 'circle')) {
 *   console.log(shape.radius); // TypeScript knows it's a circle
 * }
 * ```
 */
export function is<
  T extends SampleUnion<Discriminant>,
  U extends T[Discriminant],
  Discriminant extends PropertyKey = 'type',
>(
  union: T,
  type: U,
  discriminant?: Discriminant,
): union is Extract<T, { [K in Discriminant]: U }>;

export function is<Discriminant extends PropertyKey = 'type'>(
  union: unknown,
  type: string,
  discriminant?: Discriminant,
): boolean;

export function is(
  union: unknown,
  type: string,
  discriminant: PropertyKey = 'type',
): boolean {
  return isUnion(union, discriminant) && union[discriminant] === type;
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
  const fn = handlers[union[discriminant] as string];
  if (fn) return fn(union, payload!);
  if (fallback) return fallback(payload!);
  throw new Error('No handler');
}

function guard<T>(
  input: unknown,
  discriminant: PropertyKey,
  caller: Function,
  fn: () => T,
): T {
  try {
    if (!isUnion(input, discriminant))
      throw new Error('Not a union');
    return fn();
  } catch (err) {
    throw clearStackTrace(err, caller);
  }
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
  discriminant: Discriminant = 'type' as Discriminant,
  payload?: Payload,
): (mapper: Mapper<T, Discriminant, Payload>) => T {
  return guard(
    input,
    discriminant,
    map,
    () => (mapper: Mapper<T, Discriminant, Payload>) => {
      const result = dispatch(
        input,
        mapper as unknown as Record<string, ((input: any, payload: Payload) => T) | undefined>,
        discriminant,
        () => input,
        payload,
      );
      return result === input
        ? result
        : { ...result, [discriminant]: input[discriminant] };
    },
  );
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
  discriminant: Discriminant = 'type' as Discriminant,
  payload?: Payload,
): (mapper: MapperAll<T, Discriminant, Payload>) => T {
  return guard(
    input,
    discriminant,
    mapAll,
    () => (mapper: MapperAll<T, Discriminant, Payload>) => {
      const result = dispatch(
        input,
        mapper as unknown as Record<string, (input: any, payload: Payload) => T>,
        discriminant,
        undefined,
        payload,
      );
      return { ...result, [discriminant]: input[discriminant] };
    },
  );
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
  discriminant: Discriminant = 'type' as Discriminant,
  payload?: Payload,
): <Result>(mapper: Matcher<T, Result, Discriminant, Payload>) => Result {
  return guard(
    input,
    discriminant,
    match,
    () =>
      <Result>(matcher: Matcher<T, Result, Discriminant, Payload>) =>
        dispatch<T, Result, Discriminant, Payload>(
          input,
          matcher as unknown as Record<string, (input: any, payload: Payload) => Result>,
          discriminant,
          undefined,
          payload,
        ),
  );
}

/**
 * Pattern matching with a fallback. Handle specific variants explicitly; `Default` catches the rest.
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
 *   Default: () => 'Some other shape',
 * });
 * ```
 */
export function matchWithDefault<
  T extends SampleUnion<Discriminant>,
  Discriminant extends PropertyKey = 'type',
  Payload extends any = never,
>(
  input: T,
  discriminant: Discriminant = 'type' as Discriminant,
  payload?: Payload,
): <U>(matcher: MatcherWithDefault<T, U, Discriminant, Payload>) => U {
  return guard(
    input,
    discriminant,
    matchWithDefault,
    () =>
      <U>(matcher: MatcherWithDefault<T, U, Discriminant, Payload>) =>
        dispatch<T, U, Discriminant, Payload>(
          input,
          matcher as unknown as Record<string, (input: any, payload: Payload) => U>,
          discriminant,
          matcher.Default,
          payload,
        ),
  );
}

/**
 * Multi-variant type predicate that narrows a discriminated union to a sub-union.
 *
 * **Value-first** (for if-blocks): pass the union value and variant keys.
 * **Keys-first** (predicate factory): pass only variant keys to get a reusable predicate for `.filter()`.
 *
 * @example
 * ```ts
 * // Value-first — narrows inside if-blocks
 * if (narrow(notification, ['email', 'push'])) {
 *   notification; // EmailNotification | PushNotification
 * }
 *
 * // Keys-first — predicate factory for .filter()
 * const digital = notifications.filter(narrow(['email', 'push']));
 * ```
 */
export function narrow<
  T extends SampleUnion<Discriminant>,
  U extends T[Discriminant],
  Discriminant extends PropertyKey = 'type',
>(
  union: T,
  variants: readonly U[],
  discriminant?: Discriminant,
): union is Extract<T, { [K in Discriminant]: U }>;

export function narrow<
  T extends SampleUnion<Discriminant>,
  U extends T[Discriminant],
  Discriminant extends PropertyKey = 'type',
>(
  variants: readonly U[],
  discriminant?: Discriminant,
): (union: T) => union is Extract<T, { [K in Discriminant]: U }>;

export function narrow(
  unionOrVariants: unknown,
  variantsOrDiscriminant?: readonly string[] | PropertyKey,
  maybeDiscriminant?: PropertyKey,
): any {
  if (Array.isArray(unionOrVariants)) {
    const variants = unionOrVariants as readonly string[];
    const discriminant = (variantsOrDiscriminant ?? 'type') as PropertyKey;
    return (input: unknown) =>
      isUnion(input, discriminant) &&
      variants.includes((input as any)[discriminant]);
  }
  const union = unionOrVariants;
  const variants = variantsOrDiscriminant as readonly string[];
  const discriminant = (maybeDiscriminant ?? 'type') as PropertyKey;
  return (
    isUnion(union, discriminant) &&
    variants.includes((union as any)[discriminant])
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
  discriminant: Discriminant = 'type' as Discriminant,
): (handlers: Folder<T, Acc, Discriminant>) => Acc {
  return (handlers) => {
    let acc = initial;
    for (const item of items) {
      const key = item[discriminant] as string;
      const handler = (
        handlers as Record<string, ((acc: Acc, input: any) => Acc) | undefined>
      )[key];
      if (!handler) {
        throw clearStackTrace(new Error('No handler'), fold);
      }
      acc = handler(acc, item);
    }
    return acc;
  };
}

/**
 * Creates a pipe-friendly handler factory bound to a specific discriminant key.
 * Returns an object whose methods follow the reversed-curry shape `(handlers) => (input) => result`,
 * making them composable inside FP `pipe` utilities without wrapper lambdas.
 *
 * @param discriminant - The property used to tell variants apart (e.g. `'type'` or `'kind'`)
 * @returns An object with four methods — `match`, `matchWithDefault`, `map`, `mapAll` —
 *   each accepting handlers first and returning a reusable function that accepts the input value
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
        ...inputs: [Payload] extends [never]
          ? [input: T]
          : [input: T, payload: Payload]
      ): U =>
        match(inputs[0], discriminant, inputs[1])(handlers),

    matchWithDefault:
      <U, Payload extends any = never>(
        handlers: MatcherWithDefault<T, U, Discriminant, Payload>,
      ) =>
      (
        ...inputs: [Payload] extends [never]
          ? [input: T]
          : [input: T, payload: Payload]
      ): U =>
        matchWithDefault(inputs[0], discriminant, inputs[1])(handlers),

    map:
      <Payload extends any = never>(
        handlers: Mapper<T, Discriminant, Payload>,
      ) =>
      (
        ...inputs: [Payload] extends [never]
          ? [input: T]
          : [input: T, payload: Payload]
      ): T =>
        map(inputs[0], discriminant, inputs[1])(handlers),

    mapAll:
      <Payload extends any = never>(
        handlers: MapperAll<T, Discriminant, Payload>,
      ) =>
      (
        ...inputs: [Payload] extends [never]
          ? [input: T]
          : [input: T, payload: Payload]
      ): T =>
        mapAll(inputs[0], discriminant, inputs[1])(handlers),

    narrow:
      <U extends T[Discriminant]>(variants: readonly U[]) =>
      (union: T): union is Extract<T, { [K in Discriminant]: U }> =>
        narrow(union, variants, discriminant),

    fold:
      <Acc>(items: readonly T[], initial: Acc) =>
      (handlers: Folder<T, Acc, Discriminant>): Acc =>
        fold(items, initial, discriminant)(handlers),
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
 * Shape.is.circle(x)               // narrows x to circle variant
 * Shape.isKnown(x)                 // true if x.type is a declared variant
 *
 * const getArea = Shape.match({
 *   circle:    ({ radius })        => Math.PI * radius ** 2,
 *   rectangle: ({ width, height }) => width * height,
 *   triangle:  ({ base, height })  => (base * height) / 2,
 * });
 * ```
 */
export function createUnion<
  D extends string,
  Schema extends UnionSchema<D>,
>(discriminant: D, schema: Schema): UnionFactory<D, Schema> {
  type Union = InferUnionFromSchema<D, Schema>;

  const keys = Object.keys(schema) as (keyof Schema & string)[];

  const constructors: any = {};
  const guards: any = {};

  for (const key of keys) {
    constructors[key] = (...args: any[]) => ({
      ...schema[key](...args),
      [discriminant]: key,
    });
    guards[key] = (x: unknown): boolean =>
      isUnion(x, discriminant) && (x as any)[discriminant] === key;
  }

  return Object.assign(constructors, {
    is: guards,
    isKnown: (x: unknown): boolean =>
      isUnion(x, discriminant) && (x as any)[discriminant] in schema,
    ...createPipeHandlers<Union, any>(discriminant as any),
    variants: Object.freeze(keys) as ReadonlyArray<keyof Schema & string>,
    discriminant,
  });
}
