/**
 * Base type constraint representing any discriminated union.
 * A discriminated union is an object with a string `type` property that
 * serves as the discriminant, plus any additional data.
 *
 * @example
 * ```ts
 * type MyUnion = { type: 'a'; value: number } | { type: 'b'; name: string };
 * // MyUnion satisfies SampleUnion
 * ```
 */
export type SampleUnion<Discriminant extends PropertyKey> = {
  [K in Discriminant]: string;
};

/**
 * Constructs a single variant of a discriminated union.
 * Combines a literal `type` discriminant with additional data fields.
 *
 * @typeParam Discriminant - The literal string value for the `type` field
 * @typeParam Data - The shape of additional data carried by this variant
 *
 * @example
 * ```ts
 * type Circle = Model<'circle', { radius: number }>;
 * // Equivalent to: { type: 'circle'; radius: number }
 *
 * type Rectangle = Model<'rectangle', { width: number; height: number }>;
 * // Equivalent to: { type: 'rectangle'; width: number; height: number }
 *
 * type Shape = Circle | Rectangle;
 * ```
 */
export type Model<
  DiscriminantValue extends string,
  Data = {},
  Discriminant extends PropertyKey = 'type',
> = {
  [K in Discriminant]: DiscriminantValue;
} & Data;

/**
 * Exhaustive handler map for pattern matching on a discriminated union.
 * Requires a handler function for **every** variant in the union.
 * Each handler receives the variant data fields (without the discriminant) and
 * must return `Result`.
 *
 * @typeParam T - The discriminated union type
 * @typeParam Result - The return type of all handler functions
 *
 * @example
 * ```ts
 * type Shape = { type: 'circle', radius: number } | { type: 'rect', w: number; h: number };
 *
 * const area: Matcher<Shape, number> = {
 *   circle: ({ radius }) => Math.PI * radius ** 2,
 *   rect: ({ w, h }) => w * h,
 * };
 * ```
 */
export type Matcher<
  T extends SampleUnion<Discriminant>,
  Result,
  Discriminant extends PropertyKey,
  Payload extends any = never,
> = {
  [K in T[Discriminant]]: T extends Model<K, infer Data, Discriminant>
    ? (
        ...inputs: [Payload] extends [never]
          ? [input: Data]
          : [input: Data, payload: Payload]
      ) => Result
    : never;
};

/**
 * Partial handler map with a required `Default` fallback for unmatched variants.
 * Unlike {@link Matcher}, individual variant handlers are optional. When a variant
 * has no handler, the `Default` function is called instead.
 *
 * **Design limitation:** `Default` does not receive the triggering variant as an argument.
 * When `Payload = never` (the default), `Default` receives no arguments at all — there
 * is no way to inspect which variant fell through inside `Default`. If you need to
 * branch on the unmatched variant, use exhaustive {@link Matcher} instead, or pass the
 * original value via the `Payload` type parameter.
 *
 * @typeParam T - The discriminated union type
 * @typeParam Result - The return type of all handler functions (including Default)
 *
 * @example
 * ```ts
 * type Shape = { type: 'circle', radius: number } | { type: 'rect', w: number; h: number };
 *
 * const describe: MatcherWithDefault<Shape, string> = {
 *   circle: ({ radius }) => `Circle with radius ${radius}`,
 *   Default: () => 'Unknown shape', // ← cannot inspect which variant fell through
 * };
 * ```
 */
export type MatcherWithDefault<
  T extends SampleUnion<Discriminant>,
  Result,
  Discriminant extends PropertyKey,
  Payload extends any = never,
> = Partial<Matcher<T, Result, Discriminant, Payload>> & {
  Default: (payload: Payload) => Result;
};

/**
 * Partial transformation map for discriminated unions.
 * Each handler is optional and transforms a variant into a new value of the **same type**.
 * Variants without handlers pass through unchanged.
 *
 * @typeParam T - The discriminated union type
 *
 * @example
 * ```ts
 * type Shape = { type: 'circle', radius: number } | { type: 'rect', w: number; h: number };
 *
 * const doubleCircle: Mapper<Shape> = {
 *   circle: ({ radius }) => ({ radius: radius * 2 }),
 * };
 * // rectangle variants pass through unchanged
 * ```
 */
export type Mapper<
  T extends SampleUnion<Discriminant>,
  Discriminant extends PropertyKey,
  Payload extends any = never,
> = {
  [K in T[Discriminant]]?: T extends Model<K, infer Data, Discriminant>
    ? (input: Data, payload: Payload) => Omit<Data, Discriminant>
    : never;
};

