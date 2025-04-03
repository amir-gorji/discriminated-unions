import { Module, isUnion } from './module';
import {
  Mapper,
  MapperAll,
  Matcher,
  MatcherWithDefault,
  SampleUnion,
} from './types';

export function map<T extends SampleUnion>(input: T): (mapper: Mapper<T>) => T {
  if (!isUnion(input)) {
    throw new Error('Data is not of type discriminated union!');
  }
  return (mapper: Mapper<T>) => Module.map(input, mapper);
}

export function mapAll<T extends SampleUnion>(
  input: T,
): (mapper: MapperAll<T>) => T {
  if (!isUnion(input)) {
    throw new Error('Data is not of type discriminated union!');
  }
  return (mapper: MapperAll<T>) => Module.mapAll(input, mapper);
}

export function match<T extends SampleUnion>(
  input: T,
): <U>(mapper: Matcher<T, U>) => U {
  if (!isUnion(input)) {
    throw new Error('Data is not of type discriminated union!');
  }

  return <U>(matcher: Matcher<Text, U>) => Module.match<T, U>(input, matcher);
}

export function matchWithDefault<T extends SampleUnion>(
  input: T,
): <U>(matcher: MatcherWithDefault<T, U>) => U {
  if (!isUnion(input)) {
    throw new Error('Data is not of type discriminated union!');
  }

  return <U>(matcher: MatcherWithDefault<Text, U>) =>
    Module.matchWithDefault<T, U>(input, matcher);
}
