import { describe, it, expect } from 'vitest';
import { fold, createPipeHandlers, createUnion } from '../unions';

type Shape =
  | { type: 'circle'; radius: number }
  | { type: 'rectangle'; width: number; height: number }
  | { type: 'triangle'; base: number; height: number };

type Animal =
  | { kind: 'dog'; name: string }
  | { kind: 'cat'; lives: number }
  | { kind: 'bird'; canFly: boolean };

describe('fold — standalone', () => {
  const shapes: Shape[] = [
    { type: 'circle', radius: 5 },
    { type: 'rectangle', width: 4, height: 6 },
    { type: 'circle', radius: 10 },
    { type: 'triangle', base: 3, height: 7 },
  ];

  it('should count variants', () => {
    const counts = fold(shapes, { circles: 0, rects: 0, triangles: 0 })({
      circle: (acc) => ({ ...acc, circles: acc.circles + 1 }),
      rectangle: (acc) => ({ ...acc, rects: acc.rects + 1 }),
      triangle: (acc) => ({ ...acc, triangles: acc.triangles + 1 }),
    });
    expect(counts).toEqual({ circles: 2, rects: 1, triangles: 1 });
  });

  it('should aggregate values', () => {
    const totalArea = fold(shapes, 0)({
      circle: (acc, { radius }) => acc + Math.PI * radius ** 2,
      rectangle: (acc, { width, height }) => acc + width * height,
      triangle: (acc, { base, height }) => acc + (base * height) / 2,
    });
    expect(totalArea).toBeCloseTo(
      Math.PI * 25 + 24 + Math.PI * 100 + 10.5,
    );
  });

  it('should return initial value for empty array', () => {
    const result = fold([] as Shape[], 42)({
      circle: (acc) => acc,
      rectangle: (acc) => acc,
      triangle: (acc) => acc,
    });
    expect(result).toBe(42);
  });

  it('should work with a single item', () => {
    const result = fold(
      [{ type: 'circle', radius: 3 } as Shape],
      0,
    )({
      circle: (acc, { radius }) => acc + radius,
      rectangle: (acc) => acc,
      triangle: (acc) => acc,
    });
    expect(result).toBe(3);
  });

  it('should process items in order', () => {
    const items: Shape[] = [
      { type: 'circle', radius: 1 },
      { type: 'rectangle', width: 2, height: 3 },
      { type: 'triangle', base: 4, height: 5 },
    ];
    const result = fold(items, '')({
      circle: (acc) => acc + 'C',
      rectangle: (acc) => acc + 'R',
      triangle: (acc) => acc + 'T',
    });
    expect(result).toBe('CRT');
  });

  it('should not mutate the initial accumulator', () => {
    const initial = { count: 0 };
    fold([{ type: 'circle', radius: 5 } as Shape], initial)({
      circle: (acc) => ({ count: acc.count + 1 }),
      rectangle: (acc) => acc,
      triangle: (acc) => acc,
    });
    expect(initial.count).toBe(0);
  });

  it('should throw when a handler is missing', () => {
    expect(() =>
      fold([{ type: 'circle', radius: 5 } as Shape], 0)({
        rectangle: (acc) => acc,
        triangle: (acc) => acc,
      } as any),
    ).toThrow('No handler');
  });
});

describe('fold — custom discriminant', () => {
  const animals: Animal[] = [
    { kind: 'dog', name: 'Rex' },
    { kind: 'cat', lives: 9 },
    { kind: 'bird', canFly: true },
  ];

  it('should fold with custom discriminant', () => {
    const names = fold(animals, '', 'kind')({
      dog: (acc, { name }) => acc + name,
      cat: (acc) => acc + 'cat',
      bird: (acc) => acc + 'bird',
    });
    expect(names).toBe('Rexcatbird');
  });
});

describe('fold — createPipeHandlers', () => {
  const shapeOps = createPipeHandlers<Shape, 'type'>('type');

  it('should fold via pipe handlers', () => {
    const shapes: Shape[] = [
      { type: 'circle', radius: 5 },
      { type: 'rectangle', width: 4, height: 6 },
    ];
    const count = shapeOps.fold(shapes, 0)({
      circle: (acc) => acc + 1,
      rectangle: (acc) => acc + 1,
      triangle: (acc) => acc + 1,
    });
    expect(count).toBe(2);
  });
});

describe('fold — createUnion', () => {
  const Shape = createUnion('type', {
    circle: (radius: number) => ({ radius }),
    rectangle: (width: number, height: number) => ({ width, height }),
    triangle: (base: number, height: number) => ({ base, height }),
  });

  it('should fold via bound factory method', () => {
    const shapes = [Shape.circle(5), Shape.rectangle(4, 6), Shape.triangle(3, 7)];
    const count = Shape.fold(shapes, 0)({
      circle: (acc) => acc + 1,
      rectangle: (acc) => acc + 1,
      triangle: (acc) => acc + 1,
    });
    expect(count).toBe(3);
  });

  it('should aggregate with bound factory method', () => {
    const shapes = [Shape.circle(5), Shape.circle(10)];
    const totalRadius = Shape.fold(shapes, 0)({
      circle: (acc, { radius }) => acc + radius,
      rectangle: (acc) => acc,
      triangle: (acc) => acc,
    });
    expect(totalRadius).toBe(15);
  });
});