/**
 * Full transformation map for discriminated unions.
 * Like {@link Mapper}, but **all** variant handlers are required.
 * Each handler transforms a variant into a new value of the same type.
 *
 * @typeParam T - The discriminated union type
 *
 * @example
 * ```ts
 * type Shape = { type: 'circle', radius: number } | { type: 'rect', w: number; h: number };
 *
 * const doubleAll: MapperAll<Shape> = {
 *   circle: ({ radius }) => ({ radius: radius * 2 }),
 *   rect: ({ w, h }) => ({ w: w * 2, h: h * 2 }),
 * };
 * ```
 */
export type MapperAll<
  T extends SampleUnion<Discriminant>,
  Discriminant extends PropertyKey,
  Payload extends any = never,
> = {
  [K in T[Discriminant]]: T extends Model<K, infer Data, Discriminant>
    ? (input: Data, payload: Payload) => Omit<Data, Discriminant>
    : never;
};

/**
 * Exhaustive handler map for folding (reducing) a collection of discriminated union values.
 * Each handler receives the accumulator and the variant's data, and returns the new accumulator.
 *
 * @typeParam T - The discriminated union type
 * @typeParam Acc - The accumulator type
 *
 * @example
 * ```ts
 * type Shape = { type: 'circle', radius: number } | { type: 'rect', w: number; h: number };
 *
 * const counter: Folder<Shape, { circles: number; rects: number }> = {
 *   circle: (acc, { radius }) => ({ ...acc, circles: acc.circles + 1 }),
 *   rect: (acc, { w, h }) => ({ ...acc, rects: acc.rects + 1 }),
 * };
 * ```
 */
export type Folder<
  T extends SampleUnion<Discriminant>,
  Acc,
  Discriminant extends PropertyKey,
> = {
  [K in T[Discriminant]]: T extends Model<K, infer Data, Discriminant>
    ? (acc: Acc, input: Data) => Acc
    : never;
};

/**
 * Partial handler map for folding a collection of discriminated union values,
 * with a required `Default` fallback for unhandled variants.
 * Unlike {@link Folder}, individual variant handlers are optional. When a variant
 * has no handler, `Default` is called with the full union item so the caller
 * can inspect which variant fell through.
 *
 * @typeParam T - The discriminated union type
 * @typeParam Acc - The accumulator type
 *
 * @example
 * ```ts
 * const urgentCount = foldWithDefault(notifications, 0)({
 *   push: (acc, { urgent }) => acc + (urgent ? 1 : 0),
 *   Default: (acc, item) => acc,
 * });
 * ```
 */
export type FolderWithDefault<
  T extends SampleUnion<Discriminant>,
  Acc,
  Discriminant extends PropertyKey,
> = Partial<Folder<T, Acc, Discriminant>> & {
  Default: (acc: Acc, item: T) => Acc;
};

/**
 * Flattens an intersection of object types into a single object type.
 * `{ a: 1 } & { b: 2 }` becomes `{ a: 1; b: 2 }`.
 */
type Prettify<T> = { [K in keyof T]: T[K] } & {};

export type TakeDiscriminant<T, K extends keyof T = keyof T> = K extends keyof T
  ? T[K] extends string
    ? string extends T[K]
      ? never
      : K // excludes wide types
    : never
  : never;

type SchemaData<D extends string> = object & { [Disc in D]?: never };

export type ReservedUnionKeys =
  | 'is'
  | 'isKnown'
  | 'match'
  | 'matchWithDefault'
  | 'map'
  | 'mapAll'
  | 'fold'
  | 'foldWithDefault'
  | 'count'
  | 'partition'
  | 'variants'
  | 'discriminant'
  | '_union';

export type UnionSchema<D extends string> = Record<
  string,
  (...args: any[]) => SchemaData<D>
>;

/**
 * Computes the full discriminated union type from a {@link createUnion} schema.
 * For each key `K` in the schema, produces `ReturnType<Schema[K]> & { [D]: K }`
 * and unions them together.
 *
 * @typeParam D - The discriminant property name
 * @typeParam Schema - An object mapping variant names to constructor functions
 *
 * @example
 * ```ts
 * type Schema = {
 *   circle: (radius: number) => { radius: number };
 *   rect:   (w: number, h: number) => { w: number; h: number };
 * };
 * type Shape = InferUnionFromSchema<'type', Schema>;
 * // { type: 'circle'; radius: number } | { type: 'rect'; w: number; h: number }
 * ```
 */
export type InferUnionFromSchema<
  D extends string,
  Schema extends UnionSchema<D>,
> = {
  [K in keyof Schema & string]: Prettify<
    { [Disc in D]: K } & Omit<ReturnType<Schema[K]>, D>
  >;
}[keyof Schema & string];

