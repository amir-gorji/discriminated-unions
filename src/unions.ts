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
