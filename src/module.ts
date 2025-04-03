import {
  Mapper,
  MapperAll,
  Matcher,
  MatcherWithDefault,
  SampleUnion,
} from './types';

/**
 * A type predicate function to check if the input is a valid discriminated union
 * @param input
 * @returns true if the value is a valid discriminated union, and false if it's not
 */
export function isUnion(input: any): input is SampleUnion {
  return typeof input === 'object' && Boolean(input.type);
}

function match<T extends SampleUnion, Result>(
  union: T,
  matcher: Matcher<T, Result>,
): Result {
  const fn = matcher[union.type as keyof Matcher<T, Result>];
  if (!fn) {
    throw new Error('Matcher incomplete!');
  }

  return fn(union as Parameters<typeof fn>[0]);
}

function matchWithDefault<T extends SampleUnion, Result>(
  union: T,
  matcher: MatcherWithDefault<T, Result>,
): Result {
  if (!isUnion(union)) {
    throw new Error('Data is not union');
  }
  const fn = matcher[union.type as keyof Matcher<T, Result>];
  if (!fn) {
    return matcher['Default']();
  }

  return fn(union as Parameters<typeof fn>[0]);
}

function map<T extends SampleUnion>(union: T, mapper: Mapper<T>): T {
  return matchWithDefault<T, T>(union, {
    ...mapper,
    Default: () => union,
  });
}

function mapAll<T extends SampleUnion>(union: T, mapper: MapperAll<T>): T {
  return map<T>(union, mapper);
}

export function is<T extends { type: string }, U extends T['type']>(
  union: T,
  type: U,
): union is Extract<T, { type: U }> {
  return union.type === type;
}

export const Module = {
  match,
  matchWithDefault,
  map,
  mapAll,
};
