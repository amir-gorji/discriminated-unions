import { describe, it, expect } from 'vitest';
import { narrow, createPipeHandlers, createUnion } from '../unions';

type Shape =
  | { type: 'circle'; radius: number }
  | { type: 'rectangle'; width: number; height: number }
  | { type: 'triangle'; base: number; height: number };

type Animal =
  | { kind: 'dog'; name: string }
  | { kind: 'cat'; lives: number }
  | { kind: 'bird'; canFly: boolean };

describe('narrow — value-first', () => {
  const circle: Shape = { type: 'circle', radius: 5 };
  const rectangle: Shape = { type: 'rectangle', width: 4, height: 6 };
  const triangle: Shape = { type: 'triangle', base: 3, height: 7 };

  it('should return true when variant is in the list', () => {
    expect(narrow(circle, ['circle', 'rectangle'])).toBe(true);
  });

  it('should return false when variant is not in the list', () => {
    expect(narrow(triangle, ['circle', 'rectangle'])).toBe(false);
  });

  it('should work with a single variant', () => {
    expect(narrow(circle, ['circle'])).toBe(true);
    expect(narrow(rectangle, ['circle'])).toBe(false);
  });

  it('should work with all variants', () => {
    expect(narrow(circle, ['circle', 'rectangle', 'triangle'])).toBe(true);
    expect(narrow(triangle, ['circle', 'rectangle', 'triangle'])).toBe(true);
  });

  it('should return false for empty variants array', () => {
    expect(narrow(circle, [])).toBe(false);
  });

  it('should return false for null', () => {
    expect(narrow(null as any, ['circle'])).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(narrow(undefined as any, ['circle'])).toBe(false);
  });

  it('should return false for non-object', () => {
    expect(narrow(42 as any, ['circle'])).toBe(false);
    expect(narrow('hello' as any, ['circle'])).toBe(false);
  });

  it('should return false for object without discriminant', () => {
    expect(narrow({} as any, ['circle'])).toBe(false);
  });

  it('should narrow the type correctly', () => {
    const shape: Shape = { type: 'circle', radius: 10 };
    if (narrow(shape, ['circle', 'rectangle'])) {
      // TypeScript narrows to circle | rectangle
      expect(shape.type === 'circle' || shape.type === 'rectangle').toBe(true);
    }
  });
});

describe('narrow — value-first with custom discriminant', () => {
  const dog: Animal = { kind: 'dog', name: 'Rex' };
  const bird: Animal = { kind: 'bird', canFly: true };

  it('should return true when variant matches custom discriminant', () => {
    expect(narrow(dog, ['dog', 'cat'], 'kind')).toBe(true);
  });

  it('should return false when variant does not match', () => {
    expect(narrow(bird, ['dog', 'cat'], 'kind')).toBe(false);
  });
});

describe('narrow — keys-first (predicate factory)', () => {
  const circle: Shape = { type: 'circle', radius: 5 };
  const rectangle: Shape = { type: 'rectangle', width: 4, height: 6 };
  const triangle: Shape = { type: 'triangle', base: 3, height: 7 };

  it('should return a function', () => {
    const pred = narrow<Shape, 'circle' | 'rectangle'>(['circle', 'rectangle']);
    expect(typeof pred).toBe('function');
  });

  it('should narrow correctly when called', () => {
    const pred = narrow<Shape, 'circle' | 'rectangle'>(['circle', 'rectangle']);
    expect(pred(circle)).toBe(true);
    expect(pred(rectangle)).toBe(true);
    expect(pred(triangle)).toBe(false);
  });

  it('should work with .filter()', () => {
    const shapes: Shape[] = [circle, rectangle, triangle, circle];
    const filtered = shapes.filter(
      narrow<Shape, 'circle' | 'rectangle'>(['circle', 'rectangle']),
    );
    expect(filtered).toHaveLength(3);
    expect(filtered.every((s) => s.type !== 'triangle')).toBe(true);
  });

  it('should return false for invalid input', () => {
    const pred = narrow<Shape, 'circle'>(['circle']);
    expect(pred(null as any)).toBe(false);
    expect(pred(undefined as any)).toBe(false);
  });

  it('should work with empty variants array', () => {
    const pred = narrow<Shape, never>([]);
    expect(pred(circle)).toBe(false);
  });
});

describe('narrow — keys-first with custom discriminant', () => {
  const dog: Animal = { kind: 'dog', name: 'Rex' };
  const bird: Animal = { kind: 'bird', canFly: true };

  it('should work with custom discriminant', () => {
    const pred = narrow<Animal, 'dog' | 'cat'>(['dog', 'cat'], 'kind');
    expect(pred(dog)).toBe(true);
    expect(pred(bird)).toBe(false);
  });
});

describe('narrow — createPipeHandlers', () => {
  const circle: Shape = { type: 'circle', radius: 5 };
  const triangle: Shape = { type: 'triangle', base: 3, height: 7 };

  const shapeOps = createPipeHandlers<Shape, 'type'>('type');

  it('should return a predicate', () => {
    const pred = shapeOps.narrow(['circle', 'rectangle']);
    expect(pred(circle)).toBe(true);
    expect(pred(triangle)).toBe(false);
  });

  it('should work with .filter()', () => {
    const shapes: Shape[] = [circle, triangle];
    const filtered = shapes.filter(shapeOps.narrow(['circle']));
    expect(filtered).toHaveLength(1);
    expect(filtered[0]).toBe(circle);
  });
});

describe('narrow — createUnion', () => {
  const Shape = createUnion('type', {
    circle: (radius: number) => ({ radius }),
    rectangle: (width: number, height: number) => ({ width, height }),
    triangle: (base: number, height: number) => ({ base, height }),
  });

  it('should return a predicate from bound narrow', () => {
    const pred = Shape.narrow(['circle', 'rectangle']);
    expect(pred(Shape.circle(5))).toBe(true);
    expect(pred(Shape.rectangle(4, 6))).toBe(true);
    expect(pred(Shape.triangle(3, 7))).toBe(false);
  });

  it('should work with .filter()', () => {
    const shapes = [Shape.circle(5), Shape.triangle(3, 7), Shape.circle(10)];
    const circles = shapes.filter(Shape.narrow(['circle']));
    expect(circles).toHaveLength(2);
  });
});
