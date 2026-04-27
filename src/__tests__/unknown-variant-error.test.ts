import { describe, it, expect } from 'vitest';
import {
  UnknownVariantError,
  match,
  fold,
} from '../unions';
import { matchAsync } from '../async';

describe('UnknownVariantError', () => {
  it('is an Error subclass', () => {
    const e = new UnknownVariantError('foo', ['a', 'b']);
    expect(e).toBeInstanceOf(Error);
    expect(e).toBeInstanceOf(UnknownVariantError);
    expect(e.name).toBe('UnknownVariantError');
  });

  it('carries variant and known fields', () => {
    const e = new UnknownVariantError('foo', ['a', 'b']);
    expect(e.variant).toBe('foo');
    expect(e.known).toEqual(['a', 'b']);
  });

  it('formats message with variant and known list', () => {
    const e = new UnknownVariantError('foo', ['a', 'b']);
    expect(e.message).toBe(
      'dismatch: unknown variant "foo" (known: a, b)',
    );
  });

  it('formats empty known set as ∅', () => {
    const e = new UnknownVariantError('foo', []);
    expect(e.message).toContain('∅');
  });

  it('is thrown by match for unknown runtime variants', () => {
    const bad = { type: 'oops' } as any;
    try {
      match(bad)({ a: () => 1, b: () => 2 } as any);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(UnknownVariantError);
      expect((e as UnknownVariantError).variant).toBe('oops');
      expect((e as UnknownVariantError).known).toEqual(['a', 'b']);
    }
  });

  it('is thrown by fold for unhandled variants without Default', () => {
    const items = [{ type: 'oops' } as any];
    try {
      fold(items, 0)({ a: (acc: number) => acc } as any);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(UnknownVariantError);
      expect((e as UnknownVariantError).variant).toBe('oops');
    }
  });

  it('stack trace points at match, not internal dispatch', () => {
    const bad = { type: 'oops' } as any;
    try {
      match(bad)({ a: () => 1 } as any);
      expect.unreachable();
    } catch (e) {
      const stack = (e as Error).stack ?? '';
      expect(stack).not.toMatch(/at dispatch\b/);
    }
  });

  it('stack trace points at matchAsync, not internal dispatch', async () => {
    const bad = { type: 'oops' } as any;
    await expect(
      matchAsync(bad)({ a: async () => 1 } as any),
    ).rejects.toSatisfy((e: Error) => {
      const stack = e.stack ?? '';
      return e instanceof UnknownVariantError && !/at dispatch\b/.test(stack);
    });
  });
});
