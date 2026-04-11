import { describe, it, expect } from 'vitest';
import { is, createPipeHandlers, createUnion } from '../unions';

type Shape =
  | { type: 'circle'; radius: number }
  | { type: 'rectangle'; width: number; height: number }
  | { type: 'triangle'; base: number; height: number };

type Animal =
  | { kind: 'dog'; name: string }
  | { kind: 'cat'; lives: number }
  | { kind: 'bird'; canFly: boolean };

describe('is — multi-variant value-first', () => {
  const circle = { type: 'circle', radius: 5 } as Shape;
  const rectangle = { type: 'rectangle', width: 4, height: 6 } as Shape;
  const triangle = { type: 'triangle', base: 3, height: 7 } as Shape;

  it('should return true when variant is in the list', () => {
    expect(is(circle, ['circle', 'rectangle'])).toBe(true);
  });

  it('should return false when variant is not in the list', () => {
    expect(is(triangle, ['circle', 'rectangle'])).toBe(false);
  });

  it('should work with a single-element array', () => {
    expect(is(circle, ['circle'])).toBe(true);
    expect(is(rectangle, ['circle'])).toBe(false);
  });

  it('should work with all variants', () => {
    expect(is(circle, ['circle', 'rectangle', 'triangle'])).toBe(true);
    expect(is(triangle, ['circle', 'rectangle', 'triangle'])).toBe(true);
  });

  it('should return false for empty variants array', () => {
    expect(is(circle, [])).toBe(false);
  });

  it('should return false for null', () => {
    expect(is(null as any, ['circle'])).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(is(undefined as any, ['circle'])).toBe(false);
  });

  it('should return false for non-object', () => {
    expect(is(42 as any, ['circle'])).toBe(false);
  });

  it('should return false for object without discriminant', () => {
    expect(is({} as any, ['circle'])).toBe(false);
  });

  it('should narrow the type correctly', () => {
    const shape = { type: 'circle', radius: 10 } as Shape;
    if (is(shape, ['circle', 'rectangle'])) {
      expect(shape.type === 'circle' || shape.type === 'rectangle').toBe(true);
    }
  });
});

describe('is — multi-variant with custom discriminant', () => {
  const dog = { kind: 'dog', name: 'Rex' } as Animal;
  const bird = { kind: 'bird', canFly: true } as Animal;

  it('should return true when variant matches custom discriminant', () => {
    expect(is(dog, ['dog', 'cat'], 'kind')).toBe(true);
  });

  it('should return false when variant does not match', () => {
    expect(is(bird, ['dog', 'cat'], 'kind')).toBe(false);
  });
});

describe('is — createUnion integration', () => {
  const Shape = createUnion('type', {
    circle: (radius: number) => ({ radius }),
    rectangle: (width: number, height: number) => ({ width, height }),
    triangle: (base: number, height: number) => ({ base, height }),
  });

  it('should work with is() and array of variants', () => {
    expect(is(Shape.circle(5), ['circle', 'rectangle'])).toBe(true);
    expect(is(Shape.triangle(3, 7), ['circle', 'rectangle'])).toBe(false);
  });
});

describe('pipeHandlers.is — variant-first factory', () => {
  const shapeOps = createPipeHandlers<Shape, 'type'>('type');
  const animalOps = createPipeHandlers<Animal, 'kind'>('kind');

  const circle: Shape = { type: 'circle', radius: 5 };
  const rectangle: Shape = { type: 'rectangle', width: 4, height: 6 };
  const triangle: Shape = { type: 'triangle', base: 3, height: 7 };

  it('single variant — returns a predicate that narrows in .filter()', () => {
    const shapes: Shape[] = [circle, rectangle, triangle, circle];
    const circles = shapes.filter(shapeOps.is('circle'));
    expect(circles).toHaveLength(2);
    // Compile-time: circles is Array<Extract<Shape, { type: 'circle' }>>
    expect(circles[0].radius).toBe(5);
  });

  it('multi variant — narrows to sub-union in .filter()', () => {
    const shapes: Shape[] = [circle, rectangle, triangle];
    const roundOrAxisAligned = shapes.filter(
      shapeOps.is(['circle', 'rectangle']),
    );
    expect(roundOrAxisAligned).toHaveLength(2);
  });

  it('custom discriminant binds through createPipeHandlers', () => {
    const dog: Animal = { kind: 'dog', name: 'Rex' };
    const cat: Animal = { kind: 'cat', lives: 9 };
    const bird: Animal = { kind: 'bird', canFly: true };
    const mammals = [dog, cat, bird].filter(animalOps.is(['dog', 'cat']));
    expect(mammals).toHaveLength(2);
  });

  it('empty array matches nothing', () => {
    expect([circle].filter(shapeOps.is([]))).toHaveLength(0);
  });

  it('rejects non-union inputs', () => {
    const pred = shapeOps.is('circle');
    expect(pred(null as any)).toBe(false);
    expect(pred(undefined as any)).toBe(false);
    expect(pred({} as any)).toBe(false);
  });

  it('works as a plain call, not just in .filter()', () => {
    expect(shapeOps.is('circle')(circle)).toBe(true);
    expect(shapeOps.is(['circle', 'rectangle'])(triangle)).toBe(false);
  });

  it('narrows inside an if block', () => {
    const pred = shapeOps.is('circle');
    const shape: Shape = circle;
    if (pred(shape)) {
      expect(shape.radius).toBe(5);
    } else {
      expect.unreachable('expected circle');
    }
  });
});
