import { clearStackTrace } from './helpers';
import {
  Mapper,
  MapperAll,
  Matcher,
  MatcherWithDefault,
  SampleUnion,
  TakeDiscriminant,
} from './types';

/**
 * Checks whether a value is a valid discriminated union — a non-null object with a string discriminant property.
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
export function isUnion<Discriminant extends string | number | symbol>(
  input: any,
  discriminant: Discriminant = 'type' as Discriminant,
): input is SampleUnion<Discriminant> {
  return (
    typeof input === 'object' &&
    input !== null &&
    typeof input[discriminant] === 'string'
  );
}

/**
 * Type guard that narrows a discriminated union to a specific variant.
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
  T extends { [K in Discriminant]: string },
  U extends T[Discriminant],
  Discriminant extends string | number | symbol = 'type',
>(
  union: T,
  type: U,
  discriminant: Discriminant = 'type' as Discriminant,
): union is Extract<T, { [K in Discriminant]: U }> {
  return union[discriminant] === type;
}

function dispatch<
  T extends SampleUnion<Discriminant>,
  Result,
  Discriminant extends string | number | symbol,
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
  throw new Error('Matcher incomplete!');
}

function guard<T>(
  input: any,
  discriminant: any,
  caller: Function,
  fn: () => T,
): T {
  try {
    if (!isUnion(input, discriminant))
      throw new Error('Data is not of type discriminated union!');
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
 *   circle: ({ type, radius }) => ({ type, radius: radius * 2 }),
 * });
 * // rectangles pass through unchanged
 * ```
 */
export function map<
  T extends SampleUnion<Discriminant>,
  Discriminant extends string | number | symbol = 'type',
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
    () => (mapper: Mapper<T, Discriminant, Payload>) =>
      dispatch(
        input,
        mapper as Record<string, ((input: any, payload: Payload) => T) | undefined>,
        discriminant,
        () => input,
        payload,
      ),
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
 *   circle: ({ type, radius }) => ({ type, radius: radius * 2 }),
 *   rectangle: ({ type, width, height }) => ({ type, width: width * 2, height: height * 2 }),
 * });
 * ```
 */
export function mapAll<
  T extends SampleUnion<Discriminant>,
  Discriminant extends string | number | symbol = 'type',
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
    () => (mapper: MapperAll<T, Discriminant, Payload>) =>
      dispatch(
        input,
        mapper as Record<string, (input: any, payload: Payload) => T>,
        discriminant,
        undefined,
        payload,
      ),
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
  Discriminant extends string | number | symbol = 'type',
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
  Discriminant extends string | number | symbol = 'type',
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
  };
}
