import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/config.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'node18',
  splitting: false,
  // Esbuild already removes unused code. Tsup's extra Rollup pass warns about
  // the intentional named and default CommonJS exports.
  treeshake: false,
})
