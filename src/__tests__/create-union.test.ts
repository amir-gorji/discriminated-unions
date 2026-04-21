import { describe, it, expect } from 'vitest';
import { createUnion, is } from '../unions';
import type { InferUnion } from '../types';

const Shape = createUnion('type', {
  circle: (radius: number) => ({ radius }),
  rectangle: (width: number, height: number) => ({ width, height }),
  triangle: (base: number, height: number) => ({ base, height }),
});

type Shape = InferUnion<typeof Shape>;

const Animal = createUnion('kind', {
  dog: (name: string) => ({ name }),
  cat: (lives: number) => ({ lives }),
  bird: (canFly: boolean) => ({ canFly }),
});

type Animal = InferUnion<typeof Animal>;

describe('createUnion', () => {
  describe('constructors', () => {
    it('should inject the discriminant into constructed values', () => {
      const c = Shape.circle(5);
      expect(c).toEqual({ type: 'circle', radius: 5 });
    });

    it('should handle multi-argument constructors', () => {
      const r = Shape.rectangle(4, 6);
      expect(r).toEqual({ type: 'rectangle', width: 4, height: 6 });
    });

    it('should produce distinct objects per call', () => {
      const a = Shape.circle(1);
      const b = Shape.circle(1);
      expect(a).toEqual(b);
      expect(a).not.toBe(b);
    });

    it('should work with custom discriminant', () => {
      const dog = Animal.dog('Rex');
      expect(dog).toEqual({ kind: 'dog', name: 'Rex' });
    });

    it('should work with all variant types for custom discriminant', () => {
      expect(Animal.cat(9)).toEqual({ kind: 'cat', lives: 9 });
      expect(Animal.bird(true)).toEqual({ kind: 'bird', canFly: true });
    });
  });

  describe('bound is (curried predicate factory)', () => {
    it('should return true for a matching variant', () => {
      const c = Shape.circle(5);
      expect(Shape.is('circle')(c)).toBe(true);
    });

    it('should return false for a non-matching variant', () => {
      const r = Shape.rectangle(4, 6);
      expect(Shape.is('circle')(r)).toBe(false);
    });

    it('should return false for null', () => {
      expect(Shape.is('circle')(null as any)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(Shape.is('circle')(undefined as any)).toBe(false);
    });

    it('should return false for primitives', () => {
      expect(Shape.is('circle')(42 as any)).toBe(false);
      expect(Shape.is('circle')('circle' as any)).toBe(false);
      expect(Shape.is('circle')(true as any)).toBe(false);
    });

    it('should return false for objects without discriminant', () => {
      expect(Shape.is('circle')({ radius: 5 } as any)).toBe(false);
    });

    it('should return false for objects with wrong discriminant value', () => {
      expect(Shape.is('circle')({ type: 'hexagon', sides: 6 } as any)).toBe(
        false,
      );
    });

    it('should work with custom discriminant', () => {
      const dog = Animal.dog('Rex');
      expect(Animal.is('dog')(dog)).toBe(true);
      expect(Animal.is('cat')(dog)).toBe(false);
    });

    it('should work as an array filter predicate', () => {
      const shapes = [
        Shape.circle(1),
        Shape.rectangle(2, 3),
        Shape.circle(4),
        Shape.triangle(5, 6),
      ];
      const circles = shapes.filter(Shape.is('circle'));
      expect(circles).toHaveLength(2);
      expect(circles[0]).toEqual({ type: 'circle', radius: 1 });
      expect(circles[1]).toEqual({ type: 'circle', radius: 4 });
    });

    it('should narrow inside if blocks', () => {
      const shape: Shape = Shape.circle(5);
      if (Shape.is('circle')(shape)) {
        expect(shape.radius).toBe(5);
      } else {
        throw new Error('should have narrowed to circle');
      }
    });

    it('should accept an array of variants for sub-union narrowing', () => {
      const shapes = [
        Shape.circle(1),
        Shape.rectangle(2, 3),
        Shape.triangle(4, 5),
      ];
      const roundOrRect = shapes.filter(Shape.is(['circle', 'rectangle']));
      expect(roundOrRect).toHaveLength(2);
    });

    it('should not expose per-variant guards as object properties (removed in 2.0.0)', () => {
      expect(typeof Shape.is).toBe('function');
      expect((Shape.is as any).circle).toBeUndefined();
      expect((Shape.is as any).rectangle).toBeUndefined();
    });

    it('should interop with standalone is() for if-block narrowing', () => {
      const shape: Shape = Shape.rectangle(4, 6);
      if (is(shape, 'rectangle')) {
        expect(shape.width).toBe(4);
        expect(shape.height).toBe(6);
      } else {
        throw new Error('should have narrowed to rectangle');
      }
    });
  });

  describe('isKnown', () => {
    it('should return true for any declared variant', () => {
      expect(Shape.isKnown(Shape.circle(5))).toBe(true);
      expect(Shape.isKnown(Shape.rectangle(4, 6))).toBe(true);
      expect(Shape.isKnown(Shape.triangle(10, 3))).toBe(true);
    });

    it('should return false for an undeclared variant string', () => {
      expect(Shape.isKnown({ type: 'hexagon', sides: 6 })).toBe(false);
    });

    it('should return false for null', () => {
      expect(Shape.isKnown(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(Shape.isKnown(undefined)).toBe(false);
    });

    it('should return false for primitives', () => {
      expect(Shape.isKnown(42)).toBe(false);
      expect(Shape.isKnown('circle')).toBe(false);
    });

    it('should return false for objects without discriminant', () => {
      expect(Shape.isKnown({ radius: 5 })).toBe(false);
    });

    it('should work with custom discriminant', () => {
      expect(Animal.isKnown(Animal.dog('Rex'))).toBe(true);
      expect(Animal.isKnown({ kind: 'fish' })).toBe(false);
      expect(Animal.isKnown({ type: 'dog' })).toBe(false);
    });
  });

  describe('bound match', () => {
    const getArea = Shape.match({
      circle: ({ radius }) => Math.PI * radius ** 2,
      rectangle: ({ width, height }) => width * height,
      triangle: ({ base, height }) => (base * height) / 2,
    });

    it('should match circle', () => {
      expect(getArea(Shape.circle(5))).toBeCloseTo(Math.PI * 25);
    });

    it('should match rectangle', () => {
      expect(getArea(Shape.rectangle(4, 6))).toBe(24);
    });

    it('should match triangle', () => {
      expect(getArea(Shape.triangle(10, 3))).toBe(15);
    });

    it('should return a reusable function', () => {
      const shapes = [
        Shape.circle(1),
        Shape.rectangle(2, 3),
        Shape.triangle(4, 5),
      ];
      const areas = shapes.map(getArea);
      expect(areas[0]).toBeCloseTo(Math.PI);
      expect(areas[1]).toBe(6);
      expect(areas[2]).toBe(10);
    });

    it('should throw for invalid input', () => {
      expect(() => getArea(null as any)).toThrow();
      expect(() => getArea(42 as any)).toThrow();
    });

    it('should work with custom discriminant', () => {
      const describe = Animal.match({
        dog: ({ name }) => `Dog named ${name}`,
        cat: ({ lives }) => `Cat with ${lives} lives`,
        bird: ({ canFly }) => (canFly ? 'Flying bird' : 'Flightless bird'),
      });
      expect(describe(Animal.dog('Rex'))).toBe('Dog named Rex');
      expect(describe(Animal.cat(9))).toBe('Cat with 9 lives');
    });

    it('should support different return types', () => {
      const toBoolean = Shape.match({
        circle: () => true,
        rectangle: () => false,
        triangle: () => false,
      });
      expect(toBoolean(Shape.circle(1))).toBe(true);
      expect(toBoolean(Shape.rectangle(1, 1))).toBe(false);
    });
  });

  describe('bound matchWithDefault', () => {
    it('should use explicit handler when available', () => {
      const describe = Shape.matchWithDefault({
        circle: ({ radius }) => `Circle r=${radius}`,
        Default: () => 'Other shape',
      });
      expect(describe(Shape.circle(5))).toBe('Circle r=5');
    });

    it('should fall back to Default for unhandled variants', () => {
      const describe = Shape.matchWithDefault({
        circle: ({ radius }) => `Circle r=${radius}`,
        Default: () => 'Other shape',
      });
      expect(describe(Shape.rectangle(4, 6))).toBe('Other shape');
      expect(describe(Shape.triangle(10, 3))).toBe('Other shape');
    });

    it('should work with all handlers plus Default', () => {
      const describe = Shape.matchWithDefault({
        circle: ({ radius }) => `circle:${radius}`,
        rectangle: ({ width, height }) => `rect:${width}x${height}`,
        triangle: ({ base, height }) => `tri:${base}x${height}`,
        Default: () => 'fallback',
      });
      expect(describe(Shape.circle(5))).toBe('circle:5');
      expect(describe(Shape.rectangle(4, 6))).toBe('rect:4x6');
      expect(describe(Shape.triangle(10, 3))).toBe('tri:10x3');
    });

    it('should work with custom discriminant', () => {
      const sound = Animal.matchWithDefault({
        dog: () => 'Woof',
        Default: () => '...',
      });
      expect(sound(Animal.dog('Rex'))).toBe('Woof');
      expect(sound(Animal.cat(9))).toBe('...');
    });
  });

  describe('bound map', () => {
    it('should transform matched variant', () => {
      const doubleRadius = Shape.map({
        circle: ({ radius }) => ({ radius: radius * 2 }),
      });
      const result = doubleRadius(Shape.circle(5));
      expect(result).toEqual({ type: 'circle', radius: 10 });
    });

    it('should pass through unmatched variants unchanged', () => {
      const doubleRadius = Shape.map({
        circle: ({ radius }) => ({ radius: radius * 2 }),
      });
      const rect = Shape.rectangle(4, 6);
      const result = doubleRadius(rect);
      expect(result).toBe(rect); // same reference
    });

    it('should handle empty handler map (all pass through)', () => {
      const identity = Shape.map({});
      const c = Shape.circle(5);
      expect(identity(c)).toBe(c);
    });

    it('should work with custom discriminant', () => {
      const doubleLife = Animal.map({
        cat: ({ lives }) => ({ lives: lives * 2 }),
      });
      expect(doubleLife(Animal.cat(9))).toEqual({ kind: 'cat', lives: 18 });
      const dog = Animal.dog('Rex');
      expect(doubleLife(dog)).toBe(dog);
    });
  });

  describe('bound mapAll', () => {
    it('should transform all variants', () => {
      const describe = Shape.mapAll({
        circle: ({ radius }) => ({ radius: radius * 2 }),
        rectangle: ({ width, height }) => ({
          width: width * 2,
          height: height * 2,
        }),
        triangle: ({ base, height }) => ({
          base: base * 2,
          height: height * 2,
        }),
      });
      expect(describe(Shape.circle(5))).toEqual({ type: 'circle', radius: 10 });
      expect(describe(Shape.rectangle(4, 6))).toEqual({
        type: 'rectangle',
        width: 8,
        height: 12,
      });
      expect(describe(Shape.triangle(10, 3))).toEqual({
        type: 'triangle',
        base: 20,
        height: 6,
      });
    });

    it('should work with custom discriminant', () => {
      const transform = Animal.mapAll({
        dog: ({ name }) => ({ name: name.toUpperCase() }),
        cat: ({ lives }) => ({ lives: lives + 1 }),
        bird: ({ canFly }) => ({ canFly: !canFly }),
      });
      expect(transform(Animal.dog('Rex'))).toEqual({
        kind: 'dog',
        name: 'REX',
      });
      expect(transform(Animal.cat(9))).toEqual({ kind: 'cat', lives: 10 });
      expect(transform(Animal.bird(true))).toEqual({
        kind: 'bird',
        canFly: false,
      });
    });
  });

  describe('metadata', () => {
    it('should expose variants as a readonly array', () => {
      expect(Shape.variants).toEqual(['circle', 'rectangle', 'triangle']);
    });

    it('should expose the discriminant string', () => {
      expect(Shape.discriminant).toBe('type');
    });

    it('should expose custom discriminant', () => {
      expect(Animal.discriminant).toBe('kind');
      expect(Animal.variants).toEqual(['dog', 'cat', 'bird']);
    });

    it('should expose variants as an array', () => {
      expect(Array.isArray(Shape.variants)).toBe(true);
    });
  });

  describe('zero-arg constructor', () => {
    const Status = createUnion('type', {
      idle: () => ({}),
      loading: () => ({}),
      success: (data: string) => ({ data }),
      failure: (error: string, code: number) => ({ error, code }),
    });

    it('should handle zero-arg constructors', () => {
      expect(Status.idle()).toEqual({ type: 'idle' });
      expect(Status.loading()).toEqual({ type: 'loading' });
    });

    it('should handle mixed arity constructors in the same union', () => {
      expect(Status.success('ok')).toEqual({ type: 'success', data: 'ok' });
      expect(Status.failure('err', 404)).toEqual({
        type: 'failure',
        error: 'err',
        code: 404,
      });
    });

    it('should work with match on mixed arity union', () => {
      type Status = InferUnion<typeof Status>;
      const describe = Status.match({
        idle: () => 'idle',
        loading: () => 'loading...',
        success: ({ data }) => `ok: ${data}`,
        failure: ({ error, code }) => `err ${code}: ${error}`,
      });
      expect(describe(Status.idle())).toBe('idle');
      expect(describe(Status.success('done'))).toBe('ok: done');
      expect(describe(Status.failure('not found', 404))).toBe(
        'err 404: not found',
      );
    });
  });

  describe('interop with standalone functions', () => {
    it('constructed values work with standalone match', async () => {
      const { match } = await import('../unions');
      const c = Shape.circle(5) as Shape;
      const area = match(c)({
        circle: ({ radius }) => Math.PI * radius ** 2,
        rectangle: ({ width, height }) => width * height,
        triangle: ({ base, height }) => (base * height) / 2,
      });
      expect(area).toBeCloseTo(Math.PI * 25);
    });

    it('constructed values work with standalone is', async () => {
      const { is } = await import('../unions');
      const c = Shape.circle(5);
      expect(is(c, 'circle')).toBe(true);
      expect(is(c, 'rectangle')).toBe(false);
    });

    it('constructed values work with standalone isUnion', async () => {
      const { isUnion } = await import('../unions');
      expect(isUnion(Shape.circle(5))).toBe(true);
    });
  });

  describe('reserved variant names', () => {
    const reservedKeys = [
      'is',
      'isKnown',
      'match',
      'matchWithDefault',
      'map',
      'mapAll',
      'fold',
      'count',
      'partition',
      'variants',
      'discriminant',
      '_union',
    ] as const;

    it.each(reservedKeys)(
      'throws at runtime when variant is named "%s"',
      (key) => {
        expect(() =>
          // @ts-expect-error — 'match' is a reserved variant name
          createUnion('type', { [key]: () => ({}) } as any),
        ).toThrow(`createUnion: "${key}" is a reserved variant name`);
      },
    );

    it('does not throw for non-reserved variant names', () => {
      expect(() =>
        createUnion('type', { foo: () => ({}), bar: () => ({}) }),
      ).not.toThrow();
    });

    it('type-level: reserved key causes type error', () => {
      expect(() =>
        // @ts-expect-error — 'match' is a reserved variant name
        createUnion('type', { match: () => ({}) }),
      ).toThrow('reserved');
    });
  });
});
