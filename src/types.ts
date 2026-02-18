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
export type SampleUnion<Discriminant extends string | number | symbol> = {
  [K in Discriminant]: any;
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
  Data,
  Discriminant extends string | number | symbol,
> = {
  [K in Discriminant]: DiscriminantValue;
} & Data;

/**
 * Exhaustive handler map for pattern matching on a discriminated union.
 * Requires a handler function for **every** variant in the union.
 * Each handler receives the full variant (including `type`) and must return `Result`.
 *
 * @typeParam T - The discriminated union type
 * @typeParam Result - The return type of all handler functions
 *
 * @example
 * ```ts
 * type Shape = Model<'circle', { radius: number }> | Model<'rect', { w: number; h: number }>;
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
  Discriminant extends string | number | symbol,
> = {
  [K in T[Discriminant]]: T extends Model<K, infer Data, Discriminant>
    ? (input: Data) => Result
    : never;
};

/**
 * Partial handler map with a required `Default` fallback for unmatched variants.
 * Unlike {@link Matcher}, individual variant handlers are optional. When a variant
 * has no handler, the `Default` function is called instead.
 *
 * @typeParam T - The discriminated union type
 * @typeParam Result - The return type of all handler functions (including Default)
 *
 * @example
 * ```ts
 * type Shape = Model<'circle', { radius: number }> | Model<'rect', { w: number; h: number }>;
 *
 * const describe: MatcherWithDefault<Shape, string> = {
 *   circle: ({ radius }) => `Circle with radius ${radius}`,
 *   Default: () => 'Unknown shape',
 * };
 * ```
 */
export type MatcherWithDefault<
  T extends SampleUnion<Discriminant>,
  Result,
  Discriminant extends string | number | symbol,
> = Partial<Matcher<T, Result, Discriminant>> & { Default: () => Result };

/**
 * Partial transformation map for discriminated unions.
 * Each handler is optional and transforms a variant into a new value of the **same type**.
 * Variants without handlers pass through unchanged.
 *
 * @typeParam T - The discriminated union type
 *
 * @example
 * ```ts
 * type Shape = Model<'circle', { radius: number }> | Model<'rect', { w: number; h: number }>;
 *
 * const doubleCircle: Mapper<Shape> = {
 *   circle: ({ type, radius }) => ({ type, radius: radius * 2 }),
 * };
 * // rectangle variants pass through unchanged
 * ```
 */
export type Mapper<
  T extends SampleUnion<Discriminant>,
  Discriminant extends string | number | symbol,
> = {
  [K in T[Discriminant]]?: T extends Model<K, infer Data, Discriminant>
    ? (input: Data) => Data
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
 * type Shape = Model<'circle', { radius: number }> | Model<'rect', { w: number; h: number }>;
 *
 * const doubleAll: MapperAll<Shape> = {
 *   circle: ({ type, radius }) => ({ type, radius: radius * 2 }),
 *   rect: ({ type, w, h }) => ({ type, w: w * 2, h: h * 2 }),
 * };
 * ```
 */
export type MapperAll<
  T extends SampleUnion<Discriminant>,
  Discriminant extends string | number | symbol,
> = {
  [K in T[Discriminant]]: T extends Model<K, infer Data, Discriminant>
    ? (input: Data) => Data
    : never;
};

export type TakeDiscriminant<T, K extends keyof T = keyof T> = K extends keyof T
  ? T[K] extends string | number | symbol
    ? string extends T[K]
      ? never
      : K // excludes wide types
    : never
  : never;
