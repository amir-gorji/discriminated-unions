import { describe, it, expect } from 'vitest';
import { isUnion, is } from '../module';

type Shape =
  | { type: 'circle'; radius: number }
  | { type: 'rectangle'; width: number; height: number };

type Animal =
  | { kind: 'dog'; name: string }
  | { kind: 'cat'; lives: number }
  | { kind: 'bird'; canFly: boolean };

describe('isUnion', () => {
  it('should return true for object with truthy type property', () => {
    expect(isUnion({ type: 'circle' })).toBe(true);
  });

  it('should return true for object with type and additional data', () => {
    expect(isUnion({ type: 'circle', radius: 5 })).toBe(true);
  });

  it('should return false for null', () => {
    expect(isUnion(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isUnion(undefined)).toBe(false);
  });

  it('should return false for string primitive', () => {
    expect(isUnion('hello')).toBe(false);
  });

  it('should return false for number primitive', () => {
    expect(isUnion(42)).toBe(false);
  });

  it('should return false for boolean primitive', () => {
    expect(isUnion(true)).toBe(false);
  });

  it('should return false for empty object (no type property)', () => {
    expect(isUnion({})).toBe(false);
  });

  it('should return true for object with empty string type (still a string)', () => {
    expect(isUnion({ type: '' })).toBe(true);
  });

  it('should return false for arrays', () => {
    expect(isUnion([1, 2, 3])).toBe(false);
  });

  it('should return false for array with type-like element', () => {
    expect(isUnion([])).toBe(false);
  });

  it('should return false for object with numeric type', () => {
    expect(isUnion({ type: 123 })).toBe(false);
  });

  it('should return false for object with boolean type', () => {
    expect(isUnion({ type: true })).toBe(false);
  });
});

describe('is', () => {
  const circle: Shape = { type: 'circle', radius: 5 };
  const rectangle: Shape = { type: 'rectangle', width: 4, height: 6 };

  it('should return true when type matches', () => {
    expect(is(circle, 'circle')).toBe(true);
  });

  it('should return false when type does not match', () => {
    expect(is(circle, 'rectangle')).toBe(false);
  });

  it('should return true for rectangle variant', () => {
    expect(is(rectangle, 'rectangle')).toBe(true);
  });

  it('should return false for rectangle checked as circle', () => {
    expect(is(rectangle, 'circle')).toBe(false);
  });

  it('should narrow the type correctly (compile-time verified)', () => {
    const shape: Shape = { type: 'circle', radius: 10 };

    if (is(shape, 'circle')) {
      // TypeScript narrows shape to { type: 'circle'; radius: number }
      expect(shape.radius).toBe(10);
    } else {
      // This branch should not execute
      expect.unreachable('Expected circle variant');
    }
  });

  it('should narrow rectangle variant correctly', () => {
    const shape: Shape = { type: 'rectangle', width: 3, height: 7 };

    if (is(shape, 'rectangle')) {
      expect(shape.width).toBe(3);
      expect(shape.height).toBe(7);
    } else {
      expect.unreachable('Expected rectangle variant');
    }
  });
});

describe('isUnion with custom discriminant', () => {
  it('should return true for object with matching custom discriminant', () => {
    expect(isUnion({ kind: 'circle' }, 'kind')).toBe(true);
  });

  it('should return false for object with custom discriminant when using default', () => {
    expect(isUnion({ kind: 'circle' })).toBe(false);
  });

  it('should return false for object with type property when discriminant is kind', () => {
    expect(isUnion({ type: 'circle' }, 'kind')).toBe(false);
  });
});

describe('is with custom discriminant', () => {
  const dog: Animal = { kind: 'dog', name: 'Rex' };
  const cat: Animal = { kind: 'cat', lives: 9 };

  it('should return true when custom discriminant matches', () => {
    expect(is(dog, 'dog', 'kind')).toBe(true);
  });

  it('should return false when custom discriminant does not match', () => {
    expect(is(dog, 'cat', 'kind')).toBe(false);
  });

  it('should narrow the type correctly with custom discriminant', () => {
    const animal: Animal = { kind: 'cat', lives: 9 };

    if (is(animal, 'cat', 'kind')) {
      expect(animal.lives).toBe(9);
    } else {
      expect.unreachable('Expected cat variant');
    }
  });
});

describe('is — array filtering', () => {
  const shapes: Shape[] = [
    { type: 'circle', radius: 5 },
    { type: 'rectangle', width: 4, height: 6 },
    { type: 'circle', radius: 10 },
    { type: 'rectangle', width: 2, height: 3 },
  ];

  it('should filter to only circle variants', () => {
    const circles = shapes.filter((s) => is(s, 'circle'));
    expect(circles).toHaveLength(2);
    expect(circles.every((s) => s.type === 'circle')).toBe(true);
  });

  it('should filter to only rectangle variants', () => {
    const rectangles = shapes.filter((s) => is(s, 'rectangle'));
    expect(rectangles).toHaveLength(2);
    expect(rectangles.every((s) => s.type === 'rectangle')).toBe(true);
  });

  it('should return empty array when no variants match', () => {
    const result = shapes.filter((s) => is(s, 'triangle' as any));
    expect(result).toHaveLength(0);
  });
});
