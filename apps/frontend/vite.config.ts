import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import packageJson from '../../package.json' with { type: 'json' };

const apiPort = process.env.VITE_API_PORT || '4747';
const here = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [tailwindcss(), react()],
  base: './',
  // The engine (a linked workspace package) imports the backend's CommonJS
  // variable-substitution module. Linked packages are not pre-bundled by
  // default, and a raw CJS file provides no named exports to the browser,
  // so it must be pulled into dependency pre-bundling explicitly.
  optimizeDeps: {
    include: ['requesto-backend/utils/variable-substitution'],
  },
  resolve: {
    alias: [
      // Resolve the backend's variable-substitution module straight from
      // source. The exports map points at the compiled CommonJS dist, and
      // pre-bundling from dist captured a stale build (missing `inferType`)
      // that the Vite cache then kept serving, breaking scripts at runtime.
      // The source is pure TypeScript with type-only imports, so it bundles
      // cleanly for the browser.
      {
        find: 'requesto-backend/utils/variable-substitution',
        replacement: path.resolve(here, '../backend/src/utils/variable-substitution.ts'),
      },
    ],
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: `http://localhost:${apiPort}`,
        changeOrigin: true,
      },
    },
  },
  define: {
    'import.meta.env.PACKAGE_VERSION': JSON.stringify(packageJson.version)
  }
});
