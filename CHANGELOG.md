# Changelog

## [0.1.0] - 2026-02-18

### Added
- Customizable discriminant property name across all APIs (`match`, `matchWithDefault`, `map`, `mapAll`, `is`, `isUnion`)
- All functions now accept an optional `discriminant` parameter (defaults to `'type'` for backward compatibility)
- `Model`, `SampleUnion`, `Matcher`, `MatcherWithDefault`, `Mapper`, `MapperAll` types updated with `Discriminant` generic parameter

### Fixed
- `match()` was not passing discriminant to `isUnion()` and `Module.match()`
