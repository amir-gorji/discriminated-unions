import { describe, it, expect } from 'vitest';
import { foldAsync } from '../async';

type Event =
  | { type: 'click'; x: number }
  | { type: 'key'; code: string };

const events = [
  { type: 'click', x: 1 },
  { type: 'key', code: 'a' },
  { type: 'click', x: 2 },
] as Event[];

const tick = () =>
  new Promise<void>((resolve) =>
    (globalThis as any).setTimeout(resolve, 0),
  );

describe('foldAsync', () => {
  it('aggregates sequentially with async handlers', async () => {
    const total = await foldAsync(events, 0)({
      click: async (acc, { x }) => acc + x,
      key: async (acc) => acc + 100,
    });
    expect(total).toBe(103);
  });

  it('threads accumulator through awaits in array order', async () => {
    const items = [
      { type: 'click', x: 1 },
      { type: 'click', x: 2 },
      { type: 'click', x: 3 },
    ] as Event[];
    const trace: number[] = [];
    const out = await foldAsync(items, '')({
      click: async (acc, { x }) => {
        trace.push(x);
        await tick();
        return acc + String(x);
      },
      key: async (acc) => acc,
    });
    expect(out).toBe('123');
    expect(trace).toEqual([1, 2, 3]);
  });

  it('throws UnknownVariantError for unhandled variant', async () => {
    const items = [{ type: 'click', x: 1 }] as Event[];
    await expect(
      foldAsync(items, 0)({
        key: async (acc: number) => acc,
      } as any),
    ).rejects.toThrow(/unknown variant "click"/);
  });

  it('mixed sync and async handlers work', async () => {
    const out = await foldAsync(events.slice(0, 2), 0)({
      click: (acc, { x }) => acc + x,
      key: async (acc) => acc + 10,
    });
    expect(out).toBe(11);
  });
});
