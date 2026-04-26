import { describe, it, expect } from 'vitest';
import { matchWithDefaultAsync } from '../unions';

type Result =
  | { type: 'ok'; value: number }
  | { type: 'err'; message: string }
  | { type: 'pending' };

const ok = { type: 'ok', value: 42 } as Result;
const err = { type: 'err', message: 'boom' } as Result;
const pending = { type: 'pending' } as Result;

describe('matchWithDefaultAsync', () => {
  it('routes to a matched async handler', async () => {
    const out = await matchWithDefaultAsync(ok)({
      ok: async ({ value }) => `ok:${value}`,
      Default: async () => 'default',
    });
    expect(out).toBe('ok:42');
  });

  it('routes to async Default for unhandled variants', async () => {
    const out = await matchWithDefaultAsync(pending)({
      ok: async ({ value }) => `ok:${value}`,
      Default: async () => 'default',
    });
    expect(out).toBe('default');
  });

  it('Default may be sync', async () => {
    const out = await matchWithDefaultAsync(err)({
      ok: async ({ value }) => `ok:${value}`,
      Default: () => 'fallback',
    });
    expect(out).toBe('fallback');
  });

  it('passes payload to Default', async () => {
    const out = await matchWithDefaultAsync(pending, 'type', 'x')({
      ok: async ({ value }, p) => `ok:${value}:${p}`,
      Default: (p) => `default:${p}`,
    });
    expect(out).toBe('default:x');
  });
});
