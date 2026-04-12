# Changelog

## [2.0.1] - 2026-04-12

### Changed

- Inlined `toArray` and `hasVariant` helpers — eliminated two internal functions, reducing indirection and enabling better minification.
- Extracted shared `DEFAULT_DISCRIMINANT` constant so the `'type'` string literal appears once in the bundle instead of at every call site.
- Simplified `matchWithDefault` to delegate to `match` directly, removing duplicated `dispatch` call.
- Simplified `createPipeHandlers` curried methods — replaced rest-parameter spread (`...inputs`) with plain `(input, payload?)` signatures, cutting per-method boilerplate.
- Replaced `hasVariant` call in `createPipeHandlers().is` with the public `is()` function.
- Removed `Object.freeze` on `createUnion().variants` array — unnecessary runtime cost with no safety benefit since the type is already `ReadonlyArray`.

### Bundle size

- Canonical metric (`esbuild --bundle --minify`, non-gzipped): **1,602 B (1.56 KB)** — down from 1,713 B in 2.0.0 (−111 B / −6.5%).

## [2.0.0] - 2026-04-11

### Added

- `count(items, variant | variants, discriminant?)` — single-pass tally of how many items in a collection match the given variant(s). No intermediate array allocation.
- `partition(items, variant | variants, discriminant?)` — splits a collection into `[matched, rest]` in one pass with fully narrowed tuple types. Accepts a single variant or an array.
- **Value-first multi-variant `is()`:** `is(value, ['a', 'b'])` — narrows to a sub-union inside `if` blocks. Supports a custom discriminant via the trailing argument (e.g. `is(value, ['click','keydown'], 'kind')`).
- **`createPipeHandlers(...).is(...)`** — variant-first curried type guard, returns `(input) => input is Extract<...>`. Binds the union type and discriminant at factory construction, so `.filter(ops.is('circle'))` narrows to `Circle[]` with zero call-site generics.
- `createPipeHandlers().count` and `createPipeHandlers().partition` curried bound forms.
- `createUnion().count` and `createUnion().partition` (via `createPipeHandlers`).
- `count` and `partition` test suites; new `is()` disambiguation regression tests.
- Test files are now type-checked under `tsc --noEmit` (removed from `tsconfig.json` exclude list) so future test-side type drift is caught at the release gate.

### Removed (BREAKING)

- **`narrow` export removed.** Use `is(value, ['a','b'])` directly, or `ops.is(['a','b'])` for predicate-factory use.
- `createUnion().narrow(...)` (inherited from `createPipeHandlers`) — use `is(value, ['a','b'])`.
- `UnionFactory.narrow` type removed from public types.
- **`createUnion().is.<variant>` per-variant bound guards removed.** `createUnion().is` is now the curried predicate-factory form inherited from `createPipeHandlers` — `Shape.is('circle')` returns `(input) => input is Circle`. `createUnion().isKnown(...)` stays — it remains uniquely schema-aware.
- `UnionFactory.is` rewritten in `types.ts` from a per-variant object to the curried predicate-factory signature.

Migration:
- `narrow(v, ['a','b'])` → `is(v, ['a','b'])`
- `items.filter(narrow(['a','b']))` → `const ops = createPipeHandlers<T>('type'); items.filter(ops.is(['a','b']))`
- `shapes.filter(narrow(['circle','rect']))` → `shapes.filter(ops.is(['circle','rect']))`
- `Shape.is.circle(x)` → `is(x, 'circle')` (narrowing) or `Shape.is('circle')(x)` (curried bound form).
- `shapes.filter(Shape.is.circle)` → `shapes.filter(Shape.is('circle'))`.
- Value-first forms are unchanged: `is(value, 'circle')`, `is(value, ['circle','rectangle'])`, `is(value, 'click', 'kind')`.

### Changed

- Standalone `is()` collapsed to 2 typed value-first overloads plus an untyped fallback — no runtime arity-based disambiguation. `is(value, 'circle')` (arity 2 with two strings) is unambiguously **value-first**: first arg is the value, second is the variant name. Custom discriminant is the optional third arg: `is(value, 'circle', 'kind')`.
- `hasVariant` helper tightened to accept `string | readonly string[]` directly — eliminates per-call allocation on the single-variant hot path (previously wrapped via `toArray`).
- `UnionFactory.count` and `UnionFactory.partition` types are curried (`(variants) => (items) => result`) to match the runtime spread from `createPipeHandlers`.
- `partition` widened to accept a single variant or an array, mirroring `count`.
- Internal refactor for bundle size: `clearStackTrace` helper inlined into a single `fail` helper; `guard()` double-curry replaced with direct `ensureUnion` checks; `match` / `matchWithDefault` / `map` / `mapAll` simplified; `toArray` helper shared by `count` / `partition`.
- `src/helpers.ts` deleted (functionality inlined).
- README updated: `is()` is presented as the canonical guard, with new `count` / `partition` sections, expanded `is` documentation, and migration notes for `narrow` and bound guard helpers. Stale `narrow (deprecated)` TOC link removed.
- `samples/pipe-composition.ts` rebuilt to demonstrate `count`, `partition`, and the expanded `is()` API alongside the existing pipe composition story.
- `scripts/verify-package.mjs` expected-exports list updated to drop `narrow`, keeping release verification in sync with the removed public surface.

### Bundle size

- Canonical metric (`esbuild --bundle --minify`, non-gzipped): **1,713 B (1.67 KB)** — well under the 3.0 KB cap, despite adding `count`, `partition`, and the expanded `is()` surface. Removing `createUnion().is.<variant>` shed ~35 B versus the earlier 2.0.0 figure.
- Run `npm run size` to reproduce.

### Benchmarks

Hand-rolled micro-bench over 100,000 mixed-variant items × 50 iterations (`npm run bench`):

| Operation                                                    | ms/op |
| ------------------------------------------------------------ | ----- |
| `count(items, 'circle')`                                     | 0.76  |
| `items.filter(s => s.type === 'circle').length`              | 0.60  |
| `count(items, ['circle', 'rectangle'])`                      | 0.83  |
| inline filter+length, two variants                           | 0.74  |
| `partition(items, 'circle')`                                 | 0.69  |
| two-filter equivalent (`filter` + `filter`)                  | 1.38  |

`count` is on the same order of magnitude as a hand-rolled inline filter (the small overhead comes from `Array.includes`). `partition` is roughly 2× faster than the two-filter equivalent because it only walks the array once.

## [1.1.1] - 2026-04-08

### Fixed

- README now included in the published npm package (added to `files` in `package.json`)

## [1.1.0] - 2026-04-08

### Added

- `narrow` — multi-variant type predicate that narrows a union to a sub-union of specified variants. Two calling styles: value-first for if-blocks (`narrow(value, ['ok', 'error'])`) and keys-first predicate factory for `.filter()` (`items.filter(narrow(['ok', 'error']))`). Supports custom discriminant keys.
- `fold` — exhaustive single-pass aggregator (reduce) over a collection of union values. Curried `fold(items, initial)(handlers)` with compile-time exhaustiveness checking. Each handler receives `(accumulator, variantData)` and returns the new accumulator.
- `Folder<T, Acc, Discriminant>` type helper for fold handler maps
- `narrow` and `fold` bound methods on `createUnion` factories and `createPipeHandlers` objects
- Test suites for `narrow` (17 cases) and `fold` (7 cases)

### Changed

- README updated with `narrow` and `fold` sections, examples, and comparison table entries
- Bundle size updated from ~1.4 kB to ~1.7 kB

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
