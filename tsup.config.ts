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
      // Keep whitespace in ESM so downstream bundlers (webpack, Vite) can
      // parse the AST structure reliably and tree-shake individual exports.
      opts.minifyIdentifiers = true;
      opts.minifySyntax = true;
      opts.minifyWhitespace = false;
    } else {
      opts.minify = true;
    }
  },
});
