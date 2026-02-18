import { clearStackTrace } from './helpers';
import { Module, isUnion } from './module';
import {
  Mapper,
  MapperAll,
  Matcher,
  MatcherWithDefault,
  SampleUnion,
} from './types';

/**
 * Partially transforms a discriminated union value. Returns a curried function
 * that accepts a {@link Mapper} with optional handlers for each variant.
 * Variants without a handler pass through unchanged (identity).
 *
 * @typeParam T - The discriminated union type
 * @param input - The discriminated union value to transform
 * @returns A function that takes a partial mapper and returns the (possibly transformed) union value
 * @throws {Error} If `input` is not a valid discriminated union (missing or falsy `type` property)
 *
 * @example
 * ```ts
 * type Shape =
 *   | { type: 'circle'; radius: number }
 *   | { type: 'rectangle'; width: number; height: number };
 *
 * const circle: Shape = { type: 'circle', radius: 5 };
 *
 * // Only transform circles, rectangles pass through unchanged
 * const result = map(circle)({
 *   circle: ({ type, radius }) => ({ type, radius: radius * 2 }),
 * });
 * // result: { type: 'circle', radius: 10 }
 * ```
 */
export function map<
  T extends SampleUnion<Discriminant>,
  Discriminant extends string = 'type',
>(
  input: T,
  discriminant: Discriminant = 'type' as Discriminant,
): (mapper: Mapper<T, Discriminant>) => T {
  try {
    if (!isUnion(input, discriminant)) {
      throw new Error('Data is not of type discriminated union!');
    }
    return (mapper: Mapper<T, Discriminant>) =>
      Module.map(input, mapper, discriminant);
  } catch (err) {
    throw clearStackTrace(err, map);
  }
}

/**
 * Fully transforms a discriminated union value. Returns a curried function
 * that accepts a {@link MapperAll} with a required handler for **every** variant.
 * Unlike {@link map}, no variant can be omitted.
 *
 * @typeParam T - The discriminated union type
 * @param input - The discriminated union value to transform
 * @returns A function that takes a full mapper and returns the transformed union value
 * @throws {Error} If `input` is not a valid discriminated union (missing or falsy `type` property)
 *
 * @example
 * ```ts
 * type Shape =
 *   | { type: 'circle'; radius: number }
 *   | { type: 'rectangle'; width: number; height: number };
 *
 * const shape: Shape = { type: 'circle', radius: 5 };
 *
 * const result = mapAll(shape)({
 *   circle: ({ type, radius }) => ({ type, radius: radius * 2 }),
 *   rectangle: ({ type, width, height }) => ({ type, width: width * 2, height: height * 2 }),
 * });
 * ```
 */
export function mapAll<
  T extends SampleUnion<Discriminant>,
  Discriminant extends string = 'type',
>(
  input: T,
  discriminant: Discriminant = 'type' as Discriminant,
): (mapper: MapperAll<T, Discriminant>) => T {
  try {
    if (!isUnion(input, discriminant)) {
      throw new Error('Data is not of type discriminated union!');
    }
    return (mapper: MapperAll<T, Discriminant>) =>
      Module.mapAll(input, mapper, discriminant);
  } catch (err) {
    throw clearStackTrace(err, mapAll);
  }
}

/**
 * Exhaustive pattern matching on a discriminated union. Returns a curried function
 * that accepts a {@link Matcher} with a handler for **every** variant in the union.
 * The matched handler is invoked with the variant's data and its return value is returned.
 *
 * This guarantees at compile time that all variants are handled — if a new variant
 * is added to the union, TypeScript will error until a handler is provided.
 *
 * @typeParam T - The discriminated union type
 * @param input - The discriminated union value to match against
 * @returns A function that takes an exhaustive matcher and returns the handler's result
 * @throws {Error} If `input` is not a valid discriminated union (missing or falsy `type` property)
 *
 * @example
 * ```ts
 * type Shape =
 *   | { type: 'circle'; radius: number }
 *   | { type: 'rectangle'; width: number; height: number };
 *
 * const shape: Shape = { type: 'circle', radius: 5 };
 *
 * const area = match(shape)({
 *   circle: ({ radius }) => Math.PI * radius ** 2,
 *   rectangle: ({ width, height }) => width * height,
 * });
 * // area: 78.539...
 * ```
 */
export function match<
  T extends SampleUnion<Discriminant>,
  Discriminant extends string = 'type',
>(
  input: T,
  discriminant: Discriminant = 'type' as Discriminant,
): <U>(mapper: Matcher<T, U, Discriminant>) => U {
  try {
    if (!isUnion(input, discriminant)) {
      throw new Error('Data is not of type discriminated union!');
    }

    return <U>(matcher: Matcher<T, U, Discriminant>) =>
      Module.match<T, U, Discriminant>(input, matcher, discriminant);
  } catch (err) {
    throw clearStackTrace(err, match);
  }
}

/**
 * Non-exhaustive pattern matching on a discriminated union with a default fallback.
 * Returns a curried function that accepts a {@link MatcherWithDefault} — individual
 * variant handlers are optional, but a `Default` handler is required for unmatched variants.
 *
 * @typeParam T - The discriminated union type
 * @param input - The discriminated union value to match against
 * @returns A function that takes a partial matcher with Default and returns the handler's result
 * @throws {Error} If `input` is not a valid discriminated union (missing or falsy `type` property)
 *
 * @example
 * ```ts
 * type Shape =
 *   | { type: 'circle'; radius: number }
 *   | { type: 'rectangle'; width: number; height: number }
 *   | { type: 'triangle'; base: number; height: number };
 *
 * const shape: Shape = { type: 'triangle', base: 10, height: 5 };
 *
 * const description = matchWithDefault(shape)({
 *   circle: ({ radius }) => `Circle with radius ${radius}`,
 *   Default: () => 'Some other shape',
 * });
 * // description: 'Some other shape'
 * ```
 */
export function matchWithDefault<
  T extends SampleUnion<Discriminant>,
  Discriminant extends string = 'type',
>(
  input: T,
  discriminant: Discriminant = 'type' as Discriminant,
): <U>(matcher: MatcherWithDefault<T, U, Discriminant>) => U {
  try {
    if (!isUnion(input, discriminant)) {
      throw new Error('Data is not of type discriminated union!');
    }

    return <U>(matcher: MatcherWithDefault<T, U, Discriminant>) =>
      Module.matchWithDefault<T, U, Discriminant>(input, matcher, discriminant);
  } catch (err) {
    throw clearStackTrace(err, matchWithDefault);
  }
}
