// import { pipe } from 'fp-ts/lib/function';
import { createPipeHandlers } from '.';

type A = { kind: 'A'; a: number };
type B = { kind: 'B'; b: string };
type C = { kind: 'C'; c: boolean };

type Model = A | B | C;

const x: Model = {} as any;

const { map, mapAll, match, matchWithDefault } =
  createPipeHandlers<Model>('kind');

// const result = pipe(
//   x,
//   match({
//     A: (a) => a.a,
//     B: (b) => b.b.length,
//     C: (c) => (c.c ? 1 : 0),
//   }),
// );
