import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const apiPort = process.env.VITE_API_PORT || '4000';

export default defineConfig({
  plugins: [tailwindcss(), react()],
  base: './',
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
});
