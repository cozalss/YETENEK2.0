import { defineConfig, devices } from '@playwright/test';

const port = process.env.PLAYWRIGHT_PORT ?? '3000';
const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${port}`;

/**
 * Yetenek 2.0 E2E test konfigürasyonu.
 *
 * - Chromium + Mobile Chrome (Pixel 5) projeleri.
 * - Base URL: http://localhost:3000 — dev server otomatik başlatılır.
 * - PLAYWRIGHT_USE_BUILD=1 ile production build (next start) kullanır
 *   (kararlı, paralel run'larda Turbopack flake'i ortadan kaldırır).
 * - Default workers = 4, dev server compile race'i azaltmak için.
 */

const useProductionServer = process.env.PLAYWRIGHT_USE_BUILD === '1';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  // Default 6 worker dev server'ın compile cache'ini yarıştırıyor → 500'ler
  // üretiyordu. 4 worker hem hızı koruyor hem flake'i bitiriyor.
  workers: process.env.CI ? 1 : 4,
  reporter: process.env.CI ? [['html'], ['list']] : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: useProductionServer
      ? `pnpm exec next build && pnpm exec next start -p ${port}`
      : `pnpm exec next dev -p ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
