import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/main.ts'],
  outDir: 'lib',
  clean: true,
  exports: true,
  dts: true,
  publint: true,
  attw: {
    enabled: true,
    profile: 'esm-only',
  },
})
