# Changelog

## [0.2.0] - 2026-02-18

### Added
- `createPipeHandlers<T, Discriminant>(discriminant)` — creates a handler factory bound to a discriminant key, returning `match`, `matchWithDefault`, `map`, and `mapAll` in handlers-first (pipe-friendly) order: `(handlers) => (input) => result`
- `TakeDiscriminant<T>` utility type exported from the public API
- `samples/` directory with three real-world TypeScript examples: `fetch-state.ts`, `pipe-composition.ts`, `notifications.ts`

### Changed
- `createPipeHandlers` and `TakeDiscriminant` are now exported from the main package entry point
- `Model<DiscriminantValue, Data, Discriminant>` — `Data` now defaults to `{}` and `Discriminant` defaults to `'type'`, enabling the common 1- and 2-argument forms (`Model<'idle'>`, `Model<'ok', { data: string }>`)
- README fully restructured: table of contents, complete API reference with signatures and examples, `createPipeHandlers` pipe composition guide, type helper documentation, and real-world patterns

## [0.1.1] - 2026-02-18

### Added
- MIT License

### Changed
- Discriminant generic parameter constraint widened from `string` to `string | number | symbol` across all types (`SampleUnion`, `Model`, `Matcher`, `MatcherWithDefault`, `Mapper`, `MapperAll`) and all functions (`match`, `matchWithDefault`, `map`, `mapAll`, `is`, `isUnion`)
- `UnionByArray` utility type updated to accept `string | number | symbol` discriminant
- New internal `TakeDiscriminant` utility type added to `types.ts`
- Improved tree shaking via updated package exports and `tsup` build config
- README improvements

## [0.1.0] - 2026-02-18

### Added
- Customizable discriminant property name across all APIs (`match`, `matchWithDefault`, `map`, `mapAll`, `is`, `isUnion`)
- All functions now accept an optional `discriminant` parameter (defaults to `'type'` for backward compatibility)
- `Model`, `SampleUnion`, `Matcher`, `MatcherWithDefault`, `Mapper`, `MapperAll` types updated with `Discriminant` generic parameter

### Fixed
- `match()` was not passing discriminant to `isUnion()` and `Module.match()`
