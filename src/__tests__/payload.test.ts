import { describe, it, expect } from 'vitest';
import { createPipeHandlers, createUnion } from '../unions';

type Shape =
  | { type: 'circle'; radius: number }
  | { type: 'rectangle'; width: number; height: number }
  | { type: 'triangle'; base: number; height: number };

const circle = { type: 'circle', radius: 5 } as Shape;
const rectangle = { type: 'rectangle', width: 4, height: 6 } as Shape;
const triangle = { type: 'triangle', base: 10, height: 3 } as Shape;

type Context = { scale: number; label: string };
const ctx: Context = { scale: 2, label: 'test' };

// ── createPipeHandlers bound forms ─────────────────────────────────────────

describe('createPipeHandlers with payload', () => {
  const shapeOps = createPipeHandlers<Shape, 'type'>('type');

  describe('match', () => {
    it('accepts payload as second arg to the returned function', () => {
      const fn = shapeOps.match<string, Context>({
        circle: ({ radius }, p) => `${p.label}:${radius * p.scale}`,
        rectangle: ({ width, height }, p) => `${p.label}:${width * height * p.scale}`,
        triangle: ({ base, height }, p) => `${p.label}:${(base * height) / 2 * p.scale}`,
      });
      expect(fn(circle, ctx)).toBe('test:10');
      expect(fn(rectangle, ctx)).toBe('test:48');
    });
  });

  describe('matchWithDefault', () => {
    it('passes payload to matched handler', () => {
      const fn = shapeOps.matchWithDefault<string, Context>({
        circle: ({ radius }, p) => `${p.label}:${radius * p.scale}`,
        Default: (p) => `${p.label}:other`,
      });
      expect(fn(circle, ctx)).toBe('test:10');
    });

    it('passes payload to Default when no variant matched', () => {
      const fn = shapeOps.matchWithDefault<string, Context>({
        circle: ({ radius }, p) => `${p.label}:${radius * p.scale}`,
        Default: (p) => `${p.label}:other`,
      });
      expect(fn(triangle, ctx)).toBe('test:other');
    });
  });

  describe('map', () => {
    it('passes payload to handler', () => {
      const fn = shapeOps.map<Context>({
        circle: ({ radius }, p) => ({ radius: radius * p.scale }),
      });
      expect(fn(circle, ctx)).toEqual({ type: 'circle', radius: 10 });
    });
  });

  describe('mapAll', () => {
    it('passes payload to all handlers', () => {
      const fn = shapeOps.mapAll<Context>({
        circle: ({ radius }, p) => ({ radius: radius * p.scale }),
        rectangle: ({ width, height }, p) => ({
          width: width * p.scale,
          height: height * p.scale,
        }),
        triangle: ({ base, height }, p) => ({
          base: base * p.scale,
          height: height * p.scale,
        }),
      });
      expect(fn(circle, ctx)).toEqual({ type: 'circle', radius: 10 });
      expect(fn(rectangle, ctx)).toEqual({ type: 'rectangle', width: 8, height: 12 });
    });
  });
});

// ── createUnion bound forms ────────────────────────────────────────────────

describe('createUnion with payload', () => {
  const Shape = createUnion('type', {
    circle: (radius: number) => ({ radius }),
    rectangle: (width: number, height: number) => ({ width, height }),
    triangle: (base: number, height: number) => ({ base, height }),
  });

  it('match passes payload to handler', () => {
    const fn = Shape.match<string, Context>({
      circle: ({ radius }, p) => `${p.label}:${radius * p.scale}`,
      rectangle: ({ width, height }, p) => `${p.label}:${width * height * p.scale}`,
      triangle: ({ base, height }, p) => `${p.label}:${(base * height) / 2 * p.scale}`,
    });
    expect(fn(Shape.circle(5), ctx)).toBe('test:10');
  });

  it('matchWithDefault passes payload to Default', () => {
    const fn = Shape.matchWithDefault<string, Context>({
      circle: ({ radius }, p) => `${p.label}:${radius}`,
      Default: (p) => `${p.label}:unknown`,
    });
    expect(fn(Shape.triangle(10, 3), ctx)).toBe('test:unknown');
  });

  it('map passes payload to handler', () => {
    const fn = Shape.map<Context>({
      circle: ({ radius }, p) => ({ radius: radius * p.scale }),
    });
    expect(fn(Shape.circle(5), ctx)).toEqual({ type: 'circle', radius: 10 });
  });

  it('mapAll passes payload to all handlers', () => {
    const fn = Shape.mapAll<Context>({
      circle: ({ radius }, p) => ({ radius: radius * p.scale }),
      rectangle: ({ width, height }, p) => ({
        width: width * p.scale,
        height: height * p.scale,
      }),
      triangle: ({ base, height }, p) => ({
        base: base * p.scale,
        height: height * p.scale,
      }),
    });
    expect(fn(Shape.rectangle(4, 6), ctx)).toEqual({
      type: 'rectangle',
      width: 8,
      height: 12,
    });
  });
});
