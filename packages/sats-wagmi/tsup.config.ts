import { defineConfig } from 'tsup';

export default defineConfig({
  clean: true,
  target: 'es2019',
  format: ['cjs', 'esm'],
  banner: { js: '"use client";' },
  outDir: 'dist',
  entry: ['src/index.ts'],
  dts: true,
  splitting: false,
  sourcemap: true,
  minify: false,
  shims: true,
  skipNodeModulesBundle: true,
  external: ['react', 'react-dom']
});
