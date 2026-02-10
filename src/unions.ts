import { clearStackTrace } from './helpers';
import { Module, isUnion } from './module';
import {
  Mapper,
  MapperAll,
  Matcher,
  MatcherWithDefault,
  SampleUnion,
} from './types';

export function map<T extends SampleUnion>(input: T): (mapper: Mapper<T>) => T {
  try {
    if (!isUnion(input)) {
      throw new Error('Data is not of type discriminated union!');
    }
    return (mapper: Mapper<T>) => Module.map(input, mapper);
  } catch (err) {
    throw clearStackTrace(err, map);
  }
}

export function mapAll<T extends SampleUnion>(
  input: T,
): (mapper: MapperAll<T>) => T {
  try {
    if (!isUnion(input)) {
      throw new Error('Data is not of type discriminated union!');
    }
    return (mapper: MapperAll<T>) => Module.mapAll(input, mapper);
  } catch (err) {
    throw clearStackTrace(err, mapAll);
  }
}

export function match<T extends SampleUnion>(
  input: T,
): <U>(mapper: Matcher<T, U>) => U {
  try {
    if (!isUnion(input)) {
      throw new Error('Data is not of type discriminated union!');
    }

    return <U>(matcher: Matcher<T, U>) => Module.match<T, U>(input, matcher);
  } catch (err) {
    throw clearStackTrace(err, match);
  }
}

export function matchWithDefault<T extends SampleUnion>(
  input: T,
): <U>(matcher: MatcherWithDefault<T, U>) => U {
  try {
    if (!isUnion(input)) {
      throw new Error('Data is not of type discriminated union!');
    }

    return <U>(matcher: MatcherWithDefault<T, U>) =>
      Module.matchWithDefault<T, U>(input, matcher);
  } catch (err) {
    throw clearStackTrace(err, matchWithDefault);
  }
}
