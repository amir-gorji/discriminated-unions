export type SampleUnion = { [type: string]: any };

export type Model<Discriminant extends string, Data> = {
  type: Discriminant;
} & Data;

export type Matcher<T extends SampleUnion, Result> = {
  [K in T['type']]: T extends Model<K, infer Data>
    ? (input: Data) => Result
    : never;
};

export type MatcherWithDefault<T extends SampleUnion, Result> = Partial<
  Matcher<T, Result>
> & { Default: () => Result };

export type Mapper<T extends SampleUnion> = {
  [K in T['type']]?: T extends Model<K, infer Data>
    ? (input: Data) => Data
    : never;
};

export type MapperAll<T extends SampleUnion> = {
  [K in T['type']]: T extends Model<K, infer Data>
    ? (input: Data) => Data
    : never;
};
