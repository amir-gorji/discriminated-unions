import {
  Mapper,
  MapperAll,
  Matcher,
  MatcherWithDefault,
  SampleUnion,
} from './types';

/**
 * Type predicate that checks whether the given value is a valid discriminated union
 * (a non-null object with a string `type` property).
 *
 * @param input - The value to check
 * @returns `true` if the value is an object with a string `type` property, `false` otherwise
 *
 * @example
 * ```ts
 * isUnion({ type: 'circle', radius: 5 }); // true
 * isUnion({ name: 'not a union' });        // false
 * isUnion(null);                            // false
 * isUnion({ type: 123 });                   // false
 * ```
 */
export function isUnion<Discriminant extends string>(
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
 * Core implementation of exhaustive pattern matching.
 * Looks up the handler for the union's `type` discriminant and invokes it.
 *
 * @internal Used by the public API in `unions.ts`. Not exported directly.
 */
function match<
  T extends SampleUnion<Discriminant>,
  Result,
  Discriminant extends string,
>(
  union: T,
  matcher: Matcher<T, Result, Discriminant>,
  discriminant: Discriminant = 'type' as Discriminant,
): Result {
  const fn = matcher[union[discriminant]];
  if (!fn) {
    throw new Error('Matcher incomplete!');
  }

  return fn(union as Parameters<typeof fn>[0]);
}

/**
 * Core implementation of non-exhaustive pattern matching with a default fallback.
 * If no handler exists for the union's `type`, the `Default` handler is called.
 *
 * @internal Used by the public API in `unions.ts`. Not exported directly.
 */
function matchWithDefault<
  T extends SampleUnion<Discriminant>,
  Result,
  Discriminant extends string,
>(
  union: T,
  matcher: MatcherWithDefault<T, Result, Discriminant>,
  discriminant: Discriminant = 'type' as Discriminant,
): Result {
  const fn =
    matcher[union[discriminant] as keyof Matcher<T, Result, Discriminant>];
  if (!fn) {
    return matcher['Default']();
  }

  return fn(union as Parameters<typeof fn>[0]);
}

/**
 * Core implementation of partial transformation.
 * Delegates to `matchWithDefault` with a `Default` that returns the union unchanged.
 *
 * @internal Used by the public API in `unions.ts`. Not exported directly.
 */
function map<T extends SampleUnion<Discriminant>, Discriminant extends string>(
  union: T,
  mapper: Mapper<T, Discriminant>,
  discriminant: Discriminant = 'type' as Discriminant,
): T {
  return matchWithDefault<T, T, Discriminant>(
    union,
    {
      ...mapper,
      Default: () => union,
    },
    discriminant,
  );
}

/**
 * Core implementation of full transformation.
 * Delegates to `map` — since all handlers are required by `MapperAll`,
 * the identity default in `map` is never reached.
 *
 * @internal Used by the public API in `unions.ts`. Not exported directly.
 */
function mapAll<
  T extends SampleUnion<Discriminant>,
  Discriminant extends string,
>(
  union: T,
  mapper: MapperAll<T, Discriminant>,
  discriminant: Discriminant = 'type' as Discriminant,
): T {
  return map<T, Discriminant>(union, mapper, discriminant);
}

/**
 * Type guard that narrows a discriminated union to a specific variant
 * by checking whether the `type` discriminant matches the given string.
 *
 * @typeParam T - The discriminated union type (must have a `type` property)
 * @typeParam U - The specific type literal to check against
 * @param union - The discriminated union value to check
 * @param type - The type discriminant string to match against
 * @returns `true` if `union.type === type`, narrowing the union to `Extract<T, { type: U }>`
 *
 * @example
 * ```ts
 * type Shape =
 *   | { type: 'circle'; radius: number }
 *   | { type: 'rectangle'; width: number; height: number };
 *
 * declare const shape: Shape;
 *
 * if (is(shape, 'circle')) {
 *   // shape is narrowed to { type: 'circle'; radius: number }
 *   console.log(shape.radius);
 * }
 * ```
 */
export function is<
  T extends { [K in Discriminant]: string },
  U extends T[Discriminant],
  Discriminant extends string = 'type',
>(
  union: T,
  type: U,
  discriminant: Discriminant = 'type' as Discriminant,
): union is Extract<T, { [K in Discriminant]: U }> {
  return union[discriminant] === type;
}

/**
 * Internal module containing the core implementations of pattern matching
 * and transformation functions. These are consumed by the public API in `unions.ts`,
 * which adds input validation and clean stack traces.
 *
 * @internal
 */
export const Module = {
  match,
  matchWithDefault,
  map,
  mapAll,
};
