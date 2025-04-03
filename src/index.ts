import { Model } from './types';
export { match, matchWithDefault, map, mapAll } from './unions';
export { is } from './module';

export type UnionByArray<T extends Model<string, any>[]> = T[number];
