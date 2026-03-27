import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: false,
  outDir: 'lib',
  splitting: false,
  treeshake: true,
  target: 'es2020',
  esbuildOptions(opts, { format }) {
    if (format === 'esm') {
      // Preserve whitespace so /*#__PURE__*/ annotations survive — without
      // them downstream bundlers (webpack, vite) can't tree-shake safely.
      opts.minifyIdentifiers = true;
      opts.minifySyntax = true;
      opts.minifyWhitespace = false;
    } else {
      opts.minify = true;
    }
  },
});
