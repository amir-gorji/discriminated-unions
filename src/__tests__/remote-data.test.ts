import { describe, expect, it } from 'vitest';
import {
  type Failed,
  type Idle,
  type Loading,
  type Ok,
  type Refreshing,
  type RemoteData,
  RemoteData as RD,
} from '../remote-data';

// ── Constructors ───────────────────────────────────────────────────────────

describe('constructors', () => {
  it('idle produces correct shape', () => {
    expect(RD.idle()).toEqual({ type: 'idle' });
  });

  it('loading produces correct shape', () => {
    expect(RD.loading()).toEqual({ type: 'loading' });
  });

  it('refreshing carries stale data', () => {
    expect(RD.refreshing([1, 2, 3])).toEqual({ type: 'refreshing', data: [1, 2, 3] });
  });

  it('ok carries data', () => {
    expect(RD.ok('hello')).toEqual({ type: 'ok', data: 'hello' });
  });

  it('failed carries error', () => {
    const err = new Error('oops');
    expect(RD.failed(err)).toEqual({ type: 'failed', error: err });
  });

  it('failed accepts custom error type', () => {
    const result = RD.failed({ code: 404, message: 'Not found' });
    expect(result).toEqual({ type: 'failed', error: { code: 404, message: 'Not found' } });
  });
});

// ── Type-level tests ───────────────────────────────────────────────────────

describe('type aliases', () => {
  it('RemoteData<T,E> is assignable from all 5 variants', () => {
    const states: RemoteData<string[], Error>[] = [
      RD.idle(),
      RD.loading(),
      RD.refreshing(['stale']),
      RD.ok(['fresh']),
      RD.failed(new Error()),
    ];
    expect(states).toHaveLength(5);
  });

  it('Idle type is assignable', () => {
    const s: Idle = RD.idle();
    expect(s.type).toBe('idle');
  });

  it('Loading type is assignable', () => {
    const s: Loading = RD.loading();
    expect(s.type).toBe('loading');
  });

  it('Refreshing type is assignable', () => {
    const s: Refreshing<number> = RD.refreshing(1);
    expect(s.data).toBe(1);
  });

  it('Ok type is assignable', () => {
    const s: Ok<number> = RD.ok(1);
    expect(s.data).toBe(1);
  });

  it('Failed type defaults E to Error', () => {
    const s: Failed<Error> = RD.failed(new Error('x'));
    expect(s.error.message).toBe('x');
  });
});
