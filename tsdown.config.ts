import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts', 'src/cli.ts'],
  outDir: 'lib',
  clean: true,
  exports: {
    enabled: true,
    extensions: true,
    bin: 'src/cli.ts',
    inlinedDependencies: false
  },
  dts: true,
  publint: true,
  attw: {
    enabled: true,
    profile: 'esm-only',
  },
})
