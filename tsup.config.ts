import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: false,
  clean: true,
  target: 'node18',
  // Don't bundle express and node builtins — CJS require() breaks in ESM bundle
  noExternal: [],
  external: ['express'],
});
