import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'tsup';

const extDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  entry: {
    background: 'src/background.ts',
    content: 'src/content.ts',
    popup: 'src/popup.ts',
  },
  format: ['iife'],
  outExtension: () => ({ js: '.js' }),
  noExternal: [/.*/],
  clean: true,
  sourcemap: true,
  target: 'es2022',
  async onSuccess() {
    const publicDir = resolve(extDir, 'public');
    const distDir = resolve(extDir, 'dist');
    if (existsSync(publicDir)) {
      mkdirSync(distDir, { recursive: true });
      cpSync(publicDir, distDir, { recursive: true });
    }
  },
});
