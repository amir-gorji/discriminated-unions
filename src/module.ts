import {
  Mapper,
  MapperAll,
  Matcher,
  MatcherWithDefault,
  SampleUnion,
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
 * Core implementation of exhaustive pattern matching.
 * Looks up the handler for the union's discriminant value and invokes it.
 *
 * @internal Used by the public API in `unions.ts`. Not exported directly.
 */
function match<
  T extends SampleUnion<Discriminant>,
  Result,
  Discriminant extends string | number | symbol,
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
 * If no handler exists for the union's discriminant value, the `Default` handler is called.
 *
 * @internal Used by the public API in `unions.ts`. Not exported directly.
 */
function matchWithDefault<
  T extends SampleUnion<Discriminant>,
  Result,
  Discriminant extends string | number | symbol,
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
function map<
  T extends SampleUnion<Discriminant>,
  Discriminant extends string | number | symbol,
>(
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
  Discriminant extends string | number | symbol,
>(
  union: T,
  mapper: MapperAll<T, Discriminant>,
  discriminant: Discriminant = 'type' as Discriminant,
): T {
  return map<T, Discriminant>(union, mapper, discriminant);
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
