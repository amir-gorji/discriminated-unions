import { describe, it, expect } from 'vitest';
import { count, createPipeHandlers, createUnion } from '../unions';

type Shape =
  | { type: 'circle'; radius: number }
  | { type: 'rectangle'; width: number; height: number }
  | { type: 'triangle'; base: number; height: number };

type Animal =
  | { kind: 'dog'; name: string }
  | { kind: 'cat'; lives: number }
  | { kind: 'bird'; canFly: boolean };

const shapes: Shape[] = [
  { type: 'circle', radius: 5 },
  { type: 'circle', radius: 10 },
  { type: 'rectangle', width: 4, height: 6 },
  { type: 'triangle', base: 3, height: 7 },
  { type: 'circle', radius: 1 },
];

describe('count', () => {
  it('should count a single variant', () => {
    expect(count(shapes, 'circle')).toBe(3);
    expect(count(shapes, 'rectangle')).toBe(1);
    expect(count(shapes, 'triangle')).toBe(1);
  });

  it('should count multiple variants', () => {
    expect(count(shapes, ['circle', 'rectangle'])).toBe(4);
    expect(count(shapes, ['circle', 'triangle'])).toBe(4);
    expect(count(shapes, ['rectangle', 'triangle'])).toBe(2);
    expect(count(shapes, ['circle', 'rectangle', 'triangle'])).toBe(5);
  });

  it('should return 0 for empty array', () => {
    expect(count([] as Shape[], 'circle')).toBe(0);
    expect(count([] as Shape[], ['circle', 'rectangle'])).toBe(0);
  });

  it('should return 0 when no matches', () => {
    const rects: Shape[] = [{ type: 'rectangle', width: 1, height: 1 }];
    expect(count(rects, 'circle')).toBe(0);
    expect(count(rects, ['circle', 'triangle'])).toBe(0);
  });

  it('should work with empty variants array', () => {
    expect(count(shapes, [])).toBe(0);
  });
});

describe('count — custom discriminant', () => {
  const animals: Animal[] = [
    { kind: 'dog', name: 'Rex' },
    { kind: 'cat', lives: 9 },
    { kind: 'dog', name: 'Buddy' },
    { kind: 'bird', canFly: true },
  ];

  it('should work with custom discriminant', () => {
    expect(count(animals, 'dog', 'kind')).toBe(2);
    expect(count(animals, ['dog', 'cat'], 'kind')).toBe(3);
  });
});

describe('count — createPipeHandlers', () => {
  const shapeOps = createPipeHandlers<Shape, 'type'>('type');

  it('should work with pipe handlers — single variant', () => {
    const countCircles = shapeOps.count('circle');
    expect(countCircles(shapes)).toBe(3);
  });

  it('should work with pipe handlers — multiple variants', () => {
    const countRound = shapeOps.count(['circle', 'rectangle']);
    expect(countRound(shapes)).toBe(4);
  });
});

describe('count — createUnion', () => {
  const Shape = createUnion('type', {
    circle: (radius: number) => ({ radius }),
    rectangle: (width: number, height: number) => ({ width, height }),
    triangle: (base: number, height: number) => ({ base, height }),
  });

  it('should work with createUnion bound count', () => {
    const items = [Shape.circle(5), Shape.circle(10), Shape.triangle(3, 7)];
    expect(Shape.count('circle')(items)).toBe(2);
    expect(Shape.count(['circle', 'triangle'])(items)).toBe(3);
  });
});
