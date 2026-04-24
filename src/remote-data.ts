export type Idle = { type: 'idle' };
export type Loading = { type: 'loading' };
export type Refreshing<T> = { type: 'refreshing'; data: T };
export type Ok<T> = { type: 'ok'; data: T };
export type Failed<E> = { type: 'failed'; error: E };
export type RemoteData<T, E = Error> =
  | Idle
  | Loading
  | Refreshing<T>
  | Ok<T>
  | Failed<E>;

export const RemoteData = {
  idle: (): Idle => ({ type: 'idle' }),
  loading: (): Loading => ({ type: 'loading' }),
  refreshing: <T>(data: T): Refreshing<T> => ({ type: 'refreshing', data }),
  ok: <T>(data: T): Ok<T> => ({ type: 'ok', data }),
  failed: <E = Error>(error: E): Failed<E> => ({ type: 'failed', error }),
} as const;
