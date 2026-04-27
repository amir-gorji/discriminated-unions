import { describe, it, expect } from 'vitest';
import { matchAsync } from '../async';

type User =
  | { type: 'admin'; id: string }
  | { type: 'guest'; id: string }
  | { type: 'banned'; reason: string };

const admin = { type: 'admin', id: 'a1' } as User;
const guest = { type: 'guest', id: 'g1' } as User;

describe('matchAsync', () => {
  it('returns Promise<R> with all-async handlers', async () => {
    const result = await matchAsync(admin)({
      admin: async ({ id }) => `admin:${id}`,
      guest: async ({ id }) => `guest:${id}`,
      banned: async ({ reason }) => `banned:${reason}`,
    });
    expect(result).toBe('admin:a1');
  });

  it('accepts mixed sync and async handlers, unifies to Promise<R>', async () => {
    const result = await matchAsync(guest)({
      admin: ({ id }) => `admin:${id}`,
      guest: async ({ id }) => `guest:${id}`,
      banned: ({ reason }) => `banned:${reason}`,
    });
    expect(result).toBe('guest:g1');
  });

  it('throws UnknownVariantError for an unknown variant at runtime', async () => {
    const bad = { type: 'unknown' } as any;
    await expect(
      matchAsync(bad)({
        admin: async () => 'a',
        guest: async () => 'g',
        banned: async () => 'b',
      } as any),
    ).rejects.toThrow(/unknown variant "unknown"/);
  });

  it('throws synchronously when input is not a union', () => {
    expect(() => matchAsync(null as any)).toThrow('Not a union');
  });

  it('passes payload to handlers', async () => {
    const result = await matchAsync(admin, 'type', { suffix: '!' })({
      admin: async ({ id }, p) => `admin:${id}${p.suffix}`,
      guest: async ({ id }, p) => `guest:${id}${p.suffix}`,
      banned: async ({ reason }, p) => `banned:${reason}${p.suffix}`,
    });
    expect(result).toBe('admin:a1!');
  });

  it('supports custom discriminant', async () => {
    type E = { kind: 'click'; x: number } | { kind: 'key'; code: string };
    const e = { kind: 'click', x: 10 } as E;
    const result = await matchAsync(e, 'kind')({
      click: async ({ x }) => `click@${x}`,
      key: async ({ code }) => `key:${code}`,
    });
    expect(result).toBe('click@10');
  });

  it('propagates rejections from handlers', async () => {
    await expect(
      matchAsync(admin)({
        admin: async () => {
          throw new Error('boom');
        },
        guest: async () => 'g',
        banned: async () => 'b',
      }),
    ).rejects.toThrow('boom');
  });
});
