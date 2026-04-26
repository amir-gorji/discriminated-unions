import { createUnion, match, type InferUnion } from 'dismatch';

const Result = createUnion('type', {
  ok: (data: string) => ({ data }),
  error: (message: string) => ({ message }),
  loading: () => ({}),
});

type Result = InferUnion<typeof Result>;

const value: Result = Result.ok(' hello ');

const label = Result.match({
  ok: ({ data }) => data.trim(),
  error: ({ message }) => message,
  loading: () => 'loading',
});

const trim = Result.map({
  ok: ({ data }) => ({ data: data.trim() }),
  error: ({ message }) => ({ message: message.trim() }),
});

const trimmed: Result = trim(value);

const size: number = match(trimmed)({
  ok: ({ data }) => data.length,
  error: ({ message }) => message.length,
  loading: () => 0,
});

label(trimmed);
size;

const DefaultResult = createUnion({
  ok: (data: string) => ({ data }),
  error: (message: string) => ({ message }),
});

type DefaultResult = InferUnion<typeof DefaultResult>;

const defaultValue: DefaultResult = DefaultResult.ok(' hello ');
const defaultLabel = DefaultResult.match({
  ok: ({ data }) => data.trim(),
  error: ({ message }) => message,
});

const okType: 'ok' = DefaultResult.ok('ok').type;

defaultLabel(defaultValue);
okType;

createUnion('type', {
  broken: () => ({
    // @ts-expect-error createUnion injects the discriminant automatically
    type: 'broken',
  }),
});

createUnion({
  broken: () => ({
    // @ts-expect-error createUnion injects the default "type" discriminant automatically
    type: 'broken',
  }),
});

Result.map({
  error: ({ message }) => ({ message }),
});

({
  // @ts-expect-error map handlers cannot override the discriminant
  type: 'ok',
  message: '',
}) satisfies ReturnType<NonNullable<Parameters<typeof Result.map>[0]['error']>>;