/**
 * Extracts the discriminated union type from a value returned by {@link createUnion}.
 * Uses the phantom `_union` property that exists only at the type level.
 *
 * @example
 * ```ts
 * const Shape = createUnion('type', {
 *   circle:    (radius: number) => ({ radius }),
 *   rectangle: (w: number, h: number) => ({ w, h }),
 * });
 *
 * type Shape = InferUnion<typeof Shape>;
 * // { type: 'circle'; radius: number } | { type: 'rectangle'; w: number; h: number }
 * ```
 */
export type InferUnion<T extends { _union: unknown }> = T['_union'];

/**
 * The return type of {@link createUnion}. Combines constructors, type guards,
 * bound matchers, and metadata into a single object.
 *
 * @typeParam D - The discriminant property name
 * @typeParam Schema - The variant constructor schema
 */
export type UnionFactory<D extends string, Schema extends UnionSchema<D>> = {
  [K in keyof Schema & string]: (
    ...args: Parameters<Schema[K]>
  ) => Prettify<Omit<ReturnType<Schema[K]>, D> & { [Disc in D]: K }>;
} & {
  readonly is: <U extends keyof Schema & string>(
    variants: U | readonly U[],
  ) => (
    input: InferUnionFromSchema<D, Schema>,
  ) => input is Extract<InferUnionFromSchema<D, Schema>, { [Disc in D]: U }>;
  readonly isKnown: (x: unknown) => x is InferUnionFromSchema<D, Schema>;
  readonly match: <U, Payload extends any = never>(
    handlers: Matcher<InferUnionFromSchema<D, Schema>, U, D, Payload>,
  ) => (
    ...inputs: [Payload] extends [never]
      ? [input: InferUnionFromSchema<D, Schema>]
      : [input: InferUnionFromSchema<D, Schema>, payload: Payload]
  ) => U;
  readonly matchWithDefault: <U, Payload extends any = never>(
    handlers: MatcherWithDefault<
      InferUnionFromSchema<D, Schema>,
      U,
      D,
      Payload
    >,
  ) => (
    ...inputs: [Payload] extends [never]
      ? [input: InferUnionFromSchema<D, Schema>]
      : [input: InferUnionFromSchema<D, Schema>, payload: Payload]
  ) => U;
  readonly map: <Payload extends any = never>(
    handlers: Mapper<InferUnionFromSchema<D, Schema>, D, Payload>,
  ) => (
    ...inputs: [Payload] extends [never]
      ? [input: InferUnionFromSchema<D, Schema>]
      : [input: InferUnionFromSchema<D, Schema>, payload: Payload]
  ) => InferUnionFromSchema<D, Schema>;
  readonly mapAll: <Payload extends any = never>(
    handlers: MapperAll<InferUnionFromSchema<D, Schema>, D, Payload>,
  ) => (
    ...inputs: [Payload] extends [never]
      ? [input: InferUnionFromSchema<D, Schema>]
      : [input: InferUnionFromSchema<D, Schema>, payload: Payload]
  ) => InferUnionFromSchema<D, Schema>;
  readonly fold: <Acc>(
    items: ReadonlyArray<InferUnionFromSchema<D, Schema>>,
    initial: Acc,
  ) => (handlers: Folder<InferUnionFromSchema<D, Schema>, Acc, D>) => Acc;
  readonly foldWithDefault: <Acc>(
    items: ReadonlyArray<InferUnionFromSchema<D, Schema>>,
    initial: Acc,
  ) => (handlers: FolderWithDefault<InferUnionFromSchema<D, Schema>, Acc, D>) => Acc;
  readonly count: (
    variants: (keyof Schema & string) | ReadonlyArray<keyof Schema & string>,
  ) => (items: ReadonlyArray<InferUnionFromSchema<D, Schema>>) => number;
  readonly partition: <U extends keyof Schema & string = keyof Schema & string>(
    variants: U | readonly U[],
  ) => (
    items: ReadonlyArray<InferUnionFromSchema<D, Schema>>,
  ) => [
    Extract<InferUnionFromSchema<D, Schema>, { [Disc in D]: U }>[],
    Exclude<InferUnionFromSchema<D, Schema>, { [Disc in D]: U }>[],
  ];
  readonly variants: ReadonlyArray<keyof Schema & string>;
  readonly discriminant: D;
  /**
   * @phantom This property exists **only at the type level** and has no runtime value.
   * Accessing `factory._union` at runtime returns `undefined`.
   * It is used exclusively by {@link InferUnion} to extract the union type:
   * `type MyUnion = InferUnion<typeof factory>`.
   */
  readonly _union: InferUnionFromSchema<D, Schema>;
};
