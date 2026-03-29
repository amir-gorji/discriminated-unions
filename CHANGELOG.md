# Changelog

## [1.0.0] - 2026-03-29

### Added

- `createUnion(discriminant, schema)` — single-definition factory producing constructors, per-variant type guards (`.is.<variant>`), schema-aware runtime check (`.isKnown`), and bound `match`/`matchWithDefault`/`map`/`mapAll` methods
- `InferUnion<T>` type helper — extracts the union type from a `createUnion` factory
- `samples/create-union.ts` end-to-end example
- 49 new tests covering constructors, guards, bound matchers, metadata, and edge cases

### Changed

- **BREAKING:** Removed `Model` and `UnionByArray` type helpers from public exports — use `InferUnion` with `createUnion` instead, or define union types inline
- `Mapper` / `MapperAll` handler return type changed from `Omit<Data, Discriminant>` to `Omit<Data, Discriminant> & Partial<Pick<Data, Discriminant>>` — the discriminant is now optional in the return, so handlers can omit it, include it, or spread the input (e.g. `(ok) => ({ ...ok, data: transformed })`)
- README fully rewritten — `createUnion` is now the primary recommended workflow
- Updated `samples/fetch-state.ts`, `samples/notifications.ts`, `samples/pipe-composition.ts`

## [0.3.1] - 2026-03-27

### Changed

- Improved tree shaking for ESM builds: `/*#__PURE__*/` annotations are now preserved so downstream bundlers (webpack, Vite) can safely eliminate unused code
- ESM output uses selective minification (identifiers + syntax only, whitespace preserved) while CJS remains fully minified
- Added AI-powered PR review workflow

## [0.3.0] - 2026-03-27

### Added

- Payload support for all `createPipeHandlers` methods (`match`, `matchWithDefault`, `map`, `mapAll`). Provide a second type argument `<Result, Payload>` to pass extra context to every handler; each handler receives it as a second argument and the returned function becomes `(input, payload) => result`.
- Optional `payload` parameter on the standalone `match`, `matchWithDefault`, `map`, and `mapAll` functions.

### Changed

- bundle size up to **988 bytes** (ESM, minified) due to payload feature additions

### Fixed

- `Matcher` type and all `createPipeHandlers` methods now use `[Payload] extends [never]` (non-distributive form) for the payload conditional. The distributive form previously collapsed to `never` when `Payload` was unspecified, making the returned function impossible to call.

## [0.2.1] - 2026-02-20

### Changed

- `is` and `isUnion` moved inline into `unions.ts`; `module.ts` removed
- Internal `dispatch` and `guard` helpers extracted to eliminate code duplication across `match`, `matchWithDefault`, `map`, `mapAll`, and `createPipeHandlers`
- `createPipeHandlers` now delegates to the public `match`/`matchWithDefault`/`map`/`mapAll` functions instead of duplicating logic
- `mapAll` now enforces exhaustiveness at **runtime** in addition to compile time — throws `'Matcher incomplete!'` if a handler is missing, mirroring `match` behaviour
- Minification enabled in tsup config
- bundle size down to **901 bytes** (ESM, minified)

## [0.2.0] - 2026-02-18

### Added

- `createPipeHandlers<T, Discriminant>(discriminant)` — creates a handler factory bound to a discriminant key, returning `match`, `matchWithDefault`, `map`, and `mapAll` in handlers-first (pipe-friendly) order: `(handlers) => (input) => result`
- `TakeDiscriminant<T>` utility type exported from the public API
- `samples/` directory with three real-world TypeScript examples: `fetch-state.ts`, `pipe-composition.ts`, `notifications.ts`

### Changed

- `createPipeHandlers` and `TakeDiscriminant` are now exported from the main package entry point
- Removed unnecessary generic from `createPipeHandler` in README
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
