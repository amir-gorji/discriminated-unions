import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/remote-data.ts', 'src/async.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: false,
  outDir: 'lib',
  splitting: false,
  treeshake: true,
  target: 'es2022',
  esbuildOptions(opts, { format }) {
    if (format === 'esm') {
      // Preserve whitespace in ESM so /*#__PURE__*/ annotations survive —
      // without them downstream bundlers (webpack, Vite) can't tree-shake safely.
      opts.minifyIdentifiers = true;
      opts.minifySyntax = true;
      opts.minifyWhitespace = false;
    } else {
      opts.minify = true;
    }
  },
});
