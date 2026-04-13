# Contributing to dismatch

dismatch is a focused discriminated-union toolkit for TypeScript — small by design, sharp by intent. Contributions are welcome: bug fixes, new primitives that genuinely belong here, docs improvements, and performance work.

Start a conversation before building anything non-trivial. Open a [GitHub Issue](https://github.com/amir-gorji/dismatch/issues) for bugs or concrete proposals, or a [Discussion](https://github.com/amir-gorji/dismatch/discussions) for ideas you want to think through first.

---

## Principles

These are the filters every change is held to — including changes from maintainers.

**Every byte earns its place.**
The canonical size metric is `npm run size` (esbuild minified, non-gzipped). Anything that touches the main entry should document the before/after delta in the PR. Size regressions need a strong justification.

**Fewer, sharper APIs over symmetric completeness.**
Symmetry with an existing API is not a reason to add a new one. A new export should solve a discriminated-union problem better than plain TypeScript or an existing helper — not just fill a perceived gap.

**Functional style throughout.**
Pure functions. Single-pass collection operations where possible. No unnecessary object allocation on hot paths. No runtime machinery that could be a type-level guarantee instead.

**Discriminated-union leverage, not general pattern matching.**
If a feature makes more sense in `ts-pattern` or a general utility library, it doesn't belong here. The value of dismatch is being precisely scoped — that sharpness is the product.

---

## Workflow

1. Fork the repo and create a branch from `main`.
2. Make your changes.
3. Run the checks:
   ```bash
   npm test          # all tests must pass
   npm run ts:ci     # tsc --noEmit must be clean
   ```
4. If your change adds or modifies a public API:
   - Add or update tests in `src/__tests__/`
   - Update the relevant section of `README.md`
5. If your change affects the main entry bundle:
   ```bash
   npm run size      # note the before/after delta
   ```
   Include that delta in your PR description.
6. Open a PR against `main` with a clear description of what changed and why.

No commit message format is enforced. Write something honest.

---

## Reporting bugs

Open a [GitHub Issue](https://github.com/amir-gorji/dismatch/issues). Include:

- The version of dismatch you're using
- A minimal TypeScript snippet that reproduces the problem
- What you expected vs. what happened

---

## License

By contributing, you agree that your changes will be released under the [MIT License](./LICENSE). No CLA or sign-off required.
