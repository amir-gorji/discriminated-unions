import { describe, it, expect } from 'vitest';
import { match, matchWithDefault, map, mapAll } from '../unions';

type Shape =
  | { type: 'circle'; radius: number }
  | { type: 'rectangle'; width: number; height: number }
  | { type: 'triangle'; base: number; height: number };

type Animal =
  | { kind: 'dog'; name: string }
  | { kind: 'cat'; lives: number }
  | { kind: 'bird'; canFly: boolean };

const circle: Shape = { type: 'circle', radius: 5 };
const rectangle: Shape = { type: 'rectangle', width: 4, height: 6 };
const triangle: Shape = { type: 'triangle', base: 10, height: 3 };

describe('match', () => {
  const shapeMatcher = {
    circle: ({ radius }: { type: 'circle'; radius: number }) =>
      Math.PI * radius ** 2,
    rectangle: ({
      width,
      height,
    }: {
      type: 'rectangle';
      width: number;
      height: number;
    }) => width * height,
    triangle: ({
      base,
      height,
    }: {
      type: 'triangle';
      base: number;
      height: number;
    }) => (base * height) / 2,
  };

  it('should return correct result for circle variant', () => {
    const area = match(circle)(shapeMatcher);
    expect(area).toBeCloseTo(Math.PI * 25);
  });

  it('should return correct result for rectangle variant', () => {
    const area = match(rectangle)(shapeMatcher);
    expect(area).toBe(24);
  });

  it('should return correct result for triangle variant', () => {
    const area = match(triangle)(shapeMatcher);
    expect(area).toBe(15);
  });

  it('should support curried partial application', () => {
    const matchCircle = match(circle);
    const area = matchCircle(shapeMatcher);
    expect(area).toBeCloseTo(Math.PI * 25);
  });

  it('should work with string return type', () => {
    const name = match(circle)({
      circle: () => 'circle',
      rectangle: () => 'rectangle',
      triangle: () => 'triangle',
    });
    expect(name).toBe('circle');
  });

  it('should work with boolean return type', () => {
    const isRound = match(circle)({
      circle: () => true,
      rectangle: () => false,
      triangle: () => false,
    });
    expect(isRound).toBe(true);
  });

  it('should work with object return type', () => {
    const result = match(circle)({
      circle: ({ radius }) => ({ area: Math.PI * radius ** 2 }),
      rectangle: ({ width, height }) => ({ area: width * height }),
      triangle: ({ base, height }) => ({ area: (base * height) / 2 }),
    });
    expect(result).toEqual({ area: Math.PI * 25 });
  });

  it('should throw for null input', () => {
    expect(() => match(null as any)).toThrow(
      'Data is not of type discriminated union!',
    );
  });

  it('should throw for undefined input', () => {
    expect(() => match(undefined as any)).toThrow(
      'Data is not of type discriminated union!',
    );
  });

  it('should throw for primitive string input', () => {
    expect(() => match('hello' as any)).toThrow(
      'Data is not of type discriminated union!',
    );
  });

  it('should throw for primitive number input', () => {
    expect(() => match(42 as any)).toThrow(
      'Data is not of type discriminated union!',
    );
  });

  it('should throw for object without type property', () => {
    expect(() => match({} as any)).toThrow(
      'Data is not of type discriminated union!',
    );
  });
});

describe('matchWithDefault', () => {
  it('should match specific variant when handler is provided', () => {
    const result = matchWithDefault(circle)({
      circle: ({ radius }) => `Circle: radius=${radius}`,
      Default: () => 'Unknown shape',
    });
    expect(result).toBe('Circle: radius=5');
  });

  it('should fall back to Default when variant has no handler', () => {
    const result = matchWithDefault(triangle)({
      circle: ({ radius }) => `Circle: radius=${radius}`,
      Default: () => 'Unknown shape',
    });
    expect(result).toBe('Unknown shape');
  });

  it('should work when all handlers are provided alongside Default', () => {
    const result = matchWithDefault(rectangle)({
      circle: ({ radius }) => radius,
      rectangle: ({ width, height }) => width * height,
      triangle: ({ base, height }) => (base * height) / 2,
      Default: () => -1,
    });
    expect(result).toBe(24);
  });

  it('should return Default value for unhandled variants', () => {
    const result = matchWithDefault(rectangle)({
      Default: () => 'default',
    });
    expect(result).toBe('default');
  });

  it('should throw for null input', () => {
    expect(() => matchWithDefault(null as any)).toThrow(
      'Data is not of type discriminated union!',
    );
  });

  it('should throw for undefined input', () => {
    expect(() => matchWithDefault(undefined as any)).toThrow(
      'Data is not of type discriminated union!',
    );
  });

  it('should throw for object without type property', () => {
    expect(() => matchWithDefault({} as any)).toThrow(
      'Data is not of type discriminated union!',
    );
  });
});

