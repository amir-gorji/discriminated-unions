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
});
