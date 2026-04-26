import { describe, it, expect } from 'vitest';
import { matchAllAsync } from '../unions';

type User =
  | { type: 'admin'; id: string }
  | { type: 'guest'; id: string };

const users = [
  { type: 'admin', id: 'a1' },
  { type: 'guest', id: 'g1' },
  { type: 'admin', id: 'a2' },
] as User[];

const sleep = (ms: number) =>
  new Promise<void>((resolve) =>
    (globalThis as any).setTimeout(resolve, ms),
  );

describe('matchAllAsync', () => {
  it('dispatches all items in parallel and preserves order', async () => {
    const out = await matchAllAsync(users)({
      admin: async ({ id }) => `A:${id}`,
      guest: async ({ id }) => `G:${id}`,
    });
    expect(out).toEqual(['A:a1', 'G:g1', 'A:a2']);
  });

  it('runs handlers concurrently (not sequentially)', async () => {
    const items = [
      { type: 'admin', id: 'a1' },
      { type: 'admin', id: 'a2' },
      { type: 'admin', id: 'a3' },
    ] as User[];
    const start = Date.now();
    await matchAllAsync(items)({
      admin: async ({ id }) => {
        await sleep(30);
        return id;
      },
      guest: async ({ id }) => id,
    });
    const elapsed = Date.now() - start;
    // 3 × 30 ms sequential would be ≥ 90 ms; parallel should be ~30 ms.
    expect(elapsed).toBeLessThan(80);
  });

  it('rejects with UnknownVariantError when an item has no matching handler', async () => {
    const items = [{ type: 'unknown' }] as any[];
    await expect(
      matchAllAsync(items as User[])({
        admin: async () => 'a',
        guest: async () => 'g',
      } as any),
    ).rejects.toThrow(/unknown variant "unknown"/);
  });

  it('rejects with "Not a union" when any item is not a union', async () => {
    const items = [null] as any[];
    await expect(
      matchAllAsync(items as User[])({
        admin: async () => 'a',
        guest: async () => 'g',
      }),
    ).rejects.toThrow('Not a union');
  });

  it('passes payload to each handler', async () => {
    const items = [
      { type: 'admin', id: 'a1' },
      { type: 'guest', id: 'g1' },
    ] as User[];
    const out = await matchAllAsync(items, 'type', '!')({
      admin: async ({ id }, p) => `A:${id}${p}`,
      guest: async ({ id }, p) => `G:${id}${p}`,
    });
    expect(out).toEqual(['A:a1!', 'G:g1!']);
  });
});