describe('map', () => {
  it('should transform matched variant', () => {
    const result = map(circle)({
      circle: ({ type, radius }) => ({ type, radius: radius * 2 }),
    });
    expect(result).toEqual({ type: 'circle', radius: 10 });
  });

  it('should return original unchanged for unmatched variants', () => {
    const result = map(rectangle)({
      circle: ({ type, radius }) => ({ type, radius: radius * 2 }),
    });
    expect(result).toEqual({ type: 'rectangle', width: 4, height: 6 });
    expect(result).toBe(rectangle); // same reference (identity)
  });

  it('should handle partial mapping with only one handler', () => {
    const result = map(triangle)({
      triangle: ({ type, base, height }) => ({
        type,
        base: base * 3,
        height: height * 3,
      }),
    });
    expect(result).toEqual({ type: 'triangle', base: 30, height: 9 });
  });

  it('should work with empty mapper (all pass through)', () => {
    const result = map(circle)({});
    expect(result).toBe(circle);
  });

  it('should throw for null input', () => {
    expect(() => map(null as any)).toThrow(
      'Data is not of type discriminated union!',
    );
  });

  it('should throw for undefined input', () => {
    expect(() => map(undefined as any)).toThrow(
      'Data is not of type discriminated union!',
    );
  });

  it('should throw for object without type property', () => {
    expect(() => map({} as any)).toThrow(
      'Data is not of type discriminated union!',
    );
  });
});

describe('mapAll', () => {
  it('should transform all variants with their handlers', () => {
    const result = mapAll(circle)({
      circle: ({ type, radius }) => ({ type, radius: radius * 2 }),
      rectangle: ({ type, width, height }) => ({
        type,
        width: width * 2,
        height: height * 2,
      }),
      triangle: ({ type, base, height }) => ({
        type,
        base: base * 2,
        height: height * 2,
      }),
    });
    expect(result).toEqual({ type: 'circle', radius: 10 });
  });

  it('should transform rectangle variant correctly', () => {
    const result = mapAll(rectangle)({
      circle: ({ type, radius }) => ({ type, radius: radius * 2 }),
      rectangle: ({ type, width, height }) => ({
        type,
        width: width + 1,
        height: height + 1,
      }),
      triangle: ({ type, base, height }) => ({
        type,
        base: base * 2,
        height: height * 2,
      }),
    });
    expect(result).toEqual({ type: 'rectangle', width: 5, height: 7 });
  });

  it('should transform triangle variant correctly', () => {
    const result = mapAll(triangle)({
      circle: ({ type, radius }) => ({ type, radius }),
      rectangle: ({ type, width, height }) => ({ type, width, height }),
      triangle: ({ type, base, height }) => ({
        type,
        base: base * 10,
        height: height * 10,
      }),
    });
    expect(result).toEqual({ type: 'triangle', base: 100, height: 30 });
  });

  it('should throw for null input', () => {
    expect(() => mapAll(null as any)).toThrow(
      'Data is not of type discriminated union!',
    );
  });

  it('should throw for undefined input', () => {
    expect(() => mapAll(undefined as any)).toThrow(
      'Data is not of type discriminated union!',
    );
  });
});

const dog: Animal = { kind: 'dog', name: 'Rex' };
const cat: Animal = { kind: 'cat', lives: 9 };
const bird: Animal = { kind: 'bird', canFly: true };

describe('match with custom discriminant', () => {
  const animalMatcher = {
    dog: ({ name }: { kind: 'dog'; name: string }) => `Dog: ${name}`,
    cat: ({ lives }: { kind: 'cat'; lives: number }) => `Cat: ${lives} lives`,
    bird: ({ canFly }: { kind: 'bird'; canFly: boolean }) =>
      `Bird: ${canFly ? 'can fly' : 'cannot fly'}`,
  };

  it('should return correct result for dog variant', () => {
    const result = match(dog, 'kind')(animalMatcher);
    expect(result).toBe('Dog: Rex');
  });

  it('should return correct result for cat variant', () => {
    const result = match(cat, 'kind')(animalMatcher);
    expect(result).toBe('Cat: 9 lives');
  });

  it('should return correct result for bird variant', () => {
    const result = match(bird, 'kind')(animalMatcher);
    expect(result).toBe('Bird: can fly');
  });

  it('should throw for invalid input with custom discriminant', () => {
    expect(() => match({ type: 'dog' } as any, 'kind')).toThrow(
      'Data is not of type discriminated union!',
    );
  });
});

describe('matchWithDefault with custom discriminant', () => {
  it('should match specific variant with custom discriminant', () => {
    const result = matchWithDefault(dog, 'kind')({
      dog: ({ name }) => `Dog: ${name}`,
      Default: () => 'Unknown animal',
    });
    expect(result).toBe('Dog: Rex');
  });

  it('should fall back to Default for unhandled variant', () => {
    const result = matchWithDefault(bird, 'kind')({
      dog: ({ name }) => `Dog: ${name}`,
      Default: () => 'Unknown animal',
    });
    expect(result).toBe('Unknown animal');
  });
});

describe('map with custom discriminant', () => {
  it('should transform matched variant with custom discriminant', () => {
    const result = map(cat, 'kind')({
      cat: ({ kind, lives }) => ({ kind, lives: lives - 1 }),
    });
    expect(result).toEqual({ kind: 'cat', lives: 8 });
  });

  it('should pass through unmatched variant with custom discriminant', () => {
    const result = map(dog, 'kind')({
      cat: ({ kind, lives }) => ({ kind, lives: lives - 1 }),
    });
    expect(result).toBe(dog);
  });
});

describe('mapAll with custom discriminant', () => {
  it('should transform all variants correctly with custom discriminant', () => {
    const result = mapAll(dog, 'kind')({
      dog: ({ kind, name }) => ({ kind, name: name.toUpperCase() }),
      cat: ({ kind, lives }) => ({ kind, lives: lives + 1 }),
      bird: ({ kind, canFly }) => ({ kind, canFly: !canFly }),
    });
    expect(result).toEqual({ kind: 'dog', name: 'REX' });
  });
});
