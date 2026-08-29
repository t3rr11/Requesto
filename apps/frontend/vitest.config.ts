import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Node 22.4+ ships an experimental globalThis.localStorage/sessionStorage that is
// non-functional unless --localstorage-file is given. Its presence stops vitest's
// jsdom environment from installing jsdom's working Storage implementation
// (vitest-dev/vitest#8757), so we disable it for the test workers.
const [major, minor] = process.versions.node.split('.').map(Number);
const webstorageDisabled = major > 22 || (major === 22 && minor >= 4);

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    execArgv: webstorageDisabled ? ['--no-experimental-webstorage'] : [],
  },
});
