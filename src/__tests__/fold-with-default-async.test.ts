import { describe, it, expect } from 'vitest';
import { foldWithDefaultAsync } from '../async';

type Event =
  | { type: 'click'; x: number }
  | { type: 'key'; code: string }
  | { type: 'scroll'; dy: number };

const events = [
  { type: 'click', x: 1 },
  { type: 'key', code: 'a' },
  { type: 'scroll', dy: 5 },
  { type: 'click', x: 2 },
] as Event[];

const tick = () =>
  new Promise<void>((resolve) =>
    (globalThis as any).setTimeout(resolve, 0),
  );

describe('foldWithDefaultAsync', () => {
  it('routes matched variants and falls back to Default', async () => {
    const total = await foldWithDefaultAsync(events, 0)({
      click: async (acc, { x }) => acc + x,
      Default: async (acc) => acc + 100,
    });
    expect(total).toBe(1 + 100 + 100 + 2);
  });

  it('Default receives the full union item', async () => {
    const seen: Event[] = [];
    await foldWithDefaultAsync(events, 0)({
      click: (acc) => acc,
      Default: (acc, item) => {
        seen.push(item);
        return acc;
      },
    });
    expect(seen).toEqual([
      { type: 'key', code: 'a' },
      { type: 'scroll', dy: 5 },
    ]);
  });

  it('threads accumulator sequentially through awaits', async () => {
    const out = await foldWithDefaultAsync(events, '')({
      click: async (acc, { x }) => {
        await tick();
        return acc + `c${x}`;
      },
      Default: async (acc, item) => {
        await tick();
        return acc + `d:${item.type}`;
      },
    });
    expect(out).toBe('c1d:keyd:scrollc2');
  });

  it('mixed sync and async handlers work', async () => {
    const out = await foldWithDefaultAsync(events, 0)({
      click: (acc, { x }) => acc + x,
      Default: async (acc) => acc + 1,
    });
    expect(out).toBe(1 + 1 + 1 + 2);
  });

  it('throws when an item is not a valid union', async () => {
    const items = [null as unknown as Event];
    await expect(
      foldWithDefaultAsync(items, 0)({
        click: (acc) => acc,
        Default: (acc) => acc,
      }),
    ).rejects.toThrow(/Not a union/);
  });
});
