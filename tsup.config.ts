import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: false,
  clean: true,
  target: 'node18',
  // Bundle @clawfetch/sdk inline — it's not on npm yet.
  // Don't bundle express (CJS require() breaks in ESM bundle) or node builtins.
  noExternal: ['@clawfetch/sdk'],
  external: ['express'],
  // tweetnacl (transitive via @x402/extensions) uses require('crypto').
  // Provide createRequire shim so CJS dynamic requires work in ESM bundle.
  banner: {
    js: `import { createRequire as __$$createRequire } from 'module';\nconst require = __$$createRequire(import.meta.url);`,
  },
});
