import { describe, it, expect } from 'vitest';
import { partition, createPipeHandlers, createUnion } from '../unions';

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
const triangle: Shape = { type: 'triangle', base: 3, height: 7 };
const shapes: Shape[] = [circle, rectangle, triangle, circle];

describe('partition', () => {
  it('should split by single variant (array form)', () => {
    const [circles, rest] = partition(shapes, ['circle']);
    expect(circles).toEqual([circle, circle]);
    expect(rest).toEqual([rectangle, triangle]);
  });

  it('should split by single variant (string form)', () => {
    const [circles, rest] = partition(shapes, 'circle');
    expect(circles).toEqual([circle, circle]);
    expect(rest).toEqual([rectangle, triangle]);
  });

  it('should split by multiple variants', () => {
    const [matched, rest] = partition(shapes, ['circle', 'rectangle']);
    expect(matched).toEqual([circle, rectangle, circle]);
    expect(rest).toEqual([triangle]);
  });

  it('should return all items in matched when all variants specified', () => {
    const [matched, rest] = partition(shapes, [
      'circle',
      'rectangle',
      'triangle',
    ]);
    expect(matched).toHaveLength(4);
    expect(rest).toHaveLength(0);
  });

  it('should return all items in rest when no variants match', () => {
    const rects: Shape[] = [rectangle];
    const [matched, rest] = partition(rects, ['circle']);
    expect(matched).toHaveLength(0);
    expect(rest).toEqual([rectangle]);
  });

  it('should handle empty array', () => {
    const [matched, rest] = partition([] as Shape[], ['circle']);
    expect(matched).toHaveLength(0);
    expect(rest).toHaveLength(0);
  });

  it('should handle empty variants array', () => {
    const [matched, rest] = partition(shapes, []);
    expect(matched).toHaveLength(0);
    expect(rest).toHaveLength(4);
  });

  it('should preserve original references', () => {
    const [circles] = partition(shapes, ['circle']);
    expect(circles[0]).toBe(circle);
    expect(circles[1]).toBe(circle);
  });
});

describe('partition — non-union items are skipped', () => {
  it('excludes null from both tuple elements', () => {
    const mixed: any[] = [circle, null, rectangle];
    const [matched, rest] = partition(mixed, 'circle');
    expect(matched).toEqual([circle]);
    expect(rest).toEqual([rectangle]);
  });

  it('excludes plain objects without a discriminant from both tuple elements', () => {
    const mixed: any[] = [circle, { name: 'not a union' }, triangle];
    const [matched, rest] = partition(mixed, 'circle');
    expect(matched).toEqual([circle]);
    expect(rest).toEqual([triangle]);
  });

  it('excludes primitives from both tuple elements', () => {
    const mixed: any[] = [circle, 'string', 42, rectangle];
    const [matched, rest] = partition(mixed, 'circle');
    expect(matched).toEqual([circle]);
    expect(rest).toEqual([rectangle]);
  });

  it('returns two empty arrays when all items are invalid', () => {
    const [matched, rest] = partition([null, undefined, 'x'] as any[], 'circle');
    expect(matched).toHaveLength(0);
    expect(rest).toHaveLength(0);
  });
});

describe('partition — custom discriminant', () => {
  const dog: Animal = { kind: 'dog', name: 'Rex' };
  const cat: Animal = { kind: 'cat', lives: 9 };
  const bird: Animal = { kind: 'bird', canFly: true };
  const animals: Animal[] = [dog, cat, bird];

  it('should work with custom discriminant', () => {
    const [pets, rest] = partition(animals, ['dog', 'cat'], 'kind');
    expect(pets).toEqual([dog, cat]);
    expect(rest).toEqual([bird]);
  });
});

describe('partition — createPipeHandlers', () => {
  const shapeOps = createPipeHandlers<Shape, 'type'>('type');

  it('should work with pipe handlers', () => {
    const splitCircles = shapeOps.partition(['circle']);
    const [circles, rest] = splitCircles(shapes);
    expect(circles).toEqual([circle, circle]);
    expect(rest).toEqual([rectangle, triangle]);
  });
});

describe('partition — createUnion', () => {
  const Shape = createUnion('type', {
    circle: (radius: number) => ({ radius }),
    rectangle: (width: number, height: number) => ({ width, height }),
    triangle: (base: number, height: number) => ({ base, height }),
  });

  it('should work with createUnion bound partition', () => {
    const items = [Shape.circle(5), Shape.rectangle(4, 6), Shape.triangle(3, 7)];
    const [circles, rest] = Shape.partition(['circle'])(items);
    expect(circles).toHaveLength(1);
    expect(circles[0]).toEqual({ type: 'circle', radius: 5 });
    expect(rest).toHaveLength(2);
  });
});
