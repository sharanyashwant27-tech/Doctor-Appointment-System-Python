import { defineConfig, devices } from '@playwright/test';

/**
 * MediBook end-to-end tests.
 * Start frontend (8905) + backend (8000) before running, or use webServer below.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:8905',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.E2E_SKIP_WEBSERVER
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:8905',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
