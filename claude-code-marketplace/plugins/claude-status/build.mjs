#!/usr/bin/env node
import { build } from 'esbuild';

await build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: 'out/main.js',
  define: {
    __VERSION__: JSON.stringify('1.0.0'),
  },
});

console.log('✓ Built out/main.js');
