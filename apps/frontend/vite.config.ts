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
  // The engine imports the backend's variable-substitution module, whose
  // exports map points at compiled CommonJS a browser import cannot use, so
  // alias straight to the TypeScript source (type-only model imports bundle
  // cleanly for the browser).
  // GOTCHA: pre-bundling caches a snapshot Vite keeps serving after this
  // module changes its API, breaking scripts at the next dev-server start.
  resolve: {
    alias: [
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
