// import { pipe } from 'fp-ts/lib/function';
import { createPipeHandlers } from '.';

type A = { shape: 'circle'; radius: number };
type B = { shape: 'rectangle'; width: number; height: number };
type C = { shape: 'triangle'; base: number; height: number };

type Model = A | B | C;

const x: Model = {} as any;

const { match } = createPipeHandlers<Model>('shape');

const calculateArea = match({
  circle: ({ radius }) => Math.PI * radius ** 2,
  rectangle: ({ width, height }) => width * height,
  triangle: ({ base, height }) => (base * height) / 2,
});

const area = calculateArea(x);

type Data = { depth: number };

const calculateVolume = match<number, Data>({
  circle: ({ radius }) => (4 / 3) * Math.PI * radius ** 3,
  rectangle: ({ width, height }, { depth }) => width * height * depth,
  triangle: ({ base, height }, { depth }) => (base * height * depth) / 2,
});

const volume = calculateVolume(x, { depth: 10 });

// const result = pipe(
//   x,
//   match({
//     A: (a) => a.a,
//     B: (b) => b.b.length,
//     C: (c) => (c.c ? 1 : 0),
//   }),
// );
