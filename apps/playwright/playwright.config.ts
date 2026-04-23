import { defineConfig, devices } from '@playwright/test';
import path from 'path';

const TEST_BACKEND_PORT = 5747;
const TEST_FRONTEND_PORT = 5174;
const testDataDir = path.resolve(__dirname, 'test-data');

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['html', { open: 'never' }]],

  use: {
    baseURL: `http://localhost:${TEST_FRONTEND_PORT}`,
    viewport: { width: 1440, height: 900 },
    actionTimeout: 10_000,
    trace: 'on',
    screenshot: 'off',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: [
    {
      command: `npx tsx watch src/server.ts`,
      cwd: path.resolve(__dirname, '..', 'backend'),
      port: TEST_BACKEND_PORT,
      reuseExistingServer: !process.env.CI,
      env: {
        PORT: String(TEST_BACKEND_PORT),
        DATA_DIR: testDataDir,
        LOG_LEVEL: 'warn',
      },
    },
    {
      command: `npx vite --port ${TEST_FRONTEND_PORT}`,
      cwd: path.resolve(__dirname, '..', 'frontend'),
      port: TEST_FRONTEND_PORT,
      reuseExistingServer: !process.env.CI,
      env: {
        VITE_API_PORT: String(TEST_BACKEND_PORT),
      },
    },
  ],
});
