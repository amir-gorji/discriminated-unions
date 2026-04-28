import {
  DEFAULT_DISCRIMINANT,
  ensureUnion,
  dispatch,
  reduceAsync,
} from './unions';
import type {
  SampleUnion,
  AsyncMatcher,
  AsyncMatcherWithDefault,
  AsyncMapper,
  AsyncFolder,
  AsyncFolderWithDefault,
} from './types';

export type {
  AsyncMatcher,
  AsyncMatcherWithDefault,
  AsyncMapper,
  AsyncFolder,
  AsyncFolderWithDefault,
} from './types';

/**
 * Async exhaustive pattern matching. Like `match`, but handlers may return
 * `Promise<R>` or `R`. The result is unified to `Promise<R>` — never
 * `Promise<A> | Promise<B>`.
 *
 * @example
 * ```ts
 * const profile = await matchAsync(user)({
 *   admin: async ({ id }) => fetchAdminProfile(id),
 *   guest: async ({ id }) => fetchGuestProfile(id),
 * }); // typed: AdminProfile | GuestProfile
 * ```
 */
export function matchAsync<
  T extends SampleUnion<Discriminant>,
  Discriminant extends PropertyKey = 'type',
  Payload extends any = never,
>(
  input: T,
  discriminant: Discriminant = DEFAULT_DISCRIMINANT as Discriminant,
  payload?: Payload,
): <Result>(
  matcher: AsyncMatcher<T, Result, Discriminant, Payload>,
) => Promise<Result> {
  ensureUnion(input, discriminant, matchAsync);
  return async <Result>(
    matcher: AsyncMatcher<T, Result, Discriminant, Payload>,
  ) =>
    dispatch<T, Result | Promise<Result>, Discriminant, Payload>(
      input,
      matcher as unknown as Record<
        string,
        (input: any, payload: Payload) => Result | Promise<Result>
      >,
      discriminant,
      undefined,
      payload,
      matchAsync,
    );
}

/**
 * Async pattern matching with `Default` fallback. Like `matchWithDefault`,
 * but handlers may return `Promise<R>` or `R`. Result unified to `Promise<R>`.
 */
export function matchWithDefaultAsync<
  T extends SampleUnion<Discriminant>,
  Discriminant extends PropertyKey = 'type',
  Payload extends any = never,
>(
  input: T,
  discriminant: Discriminant = DEFAULT_DISCRIMINANT as Discriminant,
  payload?: Payload,
): <U>(
  matcher: AsyncMatcherWithDefault<T, U, Discriminant, Payload>,
) => Promise<U> {
  ensureUnion(input, discriminant, matchWithDefaultAsync);
  return async <U>(
    matcher: AsyncMatcherWithDefault<T, U, Discriminant, Payload>,
  ) =>
    dispatch<T, U | Promise<U>, Discriminant, Payload>(
      input,
      matcher as unknown as Record<
        string,
        (input: any, payload: Payload) => U | Promise<U>
      >,
      discriminant,
      (matcher as any).Default,
      payload,
      matchWithDefaultAsync,
    );
}

/**
 * Parallel per-item async matching across a collection. Each item is dispatched
 * to its variant handler concurrently via `Promise.all`. Returns `Promise<R[]>`.
 *
 * Use this as the parallel sibling to `foldAsync` when handlers are
 * independent (no shared accumulator).
 *
 * @example
 * ```ts
 * const names = await matchAllAsync(users)({
 *   admin: async ({ id }) => `admin:${await fetchName(id)}`,
 *   guest: async ({ id }) => `guest:${await fetchName(id)}`,
 * });
 * ```
 */
export function matchAllAsync<
  T extends SampleUnion<Discriminant>,
  Discriminant extends PropertyKey = 'type',
  Payload extends any = never,
>(
  items: readonly T[],
  discriminant: Discriminant = DEFAULT_DISCRIMINANT as Discriminant,
  payload?: Payload,
): <Result>(
  matcher: AsyncMatcher<T, Result, Discriminant, Payload>,
) => Promise<Result[]> {
  return <Result>(matcher: AsyncMatcher<T, Result, Discriminant, Payload>) =>
    Promise.all(
      items.map(async (item) => {
        // Validation runs concurrently inside Promise.all — unlike sync reduce,
        // which validates each item before starting the next.
        ensureUnion(item, discriminant, matchAllAsync);
        return dispatch<T, Result | Promise<Result>, Discriminant, Payload>(
          item,
          matcher as unknown as Record<
            string,
            (input: any, payload: Payload) => Result | Promise<Result>
          >,
          discriminant,
          undefined,
          payload,
          matchAllAsync,
        );
      }),
    );
}

/**
 * Async partial transform. Like `map`, but handlers may return a Promise.
 * Variants without a handler pass through unchanged. Result is `Promise<T>`.
 */
export function mapAsync<
  T extends SampleUnion<Discriminant>,
  Discriminant extends PropertyKey = 'type',
  Payload extends any = never,
>(
  input: T,
  discriminant: Discriminant = DEFAULT_DISCRIMINANT as Discriminant,
  payload?: Payload,
): (mapper: AsyncMapper<T, Discriminant, Payload>) => Promise<T> {
  ensureUnion(input, discriminant, mapAsync);
  return async (mapper) => {
    const result = await dispatch<T, T | Promise<T>, Discriminant, Payload>(
      input,
      mapper as unknown as Record<
        string,
        (input: any, payload: Payload) => T | Promise<T>
      >,
      discriminant,
      () => input,
      payload,
      mapAsync,
    );
    return result === input
      ? result
      : { ...result, [discriminant]: input[discriminant] };
  };
}

/**
 * Async sequential fold. Like `fold`, but each handler may return
 * `Acc` or `Promise<Acc>`. The accumulator threads through `await`, so handlers
 * run strictly in array order. For parallel per-item dispatch, use
 * `matchAllAsync`.
 */
export function foldAsync<
  T extends SampleUnion<Discriminant>,
  Acc,
  Discriminant extends PropertyKey = 'type',
>(
  items: readonly T[],
  initial: Acc,
  discriminant: Discriminant = DEFAULT_DISCRIMINANT as Discriminant,
): (handlers: AsyncFolder<T, Acc, Discriminant>) => Promise<Acc> {
  return (handlers) =>
    reduceAsync(
      items,
      initial,
      handlers as any,
      discriminant,
      undefined,
      foldAsync,
    );
}

/**
 * Async partial fold with `Default` fallback. Like `foldWithDefault`,
 * but each handler (including `Default`) may return `Acc` or `Promise<Acc>`.
 * Sequential execution — accumulator threads through `await`, so handlers
 * run strictly in array order. For parallel per-item dispatch, use
 * `matchAllAsync`.
 */
export function foldWithDefaultAsync<
  T extends SampleUnion<Discriminant>,
  Acc,
  Discriminant extends PropertyKey = 'type',
>(
  items: readonly T[],
  initial: Acc,
  discriminant: Discriminant = DEFAULT_DISCRIMINANT as Discriminant,
): (handlers: AsyncFolderWithDefault<T, Acc, Discriminant>) => Promise<Acc> {
  return (handlers) =>
    reduceAsync(
      items,
      initial,
      handlers as any,
      discriminant,
      handlers.Default,
      foldWithDefaultAsync,
    );
}
