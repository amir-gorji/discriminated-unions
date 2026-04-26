import { describe, it, expect } from 'vitest';
import { mapAsync } from '../unions';

type Shape =
  | { type: 'circle'; radius: number }
  | { type: 'rectangle'; width: number; height: number };

const circle = { type: 'circle', radius: 5 } as Shape;
const rectangle = { type: 'rectangle', width: 4, height: 6 } as Shape;

describe('mapAsync', () => {
  it('transforms a matched variant via async handler', async () => {
    const out = await mapAsync(circle)({
      circle: async ({ radius }) => ({ radius: radius * 2 }),
    });
    expect(out).toEqual({ type: 'circle', radius: 10 });
  });

  it('returns the same reference when no handler matches', async () => {
    const out = await mapAsync(rectangle)({
      circle: async ({ radius }) => ({ radius: radius + 1 }),
    });
    expect(out).toBe(rectangle);
  });

  it('preserves discriminant if handler returns it', async () => {
    const out = await mapAsync(circle)({
      circle: async ({ radius }) => ({ radius: radius * 2 }) as any,
    });
    expect((out as any).type).toBe('circle');
  });

  it('throws on non-union input', () => {
    expect(() => mapAsync({} as any)).toThrow('Not a union');
  });
});
