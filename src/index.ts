import { Model } from './types';
export {
  match,
  matchWithDefault,
  map,
  mapAll,
  createPipeHandlers,
} from './unions';
export { is, isUnion } from './module';
export type { Model, TakeDiscriminant } from './types';

/**
 * Utility type that extracts a discriminated union from an array of {@link Model} types.
 * Useful when you define your variants as an array (e.g., for iteration or schema generation)
 * and need to derive the union type from it.
 *
 * @typeParam T - A tuple or array of Model types
 *
 * @example
 * ```ts
 * import { Model, UnionByArray } from 'dismatch';
 *
 * type Variants = [
 *   Model<'circle', { radius: number }>,
 *   Model<'rectangle', { width: number; height: number }>,
 * ];
 *
 * type Shape = UnionByArray<Variants>;
 * // Equivalent to:
 * // Model<'circle', { radius: number }> | Model<'rectangle', { width: number; height: number }>
 * ```
 */
export type UnionByArray<
  T extends Model<string, any, Discriminant>[],
  Discriminant extends string | number | symbol = 'type',
> = T[number];
